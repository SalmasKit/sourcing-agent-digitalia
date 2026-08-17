"""
search_profiles.py — MCP Tool for searching candidate profiles with generic location handling.
"""
import hashlib
import logging
from typing import Any
import httpx

from src.config import get_settings
from src.mcp_server.mock_data import search_mock_profiles

logger = logging.getLogger(__name__)
settings = get_settings()


async def search_profiles(criteria: dict[str, Any], limit: int = 8) -> list[dict]:
    """Search for candidate profiles based on criteria."""
    if settings.effective_use_mock:
        logger.info("🔧 Using mock candidate profiles")
        return search_mock_profiles(criteria, limit)

    try:
        return await _serpapi_search(criteria, limit)
    except Exception as exc:
        logger.error(f"SerpAPI search error: {exc}")
        return []


async def _serpapi_search(criteria: dict, limit: int) -> list[dict]:
    job_title = criteria.get("job_title", "developer")
    skills_list = criteria.get("required_skills", [])
    skills = " OR ".join(skills_list[:3]) if skills_list else ""
    location = (criteria.get("location") or "").strip()
    seniority = criteria.get("seniority", "")
    if seniority in ("Any", "N/A", "Unknown"):
        seniority = ""

    # Build generic location term for Google search
    loc_lower = location.lower()
    if not location or loc_lower in ("any", "all locations", "toutes les localisations", "toutes les villes", "n/a", "unknown"):
        loc_term = '("Morocco" OR "Maroc")'
    else:
        # Generic query term using the exact city or country HR typed
        loc_term = f'"{location}"'

    query_parts = ['site:linkedin.com/in']
    if seniority:
        query_parts.append(f'"{seniority}"')
    if job_title:
        query_parts.append(f'"{job_title}"')
    if skills:
        query_parts.append(f'({skills})')
    query_parts.append(loc_term)

    query = " ".join(query_parts).strip()
    logger.info(f"SerpAPI search query: {query}")

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            "https://serpapi.com/search",
            params={
                "q": query,
                "api_key": settings.serpapi_api_key,
                "engine": "google",
                "num": min(limit * 3, 24),
                "hl": "fr",
                "gl": "ma" if not location or "morocco" in loc_lower or "maroc" in loc_lower else "us",
            },
        )
        response.raise_for_status()
        data = response.json()

    raw_results = data.get("organic_results", [])
    profiles = []

    for idx, result in enumerate(raw_results):
        if len(profiles) >= limit:
            break
        title = result.get("title", "")
        snippet = result.get("snippet", "")
        link = result.get("link", "")

        parsed = _parse_serpapi_result(idx, title, snippet, link, criteria, location)
        if parsed:
            profiles.append(parsed)

    return profiles


def _extract_candidate_location(title: str, snippet: str, requested_location: str) -> str:
    req_clean = (requested_location or "").strip()
    req_lower = req_clean.lower()

    if not req_clean or req_lower in ("any", "all locations", "toutes les localisations", "toutes les villes", "n/a", "unknown"):
        # Default to Morocco when HR leaves location blank or selects All Locations
        return "Morocco"

    # Return the exact city or country HR specified
    return req_clean


def _parse_serpapi_result(idx: int, title: str, snippet: str, url: str, criteria: dict, requested_location: str) -> dict | None:
    cand_location = _extract_candidate_location(title, snippet, requested_location)

    name = title.split(" - ")[0].split(" | ")[0].strip() if title else f"Profile {idx + 1}"
    role = title.split(" - ")[1].strip() if " - " in title else title

    candidate_skills = [
        kw for kw in criteria.get("required_skills", [])
        if kw.lower() in (snippet + title).lower()
    ]

    unique_key = (url or f"{name}-{role}").encode("utf-8")
    profile_hash = hashlib.md5(unique_key).hexdigest()[:8]
    unique_id = f"cand-{profile_hash}"

    return {
        "id": unique_id,
        "full_name": name,
        "headline": role,
        "location": cand_location,
        "current_company": "N/A",
        "current_role": role,
        "experience_years": None,
        "skills": candidate_skills,
        "seniority": criteria.get("seniority", "N/A"),
        "linkedin_url": url,
        "email": None,
        "avatar_url": None,
        "summary": snippet,
        "availability": "Unknown",
        "salary_expectation": "N/A",
        "contract_preference": criteria.get("contract_type", "Any"),
        "languages": [],
        "source": "serpapi",
    }
