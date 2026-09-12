"""
routes.py — FastAPI endpoints for agent-service.
"""
import asyncio
import logging
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from src.agent.graph import run_sourcing_agent
from src.api.limiter import limiter
from src.api.security import verify_jwt
from src.config import get_settings
from src.mcp_server.tools.score_profile import score_profile

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=3, description="Natural language sourcing query")
    job_id: str | None = Field(default=None, description="Optional Job Description ID")
    search_request_id: str | None = Field(default=None, description="Optional Search Request ID from Spring Boot")
    max_results: int = Field(default=10, ge=1, le=50)
    offset: int = Field(default=0, ge=0, description="Result offset for pagination/refresh")


class ScoreRequest(BaseModel):
    profile: dict[str, Any]
    criteria: dict[str, Any]


class HealthResponse(BaseModel):
    status: str
    agent: str
    model: str
    data_sources: dict[str, bool]
    groq_configured: bool
    database_connected: bool


async def _check_database() -> bool:
    """Check if PostgreSQL database is accessible."""
    try:
        from src.mcp_server.tools.db_pool import get_pool
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return True
    except Exception:
        return False


async def _check_serpapi() -> bool:
    """Check if SerpAPI is accessible by making a lightweight request to /account (free, no quota consumed)."""
    if not settings.has_serpapi:
        return False
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Use /account endpoint which is free and doesn't consume search quota
            params = {"api_key": settings.serpapi_api_key}
            resp = await client.get("https://serpapi.com/account", params=params)
            return resp.status_code in (200, 401, 403)  # Any response means API is reachable
    except Exception:
        return False


async def _check_apollo() -> bool:
    """Check if Apollo.io API is accessible."""
    if not settings.has_enrichment:
        return False
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            headers = {"X-Api-Key": settings.apollo_api_key}
            # Make a minimal request to verify API key is valid
            resp = await client.get("https://api.apollo.io/v1/auth/whoami", headers=headers)
            return resp.status_code in (200, 401, 403)  # Any response means API is reachable
    except Exception:
        return False


@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check() -> HealthResponse:
    # Run health checks concurrently for faster response
    db_connected, serpapi_ok, apollo_ok = await asyncio.gather(
        _check_database(),
        _check_serpapi(),
        _check_apollo(),
    )

    return HealthResponse(
        status="ok" if db_connected else "degraded",
        agent="Targetalent Sourcing Agent v1.0",
        model=settings.groq_model,
        data_sources={
            "serpapi": serpapi_ok,
            "apollo_enrichment": apollo_ok,
        },
        groq_configured=bool(settings.groq_api_key),
        database_connected=db_connected,
    )


@router.post("/api/search", tags=["Sourcing"])
@router.post("/api/v1/agent/search", tags=["Sourcing"])
@limiter.limit("10/minute")
async def run_search(
    request: Request,
    search_request: SearchRequest,
    _token: Annotated[dict, Depends(verify_jwt)],
) -> dict:
    job_identifier = search_request.search_request_id or search_request.job_id
    logger.info(f"[API] Search query: {search_request.query[:80]} (ID: {job_identifier})")
    try:
        return await run_sourcing_agent(
            raw_query=search_request.query,
            job_id=job_identifier,
            max_results=search_request.max_results,
            offset=search_request.offset,
        )
    except Exception as exc:
        logger.error(f"[API] Search error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


class PoolSearchRequest(BaseModel):
    query: str = Field(..., min_length=3, description="Job description or search prompt to match against the talent pool")
    limit: int = Field(default=10, ge=1, le=50)


@router.post("/api/pool/search", tags=["Sourcing"])
@limiter.limit("30/minute")
async def search_talent_pool(
    request: Request,
    pool_request: PoolSearchRequest,
    _token: Annotated[dict, Depends(verify_jwt)],
) -> dict:
    from src.mcp_server.tools.candidate_pool import rerank_pool
    try:
        results = await rerank_pool(pool_request.query, pool_request.limit)
        return {
            "candidates": results,
            "profiles": results,  # both keys for frontend compatibility with /api/search's shape
            "count": len(results),
            "source": "talent_pool",
        }
    except Exception as exc:
        logger.error(f"[API] Pool search error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/api/score", tags=["Sourcing"])
@limiter.limit("20/minute")
async def run_score(
    request: Request,
    score_request: ScoreRequest,
    _token: Annotated[dict, Depends(verify_jwt)],
) -> dict:
    try:
        scored = await score_profile(score_request.profile, score_request.criteria)
        return {"profile": scored, "status": "scored"}
    except Exception as exc:
        logger.error(f"[API] Score error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


class OutreachRequest(BaseModel):
    candidate: dict[str, Any]
    job_context: dict[str, Any] = Field(default_factory=dict)
    channel: Literal["linkedin", "email"] = "linkedin"


@router.post("/api/outreach", tags=["Sourcing"])
@limiter.limit("15/minute")
async def draft_outreach(
    request: Request,
    outreach_request: OutreachRequest,
    _token: Annotated[dict, Depends(verify_jwt)],
) -> dict:
    from src.mcp_server.tools.outreach import generate_outreach
    try:
        result = await generate_outreach(outreach_request.candidate, outreach_request.job_context, outreach_request.channel)
        return result
    except Exception as exc:
        logger.error(f"[API] Outreach draft error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/api/models", tags=["System"])
async def list_models() -> dict:
    return {
        "current_model": settings.groq_model,
        "embedding_model": settings.embedding_model,
        "data_sources": {
            "serpapi": settings.has_serpapi,
            "apollo_enrichment": settings.has_enrichment,
        },
    }
