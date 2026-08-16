"""
routes.py — FastAPI endpoints for agent-service.
"""
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.agent.graph import run_sourcing_agent
from src.mcp_server.tools.score_profile import score_profile
from src.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=3, description="Natural language sourcing query")
    job_id: str | None = Field(default=None, description="Optional Job Description ID")
    search_request_id: str | None = Field(default=None, description="Optional Search Request ID from Spring Boot")
    max_results: int = Field(default=8, ge=1, le=20)


class ScoreRequest(BaseModel):
    profile: dict[str, Any]
    criteria: dict[str, Any]


class HealthResponse(BaseModel):
    status: str
    agent: str
    model: str
    data_source: str
    groq_configured: bool


@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        agent="Digitalia Sourcing Agent v1.0",
        model=settings.groq_model,
        data_source="mock" if settings.effective_use_mock else "serpapi",
        groq_configured=bool(settings.groq_api_key),
    )


@router.post("/api/search", tags=["Sourcing"])
@router.post("/api/v1/agent/search", tags=["Sourcing"])
async def run_search(request: SearchRequest) -> dict:
    job_identifier = request.search_request_id or request.job_id
    logger.info(f"[API] Search query: {request.query[:80]} (ID: {job_identifier})")
    try:
        result = await run_sourcing_agent(raw_query=request.query, job_id=job_identifier)
        if "profiles" in result:
            result["profiles"] = result["profiles"][:request.max_results]
        return result
    except Exception as exc:
        logger.error(f"[API] Search error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/api/score", tags=["Sourcing"])
async def score_single_profile(request: ScoreRequest) -> dict:
    try:
        scored = await score_profile(request.profile, request.criteria)
        return {"profile": scored, "status": "scored"}
    except Exception as exc:
        logger.error(f"[API] Score error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/api/models", tags=["System"])
async def list_models() -> dict:
    return {
        "current_model": settings.groq_model,
        "available_models": [
            {"id": "llama-3.3-70b-versatile", "name": "Llama 3.3 70B", "recommended": True},
            {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B", "recommended": False},
            {"id": "mixtral-8x7b-32768", "name": "Mixtral 8x7B", "recommended": False},
        ],
        "data_source": "mock" if settings.effective_use_mock else "serpapi",
    }
