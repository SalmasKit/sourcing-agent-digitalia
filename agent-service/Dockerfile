FROM python:3.12-slim

WORKDIR /app

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# ── Layer 1: all packages except numpy ──────────────────────────────────────
# Each wheel here is < 3 MB; --timeout 300 / --retries 10 handles WSL2 stalls.
# This layer is cached independently, so a numpy failure won't evict it.
RUN pip install --no-cache-dir \
    --timeout 300 \
    --retries 10 \
    "setuptools>=61.0" \
    "wheel" \
    "fastapi>=0.115.0" \
    "uvicorn[standard]>=0.30.0" \
    "langchain>=0.3.0" \
    "langchain-core>=0.3.0" \
    "langchain-groq>=0.2.0" \
    "langgraph>=0.2.0" \
    "fastmcp>=2.0.0" \
    "httpx>=0.27.0" \
    "requests>=2.32.0" \
    "pydantic>=2.7.0" \
    "pydantic-settings>=2.3.0" \
    "python-dotenv>=1.0.0" \
    "asyncpg>=0.29.0" \
    "sqlalchemy[asyncio]>=2.0.30" \
    "orjson>=3.10.0" \
    "PyJWT>=2.8.0" \
    "prometheus-client>=0.20.0" \
    "prometheus-fastapi-instrumentator>=7.0.0" \
    "slowapi>=0.1.9" \
    "python-json-logger>=2.0.7,<3.0.0" \
    "cachetools>=5.3.0"

# ── Layer 2: numpy alone (16.7 MB binary – the slow one) ────────────────────
# Isolated in its own layer so Docker caches it once it succeeds.
# --timeout 600 = 10-min stall tolerance; --retries 10 = up to 10 restarts.
RUN pip install --no-cache-dir \
    --timeout 600 \
    --retries 10 \
    "numpy>=1.26.0"

# ── Layer 3: project source ──────────────────────────────────────────────────
COPY pyproject.toml README.md ./
COPY src/ ./src/

RUN pip install --no-cache-dir \
    --timeout 120 \
    --retries 5 \
    --no-build-isolation \
    .

# Change ownership of /app to non-root user
RUN chown -R appuser:appuser /app

# Set HOME to /app for model caching (sentence-transformers uses ~/.cache)
ENV HOME=/app

# Switch to non-root user
USER appuser

EXPOSE 8001

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
