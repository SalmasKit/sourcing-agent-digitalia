"""
main.py — FastAPI entrypoint for Targetalent Sourcing Agent Service.
"""
import logging
import os
import secrets
import sys
import uuid
from contextlib import asynccontextmanager

# Allow running as `python main.py` from inside src/ OR
# as `python -m src.main` from agent-service/ root.
_here = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_here)  # agent-service/
if _root not in sys.path:
    sys.path.insert(0, _root)

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from prometheus_fastapi_instrumentator import Instrumentator
from pythonjsonlogger import jsonlogger
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from src.api.limiter import limiter
from src.api.routes import router
from src.config import get_settings

json_handler = logging.StreamHandler(sys.stdout)
json_handler.setFormatter(jsonlogger.JsonFormatter(
    fmt='%(asctime)s %(name)s %(levelname)s %(message)s',
    timestamp=True,
))

logging.basicConfig(
    level=logging.INFO,
    handlers=[json_handler],
)
logger = logging.getLogger("agent-service")
settings = get_settings()

_metrics_basic = HTTPBasic()

def verify_metrics_scraper(credentials: HTTPBasicCredentials = Depends(_metrics_basic)) -> None:
    """Verify Basic Auth credentials for Prometheus metrics scraper."""
    expected_user = settings.metrics_scraper_username
    expected_pass = settings.metrics_scraper_password
    is_user_ok = secrets.compare_digest(credentials.username, expected_user)
    is_pass_ok = secrets.compare_digest(credentials.password, expected_pass)
    if not (is_user_ok and is_pass_ok):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            headers={"WWW-Authenticate": "Basic"},
        )


async def _request_id_middleware(request: Request, call_next):
    """
    Request-ID middleware that:
    1. Generates a unique request ID if not present
    2. Honors incoming x-request-id header for request correlation
    3. Adds request ID to response headers and logs
    """
    request_id = request.headers.get("x-request-id")
    if not request_id:
        request_id = str(uuid.uuid4())

    # Store in request state for access in endpoints
    request.state.request_id = request_id

    # Log with request ID
    logger.info(f"[{request_id}] {request.method} {request.url.path}")

    response = await call_next(request)

    # Add request ID to response headers
    response.headers["x-request-id"] = request_id

    return response


def _assert_jwt_secret_configured() -> None:
    """
    Startup invariant: JWT_SECRET must be set in production.

    Checked once during lifespan startup so the service refuses to run in
    a misconfigured state rather than silently granting access to every request.
    In non-production environments the service starts with a loud warning so
    developers can still run the agent standalone without Spring Boot.
    """
    settings = get_settings()
    if settings.jwt_secret:
        return  # all good

    if settings.app_env == "production":
        logger.critical(
            "[SECURITY] FATAL: JWT_SECRET is not configured. "
            "Refusing to start in production — set JWT_SECRET in the environment."
        )
        raise RuntimeError(
            "JWT_SECRET must be set in production. "
            "The agent-service cannot start without it."
        )

    # Non-production: warn visibly but allow boot so the agent can be run
    # standalone during development without a full Spring Boot stack.
    logger.warning("=" * 65)
    logger.warning("  ⚠️  [SECURITY] JWT_SECRET is NOT configured.")
    logger.warning("  All requests to /api/search and /api/score will be")
    logger.warning("  accepted WITHOUT token validation.")
    logger.warning("  Set JWT_SECRET in .env to enforce authentication.")
    logger.warning("=" * 65)


def _assert_metrics_scraper_configured() -> None:
    """
    Startup invariant: METRICS_SCRAPER_USERNAME/PASSWORD must be set in production.

    Prevents fail-open where empty credentials would allow unauthorized access to /metrics.
    Mirrors the Spring Boot MetricsSecurityConfig.validateScraperCredentials() pattern.
    """
    settings = get_settings()
    if settings.metrics_scraper_username and settings.metrics_scraper_password:
        return  # all good

    if settings.app_env == "production":
        logger.critical(
            "[SECURITY] FATAL: METRICS_SCRAPER_USERNAME/PASSWORD not configured. "
            "Refusing to start in production — refusing to expose /metrics with trivially guessable credentials."
        )
        raise RuntimeError(
            "METRICS_SCRAPER_USERNAME and METRICS_SCRAPER_PASSWORD must be set in production. "
            "The agent-service cannot start without them."
        )

    # Non-production: warn visibly but allow boot so developers can run without metrics auth.
    logger.warning("[SECURITY] Metrics scraper credentials not configured — /metrics is unprotected in dev.")


async def _check_and_log_api_keys():
    """Probe all configured API services and print a live quota status banner in the terminal."""
    import httpx
    settings = get_settings()

    logger.info("=" * 65)
    logger.info("       TARGETALENT SOURCING AGENT — API KEYS & QUOTA MONITOR       ")
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
        except Exception:
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
    # Fail closed on missing JWT secret before accepting any traffic.
    _assert_jwt_secret_configured()

    # Fail closed on missing metrics scraper credentials.
    _assert_metrics_scraper_configured()

    from src.mcp_server.tools.candidate_pool import assert_pgvector_available
    await assert_pgvector_available()

    await _check_and_log_api_keys()

    settings = get_settings()
    try:
        from src.embeddings.client import _get_model
        _get_model(settings.embedding_model)
    except Exception as exc:
        logger.warning(f"Embeddings pre-load warning: {exc}")

    yield

    from src.mcp_server.tools.db_pool import close_pool
    await close_pool()
    logger.info("Sourcing Agent Service — Shutdown")


app = FastAPI(
    title="Targetalent Sourcing Agent",
    description="AI Sourcing Service powered by LangGraph, Groq Llama 3.3 70B and MCP.",
    version="1.0.0",
    lifespan=lifespan,
)

_settings = get_settings()

# Set up rate limiting with shared limiter instance
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add request-ID middleware
app.middleware("http")(_request_id_middleware)

# Set up Prometheus instrumentation
instrumentator = Instrumentator(
    should_group_status_codes=False,
    should_ignore_untemplated=True,
    should_group_untemplated=True,
    excluded_handlers=["/metrics"],
    env_var_name="METRICS_ENABLED",
)
instrumentator.instrument(app)

# Expose metrics with Basic Auth protection
@app.get("/metrics", dependencies=[Depends(verify_metrics_scraper)], include_in_schema=False)
async def metrics():
    """Prometheus metrics endpoint protected by Basic Auth."""
    from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
    from starlette.responses import Response
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

# CORS — never combine "*" with allow_credentials=True.
# Per the CORS spec, browsers refuse to honor a wildcard origin on credentialed
# requests (those carrying Authorization headers), and Starlette's behaviour in
# that state is to reflect back the requesting origin — effectively allowing any
# site to make authenticated calls. We list explicit origins only.
_DEV_ORIGINS = [
    "http://localhost:3000",   # Vite dev server (frontend)
    "http://localhost:5173",   # Vite alt port
    "http://localhost:8080",   # Spring Boot (service-to-service)
]
_PROD_ORIGINS = [
    _settings.frontend_origin,   # e.g. https://targetalent.example.com
    # Note: spring_boot_url is intentionally omitted. CORS is a browser-enforced
    # restriction and only applies to requests originating from a browser page.
    # Spring Boot → agent-service calls are server-to-server and bypass CORS
    # entirely, so listing the backend URL here has no effect.
]
_ALLOWED_ORIGINS = _DEV_ORIGINS if _settings.app_env != "production" else _PROD_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(router)

if __name__ == "__main__":
    settings = get_settings()
    uvicorn.run("src.main:app", host=settings.app_host, port=settings.app_port, reload=settings.debug)
