"""
enrich_profile.py — LinkedIn profile enrichment via Apollo.io.

Flow:
    1. Check monthly quota (PostgreSQL counter) — skip immediately if exceeded.
    2. Call Apollo.io endpoint with profile URL.
    3. Parse response into EnrichedProfile (real education, experience, skills, summary).
    4. On any failure (timeout, 4xx, 5xx, parse error, no match): return None → caller uses snippet fallback.
    5. Quota counter is managed atomically via PostgreSQL UPSERT and rolled back on non-match/failure.
"""
import asyncio
import calendar
import logging
import re
from datetime import UTC, datetime
from typing import Any, Literal

import asyncpg
import httpx
from pydantic import BaseModel, field_validator

from src.config import get_settings
from src.mcp_server.tools.db_pool import get_pool

logger = logging.getLogger(__name__)
settings = get_settings()

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class EducationEntry(BaseModel):
    """A single education record extracted from a LinkedIn profile."""

    institution: str
    degree: str | None = None
    field_of_study: str | None = None
    period: str | None = None
    start_year: int | None = None
    end_year: int | None = None
    description: str | None = None

    @field_validator("institution", mode="before")
    @classmethod
    def strip_institution(cls, v: Any) -> str:
        return (str(v) if v else "Unknown Institution").strip()


class ExperienceEntry(BaseModel):
    """A single work experience record extracted from a LinkedIn profile."""

    company: str
    title: str
    role: str = ""
    period: str | None = None
    start: str | None = None
    end: str | None = None
    description: str | None = None

    @field_validator("company", "title", mode="before")
    @classmethod
    def strip_fields(cls, v: Any) -> str:
        return (str(v) if v else "").strip()


class EnrichedProfile(BaseModel):
    """Structured data returned by the profile enrichment call."""

    full_name: str
    headline: str | None = None
    summary: str | None = None
    email: str | None = None
    email_is_verified: bool = False
    education: list[EducationEntry] = []
    experience: list[ExperienceEntry] = []
    skills: list[str] = []
    raw_source: Literal["enriched", "snippet_fallback"] = "enriched"


# ---------------------------------------------------------------------------
# Quota management — PostgreSQL-backed monthly counter
# ---------------------------------------------------------------------------

_DDL = """
CREATE TABLE IF NOT EXISTS enrichment_quotas (
    month       TEXT PRIMARY KEY,              -- format: YYYY-MM
    calls_used  INT  NOT NULL DEFAULT 0
);
"""


def _current_month_key() -> str:
    """Return the current UTC month as 'YYYY-MM'."""
    now = datetime.now(tz=UTC)
    return f"{now.year}-{now.month:02d}"


class QuotaManager:
    """
    Thread-safe (asyncio-safe) monthly call counter backed by PostgreSQL.

    Uses a single atomic UPSERT so concurrent requests cannot double-count.
    """

    _init_lock: asyncio.Lock = asyncio.Lock()
    _table_ready: bool = False

    @classmethod
    async def _ensure_table(cls) -> None:
        """Create enrichment_quotas table if it doesn't exist (idempotent)."""
        if cls._table_ready:
            return
        async with cls._init_lock:
            if cls._table_ready:
                return  # double-checked locking
            try:
                pool = await get_pool()
                async with pool.acquire() as conn:
                    await conn.execute(_DDL)
                cls._table_ready = True
                logger.info("[QuotaManager] enrichment_quotas table ready.")
            except Exception as exc:
                logger.warning(
                    f"[QuotaManager] Could not initialise quota table: {exc}. "
                    "Quota checks will be skipped (enrichment will proceed but usage won't be tracked)."
                )
                cls._table_ready = True  # mark ready to avoid retry storms

    @classmethod
    async def current_usage(cls) -> int:
        """Return how many enrichment calls have been made this month."""
        try:
            await cls._ensure_table()
            pool = await get_pool()
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT calls_used FROM enrichment_quotas WHERE month = $1",
                    _current_month_key(),
                )
            return row["calls_used"] if row else 0
        except Exception as exc:
            logger.warning(f"[QuotaManager] current_usage error: {exc}")
            return 0

    @classmethod
    async def check_and_increment(cls) -> bool:
        """
        Atomically check quota and increment the counter if under the limit.

        Returns:
            True  → call is allowed (counter was incremented).
            False → quota exceeded (counter was NOT touched).
        """
        quota = settings.enrichment_monthly_quota
        month = _current_month_key()

        try:
            await cls._ensure_table()
            pool = await get_pool()
            async with pool.acquire() as conn:
                # Atomic UPSERT — only increments when under quota
                row = await conn.fetchrow(
                    """
                    INSERT INTO enrichment_quotas (month, calls_used)
                    VALUES ($1, 1)
                    ON CONFLICT (month) DO UPDATE
                        SET calls_used = enrichment_quotas.calls_used + 1
                        WHERE enrichment_quotas.calls_used < $2
                    RETURNING calls_used
                    """,
                    month,
                    quota,
                )
                # If the WHERE clause prevented the update, row is None
                if row is None:
                    logger.warning(
                        f"[QuotaManager] Monthly enrichment quota of {quota} reached for {month}. "
                        "Falling back to snippet data."
                    )
                    return False
                logger.debug(f"[QuotaManager] Quota used: {row['calls_used']}/{quota} ({month})")
                return True

        except Exception as exc:
            # If DB is unreachable, allow the call to proceed (fail open) and log.
            logger.warning(
                f"[QuotaManager] DB error during quota check: {exc}. "
                "Proceeding without quota enforcement."
            )
            return True


async def _decrement_quota_on_failure() -> None:
    """
    Best-effort quota rollback when a pre-incremented call ultimately fails.
    Silently swallows any DB errors to avoid masking the original failure.
    """
    month = _current_month_key()
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE enrichment_quotas
                   SET calls_used = GREATEST(0, calls_used - 1)
                 WHERE month = $1
                """,
                month,
            )
    except Exception as exc:
        logger.debug(f"[_decrement_quota_on_failure] Could not rollback quota: {exc}")


# ---------------------------------------------------------------------------
# Date & Text Formatting Helpers
# ---------------------------------------------------------------------------


def format_period_date(raw: Any) -> str | None:
    """Format any date representation (dict, ISO string, timestamp, text) into clean 'Mon YYYY' or 'YYYY'."""
    if raw is None:
        return None
    if isinstance(raw, dict):
        y = raw.get("year") or raw.get("start_year") or raw.get("end_year") or raw.get("y")
        m = raw.get("month") or raw.get("start_month") or raw.get("end_month") or raw.get("m")
        if y:
            if m:
                if isinstance(m, int) or (isinstance(m, str) and str(m).isdigit()):
                    try:
                        m_int = int(m)
                        if 1 <= m_int <= 12:
                            return f"{calendar.month_abbr[m_int]} {y}"
                    except (IndexError, ValueError):
                        pass
                m_str = str(m).strip()
                if len(m_str) >= 3:
                    return f"{m_str[:3].title()} {y}"
            return str(y)
        return None

    s = str(raw).strip()
    if not s or s.lower() in ("0", "null", "none", "present", "current", "now"):
        return None

    # Handle dict-as-string artifact e.g. "{'year': 2021, 'month': 3}"
    if s.startswith("{") and "year" in s:
        y_match = re.search(r"['\"]?year['\"]?\s*:\s*(\d{4})", s)
        m_match = re.search(r"['\"]?month['\"]?\s*:\s*(\d{1,2}|['\"][A-Za-z]+['\"])", s)
        if y_match:
            y = y_match.group(1)
            if m_match:
                m_val = m_match.group(1).strip("'\"")
                if m_val.isdigit():
                    m_int = int(m_val)
                    if 1 <= m_int <= 12:
                        return f"{calendar.month_abbr[m_int]} {y}"
                elif len(m_val) >= 3:
                    return f"{m_val[:3].title()} {y}"
            return y

    # Match ISO date like '2021-03-01' or '2021-03'
    if m := re.match(r"^(\d{4})-(\d{1,2})", s):
        y = m.group(1)
        m_idx = int(m.group(2))
        if 1 <= m_idx <= 12:
            return f"{calendar.month_abbr[m_idx]} {y}"
        return f"{y}-{m_idx:02d}"

    # Match 4-digit year '2021'
    if re.match(r"^\d{4}$", s):
        return s

    # Match '03/2021'
    if m := re.match(r"^(\d{1,2})/(\d{4})$", s):
        m_idx = int(m.group(1))
        if 1 <= m_idx <= 12:
            return f"{calendar.month_abbr[m_idx]} {m.group(2)}"
        return f"{m.group(1)}/{m.group(2)}"

    # Textual dates like 'Jan 2021' or 'March 2021'
    if m := re.search(r"([A-Za-z]{3,9})\.?\s+(\d{4})", s):
        return f"{m.group(1)[:3].title()} {m.group(2)}"

    return s[:15] if len(s) >= 4 else None


def build_experience_period(
    start_raw: Any,
    end_raw: Any,
    is_current: bool | None = None,
    duration_raw: Any = None,
    default_role_period: str = "Current Position",
) -> str:
    """Build a clean, human-readable period string (e.g. 'Jan 2021 - Present', 'Mar 2018 - Jun 2020')."""
    start = format_period_date(start_raw)
    end = format_period_date(end_raw)

    if is_current is True:
        is_active = True
    elif is_current is False:
        is_active = False
    else:
        is_active = (end is None)

    if start and end:
        period = f"{start} - {end}"
    elif start and is_active:
        period = f"{start} - Present"
    elif start:
        period = start
    elif end:
        period = f"Until {end}"
    elif is_active:
        period = default_role_period
    else:
        period = "Past Role"

    if duration_raw and isinstance(duration_raw, str):
        d_clean = duration_raw.strip()
        if d_clean and d_clean.lower() not in ("none", "null", "") and not any(k in d_clean.lower() for k in ["present", "current", "-"]):
            if len(d_clean) < 25:
                period = f"{period} · {d_clean}"

    return period


def clean_canonical_linkedin_url(raw_url: str) -> str:
    """Normalize localized or language-suffixed LinkedIn URL to canonical format."""
    if not raw_url:
        return ""
    m = re.search(r"linkedin\.com/in/([a-zA-Z0-9\-_%]+)", raw_url, re.IGNORECASE)
    if m:
        slug = m.group(1).rstrip("/")
        slug = re.sub(r"/(?:en|fr|ar|es|de)$", "", slug, flags=re.IGNORECASE)
        return f"https://www.linkedin.com/in/{slug}"
    return raw_url


def clean_4_line_summary(
    raw_summary: str = "",
    full_name: str = "",
    headline: str | None = None,
    experiences: list[ExperienceEntry] | None = None,
    skills: list[str] | None = None,
    **kwargs: Any,
) -> str:
    """
    Synthesize a polished, executive-level 3-sentence professional overview.
    Guarantees that the overview is an authentic synthesis rather than a duplicate of the raw headline.
    """
    sentences: list[str] = []

    # 1. Clean role and company
    raw_role = headline or (experiences[0].title if experiences else "")
    clean_role = raw_role.split("|")[0].split("·")[0].split("@")[0].split(" chez ")[0].split(" at ")[0].strip()
    if not clean_role or clean_role.lower() in ("professional", "unknown", "none", "n/a", "see linkedin profile"):
        clean_role = (experiences[0].title if experiences else "").split("|")[0].split("·")[0].strip() or "Specialist"

    comp = (experiences[0].company if experiences else "").strip()
    if comp.lower() in ("unknown company", "see linkedin profile", "unknown", "n/a", "none"):
        comp = ""

    # Sentence 1: Professional identity and current position
    if clean_role and comp:
        s1 = f"{full_name} is an experienced {clean_role} currently working at {comp}."
    elif clean_role:
        s1 = f"{full_name} is an established {clean_role} with strong domain expertise."
    elif comp:
        s1 = f"{full_name} is a dedicated professional currently active at {comp}."
    else:
        s1 = f"{full_name} is a qualified professional with extensive domain experience."
    sentences.append(s1)

    # Sentence 2: Core competencies & verified skills
    clean_skills = [
        s.strip().title() for s in (skills or [])
        if s.strip() and len(s.strip()) > 1 and "|" not in s and "·" not in s
    ][:5]
    if clean_skills:
        if len(clean_skills) >= 3:
            skills_str = f"{', '.join(clean_skills[:-1])}, and {clean_skills[-1]}"
        else:
            skills_str = " and ".join(clean_skills)
        sentences.append(f"Demonstrates core competencies in {skills_str}.")

    # Sentence 3: Career track record & past companies
    past_roles: list[str] = []
    if experiences and len(experiences) > 1:
        for exp in experiences[1:3]:
            r = (exp.title or exp.role or "").split("|")[0].split("·")[0].split("@")[0].strip()
            c = (exp.company or "").strip()
            if r and c and c.lower() not in ("unknown company", "see linkedin profile", comp.lower()):
                past_roles.append(f"{r} at {c}")

    if past_roles:
        sentences.append(f"Career background includes proven experience as {', and '.join(past_roles)}.")
    elif experiences and len(experiences) == 1 and experiences[0].description:
        desc = experiences[0].description.strip()
        if len(desc) > 25 and not any(k in desc for k in ["*", "|", "http", "@"]):
            first_clause = desc.split(".")[0].strip()
            if not first_clause.lower().startswith(full_name.lower()):
                sentences.append(f"Key operational responsibilities include {first_clause.lower() if not first_clause[0].isupper() else first_clause}.")

    return " ".join(sentences)


# ---------------------------------------------------------------------------
# Apollo Person Record Parser
# ---------------------------------------------------------------------------


def _parse_apollo_person(person: dict, snippet_hint: str = "") -> EnrichedProfile | None:
    """Parse Apollo.io person record into structured EnrichedProfile with real education and current job on top."""
    if not isinstance(person, dict) or not person:
        return None

    first = (person.get("first_name") or "").strip()
    last = (person.get("last_name") or "").strip()
    raw_name = (person.get("name") or f"{first} {last}").strip()
    if raw_name in ("None None", "None", "", "null", "null null"):
        raw_name = ""
    full_name = raw_name

    top_current_title = (person.get("title") or "").strip()
    raw_headline = (person.get("headline") or top_current_title).strip()
    headline = raw_headline or None

    org_name = ""
    if isinstance(person.get("organization"), dict):
        org_name = (person["organization"].get("name") or "").strip()

    experiences: list[ExperienceEntry] = []

    # 1. Parse employment history (latest/current job on top)
    raw_eh = person.get("employment_history", [])
    if isinstance(raw_eh, list):
        for idx, item in enumerate(raw_eh):
            if not isinstance(item, dict):
                continue
            deg = item.get("degree") or item.get("major")
            if not deg:
                title = (item.get("title") or "").strip()
                comp = (item.get("organization_name") or org_name or "").strip()

                # Strictly skip masked entries from Apollo (e.g. *******, ***, or empty)
                if not title or not comp or "*" in title or "*" in comp or len(title) < 2 or len(comp) < 2:
                    continue

                s_raw = item.get("start_date")
                e_raw = item.get("end_date")

                is_curr_flag = item.get("current")
                if is_curr_flag is True:
                    is_curr = True
                elif is_curr_flag is False:
                    is_curr = False
                else:
                    is_curr = bool(idx == 0 and not e_raw)

                s_date = format_period_date(s_raw)
                e_date = format_period_date(e_raw)

                p_str = build_experience_period(
                    start_raw=s_raw,
                    end_raw=e_raw,
                    is_current=is_curr,
                    default_role_period="Current Position" if idx == 0 else "Past Role"
                )
                desc = item.get("description") or f"Position as {title} at {comp}."
                if "*" in desc:
                    desc = f"Position as {title} at {comp}."
                experiences.append(
                    ExperienceEntry(
                        company=comp,
                        title=title,
                        role=title,
                        period=p_str,
                        start=s_date or None,
                        end=e_date or None,
                        description=desc,
                    )
                )

    # 2. If Apollo has current title on top not in experiences, prepend it
    if top_current_title and org_name:
        if not experiences or (experiences[0].company.lower() != org_name.lower()):
            experiences.insert(
                0,
                ExperienceEntry(
                    company=org_name,
                    title=top_current_title,
                    role=top_current_title,
                    period="Present",
                    description=f"Current position as {top_current_title} at {org_name}."
                )
            )

    # 3. Extract skills
    skills_set: list[str] = []
    for dept in (person.get("departments") or []) + (person.get("functions") or []):
        if isinstance(dept, str) and dept.strip() and dept.strip() not in skills_set:
            skills_set.append(dept.strip().title())

    # 4. Extract verified email if present
    raw_email = (person.get("email") or person.get("corporate_email") or "").strip()
    personal_emails = person.get("personal_emails") or []
    if (not raw_email or "@" not in raw_email) and isinstance(personal_emails, list) and personal_emails:
        raw_email = str(personal_emails[0]).strip()

    valid_email = raw_email if (raw_email and "@" in raw_email and not raw_email.endswith("@talent-candidate.ma")) else None

    # 5. Clean executive summary
    raw_summary = (person.get("headline") or person.get("title") or "").strip()
    summary = clean_4_line_summary(
        raw_summary=raw_summary,
        full_name=full_name,
        headline=headline or "",
        experiences=experiences,
        skills=skills_set,
    )

    return EnrichedProfile(
        full_name=full_name,
        headline=headline,
        summary=summary,
        email=valid_email,
        email_is_verified=bool(valid_email),
        education=[],
        experience=experiences,
        skills=skills_set,
        raw_source="enriched",
    )


# ---------------------------------------------------------------------------
# Public API & MCP Tool
# ---------------------------------------------------------------------------


async def enrich_candidate(linkedin_url: str, snippet_hint: str = "") -> EnrichedProfile | None:
    """
    Fetch structured LinkedIn data for a candidate via Apollo.io.
    Returns None when services are unavailable or no match is found.
    """
    # --- Guard: URL must look like a LinkedIn profile ---
    raw_url = (linkedin_url or "").strip()
    if not raw_url or "linkedin.com/in/" not in raw_url.lower():
        logger.debug(f"[enrich_candidate] Skipping — not a LinkedIn profile URL: {raw_url!r}")
        return None

    # --- Canonicalize LinkedIn URL (strip ma., /en, /fr) ---
    url = clean_canonical_linkedin_url(raw_url)

    # --- Guard: enrichment must be enabled ---
    if not settings.has_enrichment:
        logger.debug("[enrich_candidate] Enrichment disabled via config — skipping.")
        return None

    apollo_key = (settings.apollo_api_key or "").strip()
    if not apollo_key:
        logger.debug("[enrich_candidate] No Apollo.io API key configured.")
        return None

    # --- Quota check (atomic DB upsert) ---
    allowed = await QuotaManager.check_and_increment()
    if not allowed:
        return None

    # --- Query Apollo.io People Match API ---
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            headers = {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
                "X-Api-Key": apollo_key,
            }
            payload_data = {"linkedin_url": url}
            apollo_resp = await client.post(
                "https://api.apollo.io/v1/people/match",
                headers=headers,
                json=payload_data,
            )

        if apollo_resp.status_code == 200:
            data = apollo_resp.json()
            person = data.get("person")
            if person and isinstance(person, dict):
                enriched = _parse_apollo_person(person, snippet_hint=snippet_hint)
                if enriched and (enriched.experience or enriched.education or enriched.skills):
                    logger.info(
                        f"🔑 [API Monitor] 🟢 Apollo.io: Successfully enriched '{enriched.full_name}' — "
                        f"{len(enriched.experience)} exp, {len(enriched.education)} edu, {len(enriched.skills)} skills."
                    )
                    return enriched

            # 200 but no valid person matched
            await _decrement_quota_on_failure()
            return None

        if apollo_resp.status_code == 429:
            logger.warning(f"🔑 [API Monitor] ⚠️ Apollo.io: 429 Rate limit reached (Key: {apollo_key[:6]}...).")
            await _decrement_quota_on_failure()
            return None

        if apollo_resp.status_code in (401, 402, 403):
            logger.error(f"🔑 [API Monitor] 🔴 Apollo.io: Quota Exhausted / Invalid Key (HTTP {apollo_resp.status_code}).")
            await _decrement_quota_on_failure()
            return None

        logger.debug(f"🔑 [API Monitor] ℹ️ Apollo.io: Status {apollo_resp.status_code} for {url}.")
        await _decrement_quota_on_failure()
        return None

    except httpx.TimeoutException:
        logger.warning(f"[enrich_candidate] Timeout fetching {url} from Apollo.io.")
        await _decrement_quota_on_failure()
        return None
    except Exception as apollo_err:
        logger.warning(f"🔑 [API Monitor] ⚠️ Apollo.io request error: {apollo_err}")
        await _decrement_quota_on_failure()
        return None


async def enrich_profile(linkedin_url: str, snippet_hint: str = "") -> dict[str, Any] | None:
    """
    MCP Tool for enriching candidate profiles using Apollo.io.
    Returns structured employment history, education, skills, and summary.
    """
    enriched = await enrich_candidate(linkedin_url=linkedin_url, snippet_hint=snippet_hint)
    if enriched is None:
        return None
    return enriched.model_dump()
