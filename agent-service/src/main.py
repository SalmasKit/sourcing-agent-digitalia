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


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("=" * 50)
    logger.info(" Digitalia Sourcing Agent Service — Active")
    logger.info(f" Model       : {settings.groq_model}")
    logger.info(f" Data Source : {'MOCK' if settings.effective_use_mock else 'SerpAPI'}")
    logger.info("=" * 50)

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
