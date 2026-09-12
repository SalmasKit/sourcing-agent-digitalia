"""
candidate_pool.py — Persistent semantic talent pool tool.

Stores vectorized candidate profiles in PostgreSQL using pgvector (384 dimensions)
so recruiters can instantly re-rank previously sourced talent against new job
descriptions without re-running SerpAPI or Groq scraping queries.
"""
import json
import logging
from typing import Any

from src.config import get_settings
from src.embeddings.client import _get_model
from src.mcp_server.tools.db_pool import get_pool

logger = logging.getLogger(__name__)
settings = get_settings()

_DDL = """
CREATE TABLE IF NOT EXISTS candidate_embeddings (
    candidate_id TEXT PRIMARY KEY,
    profile_json JSONB NOT NULL,
    embedding VECTOR(384),
    created_at TIMESTAMPTZ DEFAULT now()
);
"""


def _fail_or_warn_pgvector(message: str, exc: Exception) -> None:
    """
    Production fails closed; non-production warns and leaves the talent pool disabled.

    Matches _assert_jwt_secret_configured: a fresh local clone can boot without
    pgvector, while production refuses a silently empty pool.
    """
    if settings.app_env == "production":
        logger.critical("[CandidatePool] FATAL: %s", message)
        raise RuntimeError(message) from exc

    logger.warning("=" * 65)
    logger.warning("  ⚠️  [CandidatePool] %s", message)
    logger.warning("  Talent pool store/rerank will be disabled until pgvector is available.")
    logger.warning("  In production this would refuse to start.")
    logger.warning("=" * 65)


async def assert_pgvector_available() -> None:
    """
    Startup invariant: pgvector must be usable when the database is expected.

    Either probe line may raise: CREATE EXTENSION if the files are not on disk,
    or the `::vector` cast (`type "vector" does not exist`) if files are present
    but the extension is not yet enabled. Both are the liveness signal — the
    cast does not return a quiet NULL.
    """
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
            await conn.fetchval("SELECT '[0,0,0]'::vector IS NOT NULL")
    except Exception as exc:
        _fail_or_warn_pgvector(
            "pgvector extension is not available. "
            "Install pgvector on Postgres and run CREATE EXTENSION vector.",
            exc,
        )


async def store_candidate_embedding(candidate: dict[str, Any]) -> None:
    """
    Encode candidate text into a 384-dimensional vector and store/update in
    the PostgreSQL candidate_embeddings pool.
    """
    candidate_id = candidate.get("id")
    if not candidate_id:
        return

    skills = candidate.get("skills", [])
    skills_str = " ".join(skills) if isinstance(skills, list) else str(skills)
    text = f"{candidate.get('headline', '')} {candidate.get('summary', '')} {skills_str}".strip()
    if not text:
        text = candidate.get("full_name", "")

    model = _get_model(settings.embedding_model)
    vec_str = None
    if model is not None:
        try:
            vec = model.encode(text, normalize_embeddings=True).tolist()
            vec_str = "[" + ",".join(f"{x:.6f}" for x in vec) + "]"
        except Exception as exc:
            logger.warning(f"[CandidatePool] Failed to compute embedding for {candidate_id}: {exc}")

    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            # Ensure table exists (idempotent)
            await conn.execute(_DDL)
            try:
                await conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS candidate_embeddings_vec_idx
                    ON candidate_embeddings USING ivfflat (embedding vector_cosine_ops);
                    """
                )
            except Exception as exc:
                logger.warning(f"[CandidatePool] IVFFlat index initialization note: {exc}")
            
            query = """
                INSERT INTO candidate_embeddings (candidate_id, profile_json, embedding)
                VALUES ($1, $2, $3)
                ON CONFLICT (candidate_id) DO UPDATE
                    SET profile_json = EXCLUDED.profile_json,
                        embedding = COALESCE(EXCLUDED.embedding, candidate_embeddings.embedding),
                        created_at = now();
            """
            await conn.execute(query, str(candidate_id), json.dumps(candidate), vec_str)
    except Exception as exc:
        logger.warning(f"[CandidatePool] Could not store candidate {candidate_id} in pool: {exc}")


async def store_candidate_pool_batch(candidates: list[dict[str, Any]]) -> None:
    """Convenience helper to persist a batch of candidates into the talent pool."""
    for c in candidates:
        await store_candidate_embedding(c)


async def rerank_pool(job_query: str, limit: int = 10) -> list[dict[str, Any]]:
    """
    Search and re-rank the persistent candidate pool by semantic similarity
    to a job description or search prompt — zero SerpAPI / Groq calls.
    """
    if not job_query or not job_query.strip():
        return []

    model = _get_model(settings.embedding_model)
    query_vec_str = None
    if model is not None:
        try:
            query_vec = model.encode(job_query, normalize_embeddings=True).tolist()
            query_vec_str = "[" + ",".join(f"{x:.6f}" for x in query_vec) + "]"
        except Exception as exc:
            logger.warning(f"[CandidatePool] Query embedding failed: {exc}")

    try:
        pool = await get_pool()
    except Exception as exc:
        logger.error(f"[CandidatePool] Database connection failed during rerank: {exc}")
        return []

    try:
        async with pool.acquire() as conn:
            # Ensure table exists (idempotent)
            await conn.execute(_DDL)
            try:
                await conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS candidate_embeddings_vec_idx
                    ON candidate_embeddings USING ivfflat (embedding vector_cosine_ops);
                    """
                )
            except Exception as exc:
                logger.warning(f"[CandidatePool] IVFFlat index initialization note: {exc}")

            if query_vec_str:
                rows = await conn.fetch(
                    """
                    SELECT profile_json,
                           1 - (embedding <=> $1) AS similarity
                    FROM candidate_embeddings
                    WHERE embedding IS NOT NULL
                    ORDER BY embedding <=> $1
                    LIMIT $2;
                    """,
                    query_vec_str,
                    limit,
                )
                results = []
                for r in rows:
                    try:
                        profile = json.loads(r["profile_json"])
                        sim = max(0.0, min(1.0, float(r["similarity"])))
                        score = round(sim * 100)
                        profile["pool_similarity"] = score
                        profile["match_score"] = score
                        profile["source"] = profile.get("source") or "talent_pool"
                        results.append(profile)
                    except Exception as parse_err:
                        logger.warning(f"[CandidatePool] Failed parsing profile JSON: {parse_err}")
                return results

            # Fallback: if embedding model is not yet loaded, perform text ILIKE matching
            keywords = [w.strip() for w in job_query.split() if len(w.strip()) > 2][:4]
            conditions: list[str] = []
            params: list[Any] = []
            for i, kw in enumerate(keywords, start=1):
                conditions.append(f"profile_json::text ILIKE ${i}")
                params.append(f"%{kw}%")
            where_clause = " OR ".join(conditions) or "TRUE"
            params.append(limit)
            # where_clause contains only hardcoded column names/operators (profile_json::text ILIKE $n);
            # user-supplied keyword values go through asyncpg parameterized *params, never string-interpolated.
            fallback_sql = f"SELECT profile_json, 0.75 AS similarity FROM candidate_embeddings WHERE {where_clause} ORDER BY created_at DESC LIMIT ${len(params)};"  # nosec B608
            rows = await conn.fetch(fallback_sql, *params)

            results = []
            for r in rows:
                profile = json.loads(r["profile_json"])
                profile["pool_similarity"] = 75
                profile["match_score"] = 75
                profile["source"] = profile.get("source") or "talent_pool"
                results.append(profile)
            return results

    except Exception as exc:
        logger.error(f"[CandidatePool] Error querying candidate pool: {exc}")
        return []
