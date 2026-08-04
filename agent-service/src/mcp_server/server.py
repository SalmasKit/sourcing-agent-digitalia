"""
server.py — FastMCP server for Sourcing Agent tools.
"""
import logging
from typing import Any
from fastmcp import FastMCP

from src.mcp_server.tools.search_profiles import search_profiles
from src.mcp_server.tools.score_profile import score_profile

logger = logging.getLogger(__name__)
mcp = FastMCP("Digitalia Sourcing Agent MCP")


@mcp.tool()
async def search_candidate_profiles(
    job_title: str,
    required_skills: list[str],
    location: str = "Any",
    seniority: str = "Any",
    limit: int = 8,
) -> list[dict[str, Any]]:
    """Search candidate profiles matching criteria."""
    criteria = {
        "job_title": job_title,
        "required_skills": required_skills,
        "location": location,
        "seniority": seniority,
    }
    return await search_profiles(criteria, limit=limit)


@mcp.tool()
async def score_candidate_profile(
    profile: dict[str, Any],
    criteria: dict[str, Any],
) -> dict[str, Any]:
    """Score a candidate profile against criteria."""
    return await score_profile(profile, criteria)


if __name__ == "__main__":
    mcp.run()
