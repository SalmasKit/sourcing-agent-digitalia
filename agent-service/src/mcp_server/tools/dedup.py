"""
dedup.py — Cross-search candidate deduplication tool.

Maintains persistent fingerprints of sourced candidates in PostgreSQL
so repeat candidates across different sourcing sessions can be identified
and badged, rather than silently presented as novel candidates.
"""
import hashlib
import logging
import re
from typing import Any

from src.config import get_settings
from src.mcp_server.tools.db_pool import get_pool

logger = logging.getLogger(__name__)
settings = get_settings()

_DDL = """
CREATE TABLE IF NOT EXISTS seen_candidates (
    fingerprint TEXT PRIMARY KEY,
    linkedin_url TEXT,
    full_name TEXT,
    first_seen TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ DEFAULT now(),
    times_seen INT DEFAULT 1
);
"""

_table_initialized = False


def _canonical_fingerprint(profile: dict[str, Any]) -> str:
    """
    Build a stable fingerprint from LinkedIn URL, or name+company as fallback.

    - If a valid LinkedIn public profile slug exists: 'li:<slug>'
    - Fallback: 'nc:<md5(name+company)[:12]>'
      Note: The name+company fallback carries an accepted collision risk for
      different individuals sharing a common name at the same enterprise (e.g.
      two 'Mohammed Alaoui's at OCP Group). Because deduplication is purely
      informational (badging, not dropping), this false-positive trade-off
      avoids missing repeat sightings when URLs are omitted.
    """
    url = (profile.get("linkedin_url") or profile.get("source_url") or "").lower().strip()
    if url:
        slug_match = re.search(r"linkedin\.com/in/([a-z0-9\-_%]+)", url)
        if slug_match:
            slug = slug_match.group(1).rstrip("/")
            return f"li:{slug}"

    name = re.sub(r"[^a-z0-9]", "", (profile.get("full_name") or "").lower())
    company = re.sub(r"[^a-z0-9]", "", (profile.get("current_company") or profile.get("company") or "").lower())
    seed = f"{name}:{company}".encode()
    return f"nc:{hashlib.md5(seed, usedforsecurity=False).hexdigest()[:12]}"


async def filter_and_record_duplicates(profiles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Mark each profile with `is_duplicate` (bool) and `times_seen` (int),
    recording each observation in PostgreSQL seen_candidates.

    Does NOT drop duplicates — merely enriches them with deduplication metadata
    so the UI / recruiter has complete transparency.
    """
    if not profiles:
        return profiles

    try:
        pool = await get_pool()
    except Exception as exc:
        logger.warning(f"[Dedup] Database unavailable for deduplication: {exc}. Passing profiles through.")
        for p in profiles:
            p.setdefault("is_duplicate", False)
            p.setdefault("times_seen", 1)
        return profiles

    try:
        async with pool.acquire() as conn:
            # Ensure table exists (idempotent)
            await conn.execute(_DDL)

            for p in profiles:
                fp = _canonical_fingerprint(p)
                row = await conn.fetchrow(
                    """
                    INSERT INTO seen_candidates (fingerprint, linkedin_url, full_name)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (fingerprint) DO UPDATE
                        SET last_seen = now(),
                            times_seen = seen_candidates.times_seen + 1
                    RETURNING times_seen;
                    """,
                    fp,
                    p.get("linkedin_url") or "",
                    p.get("full_name") or "",
                )
                times = row["times_seen"] if row else 1
                p["is_duplicate"] = times > 1
                p["times_seen"] = times
                p["fingerprint"] = fp

        return profiles
    except Exception as exc:
        logger.error(f"[Dedup] Error recording candidate fingerprints: {exc}")
        for p in profiles:
            p.setdefault("is_duplicate", False)
            p.setdefault("times_seen", 1)
        return profiles
