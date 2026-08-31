"""
score_profile.py — MCP Tool for scoring candidate profiles.
"""
import json
import logging
import re
from typing import Any

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

from src.config import get_settings
from src.agent.prompts import SCORING_SYSTEM, SCORING_USER
from src.embeddings.client import compute_similarity

logger = logging.getLogger(__name__)
settings = get_settings()


def _get_llm() -> ChatGroq | None:
    if not settings.groq_api_key:
        return None
    model_name = settings.groq_model or "qwen/qwen3.6-27b"
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=model_name,
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
        parts.append(f"Required skills: {', '.join(skills)}")
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


async def score_profile(
    profile: dict[str, Any],
    criteria: dict[str, Any],
    use_llm_rationale: bool = True,
) -> dict[str, Any]:
    """Score a single profile against criteria."""
    job_text = _build_job_context(criteria)
    profile_text = _build_profile_context(profile)

    # 1. Role / Title Match Score (Crucial for exact career domain alignment)
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
            title_score = 30  # Heavily penalize unrelated domains

    # 2. Rule-based skill score
    required_skills = [s.lower() for s in criteria.get("required_skills", [])]
    profile_skills = [s.lower() for s in profile.get("skills", [])]

    matched_skills = [s for s in required_skills if any(s in ps for ps in profile_skills)]
    skill_match_ratio = len(matched_skills) / len(required_skills) if required_skills else 0.5
    skill_score = round(skill_match_ratio * 100)

    # 3. Experience score
    min_exp = criteria.get("min_experience_years") or 0
    if min_exp == 0:
        seniority_str = f"{criteria.get('seniority', '')} {criteria.get('job_title', '')}".lower()
        if "senior" in seniority_str:
            min_exp = 5
        elif any(k in seniority_str for k in ["lead", "principal", "architect", "manager", "director"]):
            min_exp = 8
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

    # Base weighted score prioritizing exact title & skills
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

    # 6. LLM rationale generation
    llm_data = {}
    llm = _get_llm() if use_llm_rationale else None
    if llm:
        try:
            messages = [
                SystemMessage(content=SCORING_SYSTEM),
                HumanMessage(content=SCORING_USER.format(
                    criteria_json=json.dumps(criteria, ensure_ascii=False, indent=2),
                    profile_json=json.dumps({
                        "full_name": profile.get("full_name"),
                        "headline": profile.get("headline"),
                        "skills": profile.get("skills"),
                        "experience_years": profile.get("experience_years"),
                        "location": profile.get("location"),
                        "summary": profile.get("summary", ""),
                    }, ensure_ascii=False, indent=2),
                )),
            ]
            response = await llm.ainvoke(messages)
            content = response.content
            if isinstance(content, list):
                raw = "".join(
                    block.get("text", "") if isinstance(block, dict) else str(block)
                    for block in content
                ).strip()
            else:
                raw = content.strip()
            # Strip <think>...</think> tags from qwen reasoning models
            raw = re.sub(r'<think>.*?</think>', '', raw, flags=re.DOTALL).strip()
            json_match = re.search(r"\{.*\}", raw, re.DOTALL)
            if json_match:
                llm_data = json.loads(json_match.group())
                llm_score = llm_data.get("match_score", base_score)
                base_score = int((base_score * 0.5) + (llm_score * 0.5))
        except Exception as exc:
            logger.warning(f"LLM rationale failed for {profile.get('full_name')}: {exc}")

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
        "missing_skills": [s for s in required_skills if s not in matched_skills],
        "match_rationale": llm_data.get("match_rationale", [
            f"Skills: {len(matched_skills)}/{len(required_skills)} required skills matched",
            f"Experience: {candidate_exp} years ({'+' if candidate_exp >= min_exp else '-'} vs required {min_exp})",
            f"Location fit: {'High' if location_score >= 80 else 'Moderate'}",
        ]),
        "key_strengths": llm_data.get("key_strengths", [s for s in matched_skills[:3]]),
        "gaps": llm_data.get("gaps", []),
        "recommendation": llm_data.get("recommendation", recommendation),
    }


async def score_profiles_batch(profiles: list[dict], criteria: dict) -> list[dict]:
    import asyncio
    scored = await asyncio.gather(*[score_profile(p, criteria, use_llm_rationale=False) for p in profiles])
    return sorted(scored, key=lambda p: p.get("match_score", 0), reverse=True)
