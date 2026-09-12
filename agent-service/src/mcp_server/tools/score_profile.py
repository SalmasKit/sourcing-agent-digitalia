"""
score_profile.py — MCP Tool for scoring candidate profiles.
"""
import json
import logging
import re
import time
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from src.agent.groq_circuit_breaker import get_groq_circuit_breaker
from src.agent.prompts import SCORING_SYSTEM, SCORING_USER
from src.config import get_settings
from src.embeddings.client import compute_similarity
from src.metrics import score_duration

logger = logging.getLogger(__name__)
settings = get_settings()

# Global circuit breaker instance
_groq_breaker = get_groq_circuit_breaker()


def _get_llm() -> ChatGroq | None:
    if not settings.groq_api_key or not settings.groq_model:
        return None
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        temperature=settings.groq_temperature,
        max_tokens=1024,
    )


def _build_job_context(criteria: dict) -> str:
    parts = []
    if title := criteria.get("job_title"):
        parts.append(f"Title: {title}")
    if seniority := criteria.get("seniority"):
        parts.append(f"Seniority: {seniority}")
    if skills := criteria.get("required_skills"):
        parts.append(f"Required skills (must-have): {', '.join(skills)}")
    if nice := criteria.get("nice_to_have_skills"):
        parts.append(f"Nice-to-have skills (bonus, not disqualifying): {', '.join(nice)}")
    if location := criteria.get("location"):
        parts.append(f"Location: {location}")
    if min_exp := criteria.get("min_experience_years"):
        parts.append(f"Min experience: {min_exp} years")
    return "\n".join(parts)


def _build_profile_context(profile: dict) -> str:
    parts = []
    if name := profile.get("full_name"):
        parts.append(f"Name: {name}")
    if headline := profile.get("headline"):
        parts.append(f"Title: {headline}")
    if exp := profile.get("experience_years"):
        parts.append(f"Experience: {exp} years")
    if location := profile.get("location"):
        parts.append(f"Location: {location}")
    if skills := profile.get("skills"):
        parts.append(f"Skills: {', '.join(skills)}")
    if summary := profile.get("summary"):
        parts.append(f"Summary: {summary}")
    return "\n".join(parts)


def _build_candidate_corpus(profile: dict[str, Any]) -> tuple[str, list[str]]:
    """Build searchable lowercase text corpus and clean skills list from candidate."""
    corpus_parts: list[str] = []
    clean_skills: list[str] = []

    for s in profile.get("skills", []) or []:
        if isinstance(s, str) and s.strip():
            clean_skills.append(s.strip().lower())
            corpus_parts.append(s.strip().lower())

    if h := profile.get("headline"):
        corpus_parts.append(str(h).lower())
    if s := profile.get("summary"):
        corpus_parts.append(str(s).lower())
    if r := profile.get("current_role"):
        corpus_parts.append(str(r).lower())

    for exp in profile.get("experiences", []) or []:
        if isinstance(exp, dict):
            if t := exp.get("title") or exp.get("role"):
                corpus_parts.append(str(t).lower())
            if d := exp.get("description"):
                corpus_parts.append(str(d).lower())

    for ext in profile.get("extensions", []) or []:
        if isinstance(ext, str):
            corpus_parts.append(ext.lower())

    return " ".join(corpus_parts), clean_skills


def _baseline_skill_check(required_skill: str, full_corpus: str, profile_skills: list[str]) -> bool:
    """Fast baseline string & token containment check for offline fallback."""
    req_clean = required_skill.strip().lower()
    if not req_clean:
        return False

    if any(req_clean in ps or ps in req_clean for ps in profile_skills):
        return True

    # Check for sub-terms in parentheses (e.g. 'Pay-Per-Click (PPC)' -> 'ppc', 'pay-per-click')
    terms = [req_clean]
    if "(" in req_clean and ")" in req_clean:
        if m := re.search(r"\((.*?)\)", req_clean):
            terms.append(m.group(1).strip())
        terms.append(re.sub(r"\(.*?\)", "", req_clean).strip())

    for t in terms:
        if not t:
            continue
        if len(t) <= 3:
            # For short terms with symbols (C++, C#, .NET), \b word boundary fails
            # because symbols are non-word chars. Use simple containment instead.
            if any(not c.isalnum() for c in t):
                if t in full_corpus:
                    return True
            elif re.search(r"\b" + re.escape(t) + r"\b", full_corpus):
                return True
        elif t in full_corpus:
            return True

    return False


def _compute_skill_score(
    required_skills: list[str],
    matched_skills: list[str],
    nice_to_have_skills: list[str],
    full_corpus: str,
    profile_skills: list[str],
) -> tuple[int, list[str]]:
    """
    Weighted skill score: the first 3 required skills carry more weight
    (assumed to be the most critical, since recruiters usually list them
    in priority order), the rest count equally. Nice-to-have skills add
    a capped bonus rather than diluting the required-skills denominator.
    """
    if not required_skills:
        # When no required skills, base score is 70 with nice-to-have bonus
        nice_matched = [
            s for s in nice_to_have_skills
            if _baseline_skill_check(s, full_corpus, profile_skills)
        ]
        bonus = 0
        if nice_to_have_skills:
            bonus = (len(nice_matched) / len(nice_to_have_skills)) * 10
        return round(min(100, 70 + bonus)), nice_matched

    weights = [3, 2, 1][:len(required_skills)] + [1] * max(0, len(required_skills) - 3)
    total_weight = sum(weights)
    matched_weight = sum(
        w for skill, w in zip(required_skills, weights, strict=True)
        if skill in matched_skills
    )
    base = (matched_weight / total_weight) * 100

    nice_matched = [
        s for s in nice_to_have_skills
        if _baseline_skill_check(s, full_corpus, profile_skills)
    ]
    bonus = 0
    if nice_to_have_skills:
        bonus = (len(nice_matched) / len(nice_to_have_skills)) * 10

    return round(min(100, base + bonus)), nice_matched


def _clean_log(val: Any) -> str:
    if val is None:
        return ""
    return str(val).replace("\r", " ").replace("\n", " ").strip()


async def score_profile(
    profile: dict,
    criteria: dict,
    use_llm_rationale: bool = True,
) -> dict:
    """Score a single candidate profile against job criteria."""
    safe_name = _clean_log(profile.get("full_name"))
    safe_skills = _clean_log(profile.get("skills"))
    safe_exp = _clean_log(profile.get("experience_years"))
    logger.info(f"[score_profile] Scoring profile: {safe_name}, skills: {safe_skills}, experience_years: {safe_exp}")

    job_text = _build_job_context(criteria)
    profile_text = _build_profile_context(profile)

    # 1. Role / Title Match Score
    req_title = (criteria.get("job_title") or "").strip().lower()
    cand_title = f"{profile.get('headline', '')} {profile.get('current_role', '')}".lower()

    if not req_title:
        title_score = 90
    else:
        stop_words = {"lead", "senior", "junior", "manager", "head", "specialist", "in", "and", "of", "the", "de", "du", "des", "le", "la", "pour", "chef", "responsable", "directeur", "consultant"}
        req_words = [w for w in re.findall(r'\w+', req_title) if w not in stop_words]
        if req_title in cand_title:
            title_score = 100
        elif req_words and all(w in cand_title for w in req_words):
            title_score = 95
        elif req_words and any(w in cand_title for w in req_words):
            matched_count = sum(1 for w in req_words if w in cand_title)
            title_score = 60 + int((matched_count / len(req_words)) * 30)
        else:
            title_score = 30

    # 2. Baseline skill check across profile corpus
    required_skills = criteria.get("required_skills", []) or []
    nice_to_have_skills = criteria.get("nice_to_have_skills", []) or []
    full_corpus, profile_skills = _build_candidate_corpus(profile)

    matched_skills = [
        s for s in required_skills
        if _baseline_skill_check(s, full_corpus, profile_skills)
    ]
    missing_skills = [s for s in required_skills if s not in matched_skills]
    safe_req_skills = _clean_log(required_skills)
    safe_prof_skills = _clean_log(profile_skills)
    safe_matched = _clean_log(matched_skills)
    safe_missing = _clean_log(missing_skills)
    logger.info(f"[score_profile] Required skills: {safe_req_skills}, Profile skills: {safe_prof_skills}, Matched: {safe_matched}, Missing: {safe_missing}")

    skill_score, nice_to_have_matched = _compute_skill_score(
        required_skills, matched_skills, nice_to_have_skills, full_corpus, profile_skills
    )

    # 3. Experience score
    min_exp = criteria.get("min_experience_years") or 0
    if min_exp == 0:
        seniority_str = f"{criteria.get('seniority', '')} {criteria.get('job_title', '')}".lower()
        if any(k in seniority_str for k in ["manager", "director", "head", "lead", "principal", "architect"]):
            min_exp = 8
        elif "senior" in seniority_str:
            min_exp = 5
        elif any(k in seniority_str for k in ["mid", "medior"]):
            min_exp = 3
        elif any(k in seniority_str for k in ["junior", "entry"]):
            min_exp = 1

    candidate_exp = profile.get("experience_years") or 0
    if min_exp == 0:
        exp_score = 80
    elif candidate_exp >= min_exp:
        exp_score = min(100, 70 + (candidate_exp - min_exp) * 5)
    else:
        exp_score = max(0, int(candidate_exp / min_exp * 70))

    # 4. Location score
    req_loc = (criteria.get("location") or "").strip().lower()
    cand_loc = (profile.get("location") or "").strip().lower()

    if not req_loc or req_loc in ("any", "all locations", "morocco", "maroc"):
        location_score = 95
    elif req_loc in cand_loc or cand_loc in req_loc:
        location_score = 100
    elif "remote" in cand_loc or "remote" in req_loc:
        location_score = 90
    else:
        location_score = 70

    # Base weighted score
    base_score = int(
        title_score * 0.35
        + skill_score * 0.30
        + exp_score * 0.20
        + location_score * 0.15
    )

    # 5. Semantic embedding score
    try:
        raw_sim = await compute_similarity(job_text, profile_text)
        embedding_score = round(max(0.0, min(1.0, float(raw_sim))) * 100)
    except Exception as exc:
        logger.warning(f"Embedding similarity computation failed: {exc}")
        embedding_score = 70

    # 6. LLM intelligent semantic evaluation
    llm_data = {}
    # Skip the LLM rationale call entirely while the circuit breaker is open —
    # same short-circuit pattern used in graph.py / outreach.py / search_profiles.py,
    # so a Groq 429 doesn't get hammered again on every profile in a batch.
    llm = _get_llm() if (use_llm_rationale and not _groq_breaker.is_rate_limited()) else None
    if use_llm_rationale and llm is None and settings.groq_api_key and _groq_breaker.is_rate_limited():
        logger.debug(f"[score_profile] Groq rate-limited (circuit breaker) — skipping LLM rationale for {profile.get('full_name')}.")
    if llm:
        try:
            # Package full candidate context (including experiences list) for the LLM
            profile_eval_payload = {
                "full_name": profile.get("full_name"),
                "headline": profile.get("headline"),
                "skills": profile.get("skills", []),
                "experience_years": profile.get("experience_years"),
                "location": profile.get("location"),
                "summary": profile.get("summary", ""),
                "experiences": [
                    {
                        "role": e.get("title") or e.get("role"),
                        "company": e.get("company"),
                        "period": e.get("period"),
                        "description": e.get("description")
                    }
                    for e in (profile.get("experiences") or [])[:4]
                    if isinstance(e, dict)
                ],
            }

            messages = [
                SystemMessage(content=SCORING_SYSTEM),
                HumanMessage(content=SCORING_USER.format(
                    criteria_json=json.dumps(criteria, ensure_ascii=False, indent=2),
                    profile_json=json.dumps(profile_eval_payload, ensure_ascii=False, indent=2),
                )),
            ]
            response = await llm.ainvoke(messages)
            content = response.content
            if isinstance(content, list):
                raw = "".join(
                    block.get("text", "") if isinstance(block, dict) else (block if isinstance(block, str) else str(block))
                    for block in content
                ).strip()
            else:
                raw = content.strip()
            # Strip think tags if reasoning model is used
            raw = re.sub(r'<think>.*?</think>', '', raw, flags=re.DOTALL).strip()
            json_match = re.search(r"\{.*\}", raw, re.DOTALL)
            if json_match:
                llm_data = json.loads(json_match.group())

                # Adopt LLM's dynamic semantic skill verification
                if isinstance(llm_data.get("matched_skills"), list) and llm_data["matched_skills"]:
                    matched_skills = llm_data["matched_skills"]
                if isinstance(llm_data.get("missing_skills"), list):
                    missing_skills = llm_data["missing_skills"]
                if isinstance(llm_data.get("skill_match_score"), int):
                    skill_score = llm_data["skill_match_score"]

                llm_score = llm_data.get("match_score", base_score)
                base_score = int((base_score * 0.4) + (llm_score * 0.6))
        except Exception as exc:
            if not _groq_breaker.check_and_trigger_from_exception(exc):
                safe_cand = _clean_log(profile.get("full_name"))
                safe_exc = _clean_log(exc)
                logger.warning(f"LLM rationale failed for {safe_cand}: {safe_exc}")

    # Recommendation tier
    if base_score >= 80:
        recommendation = "Strong Match"
    elif base_score >= 65:
        recommendation = "Good Match"
    elif base_score >= 45:
        recommendation = "Partial Match"
    else:
        recommendation = "Not Recommended"

    return {
        **profile,
        "match_score": base_score,
        "skill_match_score": skill_score,
        "experience_score": exp_score,
        "location_score": location_score,
        "embedding_score": embedding_score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "min_experience_years": criteria.get("min_experience_years", 0),
        "match_rationale": llm_data.get("match_rationale", [
            f"Skills: {len(matched_skills)}/{len(required_skills)} required skills matched",
            f"Experience: {candidate_exp} years ({'+' if candidate_exp >= min_exp else '-'} vs required {min_exp})",
            f"Location fit: {'High' if location_score >= 80 else 'Moderate'}",
        ]),
        "key_strengths": llm_data.get("key_strengths", [s for s in matched_skills[:3]]),
        "gaps": llm_data.get("gaps", [s for s in missing_skills[:3]]),
        "recommendation": llm_data.get("recommendation", recommendation),
    }


async def score_profiles_batch(profiles: list[dict], criteria: dict) -> list[dict]:
    """
    Batch score profiles without LLM rationale for performance and cost efficiency.
    
    The weighted baseline scoring (title*0.35 + skill*0.30 + exp*0.20 + location*0.15)
    provides good enough results for initial candidate ranking. LLM rationale is
    reserved for single-profile detailed scoring via /api/score endpoint.
    """
    start_time = time.time()
    status = "success"

    try:
        import asyncio
        scored = await asyncio.gather(*[score_profile(p, criteria, use_llm_rationale=False) for p in profiles])
        return sorted(scored, key=lambda p: p.get("match_score", 0), reverse=True)
    except Exception:
        status = "error"
        raise
    finally:
        duration = time.time() - start_time
        score_duration.labels(status=status).observe(duration)