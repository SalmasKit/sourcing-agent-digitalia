"""
search_profiles.py — MCP Tool for searching candidate profiles.
"""
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
    skills = " OR ".join(criteria.get("required_skills", [])[:3])
    location = criteria.get("location", "")
    seniority = criteria.get("seniority", "")

    query = f'site:linkedin.com/in "{seniority} {job_title}" {skills} {location}'.strip()
    logger.info(f"SerpAPI search query: {query}")

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            "https://serpapi.com/search",
            params={
                "q": query,
                "api_key": settings.serpapi_api_key,
                "engine": "google",
                "num": min(limit * 2, 20),
                "hl": "fr",
                "gl": "ma",
            },
        )
        response.raise_for_status()
        data = response.json()

    raw_results = data.get("organic_results", [])
    profiles = []

    for idx, result in enumerate(raw_results[:limit]):
        title = result.get("title", "")
        snippet = result.get("snippet", "")
        link = result.get("link", "")
        profiles.append(_parse_serpapi_result(idx, title, snippet, link, criteria))

    return profiles


def _parse_serpapi_result(idx: int, title: str, snippet: str, url: str, criteria: dict) -> dict:
    name = title.split(" - ")[0].split(" | ")[0].strip() if title else f"Profile {idx + 1}"
    role = title.split(" - ")[1].split(" | ")[0].strip() if " - " in title else "N/A"

    candidate_skills = [
        kw for kw in criteria.get("required_skills", [])
        if kw.lower() in (snippet + title).lower()
    ]

    return {
        "id": f"serpapi-{idx:03d}",
        "full_name": name,
        "headline": role,
        "location": criteria.get("location", "N/A"),
        "current_company": "N/A",
        "current_role": role,
        "experience_years": None,
        "skills": candidate_skills,
        "seniority": criteria.get("seniority", "N/A"),
        "linkedin_url": url,
        "email": None,
        "avatar_url": "https://randomuser.me/api/portraits/lego/1.jpg",
        "summary": snippet,
        "availability": "Unknown",
        "salary_expectation": "N/A",
        "contract_preference": criteria.get("contract_type", "Any"),
        "languages": [],
        "source": "serpapi",
    }
