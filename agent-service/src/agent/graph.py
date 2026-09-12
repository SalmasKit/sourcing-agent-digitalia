import asyncio
import json
import logging
import re
import time
from typing import Any, cast

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph

from src.agent.groq_circuit_breaker import get_groq_circuit_breaker
from src.agent.prompts import CRITERIA_EXTRACTION_SYSTEM, CRITERIA_EXTRACTION_USER
from src.agent.state import SourcingState
from src.config import get_settings
from src.mcp_server.tools.candidate_pool import store_candidate_pool_batch
from src.mcp_server.tools.dedup import filter_and_record_duplicates
from src.mcp_server.tools.enrich_profile import enrich_candidate
from src.mcp_server.tools.score_profile import score_profiles_batch
from src.mcp_server.tools.search_profiles import _ai_enrich_profile, search_profiles
from src.metrics import search_duration

logger = logging.getLogger(__name__)

settings = get_settings()



# Global circuit breaker instance

_groq_breaker = get_groq_circuit_breaker()





def _get_llm(max_tokens: int = 1024) -> ChatGroq | None:

    if not settings.groq_api_key or not settings.groq_model:

        return None

    return ChatGroq(

        api_key=settings.groq_api_key,

        model=settings.groq_model,

        temperature=settings.groq_temperature,

        max_tokens=max_tokens,

    )





def _parse_json_from_llm(raw: str) -> Any:

    # Strip <think>...</think> blocks from reasoning models

    cleaned = re.sub(r'<think>.*?</think>', '', raw, flags=re.DOTALL).strip()

    text = cleaned if cleaned else raw.strip()

    try:

        return json.loads(text)

    except json.JSONDecodeError:

        pass

    json_match = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", text, re.DOTALL)

    if json_match:

        try:

            return json.loads(json_match.group(1))

        except json.JSONDecodeError:

            pass

    any_json = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)

    if any_json:

        try:

            return json.loads(any_json.group(1))

        except json.JSONDecodeError:

            pass

    return None





async def interpret_request(state: SourcingState) -> SourcingState:

    logger.info(f"[Node 1] Interpreting: {state['raw_query'][:80]}")

    llm = _get_llm(max_tokens=2048)



    if not llm:
        fallback = _build_fallback_criteria(state["raw_query"])
        return {
            **state,
            "criteria": fallback,
            "messages": state["messages"] + [AIMessage(content="Fallback criteria extracted (Groq API key absent).")],
            "error": None,
        }

    if _groq_breaker.is_rate_limited():
        logger.warning("[Node 1] Groq rate-limited (circuit breaker) — using fallback criteria.")
        fallback = _build_fallback_criteria(state["raw_query"])
        return {
            **state,
            "criteria": fallback,
            "messages": state["messages"] + [AIMessage(content="Fallback criteria extracted (Groq rate-limited).")],
            "error": None,
        }



    try:

        messages = [

            SystemMessage(content=CRITERIA_EXTRACTION_SYSTEM),

            HumanMessage(content=CRITERIA_EXTRACTION_USER.format(query=state["raw_query"])),

        ]

        response = await llm.ainvoke(messages)



        # Reasoning models (e.g. gpt-oss-20b) sometimes emit all output as internal

        # thinking tokens and return an empty content string. Fall back to

        # reasoning_content in additional_kwargs before giving up.

        raw_content = cast(str, response.content or "")

        if not raw_content.strip():

            raw_content = (

                response.additional_kwargs.get("reasoning_content")

                or response.additional_kwargs.get("thinking")

                or ""

            )

        raw_content = re.sub(r'<think>.*?</think>', '', raw_content, flags=re.DOTALL).strip()

        criteria = _parse_json_from_llm(raw_content)



        if not criteria or not isinstance(criteria, dict):

            raise ValueError("Invalid criteria format from LLM")



        criteria.setdefault("job_title", state["raw_query"].split(" in ")[0].strip() or "Professional")

        criteria.setdefault("required_skills", [])

        criteria.setdefault("seniority", "Any")

        criteria.setdefault("location", "Any")



        # Explicit numeric experience takes precedence if mentioned in query (e.g. "+8 years", "8+ ans")

        explicit_exp = _extract_min_experience_from_query(state["raw_query"])

        if explicit_exp is not None:

            criteria["min_experience_years"] = explicit_exp

        elif not criteria.get("min_experience_years"):

            sen_str = f"{criteria.get('seniority', '')} {criteria.get('job_title', '')}".lower()

            if any(k in sen_str for k in ["manager", "director", "head", "lead", "principal", "architect"]):

                criteria["min_experience_years"] = 8

            elif "senior" in sen_str:

                criteria["min_experience_years"] = 5

            elif any(k in sen_str for k in ["mid", "medior"]):

                criteria["min_experience_years"] = 3

            elif any(k in sen_str for k in ["junior", "entry"]):

                criteria["min_experience_years"] = 1



        return {

            **state,

            "criteria": criteria,

            "messages": state["messages"] + [AIMessage(content=f"Criteria: {json.dumps(criteria, ensure_ascii=False)}")],

            "error": None,

        }

    except Exception as exc:

        if not _groq_breaker.check_and_trigger_from_exception(exc):

            logger.error(f"[Node 1] Failed: {exc}")

        fallback = _build_fallback_criteria(state["raw_query"])
        return {
            **state,
            "criteria": fallback,
            "messages": state["messages"] + [AIMessage(content="Fallback criteria used.")],
            "error": None,
        }





async def search_node(state: SourcingState) -> SourcingState:
    limit = state.get("max_results", 10)
    offset = state.get("offset", 0)
    logger.info(f"[Node 2] Searching profiles (limit: {limit}, offset: {offset})...")

    try:
        profiles = await search_profiles(state["criteria"], limit=limit, offset=offset)
        return {
            **state,
            "raw_profiles": profiles,
            "messages": state["messages"] + [AIMessage(content=f"Found {len(profiles)} profiles.")],
        }

    except Exception as exc:
        logger.error(f"[Node 2] Failed: {exc}", exc_info=True)
        return {

            **state,

            "raw_profiles": [],

            "error": f"Search error: {exc}",

        }





async def enrich_node(state: SourcingState) -> SourcingState:

    """

    Node 2.5 — Enrich profiles with real LinkedIn data from Apollo.io.

    When Apollo.io is unavailable (quota exhausted / disabled), automatically

    falls back to Groq LLM enrichment so experiences, educations, and summaries

    are always populated.

    """

    if not settings.has_enrichment and not settings.groq_api_key:

        logger.info("[Node 2.5] No enrichment configured — passing profiles through unchanged.")

        return state



    profiles = state.get("raw_profiles", [])

    if not profiles:

        return state



    max_res = state.get("max_results", 10)

    target_profiles = profiles[:max_res]

    logger.info(f"[Node 2.5] Enriching {len(target_profiles)} profiles...")

    sem = asyncio.Semaphore(2)





    async def _bounded_enrich(profile: dict) -> dict:

        async with sem:

            url = profile.get("linkedin_url", "")



            # --- Try Apollo.io enrichment ---

            enrich_result = None

            if settings.has_enrichment:

                snip_parts = [

                    profile.get("summary", ""),

                    profile.get("headline", ""),

                    profile.get("full_name", ""),

                    " ".join(str(e) for e in profile.get("extensions", [])),

                ]

                snip_hint = " ".join(p for p in snip_parts if p)

                enrich_result = await enrich_candidate(url, snippet_hint=snip_hint)



            if enrich_result is not None:

                if enrich_result.full_name and enrich_result.full_name.strip() not in ("None None", "None", "", "null", "null null"):

                    profile["full_name"] = enrich_result.full_name.strip()

                if enrich_result.headline and enrich_result.headline.strip() not in ("None", ""):

                    profile["headline"] = enrich_result.headline.strip()

                if enrich_result.skills:

                    profile["skills"] = list(dict.fromkeys(enrich_result.skills + profile.get("skills", [])))

                if enrich_result.experience:

                    valid_exps = [e.model_dump() for e in enrich_result.experience if "*" not in e.company and "*" not in e.title]

                    if valid_exps:

                        profile["experiences"] = valid_exps

                        profile["current_role"] = valid_exps[0].get("title") or valid_exps[0].get("role") or profile.get("current_role")

                        profile["current_company"] = valid_exps[0].get("company") or profile.get("current_company")

                        # Recalculate experience_years from enriched experiences
                        total_years = 0
                        for exp in valid_exps:
                            start = exp.get("start")
                            end = exp.get("end")
                            if start:
                                from datetime import datetime
                                try:
                                    start_date = datetime.fromisoformat(start) if isinstance(start, str) else start
                                    end_date = datetime.now() if not end or exp.get("period", "").lower() == "present" else (datetime.fromisoformat(end) if isinstance(end, str) else end)
                                    years = (end_date - start_date).days / 365.25
                                    total_years += max(0, years)
                                except Exception:
                                    pass
                        if total_years > 0:
                            profile["experience_years"] = int(round(total_years))

                if enrich_result.summary:

                    profile["summary"] = enrich_result.summary

                if enrich_result.email:

                    profile["email"] = enrich_result.email

                    profile["email_is_verified"] = enrich_result.email_is_verified

                # Add additional Apollo fields
                if enrich_result.email_status:
                    profile["email_status"] = enrich_result.email_status

                if enrich_result.extrapolated_email_confidence is not None:
                    profile["extrapolated_email_confidence"] = enrich_result.extrapolated_email_confidence

                if enrich_result.match_confidence:
                    profile["match_confidence"] = enrich_result.match_confidence

                if enrich_result.photo_url:
                    profile["photo_url"] = enrich_result.photo_url

                if enrich_result.linkedin_url:
                    profile["linkedin_url"] = enrich_result.linkedin_url

                if enrich_result.github_url:
                    profile["github_url"] = enrich_result.github_url

                if enrich_result.organization_name:
                    profile["organization_name"] = enrich_result.organization_name

                if enrich_result.organization_domain:
                    profile["organization_domain"] = enrich_result.organization_domain

                if enrich_result.organization_departments:
                    profile["organization_departments"] = enrich_result.organization_departments

                if enrich_result.organization_functions:
                    profile["organization_functions"] = enrich_result.organization_functions

                if enrich_result.organization_seniority:
                    profile["organization_seniority"] = enrich_result.organization_seniority



                profile["enrichment_source"] = "apollo"

                

                # Run LLM skill extraction as a separate, evidence-based layer

                if settings.groq_api_key:

                    try:

                        from src.mcp_server.tools.search_profiles import _extract_skills_via_llm

                        llm_skills = await _extract_skills_via_llm(profile, state.get("criteria"))

                        if llm_skills:

                            profile["llm_extracted_skills"] = llm_skills

                    except Exception as exc:

                        logger.warning(f"[Node 2.5] LLM skill extraction failed: {exc}")

                

                return profile







            # --- Groq LLM fallback: run when external services unavailable ---

            if settings.groq_api_key:

                try:

                    enriched = await _ai_enrich_profile(profile)

                    enriched["enrichment_source"] = "groq_fallback"

                    

                    # Run LLM skill extraction for Groq fallback as well

                    try:

                        from src.mcp_server.tools.search_profiles import _extract_skills_via_llm

                        llm_skills = await _extract_skills_via_llm(enriched, state.get("criteria"))

                        if llm_skills:

                            enriched["llm_extracted_skills"] = llm_skills

                    except Exception as exc:

                        logger.warning(f"[Node 2.5] LLM skill extraction failed in Groq fallback: {exc}")

                    

                    return enriched

                except Exception as exc:

                    logger.warning(f"[Node 2.5] Groq fallback failed for profile: {exc}")



            profile["enrichment_source"] = "snippet_only"

            return profile



    results = await asyncio.gather(

        *[_bounded_enrich(p) for p in target_profiles], return_exceptions=True

    )



    merged: list[dict] = []

    for idx, res in enumerate(results):

        if isinstance(res, Exception):

            logger.warning(f"[Node 2.5] Exception enriching profile {idx}: {res}")

            target_profiles[idx]["enrichment_source"] = "snippet_only"

            merged.append(target_profiles[idx])

        else:

            merged.append(res)  # type: ignore[arg-type]



    counts = {}

    for p in merged:

        src = p.get("enrichment_source", "unknown")

        counts[src] = counts.get(src, 0) + 1



    logger.info(f"[Node 2.5] Enrichment complete — {counts}")



    return {

        **state,

        "raw_profiles": merged,

        "messages": state["messages"] + [

            AIMessage(content=f"Enriched {len(merged)} profiles: {counts}.")

        ],

    }





async def dedup_node(state: SourcingState) -> SourcingState:

    """

    Node 2.7 — Cross-search candidate deduplication.

    Identifies candidates seen in prior searches and badges them with

    is_duplicate=True and times_seen count without dropping them.

    """

    profiles = state.get("raw_profiles", [])

    if not profiles:

        return state



    tagged = await filter_and_record_duplicates(profiles)

    dup_count = sum(1 for p in tagged if p.get("is_duplicate"))

    msg = f"Deduplication: {dup_count} of {len(tagged)} candidate(s) previously sourced."

    logger.info(f"[Node 2.7] {msg}")



    return {

        **state,

        "raw_profiles": tagged,

        "messages": state["messages"] + [AIMessage(content=msg)],

    }





async def score_node(state: SourcingState) -> SourcingState:

    profiles = state.get("raw_profiles", [])

    if not profiles:

        return {**state, "scored_profiles": []}



    logger.info(f"[Node 3] Scoring {len(profiles)} profiles...")

    try:

        scored = await score_profiles_batch(profiles, state["criteria"])

        return {

            **state,

            "scored_profiles": scored,

            "messages": state["messages"] + [AIMessage(content=f"Scored {len(scored)} profiles.")],

        }

    except Exception as exc:

        # Don't fail the entire pipeline for scoring errors - return unscored profiles

        logger.warning(f"[Node 3] Scoring failed, returning unscored profiles: {exc}")

        return {

            **state,

            "scored_profiles": profiles,

            "messages": state["messages"] + [AIMessage(content="Scoring skipped due to rate limit. Using baseline scores.")],

        }





def _get_exp_field(exp: dict, *keys: str) -> str:

    """Get first non-empty value from a dict checking multiple possible key names."""

    for k in keys:

        v = (exp.get(k) or "").strip()

        if v and v not in ("Unknown Company", "See LinkedIn Profile"):

            return v

    return ""





def _format_clean_summary(p: dict) -> str:

    """Return the candidate's actual summary or a clean concise factual description from their real profile data."""

    existing_summary = (p.get("summary") or "").strip()

    if existing_summary and len(existing_summary) > 20:

        return existing_summary



    full_name = (p.get("full_name") or "").strip()

    headline = (p.get("headline") or p.get("current_role") or "").strip()

    comp = (p.get("current_company") or "").strip()

    skills = p.get("skills", [])

    experiences = p.get("experiences", [])



    if not comp and experiences:

        comp = _get_exp_field(experiences[0], "company", "company_name", "organization")

    if not headline and experiences:

        headline = _get_exp_field(experiences[0], "role", "title", "position")



    clean_role = re.sub(r"\s*[|•\-/].*$", "", headline).strip() or headline



    lines: list[str] = []



    # Line 1: Identity & Current Role

    if full_name and clean_role and comp:

        lines.append(f"{full_name} is working as {clean_role} at {comp}.")

    elif full_name and clean_role:

        lines.append(f"{full_name} is a {clean_role}.")

    elif full_name and comp:

        lines.append(f"{full_name} is currently at {comp}.")

    elif clean_role and comp:

        lines.append(f"Professional working as {clean_role} at {comp}.")

    elif clean_role:

        lines.append(f"Specialized as {clean_role}.")

    elif existing_summary:

        lines.append(existing_summary)



    # Line 2: Skills & Competencies

    s_list = skills if isinstance(skills, list) else (skills.get("skills", []) if isinstance(skills, dict) else [])

    if s_list:

        skills_str = ", ".join(str(s) for s in s_list[:5])

        lines.append(f"Key skills include {skills_str}.")



    # Line 3: Past Experiences

    if experiences and len(experiences) > 1:

        past = []

        for e in experiences[1:3]:

            role = _get_exp_field(e, "role", "title", "position")

            c = _get_exp_field(e, "company", "company_name")

            if role and c:

                past.append(f"{role} at {c}")

        if past:

            lines.append(f"Career history includes {', and '.join(past)}.")

    elif experiences and not comp:

        first_role = _get_exp_field(experiences[0], "role", "title", "position")

        first_comp = _get_exp_field(experiences[0], "company", "company_name")

        if first_role and first_comp:

            lines.append(f"Position held: {first_role} at {first_comp}.")



    return " ".join(lines) if lines else existing_summary





async def format_output(state: SourcingState) -> SourcingState:

    max_res = state.get("max_results", 10)

    scored = state.get("scored_profiles", [])[:max_res]



    strong_matches = [p for p in scored if p.get("match_score", 0) >= 80]

    avg_score = round(sum(p.get("match_score", 0) for p in scored) / len(scored)) if scored else 0



    formatted_profiles = []

    for p in scored:

        clean_summary = _format_clean_summary(p)

        formatted_p = {

            **p,

            "summary": clean_summary,

            "source_platform": p.get("source", "linkedin"),

            "source_url": p.get("linkedin_url", ""),

            "full_name": p.get("full_name"),

            "headline": p.get("headline"),

            "location": p.get("location"),

            "current_company": p.get("current_company"),

            "current_role": p.get("current_role"),

            "experiences": p.get("experiences", []),

            "skills": p.get("skills", []) if isinstance(p.get("skills"), list) else (p.get("skills", {}).get("skills", []) if isinstance(p.get("skills"), dict) else []),

            "experience_years": p.get("experience_years"),

            "languages": p.get("languages", []),

            "is_duplicate": p.get("is_duplicate", False),

            "times_seen": p.get("times_seen", 1),

            "fingerprint": p.get("fingerprint"),

            "raw_data": p,

            "score": p.get("match_score", 0),

            "score_breakdown": {

                "skill": p.get("skill_match_score", 0),

                "experience": p.get("experience_score", 0),

                "location": p.get("location_score", 0),

                "embedding": p.get("embedding_score", 0),

            },

            "match_rationale": p.get("match_rationale", []),

            "key_strengths": p.get("key_strengths", []),

            "gaps": p.get("gaps", []),

            "recommendation": p.get("recommendation", ""),

        }

        formatted_profiles.append(formatted_p)



    # Persist every sourced candidate into the semantic talent pool so future

    # searches can re-rank against them without re-running SerpAPI/Groq.

    # Fire-and-forget: pool storage failures must never break the response

    # the recruiter is waiting on.

    try:

        await store_candidate_pool_batch(formatted_profiles)

    except Exception as exc:

        logger.warning(f"[format_output] Talent pool storage failed (non-fatal): {exc}")



    final_output = {

        "job_id": state.get("job_id"),

        "search_request_id": state.get("job_id"),

        "query": state.get("raw_query"),

        "criteria": state.get("criteria", {}),

        "extracted_criteria": state.get("criteria", {}),

        "summary": {

            "total_profiles": len(scored),

            "strong_matches": len(strong_matches),

            "average_score": avg_score,

            "top_candidate": scored[0].get("full_name") if scored else None,

            "top_score": scored[0].get("match_score") if scored else None,

        },

        # Both keys exposed for backward compatibility with different callers

        "profiles": formatted_profiles,

        "candidates": formatted_profiles,

    }



    return {

        **state,

        "final_output": final_output,

    }





def build_sourcing_graph() -> CompiledStateGraph:  # type: ignore[type-arg]

    graph: StateGraph = StateGraph(SourcingState)  # type: ignore[type-arg]

    graph.add_node("interpret_request", interpret_request)

    graph.add_node("search_profiles", search_node)

    graph.add_node("enrich_node", enrich_node)

    graph.add_node("dedup_node", dedup_node)

    graph.add_node("score_profiles", score_node)

    graph.add_node("format_output", format_output)



    graph.set_entry_point("interpret_request")

    graph.add_edge("interpret_request", "search_profiles")

    graph.add_edge("search_profiles", "enrich_node")

    graph.add_edge("enrich_node", "dedup_node")

    graph.add_edge("dedup_node", "score_profiles")

    graph.add_edge("score_profiles", "format_output")

    graph.add_edge("format_output", END)



    return graph.compile()





sourcing_graph = build_sourcing_graph()





async def run_sourcing_agent(
    raw_query: str,
    job_id: str | None = None,
    max_results: int = 10,
    offset: int = 0,
) -> dict:
    start_time = time.time()
    status = "success"

    try:
        initial_state: SourcingState = {
            "raw_query": raw_query,
            "job_id": job_id,
            "max_results": max_results,
            "offset": offset,
            "criteria": {},
            "raw_profiles": [],
            "scored_profiles": [],
            "final_output": {},
            "messages": [],
            "error": None,
        }

        result = await sourcing_graph.ainvoke(initial_state)
        final_output = result.get("final_output", {})
        if result.get("error") and not final_output.get("profiles"):
            logger.error(f"[Agent] Sourcing agent execution failed: {result['error']}")
            status = "error"
            raise RuntimeError(result["error"])

        return final_output

    except Exception:

        status = "error"

        raise

    finally:

        duration = time.time() - start_time

        search_duration.labels(status=status).observe(duration)





def _extract_min_experience_from_query(query: str) -> int | None:

    """Extract explicit numeric years of experience from query text (e.g. '+8 years', '8+ ans', 'min 5 years')."""

    patterns = [

        r"[+>≥]\s*(\d+)\s*(?:years?|ans?|yr|y\.?o\.?|d'expérience)",

        r"(\d+)\s*\+\s*(?:years?|ans?|yr|y\.?o\.?)\b",

        r"(\d+)\s*(?:years?|ans?|yr)\s*(?:of\s+experience|d'expérience)\b",

        r"(?:min|minimum|au moins|plus de)\s*(\d+)\s*(?:years?|ans?|yr)",

        r"\(\s*\+?\s*(\d+)\s*(?:years?|ans?|yr)\s*\)",

    ]

    for p in patterns:

        m = re.search(p, query, re.IGNORECASE)

        if m:

            try:

                val = int(m.group(1))

                if 1 <= val <= 30:

                    return val

            except ValueError:

                pass

    return None





def _build_fallback_criteria(query: str) -> dict:

    query_clean = query.strip()

    query_lower = query_clean.lower()



    # Extract location

    loc = "Any"

    loc_match = re.search(r"(?:in|à|basé\(e\)\s+à|at)\s+([A-Za-z\s]+)", query_clean, re.IGNORECASE)

    if loc_match:

        extracted_loc = loc_match.group(1).split("with")[0].split("avec")[0].split("(")[0].strip()

        if extracted_loc and len(extracted_loc) > 1:

            loc = extracted_loc



    # Extract seniority & min experience

    explicit_exp = _extract_min_experience_from_query(query_clean)

    if explicit_exp is not None:

        min_exp = explicit_exp

        sen = "Lead / Manager" if min_exp >= 8 else "Senior" if min_exp >= 5 else "Mid" if min_exp >= 3 else "Junior"

    else:

        if any(k in query_lower for k in ["manager", "director", "head", "lead", "principal", "architect"]):

            sen = "Manager" if "manager" in query_lower else "Lead"

            min_exp = 8

        elif "senior" in query_lower:

            sen = "Senior"

            min_exp = 5

        elif any(k in query_lower for k in ["mid", "medior"]):

            sen = "Mid"

            min_exp = 3

        elif any(k in query_lower for k in ["junior", "entry"]):

            sen = "Junior"

            min_exp = 1

        else:

            sen = "Any"

            min_exp = 0



    # Extract title dynamically from query

    clean_chunk = re.sub(r"^(?:candidates?|profils?|recherche|seeking|looking for|hiring|we are looking for)\s+(?:for|de|d'|a|an)?\s*", "", query_clean, flags=re.IGNORECASE).strip()

    clean_chunk = re.split(r"[\.\(\,\;]|\s+based\s+|\s+basé|\s+in\s+|\s+with\s+|\s+avec\s+", clean_chunk, flags=re.IGNORECASE)[0].strip()

    words = [w for w in clean_chunk.split() if w.lower() not in ("a", "an", "the", "for", "in", "at", "to", "senior", "junior", "lead", "mid", "manager")]

    title = " ".join(words[:3]) if words else "Professional"

    if not title or len(title) > 50:

        title = "Professional"



    # Extract skill tokens dynamically from "with / avec / skills:" clauses if present

    skills: list[str] = []

    if "with " in query_lower or "avec " in query_lower or "skills:" in query_lower:

        skill_part = re.split(r"\b(?:with|avec|skills:)\b", query_clean, flags=re.IGNORECASE)[-1]

        raw_tokens = [s.strip() for s in re.split(r"[,;/&|]|\band\b|\bet\b", skill_part) if len(s.strip()) > 1]

        skills = [t for t in raw_tokens if not any(w in t.lower() for w in ["years", "ans", "experience", "remote", "hybrid", "cdi"])]



    return {

        "job_title": title,

        "required_skills": skills if skills else [title],

        "seniority": sen,

        "min_experience_years": min_exp,

        "location": loc,

        "contract_type": "CDI",

    }

