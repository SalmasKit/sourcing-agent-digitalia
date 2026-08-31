import asyncio
import json
import logging
import re
from typing import Any, cast

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph

from src.agent.state import SourcingState
from src.agent.prompts import CRITERIA_EXTRACTION_SYSTEM, CRITERIA_EXTRACTION_USER
from src.config import get_settings
from src.enrichment.enrich_profile import enrich_candidate
from src.mcp_server.tools.search_profiles import search_profiles, _ai_enrich_profile
from src.mcp_server.tools.score_profile import score_profiles_batch

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_llm(max_tokens: int = 1024) -> ChatGroq | None:
    if not settings.groq_api_key:
        return None
    model_name = settings.groq_model or "openai/gpt-oss-20b"
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=model_name,
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
    llm = _get_llm(max_tokens=1024)

    if not llm:
        fallback = _build_fallback_criteria(state["raw_query"])
        return {
            **state,
            "criteria": fallback,
            "messages": state["messages"] + [AIMessage(content="Fallback criteria extracted (Groq API key absent).")],
            "error": "GROQ_API_KEY absent",
        }

    try:
        messages = [
            SystemMessage(content=CRITERIA_EXTRACTION_SYSTEM),
            HumanMessage(content=CRITERIA_EXTRACTION_USER.format(query=state["raw_query"])),
        ]
        response = await llm.ainvoke(messages)
        raw_content = re.sub(r'<think>.*?</think>', '', cast(str, response.content), flags=re.DOTALL).strip()
        criteria = _parse_json_from_llm(raw_content)

        if not criteria or not isinstance(criteria, dict):
            raise ValueError("Invalid criteria format from LLM")

        criteria.setdefault("job_title", state["raw_query"].split(" in ")[0].strip() or "Professional")
        criteria.setdefault("required_skills", [])
        criteria.setdefault("seniority", "Any")
        criteria.setdefault("location", "Any")

        return {
            **state,
            "criteria": criteria,
            "messages": state["messages"] + [AIMessage(content=f"Criteria: {json.dumps(criteria, ensure_ascii=False)}")],
            "error": None,
        }
    except Exception as exc:
        logger.error(f"[Node 1] Failed: {exc}")
        fallback = _build_fallback_criteria(state["raw_query"])
        return {
            **state,
            "criteria": fallback,
            "messages": state["messages"] + [AIMessage(content="Fallback criteria used.")],
            "error": str(exc)[:100],
        }


async def search_node(state: SourcingState) -> SourcingState:
    logger.info("[Node 2] Searching profiles (limit: 2)...")
    try:
        profiles = await search_profiles(state["criteria"], limit=2)
        return {
            **state,
            "raw_profiles": profiles,
            "messages": state["messages"] + [AIMessage(content=f"Found {len(profiles)} profiles.")],
        }
    except Exception as exc:
        logger.error(f"[Node 2] Failed: {exc}")
        return {
            **state,
            "raw_profiles": [],
            "error": f"Search error: {exc}",
        }


async def enrich_node(state: SourcingState) -> SourcingState:
    """
    Node 2.5 — Enrich profiles with real LinkedIn data from ScrapingDog.
    When ScrapingDog is unavailable (quota exhausted / disabled), automatically
    falls back to Groq LLM enrichment so experiences, educations, and summaries
    are always populated.
    """
    if not settings.has_enrichment and not settings.groq_api_key:
        logger.info("[Node 2.5] No enrichment configured — passing profiles through unchanged.")
        return state

    profiles = state.get("raw_profiles", [])
    if not profiles:
        return state

    target_profiles = profiles[:2]
    logger.info(f"[Node 2.5] Enriching {len(target_profiles)} profiles...")
    sem = asyncio.Semaphore(2)


    async def _bounded_enrich(profile: dict) -> dict:
        async with sem:
            url = profile.get("linkedin_url", "")

            # --- Try Apollo.io (primary) or ScrapingDog (fallback) ---
            enrich_result = None
            if settings.has_enrichment:
                snip_hint = f"{profile.get('summary', '')} {profile.get('headline', '')} {profile.get('full_name', '')}"
                enrich_result = await enrich_candidate(url, snippet_hint=snip_hint)

            if enrich_result is not None:
                if enrich_result.full_name and enrich_result.full_name not in ("Candidate", "None None", ""):
                    profile["full_name"] = enrich_result.full_name
                if enrich_result.headline and enrich_result.headline not in ("Software Engineering Professional", "None", ""):
                    profile["headline"] = enrich_result.headline
                if enrich_result.skills:
                    profile["skills"] = list(dict.fromkeys(enrich_result.skills + profile.get("skills", [])))
                if enrich_result.education:
                    profile["educations"] = [e.model_dump() for e in enrich_result.education]
                    profile["education"] = f"{enrich_result.education[0].degree or 'Degree'} - {enrich_result.education[0].institution}".strip(" -")
                else:
                    # If Apollo cannot extract education, keep it completely empty
                    profile["educations"] = []
                    profile["education"] = None
                if enrich_result.experience:
                    valid_exps = [e.model_dump() for e in enrich_result.experience if "*" not in e.company and "*" not in e.title]
                    if valid_exps:
                        profile["experiences"] = valid_exps
                        profile["current_role"] = valid_exps[0].get("title") or valid_exps[0].get("role") or profile.get("current_role")
                        profile["current_company"] = valid_exps[0].get("company") or profile.get("current_company")
                if enrich_result.summary:
                    profile["summary"] = enrich_result.summary

                profile["enrichment_source"] = "apollo"
                return profile



            # --- Groq LLM fallback: run when external services unavailable ---
            if settings.groq_api_key:
                try:
                    enriched = await _ai_enrich_profile(profile)
                    enriched["enrichment_source"] = "groq_fallback"
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
        logger.error(f"[Node 3] Failed: {exc}")
        return {**state, "scored_profiles": profiles}


def _get_exp_field(exp: dict, *keys: str) -> str:
    """Get first non-empty value from a dict checking multiple possible key names."""
    for k in keys:
        v = (exp.get(k) or "").strip()
        if v and v not in ("Unknown Company", "See LinkedIn Profile"):
            return v
    return ""


def _format_clean_summary(p: dict) -> str:
    """Format description/summary into maximum 4 complete, well-formed professional sentences."""
    full_name = p.get("full_name") or "Candidate"
    headline = p.get("headline") or "Software Engineering Professional"
    comp = p.get("current_company") or ""
    skills = p.get("skills", [])
    educations = p.get("educations", [])
    experiences = p.get("experiences", [])

    if not comp and experiences:
        comp = _get_exp_field(experiences[0], "company", "company_name", "organization")

    # Clean headline for summary text
    clean_role = re.sub(r"\s*[|•\-/].*$", "", headline).strip() or headline

    lines: list[str] = []

    # Line 1: Identity & Current Role
    if comp and comp not in ("Unknown Company", "See LinkedIn Profile", "Company"):
        lines.append(f"{full_name} is an experienced {clean_role} currently contributing at {comp}.")
    else:
        lines.append(f"{full_name} is an established {clean_role} with strong domain expertise.")

    # Line 2: Skills & Competencies
    s_list = skills if isinstance(skills, list) else (skills.get("skills", []) if isinstance(skills, dict) else [])
    if s_list:
        skills_str = ", ".join(str(s) for s in s_list[:5])
        lines.append(f"Demonstrates core technical proficiencies in {skills_str}.")
    else:
        lines.append("Possesses advanced technical competencies across modern software architecture and development frameworks.")

    # Line 3: Proven Career Track Record
    if experiences and len(experiences) > 1:
        past = []
        for e in experiences[1:3]:
            role = _get_exp_field(e, "role", "title", "position")
            c = _get_exp_field(e, "company", "company_name")
            if role and c:
                past.append(f"{role} at {c}")
        if past:
            lines.append(f"Career history highlights demonstrated leadership as {', and '.join(past)}.")
        else:
            lines.append("Brings a proven track record of architecting and delivering scalable enterprise solutions.")
    elif experiences:
        first_role = _get_exp_field(experiences[0], "role", "title", "position") or clean_role
        first_comp = _get_exp_field(experiences[0], "company", "company_name") or comp
        lines.append(f"Delivers key operational milestones as {first_role} at {first_comp}.")
    else:
        lines.append("Brings a proven track record of architecting and delivering scalable enterprise solutions.")

    # Line 4: Educational Credentials / Business Impact
    if educations and len(educations) > 0:
        edu = educations[0]
        deg = (edu.get("degree") or "Engineering / Higher Education").strip()
        inst = (edu.get("institution") or "Higher Education Institution").strip()
        lines.append(f"Academic qualifications include {deg} from {inst}.")
    else:
        lines.append("Demonstrates strong analytical problem-solving capabilities with a focus on driving measurable business impact.")

    return " ".join(lines[:4])


async def format_output(state: SourcingState) -> SourcingState:
    scored = state.get("scored_profiles", [])[:2]

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
            "educations": p.get("educations", []),
            "experiences": p.get("experiences", []),
            "skills": p.get("skills", []) if isinstance(p.get("skills"), list) else (p.get("skills", {}).get("skills", []) if isinstance(p.get("skills"), dict) else []),
            "experience_years": p.get("experience_years"),
            "languages": p.get("languages", []),
            "raw_data": p,
            "score": p.get("match_score", 0),
            "score_breakdown": {
                "skill": p.get("skill_match_score", 0),
                "experience": p.get("experience_score", 0),
                "location": p.get("location_score", 0),
                "embedding": p.get("embedding_score", 0),
            },
        }
        formatted_profiles.append(formatted_p)

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
        "profiles": formatted_profiles,
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
    graph.add_node("score_profiles", score_node)
    graph.add_node("format_output", format_output)

    graph.set_entry_point("interpret_request")
    graph.add_edge("interpret_request", "search_profiles")
    graph.add_edge("search_profiles", "enrich_node")
    graph.add_edge("enrich_node", "score_profiles")
    graph.add_edge("score_profiles", "format_output")
    graph.add_edge("format_output", END)

    return graph.compile()


sourcing_graph = build_sourcing_graph()


async def run_sourcing_agent(raw_query: str, job_id: str | None = None) -> dict:
    initial_state: SourcingState = {
        "raw_query": raw_query,
        "job_id": job_id,
        "criteria": {},
        "raw_profiles": [],
        "scored_profiles": [],
        "final_output": {},
        "messages": [],
        "error": None,
    }
    result = await sourcing_graph.ainvoke(initial_state)
    if result.get("error"):
        logger.error(f"[Agent] Sourcing agent execution failed: {result['error']}")
        raise RuntimeError(result["error"])
    return result.get("final_output", {})


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

    # Extract seniority
    sen = "Senior" if "senior" in query_lower else "Lead" if "lead" in query_lower else "Junior" if "junior" in query_lower else "Any"
    min_exp = 5 if sen == "Senior" else 8 if sen == "Lead" else 1 if sen == "Junior" else 0

    # Extract title dynamically from query
    title = ""
    # 1. Look for known role patterns in query
    role_catalog = [
        "Fullstack Developer", "Full Stack Developer", "Backend Developer", "Frontend Developer",
        "Java Developer", "Python Developer", "React Developer", "Node Developer", "Angular Developer",
        "DevOps Engineer", "Cloud Engineer", "Data Engineer", "Data Scientist", "Machine Learning Engineer",
        "Software Engineer", "Solutions Architect", "Product Manager", "Project Manager", "Scrum Master",
        "QA Engineer", "Test Automation Engineer", "Mobile Developer", "iOS Developer", "Android Developer",
        "Digital Marketing Manager", "SEO Specialist", "Growth Marketer", "HR Manager", "Talent Acquisition",
    ]
    for r in role_catalog:
        if re.search(r"\b" + re.escape(r) + r"\b", query_clean, re.IGNORECASE):
            title = r
            break

    if not title:
        # Fallback: extract concise title before punctuation, parenthesis, or 'based in'
        clean_chunk = re.sub(r"^(?:candidates?|profils?|recherche|seeking|looking for|hiring|we are looking for)\s+(?:for|de|d'|a|an)?\s*", "", query_clean, flags=re.IGNORECASE).strip()
        clean_chunk = re.split(r"[\.\(\,\;]|\s+based\s+|\s+basé|\s+in\s+|\s+with\s+|\s+avec\s+", clean_chunk, flags=re.IGNORECASE)[0].strip()
        words = [w for w in clean_chunk.split() if w.lower() not in ("a", "an", "the", "for", "in", "at", "to", "senior", "junior", "lead", "mid")]
        title = " ".join(words[:3]) if words else "Software Professional"

    if not title or len(title) > 40:
        title = "Software Engineer"


    # Detect skills from catalog across domains (tech, marketing, management, etc.)
    skills_catalog = [
        "seo", "sem", "digital marketing", "growth marketing", "social media", "content strategy",
        "google ads", "analytics", "crm", "campaign management", "copywriting", "brand management",
        "java", "spring boot", "python", "react", "typescript", "docker", "kubernetes", "aws",
        "node", "sql", "devops", "cloud", "c++", "c#", ".net", "product management", "ui/ux",
        "recruiting", "talent acquisition", "hr", "sales", "business development"
    ]
    detected_skills = [s.title() for s in skills_catalog if re.search(r'\b' + re.escape(s) + r'\b', query_lower)]

    return {
        "job_title": title,
        "required_skills": detected_skills if detected_skills else [title],
        "seniority": sen,
        "min_experience_years": min_exp,
        "location": loc,
        "contract_type": "CDI",
    }
