"""
main.py — FastAPI entrypoint for Digitalia Sourcing Agent Service.
"""
import logging
import sys
import os
from contextlib import asynccontextmanager

# Allow running as `python main.py` from inside src/ OR
# as `python -m src.main` from agent-service/ root.
_here = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_here)  # agent-service/
if _root not in sys.path:
    sys.path.insert(0, _root)

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("agent-service")


async def _check_and_log_api_keys():
    """Probe all configured API services and print a live quota status banner in the terminal."""
    import httpx
    settings = get_settings()

    logger.info("=" * 65)
    logger.info("       DIGITALIA SOURCING AGENT — API KEYS & QUOTA MONITOR       ")
    logger.info("=" * 65)

    # 1. SerpAPI Status & Quota Check
    if settings.serpapi_api_key:
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                r = await client.get(
                    "https://serpapi.com/account",
                    params={"api_key": settings.serpapi_api_key}
                )
            if r.status_code == 200:
                data = r.json()
                left = data.get("total_searches_left") or (data.get("searches_per_month", 250) - data.get("this_month_usage", 0))
                email = data.get("account_email", "N/A")
                plan = data.get("plan_name", "Free")
                logger.info(f" 🔑 [SerpAPI]   : 🟢 ACTIVE — {left} searches left (Plan: {plan} | {email})")
            elif r.status_code in (401, 403):
                logger.warning(f" 🔑 [SerpAPI]   : 🔴 QUOTA EXHAUSTED / INVALID KEY (HTTP {r.status_code})")
            else:
                logger.info(f" 🔑 [SerpAPI]   : 🟡 Configured (Key: {settings.serpapi_api_key[:8]}...)")
        except Exception as e:
            logger.info(f" 🔑 [SerpAPI]   : 🟡 Configured (Key: {settings.serpapi_api_key[:8]}...)")
    else:
        logger.warning(" 🔑 [SerpAPI]   : ⚪ NOT CONFIGURED")

    # 2. Apollo.io Status
    if settings.apollo_api_key:
        key_preview = f"{settings.apollo_api_key[:6]}...{settings.apollo_api_key[-4:]}"
        logger.info(f" 🔑 [Apollo.io] : 🟢 ACTIVE (Primary Enrichment Key: {key_preview})")
    else:
        logger.warning(" 🔑 [Apollo.io] : ⚪ NOT CONFIGURED")

    # 3. Groq LLM Status
    if settings.groq_api_key:
        logger.info(f" 🔑 [Groq LLM]  : 🟢 ACTIVE (Model: {settings.groq_model})")
    else:
        logger.warning(" 🔑 [Groq LLM]  : ⚪ NOT CONFIGURED")

    logger.info("=" * 65)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _check_and_log_api_keys()

    settings = get_settings()
    try:
        from src.embeddings.client import _get_model
        _get_model(settings.embedding_model)
    except Exception as exc:
        logger.warning(f"Embeddings pre-load warning: {exc}")

    yield
    logger.info("Sourcing Agent Service — Shutdown")


app = FastAPI(
    title="Digitalia Sourcing Agent",
    description="AI Sourcing Service powered by LangGraph, Groq Llama 3.3 70B and MCP.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run("src.main:app", host=settings.app_host, port=settings.app_port, reload=settings.debug)
