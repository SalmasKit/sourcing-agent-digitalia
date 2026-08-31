"""
enrich_profile.py — LinkedIn profile enrichment via ScrapingDog (1,000 free credits) or RapidAPI.

Flow:
    1. Check monthly quota (PostgreSQL counter) — skip immediately if exceeded.
    2. Call ScrapingDog (or RapidAPI) endpoint with profile ID/URL.
    3. Parse response into EnrichedProfile (real education, experience, skills).
    4. On any failure (timeout, 4xx, 5xx, parse error): return None → caller uses snippet fallback.
    5. Quota counter is incremented ONLY on a successful (200) response.
"""
import asyncio
import calendar
import logging
import re
from datetime import datetime, timezone
from typing import Any, Literal

import asyncpg
import httpx
from pydantic import BaseModel, field_validator

from src.config import get_settings

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
    now = datetime.now(tz=timezone.utc)
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
                conn: asyncpg.Connection = await asyncpg.connect(
                    settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
                )
                await conn.execute(_DDL)
                await conn.close()
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
            conn: asyncpg.Connection = await asyncpg.connect(
                settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
            )
            row = await conn.fetchrow(
                "SELECT calls_used FROM enrichment_quotas WHERE month = $1",
                _current_month_key(),
            )
            await conn.close()
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
            conn: asyncpg.Connection = await asyncpg.connect(
                settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
            )
            try:
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
            finally:
                await conn.close()

        except Exception as exc:
            # If DB is unreachable, allow the call to proceed (fail open) and log.
            logger.warning(
                f"[QuotaManager] DB error during quota check: {exc}. "
                "Proceeding without quota enforcement."
            )
            return True


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Date & Period Formatting Helpers
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


# ---------------------------------------------------------------------------
# RapidAPI / ScrapingDog response parser
# ---------------------------------------------------------------------------


def _parse_education(data: dict) -> list[EducationEntry]:
    """Parse the educations list from a LinkedIn profile scraper response."""
    educations: list[EducationEntry] = []
    raw_list = data.get("educations") or data.get("education") or data.get("schools") or []
    if not isinstance(raw_list, list):
        return educations

    for item in raw_list:
        if not isinstance(item, dict):
            continue
        institution = (
            item.get("college_name")
            or item.get("school")
            or item.get("college")
            or item.get("institution")
            or item.get("schoolName")
            or ""
        ).strip()
        if not institution:
            continue

        degree = (item.get("college_degree") or item.get("degree") or item.get("degreeName") or item.get("degree_name") or "").strip() or None
        field = (item.get("college_degree_field") or item.get("field") or item.get("fieldOfStudy") or item.get("field_of_study") or "").strip() or None

        start_raw = item.get("starts_at") or item.get("start") or item.get("startDate") or item.get("start_year") or item.get("start_date")
        end_raw = item.get("ends_at") or item.get("end") or item.get("endDate") or item.get("end_year") or item.get("end_date")

        start_year: int | None = None
        end_year: int | None = None

        if start_raw:
            if isinstance(start_raw, dict):
                y = start_raw.get("year")
                if y:
                    try:
                        start_year = int(y)
                    except ValueError:
                        pass
            else:
                years = re.findall(r"\b(19\d\d|20\d\d)\b", str(start_raw))
                if years:
                    start_year = int(years[0])

        if end_raw:
            if isinstance(end_raw, dict):
                y = end_raw.get("year")
                if y:
                    try:
                        end_year = int(y)
                    except ValueError:
                        pass
            else:
                years = re.findall(r"\b(19\d\d|20\d\d)\b", str(end_raw))
                if years:
                    end_year = int(years[0])

        duration = item.get("college_duration") or item.get("period") or item.get("duration")
        if not start_year and duration:
            years = re.findall(r"\b(19\d\d|20\d\d)\b", str(duration))
            if len(years) >= 2:
                start_year = int(years[0])
                end_year = int(years[1])
            elif len(years) == 1:
                start_year = int(years[0])

        if start_year and end_year:
            period_str = f"{start_year} - {end_year}"
        elif start_year:
            period_str = f"Since {start_year}"
        elif end_year:
            period_str = f"Graduated {end_year}"
        elif duration and str(duration).strip():
            period_str = str(duration).strip()
        else:
            period_str = "Graduated"

        display_degree = degree or (f"Degree in {field}" if field else "Higher Education")

        educations.append(
            EducationEntry(
                institution=institution,
                degree=display_degree,
                field_of_study=field,
                period=period_str,
                start_year=start_year,
                end_year=end_year,
                description=f"Studied {display_degree} at {institution}." if institution else None,
            )
        )

    return educations


def _parse_experience(data: dict) -> list[ExperienceEntry]:
    """Parse the experiences list from a LinkedIn profile scraper response."""
    experiences: list[ExperienceEntry] = []
    raw_list = data.get("experiences") or data.get("experience") or data.get("positions") or []
    if not isinstance(raw_list, list):
        return experiences

    for idx, item in enumerate(raw_list):
        if not isinstance(item, dict):
            continue
        company = (
            item.get("company_name")
            or item.get("company")
            or item.get("companyName")
            or item.get("organization")
            or ""
        ).strip()
        title = (
            item.get("position")
            or item.get("title")
            or item.get("role")
            or ""
        ).strip()
        if not company or not title or "*" in company or "*" in title:
            continue


        start_raw = item.get("starts_at") or item.get("start") or item.get("startDate") or item.get("start_date")
        end_raw = item.get("ends_at") or item.get("end") or item.get("endDate") or item.get("end_date")

        is_curr = item.get("is_current") or item.get("current")
        if is_curr is None:
            is_curr = (idx == 0 and end_raw is None)
        else:
            is_curr = bool(is_curr)

        start = format_period_date(start_raw)
        end = format_period_date(end_raw)
        duration = item.get("duration") or item.get("period")

        period_str = build_experience_period(
            start_raw=start_raw,
            end_raw=end_raw,
            is_current=is_curr,
            duration_raw=duration if isinstance(duration, str) and not ("-" in duration) else None,
            default_role_period="Current Position" if idx == 0 else "Past Role",
        )

        if isinstance(duration, str) and ("-" in duration or "Present" in duration or "ans" in duration or "yrs" in duration):
            period_str = duration.strip()

        description = (item.get("summary") or item.get("description") or "").strip() or None

        experiences.append(
            ExperienceEntry(
                company=company or "Unknown Company",
                title=title or "Professional",
                role=title or "Professional",
                period=period_str,
                start=start,
                end=end,
                description=description,
            )
        )

    return experiences


def _parse_skills(data: dict) -> list[str]:
    """Extract a flat list of skill strings from a RapidAPI LinkedIn response."""
    raw = data.get("skills") or []
    if not isinstance(raw, list):
        return []
    skills: list[str] = []
    for item in raw:
        if isinstance(item, str):
            s = item.strip()
            if s:
                skills.append(s)
        elif isinstance(item, dict):
            s = (item.get("name") or item.get("skill") or "").strip()
            if s:
                skills.append(s)
    return skills


def clean_4_line_summary(
    raw_summary: str,
    full_name: str,
    headline: str,
    experiences: list[ExperienceEntry],
    educations: list[EducationEntry],
    skills: list[str],
) -> str:
    """
    Format executive bio / description into max 4 complete, professional lines.
    """
    lines: list[str] = []

    # 1. Try extracting clean, full sentences from raw_summary if available
    if raw_summary and len(raw_summary.strip()) > 30:
        cleaned = re.sub(r"\s+", " ", raw_summary).strip()
        raw_sentences = [
            s.strip() for s in re.split(r"(?<=[.!?])\s+", cleaned)
            if len(s.strip()) > 15 and not s.strip().endswith("...")
        ]
        for s in raw_sentences:
            if not s.endswith((".", "!", "?")):
                s = s + "."
            if s not in lines and len(lines) < 4:
                lines.append(s)

    # 2. If fewer than 4 sentences, construct structured, complete sentences
    if len(lines) == 0:
        role = headline or (experiences[0].title if experiences else "Professional")
        comp = experiences[0].company if experiences else ""
        if comp and comp not in ("Unknown Company", "See LinkedIn Profile"):
            line1 = f"{full_name} is an experienced {role} currently at {comp}."
        else:
            line1 = f"{full_name} is an established professional working as {role}."
        lines.append(line1)

    if len(lines) < 2 and skills:
        top_skills = ", ".join(skills[:5])
        lines.append(f"Demonstrates specialized technical expertise in {top_skills}.")

    if len(lines) < 3 and experiences and len(experiences) > 1:
        past_roles = [
            f"{exp.title} at {exp.company}"
            for exp in experiences[1:3]
            if exp.company not in ("Unknown Company", "See LinkedIn Profile")
        ]
        if past_roles:
            lines.append(f"Career background includes key deliverables as {', and '.join(past_roles)}.")

    if len(lines) < 4 and educations:
        edu = educations[0]
        deg = edu.degree or "higher education"
        lines.append(f"Holds qualifications in {deg} from {edu.institution}.")

    if len(lines) < 4:
        lines.append("Proven capability in delivering high-impact initiatives and driving organizational success.")

    # Return exactly up to 4 complete lines
    final_lines = [l.strip() for l in lines[:4] if l.strip()]
    return " ".join(final_lines)


def _parse_profile_response(data: dict | list) -> EnrichedProfile | None:
    """
    Convert a ScrapingDog or RapidAPI LinkedIn profile response into an EnrichedProfile.
    """
    if isinstance(data, list):
        if not data:
            return None
        profile = data[0] if isinstance(data[0], dict) else {}
    elif isinstance(data, dict):
        profile = data.get("data") or data
    else:
        return None

    first = (profile.get("firstName") or profile.get("first_name") or "").strip()
    last = (profile.get("lastName") or profile.get("last_name") or "").strip()
    full_name = (
        profile.get("fullName")
        or profile.get("full_name")
        or profile.get("name")
        or ""
    ).strip()
    if not full_name and (first or last):
        full_name = f"{first} {last}".strip()
    if not full_name:
        return None  # no usable name

    headline = (profile.get("headline") or profile.get("title") or profile.get("occupation") or "").strip() or None
    education = _parse_education(profile)
    experience = _parse_experience(profile)
    skills = _parse_skills(profile)

    raw_summary = (
        profile.get("about")
        or profile.get("description")
        or profile.get("summary")
        or ""
    ).strip()
    summary = clean_4_line_summary(
        raw_summary=raw_summary,
        full_name=full_name,
        headline=headline or "",
        experiences=experience,
        educations=education,
        skills=skills,
    )

    return EnrichedProfile(
        full_name=full_name,
        headline=headline,
        summary=summary,
        education=education,
        experience=experience,
        skills=skills,
        raw_source="enriched",
    )


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


def extract_real_education_from_text(full_text: str) -> list[EducationEntry]:
    """Deprecated: avoid speculative text extraction that causes hallucinations."""
    return []



def _parse_apollo_person(person: dict, snippet_hint: str = "") -> EnrichedProfile | None:
    """Parse Apollo.io person record into structured EnrichedProfile with real education and current job on top."""
    if not isinstance(person, dict) or not person:
        return None

    first = (person.get("first_name") or "").strip()
    last = (person.get("last_name") or "").strip()
    raw_name = (person.get("name") or f"{first} {last}").strip()
    if raw_name in ("None None", "None", "", "null", "null null", "Candidate"):
        raw_name = ""
    full_name = raw_name or "Candidate"

    top_current_title = (person.get("title") or "").strip()
    raw_headline = (person.get("headline") or top_current_title).strip()
    headline = raw_headline or "Software Engineering Professional"

    org_name = ""
    if isinstance(person.get("organization"), dict):
        org_name = (person["organization"].get("name") or "").strip()

    experiences: list[ExperienceEntry] = []
    educations: list[EducationEntry] = []

    # 1. Parse employment history (latest/current job on top)
    raw_eh = person.get("employment_history", [])
    if isinstance(raw_eh, list):
        for idx, item in enumerate(raw_eh):
            if not isinstance(item, dict):
                continue
            deg = item.get("degree") or item.get("major")
            if deg:
                inst = (item.get("organization_name") or "University").strip()
                deg_str = str(deg).strip()
                s_raw = item.get("start_date")
                e_raw = item.get("end_date")
                s_date = format_period_date(s_raw) or (str(s_raw)[:4] if s_raw else "")
                e_date = format_period_date(e_raw) or (str(e_raw)[:4] if e_raw else "")
                p_str = f"{s_date} - {e_date}".strip(" -") or "Graduated"
                educations.append(
                    EducationEntry(
                        institution=inst,
                        degree=deg_str,
                        period=p_str,
                        description=f"Studied {deg_str} at {inst}."
                    )
                )
            else:
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

    # 3. Parse education history if separate in Apollo
    raw_edu = person.get("education_history") or person.get("educations") or []
    if isinstance(raw_edu, list):
        for edu in raw_edu:
            if not isinstance(edu, dict):
                continue
            inst = (edu.get("school") or edu.get("institution") or edu.get("organization_name") or "").strip()
            if not inst or inst.lower() in ("university", "unknown", "n/a", "none", "enseignement supérieur"):
                continue
            deg = (edu.get("degree") or edu.get("field_of_study") or edu.get("major") or "").strip() or inst
            s_raw = edu.get("start_date") or edu.get("start_year")
            e_raw = edu.get("end_date") or edu.get("end_year")
            s_date = format_period_date(s_raw) or (str(s_raw)[:4] if s_raw else "")
            e_date = format_period_date(e_raw) or (str(e_raw)[:4] if e_raw else "")
            p_str = f"{s_date} - {e_date}".strip(" -") if (s_date or e_date) else (edu.get("period") or "Diplômé(e)")
            educations.append(
                EducationEntry(
                    institution=inst,
                    degree=deg,
                    period=p_str,
                    description=f"Formation : {deg} à {inst}." if deg != inst else f"Études à {inst}."
                )
            )


    # 5. Extract skills
    skills_set: list[str] = []
    for dept in (person.get("departments") or []) + (person.get("functions") or []):
        if isinstance(dept, str) and dept.strip() and dept.strip() not in skills_set:
            skills_set.append(dept.strip().title())

    # 6. Clean 4-line executive summary
    raw_summary = (person.get("headline") or person.get("title") or "").strip()
    summary = clean_4_line_summary(
        raw_summary=raw_summary,
        full_name=full_name,
        headline=headline,
        experiences=experiences,
        educations=educations,
        skills=skills_set,
    )

    return EnrichedProfile(
        full_name=full_name,
        headline=headline,
        summary=summary,
        education=educations,
        experience=experiences,
        skills=skills_set,
        raw_source="enriched",
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


_scrapingdog_exhausted: bool = False       # circuit breaker — set True on 402/403
_scrapingdog_exhausted_for_key: str = ""   # which key triggered the exhaustion
_scrapingdog_semaphore: asyncio.Semaphore | None = None  # rate-limit throttle


async def enrich_candidate(linkedin_url: str, snippet_hint: str = "") -> EnrichedProfile | None:
    """
    Fetch structured LinkedIn data for a candidate via Apollo.io (primary)
    or ScrapingDog (fallback). Returns None when services are unavailable.
    """
    global _scrapingdog_exhausted, _scrapingdog_exhausted_for_key

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

    current_dog_key = settings.scrapingdog_api_key.strip()
    if _scrapingdog_exhausted and _scrapingdog_exhausted_for_key != current_dog_key:
        _scrapingdog_exhausted = False
        _scrapingdog_exhausted_for_key = ""

    # --- Quota check (atomic DB upsert) ---
    allowed = await QuotaManager.check_and_increment()
    if not allowed:
        return None

    # -----------------------------------------------------------------------
    # 1. Primary Engine: Apollo.io
    # -----------------------------------------------------------------------
    apollo_key = (settings.apollo_api_key or "").strip()
    if apollo_key:
        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                headers = {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache",
                    "X-Api-Key": apollo_key,
                }
                payload_data = {"api_key": apollo_key, "linkedin_url": url}
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
            elif apollo_resp.status_code == 429:
                logger.warning(f"🔑 [API Monitor] ⚠️ Apollo.io: 429 Rate limit reached (Key: {apollo_key[:6]}...).")
            elif apollo_resp.status_code in (401, 402, 403):
                logger.error(f"🔑 [API Monitor] 🔴 Apollo.io: Quota Exhausted / Invalid Key (HTTP {apollo_resp.status_code}).")
            else:
                logger.debug(f"🔑 [API Monitor] ℹ️ Apollo.io: Status {apollo_resp.status_code} for {url}.")
        except Exception as apollo_err:
            logger.warning(f"🔑 [API Monitor] ⚠️ Apollo.io request error: {apollo_err}")

    # -----------------------------------------------------------------------
    # 2. Fallback Engine: ScrapingDog
    # -----------------------------------------------------------------------
    current_key = settings.scrapingdog_api_key.strip()
    if not current_key or (_scrapingdog_exhausted and _scrapingdog_exhausted_for_key == current_key):
        await _decrement_quota_on_failure()
        return None

    slug_match = re.search(r"linkedin\.com/in/([^/?#]+)", url, re.IGNORECASE)
    profile_slug = slug_match.group(1).rstrip("/") if slug_match else ""

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            target_id = profile_slug or url
            api_url = "https://api.scrapingdog.com/profile/"
            params = {
                "api_key": current_key,
                "type": "profile",
                "id": target_id,
            }
            response = await client.get(api_url, params=params)

        if response.status_code in (402, 403):
            _scrapingdog_exhausted = True
            _scrapingdog_exhausted_for_key = current_key
            logger.warning(
                f"[enrich_candidate] ScrapingDog credits exhausted (HTTP {response.status_code})."
            )
            await _decrement_quota_on_failure()
            return None

        if response.status_code == 429:
            logger.warning(f"[enrich_candidate] ScrapingDog rate-limited (429) for {url}.")
            await _decrement_quota_on_failure()
            return None

        if response.status_code != 200:
            await _decrement_quota_on_failure()
            return None

        payload = response.json()
        enriched = _parse_profile_response(payload)
        if enriched is None:
            await _decrement_quota_on_failure()
            return None

        logger.info(
            f"[enrich_candidate] ✅ ScrapingDog Enriched '{enriched.full_name}' — "
            f"{len(enriched.education)} edu, {len(enriched.experience)} exp, "
            f"{len(enriched.skills)} skills."
        )
        return enriched

    except httpx.TimeoutException:
        logger.warning(f"[enrich_candidate] Timeout fetching {url}. Using snippet fallback.")
        await _decrement_quota_on_failure()
        return None
    except Exception as exc:
        logger.warning(f"[enrich_candidate] Unexpected error for {url}: {exc}")
        await _decrement_quota_on_failure()
        return None


async def _decrement_quota_on_failure() -> None:
    """
    Best-effort quota rollback when a pre-incremented call ultimately fails.
    Silently swallows any DB errors to avoid masking the original failure.
    """
    month = _current_month_key()
    try:
        conn: asyncpg.Connection = await asyncpg.connect(
            settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
        )
        await conn.execute(
            """
            UPDATE enrichment_quotas
               SET calls_used = GREATEST(0, calls_used - 1)
             WHERE month = $1
            """,
            month,
        )
        await conn.close()
    except Exception as exc:
        logger.debug(f"[_decrement_quota_on_failure] Could not rollback quota: {exc}")
