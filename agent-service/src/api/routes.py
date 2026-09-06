"""
routes.py — FastAPI endpoints for agent-service.
"""
import logging
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from src.agent.graph import run_sourcing_agent
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


class ScoreRequest(BaseModel):
    profile: dict[str, Any]
    criteria: dict[str, Any]


class HealthResponse(BaseModel):
    status: str
    agent: str
    model: str
    data_sources: dict[str, bool]
    groq_configured: bool


@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        agent="Digitalia Sourcing Agent v1.0",
        model=settings.groq_model,
        data_sources={
            "serpapi": settings.has_serpapi,
            "apollo_enrichment": settings.has_enrichment,
        },
        groq_configured=bool(settings.groq_api_key),
    )


@router.post("/api/search", tags=["Sourcing"])
@router.post("/api/v1/agent/search", tags=["Sourcing"])
async def run_search(
    request: SearchRequest,
    _token: Annotated[dict, Depends(verify_jwt)],
) -> dict:
    job_identifier = request.search_request_id or request.job_id
    logger.info(f"[API] Search query: {request.query[:80]} (ID: {job_identifier})")
    try:
        return await run_sourcing_agent(
            raw_query=request.query,
            job_id=job_identifier,
            max_results=request.max_results,
        )
    except Exception as exc:
        logger.error(f"[API] Search error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


class PoolSearchRequest(BaseModel):
    query: str = Field(..., min_length=3, description="Job description or search prompt to match against the talent pool")
    limit: int = Field(default=10, ge=1, le=50)


@router.post("/api/pool/search", tags=["Sourcing"])
async def search_talent_pool(
    request: PoolSearchRequest,
    _token: Annotated[dict, Depends(verify_jwt)],
) -> dict:
    from src.mcp_server.tools.candidate_pool import rerank_pool
    try:
        results = await rerank_pool(request.query, request.limit)
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
async def score_single_profile(
    request: ScoreRequest,
    _token: Annotated[dict, Depends(verify_jwt)],
) -> dict:
    try:
        scored = await score_profile(request.profile, request.criteria)
        return {"profile": scored, "status": "scored"}
    except Exception as exc:
        logger.error(f"[API] Score error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


class OutreachRequest(BaseModel):
    candidate: dict[str, Any]
    job_context: dict[str, Any] = Field(default_factory=dict)
    channel: Literal["linkedin", "email"] = "linkedin"


@router.post("/api/outreach", tags=["Sourcing"])
async def draft_outreach(
    request: OutreachRequest,
    _token: Annotated[dict, Depends(verify_jwt)],
) -> dict:
    from src.mcp_server.tools.outreach import generate_outreach
    try:
        result = await generate_outreach(request.candidate, request.job_context, request.channel)
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
