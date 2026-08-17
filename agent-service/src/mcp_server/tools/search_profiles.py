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


async def search_profiles(criteria: dict[str, Any], limit: int = 20) -> list[dict]:
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
    raw_job_title = criteria.get("job_title", "developer")
    skills_list = criteria.get("required_skills", [])
    skills = " OR ".join(f'"{s}"' if " " in s else s for s in skills_list[:3]) if skills_list else ""
    location = (criteria.get("location") or "").strip()
    raw_seniority = criteria.get("seniority", "")

    # Clean seniority keyword (remove parens like "Senior (5-8 ans)")
    seniority = ""
    if raw_seniority and raw_seniority not in ("Any", "N/A", "Unknown"):
        sen_clean = raw_seniority.split("(")[0].split("/")[0].strip()
        if sen_clean in ("Junior", "Mid-Level", "Senior", "Lead", "Architect"):
            seniority = sen_clean

    # Clean job title (remove restrictive quotes and noise)
    clean_title = raw_job_title.replace('"', '').replace('&', ' ').replace('/', ' ').strip()

    # Build generic location term for Google search
    loc_lower = location.lower()
    if not location or loc_lower in ("any", "all locations", "toutes les localisations", "toutes les villes", "n/a", "unknown"):
        loc_term = '("Morocco" OR "Maroc")'
    else:
        loc_term = f'"{location}"' if " " in location else location

    query_parts = ['site:linkedin.com/in']
    if seniority and seniority.lower() not in clean_title.lower():
        query_parts.append(seniority)
    if clean_title:
        query_parts.append(clean_title)
    if skills:
        query_parts.append(f'({skills})')
    query_parts.append(loc_term)

    query = " ".join(query_parts).strip()
    logger.info(f"SerpAPI search query: {query}")

    profiles = []
    seen_urls = set()
    start_offset = 0

    async with httpx.AsyncClient(timeout=15.0) as client:
        while len(profiles) < limit and start_offset <= 50:
            response = await client.get(
                "https://serpapi.com/search",
                params={
                    "q": query,
                    "api_key": settings.serpapi_api_key,
                    "engine": "google",
                    "num": 20,
                    "start": start_offset,
                    "hl": "fr",
                    "gl": "ma" if not location or "morocco" in loc_lower or "maroc" in loc_lower else "us",
                },
            )
            if response.status_code != 200:
                logger.error(f"SerpAPI status {response.status_code}: {response.text[:200]}")
                break

            data = response.json()
            raw_results = data.get("organic_results", [])
            if not raw_results:
                break

            for result in raw_results:
                if len(profiles) >= limit:
                    break
                title = result.get("title", "")
                snippet = result.get("snippet", "")
                link = result.get("link", "")

                if not link or link in seen_urls:
                    continue
                seen_urls.add(link)

                parsed = _parse_serpapi_result(len(profiles), title, snippet, link, criteria, location)
                if parsed:
                    profiles.append(parsed)

            start_offset += 20

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
