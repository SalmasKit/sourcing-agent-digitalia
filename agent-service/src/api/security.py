"""
security.py — JWT verification dependency for the Digitalia agent-service.

Spring Boot signs access tokens with HS256 using the value of the JWT_SECRET
environment variable. JJWT decodes the secret with Decoders.BASE64.decode()
before using it as key material — i.e. it base64-decodes the string, it does
NOT treat it as raw bytes. This module mirrors that behaviour exactly using
base64.b64decode so that tokens issued by Spring Boot are accepted here.

Encoding proof (verified empirically against the dev secret):
  secret.encode('utf-8')   → 64 bytes, wrong HMAC key, every token rejected
  base64.b64decode(secret) → 48 bytes, correct key, tokens accepted ✓

Startup invariant: if JWT_SECRET is absent the service refuses to boot in
production (checked once in main.py lifespan). In dev it logs a loud warning
and allows the request through. See _assert_jwt_secret_configured() in main.py.

Usage:
    from src.api.security import verify_jwt

    @router.post("/api/search")
    async def run_search(request: SearchRequest, _: dict = Depends(verify_jwt)):
        ...
"""
import base64
import logging
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.config import get_settings

logger = logging.getLogger(__name__)

# HTTPBearer extracts the token from the "Authorization: Bearer <token>" header.
# auto_error=False lets us return a cleaner 401 instead of FastAPI's default 403.
_bearer_scheme = HTTPBearer(auto_error=False)


def verify_jwt(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
) -> dict:
    """
    FastAPI dependency that validates an HS256 JWT issued by Spring Boot.

    Returns the decoded JWT payload (claims dict) on success.
    Raises HTTP 401 on any validation failure so callers receive a uniform
    error rather than leaking internal details.

    Precondition: JWT_SECRET must be non-empty. The lifespan startup check in
    main.py guarantees this in production; in dev the service will already have
    logged a warning if the secret is absent.
    """
    settings = get_settings()

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Dev-only escape hatch: if the startup check allowed boot without a secret
    # (app_env != "production"), skip verification here too so the agent can
    # still be exercised standalone. Every such request is logged so it's obvious
    # in the console.
    if not settings.jwt_secret:
        logger.warning(
            "[SECURITY] JWT_SECRET not configured — skipping token validation for "
            "this request. Set JWT_SECRET in .env to enforce authentication."
        )
        return {"sub": "unauthenticated-dev", "role": "RECRUITER"}

    token = credentials.credentials

    # Mirror JJWT's Decoders.BASE64.decode(): base64-decode the secret string to
    # obtain the raw key bytes. Using .encode('utf-8') instead produces 64 bytes
    # vs 48 bytes and a completely different HMAC key — every real token rejects.
    try:
        secret_bytes = base64.b64decode(settings.jwt_secret)
    except Exception:
        logger.error("[SECURITY] JWT_SECRET is not valid base64 — cannot verify tokens.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service misconfigured.",
        ) from None

    try:
        payload = jwt.decode(
            token,
            secret_bytes,
            algorithms=["HS256"],
            options={"verify_aud": False},  # Spring Boot does not set an 'aud' claim
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("[SECURITY] Rejected expired JWT.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except jwt.InvalidTokenError as exc:
        logger.warning(f"[SECURITY] Rejected invalid JWT: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or tampered token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
