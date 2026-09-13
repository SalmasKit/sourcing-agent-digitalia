"""
search_profiles.py — MCP Tool for searching candidate profiles via SerpAPI + Groq AI enrichment.
All location, education, and experience extraction is delegated to the AI — no hardcoded lists.
"""
import asyncio
import hashlib
import json
import logging
import re
from typing import Any

import httpx
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from src.agent.groq_circuit_breaker import get_groq_circuit_breaker
from src.config import get_settings
from src.mcp_server.tools.enrich_profile import ExperienceEntry, clean_4_line_summary
from src.metrics import serpapi_failures

logger = logging.getLogger(__name__)
settings = get_settings()

# Matches a LinkedIn profile slug wherever it appears in a URL/text field.
LINKEDIN_SLUG_RE = re.compile(r"linkedin\.com/in/([a-zA-Z0-9\-_%]+)", re.IGNORECASE)


def _resolve_linkedin_url(result: dict) -> str:
    """
    Extract a clean, direct linkedin.com/in/... URL from a SerpAPI organic result.

    SerpAPI's 'link' field can come back as a Google goto/consent redirect wrapper
    (e.g. 'https://.../goto/?url=CAESaw...') instead of the resolved destination —
    seen especially for gl=ma / gl=fr searches. That opaque token is NOT decodable
    client-side. Fall back to 'redirect_link' and 'displayed_link', which usually
    still expose the plain domain+path even when 'link' is wrapped.

    Returns "" if no field yields a real linkedin.com/in/<slug> URL — callers must
    skip the result in that case rather than storing a broken URL, since a broken
    URL silently disables downstream Apollo enrichment.
    """
    # First check the standard URL fields
    for field in ("link", "redirect_link", "displayed_link"):
        val = result.get(field, "") or ""
        m = LINKEDIN_SLUG_RE.search(val)
        if m:
            slug = m.group(1).rstrip("/")
            slug = re.sub(r"/(?:en|fr|ar|es|de)$", "", slug, flags=re.IGNORECASE)
            return f"https://www.linkedin.com/in/{slug}"

    # Fallback: check if title or snippet contains a LinkedIn URL
    for field in ("title", "snippet"):
        val = result.get(field, "") or ""
        m = LINKEDIN_SLUG_RE.search(val)
        if m:
            slug = m.group(1).rstrip("/")
            slug = re.sub(r"/(?:en|fr|ar|es|de)$", "", slug, flags=re.IGNORECASE)
            return f"https://www.linkedin.com/in/{slug}"

    return ""


async def _resolve_linkedin_url_via_redirect(client: httpx.AsyncClient, result: dict) -> str:
    """
    Last-resort resolver: follow Google's goto/redirect wrapper via HTTP to reach
    the real destination. Only called when _resolve_linkedin_url (field-based,
    free) finds nothing. Costs one network round-trip per unresolved result.
    """
    raw_link = result.get("link", "") or ""
    if not raw_link:
        return ""

    # Relative goto links (e.g. "/goto?url=...") need the google.com origin prefixed.
    target = raw_link if raw_link.startswith("http") else f"https://www.google.com{raw_link}"

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        resp = await client.get(target, headers=headers, follow_redirects=True, timeout=8.0)
        final_url = str(resp.url)
        m = LINKEDIN_SLUG_RE.search(final_url)
        if m:
            slug = m.group(1).rstrip("/")
            slug = re.sub(r"/(?:en|fr|ar|es|de)$", "", slug, flags=re.IGNORECASE)
            return f"https://www.linkedin.com/in/{slug}"
    except Exception as exc:
        logger.debug(f"[_resolve_linkedin_url_via_redirect] failed for {target[:80]}: {exc}")

    return ""


def _parse_json_from_llm(raw: str) -> Any:
    """Robustly extract JSON from an LLM response, handling markdown fences, think blocks, and nested JSON."""
    cleaned = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
    if not cleaned:
        cleaned = raw.strip()
    try:
        return json.loads(cleaned)
    except Exception:
        pass

    fence = re.search(r"```(?:json)?\n?([\s\S]*?)```", cleaned)
    if fence:
        try:
            return json.loads(fence.group(1).strip())
        except Exception:
            pass

    # Extract between the first '{' and the last '}'
    start_brace = cleaned.find("{")
    end_brace = cleaned.rfind("}")
    if start_brace != -1 and end_brace != -1 and end_brace > start_brace:
        try:
            return json.loads(cleaned[start_brace:end_brace + 1])
        except Exception:
            pass

    return None


# Global circuit breaker instance
_groq_breaker = get_groq_circuit_breaker()


def _get_llm():
    if not settings.groq_api_key or not settings.groq_model:
        return None
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        temperature=settings.groq_temperature,
        max_tokens=800,
        max_retries=0,  # we handle error catching directly
    )


async def _extract_skills_via_llm(profile: dict, criteria: dict | None = None) -> list[dict]:
    """
    Extract skills from candidate text signals using LLM with evidence tracking.

    Returns list of dicts: [{"skill": str, "confidence": "high"|"low", "evidence": str, "source": "llm_extracted"}]
    Only extracts skills explicitly evidenced in the text - no hallucination.
    """
    if _groq_breaker.is_rate_limited():
        logger.debug("[_extract_skills_via_llm] Groq rate-limited (circuit breaker) — skipping.")
        return []

    llm = _get_llm()
    if not llm:
        return []

    # Concatenate all text signals
    text_signals = []
    if profile.get("headline"):
        text_signals.append(f"Headline: {profile['headline']}")
    if profile.get("summary"):
        text_signals.append(f"Summary: {profile['summary']}")

    # Add experience descriptions
    experiences = profile.get("experiences", [])
    if experiences:
        for idx, exp in enumerate(experiences, 1):
            if isinstance(exp, dict):
                role = exp.get("role", exp.get("title", ""))
                company = exp.get("company", "")
                desc = exp.get("description", "")
                if role or desc:
                    text_signals.append(f"Experience {idx}: {role} at {company} - {desc}")

    if not text_signals:
        return []

    combined_text = "\n\n".join(text_signals)

    # Build skill list from criteria if provided
    target_skills = []
    if criteria:
        target_skills = criteria.get("required_skills", []) + criteria.get("nice_to_have_skills", [])

    skill_filter = ""
    if target_skills:
        skill_filter = f"\n\nTARGET SKILLS TO LOOK FOR: {', '.join(target_skills)}\nOnly extract skills from this list if they appear in the text."

    prompt_system = f"""You are an expert technical recruiter and skills analyst.
Your task is to extract ONLY explicitly evidenced technical and professional skills from the provided candidate text.

STRICT RULES:
1. Extract ONLY skills that are EXPLICITLY mentioned or clearly demonstrated in the text.
2. DO NOT invent, hallucinate, or infer skills not supported by the text.
3. DO NOT extract methodologies, processes, or soft skills (e.g., "agile", "CI/CD", "clean code", "collaboration") - these are NOT skills.
4. For each skill, provide:
   - skill: The exact skill name (e.g., "Python", "Project Management", "SEO")
   - confidence: "high" if explicitly stated (e.g., "Skills: Python, Java"), "low" if implied through work (e.g., "developed web applications" → "Web Development")
   - evidence: A brief quote from the text that supports this skill (max 50 chars)
5. Return skills maximum. Prioritize technical/hard skills over soft skills.
6. Handle both English and French text correctly (preserve accents: é, è, à, ç).{skill_filter}

Return ONLY a valid JSON object matching this schema:
{{
  "extracted_skills": [
    {{
      "skill": "string",
      "confidence": "high" | "low",
      "evidence": "string"
    }}
  ]
}}"""

    prompt_user = f"""Candidate Profile Text:\n\n{combined_text}"""

    try:
        response = await llm.ainvoke([
            SystemMessage(content=prompt_system),
            HumanMessage(content=prompt_user)
        ])
        raw_text = str(response.content)
        data = _parse_json_from_llm(raw_text)

        if data and isinstance(data, dict):
            extracted = data.get("extracted_skills", [])
            if isinstance(extracted, list):
                # Add source tag to each skill
                for skill_entry in extracted:
                    if isinstance(skill_entry, dict):
                        skill_entry["source"] = "llm_extracted"
                return extracted
    except Exception as exc:
        if _groq_breaker.check_and_trigger_from_exception(exc):
            pass
        else:
            logger.warning(f"LLM skill extraction failed: {exc}")

    return []


async def _ai_enrich_profile(profile: dict) -> dict:
    """Use Groq AI to build comprehensive structured experiences, educations, skills, and summary."""
    if _groq_breaker.is_rate_limited():
        logger.debug("[_ai_enrich_profile] Groq rate-limited (circuit breaker) — skipping.")
        return profile
    llm = _get_llm()
    if not llm:
        return profile

    snippet = profile.get("summary", "")
    title = profile.get("headline", "")
    full_name = profile.get("full_name", "")
    location_hint = profile.get("location", "")
    current_company_hint = profile.get("current_company", "")
    extensions = profile.get("extensions", [])
    extensions_text = ", ".join(extensions) if extensions else "None"

    prompt_system = """You are a senior executive headhunter and talent assessment director.
Your task is to synthesize an extensive, premium candidate dossier based on public LinkedIn profile data.

CRITICAL REQUIREMENTS:
1. summary: An extensive, highly articulate 4-5 sentence Executive Bio. It MUST detail:
   - Seniority level, core professional identity, and total domain expertise.
   - Key functional specializations, methodologies, and technical/strategic tools mastered.
   - Demonstrated leadership scope, operational deliverables, and ability to drive measurable business growth in Moroccan and international markets.
   - Why this candidate represents a high-value talent asset.
   (Write in sophisticated, engaging professional English. Never write short stubs, and never leave incomplete sentences or '...').

2. experiences: Structured work history extracted directly from the candidate's headline, company, and bio:
   - For EACH real position (Primary Role and any genuine past roles explicitly visible in the bio/snippet):
     - role: Exact professional job title.
     - company: Exact company name (e.g. "Eliott & Markus", "inwi", "OCP Group", "Freelance / Independent"). NEVER invent fake placeholder companies like "ABC Company" or "XYZ Agency".
     - period: Accurate tenure string based STRICTLY on dates visible in the data:
       * If a start year is visible in the bio/snippet (e.g. "since 2021", "2020 - Present"): return "YYYY - Present".
       * If NO start year is mentioned for the current role: return "Present" (DO NOT invent or guess a starting year like "2021" or "2019").
       * For past positions (only if explicitly named in text): return "YYYY - YYYY" if dates are mentioned, or "Past Position" if no dates are given.
     - description: An in-depth, thorough 3-4 sentence breakdown detailing core strategic duties, day-to-day leadership, tools and platforms utilized, and key project outcomes.
   - ANTI-HALLUCINATION RULE:
     * If only ONE primary role is visible, return ONLY that one primary role with its full, comprehensive description. Do NOT fabricate secondary imaginary past roles or imaginary past companies.
     * Do NOT invent start or end years that are not explicitly stated in the candidate data.


3. current_company: Accurate primary employer name.
4. location: Clean City, Country (e.g., "Casablanca, Morocco").
5. skills: A curated list of 8 to 12 relevant domain skills.
6. languages: Spoken languages with proficiency level (e.g., ["French (Fluent / Bilingual)", "English (Professional Working)", "Arabic (Native)"]).

Return ONLY a valid JSON object matching this schema:
{
  "current_company": "string",
  "location": "string",
  "summary": "string (extensive 4-5 sentence executive bio)",
  "skills": ["string"],
  "languages": ["string"],
  "experiences": [
    {
      "role": "string",
      "company": "string",
      "period": "string",
      "description": "string (detailed 3-4 sentences on duties, tools, and impact)"
    }
  ]
}"""

    prompt_user = f"""Candidate Name: {full_name}
Headline: {title}
Location: {location_hint}
Company Hint: {current_company_hint}
Bio Snippet: {snippet}
LinkedIn Extensions: {extensions_text}"""

    data = None
    llm_inst = _get_llm()
    if llm_inst:
        try:
            response = await llm_inst.ainvoke([
                SystemMessage(content=prompt_system),
                HumanMessage(content=prompt_user)
            ])
            raw_text = str(response.content)
            data = _parse_json_from_llm(raw_text)
        except Exception as exc:
            # Check for rate limit error (429) and trigger circuit breaker
            if _groq_breaker.check_and_trigger_from_exception(exc):
                # Circuit breaker was triggered
                pass
            else:
                logger.warning(f"AI enrichment failed for {full_name}: {exc}")

    if data and isinstance(data, dict):
        if comp := data.get("current_company"):
            if comp and "Listed on" not in comp and "See LinkedIn" not in comp and len(comp) < 80:
                profile["current_company"] = comp

        if langs := data.get("languages"):
            if isinstance(langs, list) and len(langs) > 0:
                profile["languages"] = langs
        if exps := data.get("experiences"):
            if isinstance(exps, list) and len(exps) > 0:
                profile["experiences"] = exps
        if sks := data.get("skills"):
            if isinstance(sks, list) and len(sks) > 0:
                profile["skills"] = list(dict.fromkeys(sks + profile.get("skills", [])))
        ai_location = (data.get("location") or "").strip()
        if ai_location and len(ai_location) > 1 and ai_location.lower() not in ("any", "unknown", "n/a"):
            profile["location"] = ai_location
        ai_summary = (data.get("summary") or "").strip()
        if ai_summary and len(ai_summary) > 30 and not ai_summary.endswith("..."):
            profile["summary"] = ai_summary

    return profile


async def search_profiles(criteria: dict[str, Any], limit: int = 10, offset: int = 0) -> list[dict]:
    """Search for candidate profiles via SerpAPI based on criteria."""
    if not settings.has_serpapi:
        raise ValueError("SERPAPI_API_KEY is missing or not configured. Cannot perform real candidate search.")

    return await _serpapi_search(criteria, limit, offset=offset)


def _build_search_query(criteria: dict) -> tuple[str, str, str]:
    """Build SerpAPI search query from job criteria. Returns (query, gl_code, location)."""
    raw_job_title = (criteria.get("job_title") or "Professional").strip()
    skills_list = criteria.get("required_skills", [])

    # Normalize skills for the query: prefer short abbreviations from parentheses
    # (e.g. "Pay-Per-Click (PPC)" → "PPC", "Conversion Rate Optimization (CRO)" → "CRO")
    # so we don't blow out the SerpAPI query length limit.
    def _shorten_skill(s: str) -> str:
        s = s.strip()
        abbr_match = re.search(r"\(([A-Z][A-Z0-9\-]{0,9})\)", s)
        if abbr_match:
            return abbr_match.group(1)  # e.g. "PPC", "CRO", "ROAS"
        # Already short enough
        if len(s.split()) <= 3 and len(s) <= 30:
            return s
        # Use first 3 words for very long phrases
        return " ".join(s.split()[:3])

    clean_skills = [
        _shorten_skill(s) for s in skills_list
        if s.lower() not in raw_job_title.lower()
    ]
    # Deduplicate and cap at 3 for a focused query
    seen_sk: set[str] = set()
    deduped_skills: list[str] = []
    for sk in clean_skills:
        sk_low = sk.lower()
        if sk_low not in seen_sk:
            seen_sk.add(sk_low)
            deduped_skills.append(sk)
    clean_skills = deduped_skills[:3]
    skills = " OR ".join(f'"{s}"' if " " in s else s for s in clean_skills) if clean_skills else ""
    location = (criteria.get("location") or "").strip()
    raw_seniority = criteria.get("seniority", "")

    seniority = ""
    if raw_seniority and raw_seniority not in ("Any", "N/A", "Unknown"):
        # Safe split with fallback
        temp = raw_seniority.split("(")[0] if "(" in raw_seniority else raw_seniority
        temp = temp.split("/")[0] if "/" in temp else temp
        sen_clean = temp.strip()
        if sen_clean in ("Junior", "Mid-Level", "Senior", "Lead", "Architect", "Director", "Manager", "Head"):
            seniority = sen_clean

    clean_title = raw_job_title.replace('"', "").replace("&", " ").replace("/", " ").strip()

    loc_lower = location.lower()
    loc_term = ""
    if location and loc_lower not in ("any", "all locations", "toutes les localisations", "toutes les villes", "n/a", "unknown", ""):
        loc_term = f'"{location}"' if " " in location else location

    # Determine optimal Google country code
    gl_code = "us"
    if any(x in loc_lower for x in ["copenhagen", "denmark", "danmark", "danemark"]):
        gl_code = "dk"
    elif any(x in loc_lower for x in ["france", "paris", "lyon"]):
        gl_code = "fr"
    elif any(x in loc_lower for x in ["morocco", "maroc", "casablanca", "rabat", "tanger", "marrakech", "fes"]):
        gl_code = "ma"
    elif any(x in loc_lower for x in ["uk", "london", "united kingdom"]):
        gl_code = "uk"
    elif any(x in loc_lower for x in ["germany", "berlin", "allemagne"]):
        gl_code = "de"
    elif any(x in loc_lower for x in ["spain", "madrid", "barcelona", "espagne"]):
        gl_code = "es"
    elif any(x in loc_lower for x in ["dubai", "uae"]):
        gl_code = "ae"

    # Build title clause with French/English synonyms when relevant
    title_clause = ""
    title_lower = clean_title.lower()
    if gl_code in ("ma", "fr"):
        if "digital marketing" in title_lower or "marketing digital" in title_lower:
            title_clause = '("Digital Marketing" OR "Marketing Digital")'
        elif "data scientist" in title_lower:
            title_clause = '("Data Scientist" OR "Data Science")'
        elif "software engineer" in title_lower or "software developer" in title_lower or "développeur" in title_lower:
            title_clause = '("Software Engineer" OR "Développeur" OR "Ingénieur Logiciel")'
        elif "product manager" in title_lower:
            title_clause = '("Product Manager" OR "Chef de Produit")'
        elif "project manager" in title_lower or "chef de projet" in title_lower:
            title_clause = '("Project Manager" OR "Chef de Projet")'

    if not title_clause and clean_title:
        # Strip long sentences or punctuation if present
        split_result = re.split(r"[.(,;]|\s+(?:based|in)\s*", clean_title, flags=re.IGNORECASE)
        short_title = split_result[0].strip() if split_result else clean_title.strip()
        title_words = [w for w in short_title.split() if w.lower() not in ("a", "an", "the", "for", "in", "at", "to", "senior", "junior", "lead", "mid", "manager", "head")]
        if title_words:
            core_phrase = " ".join(title_words[:3])
            title_clause = f'"{core_phrase}"'
        else:
            title_clause = '"Software Engineer"'

    query_parts = ["site:linkedin.com/in"]
    if seniority and seniority.lower() not in title_clause.lower():
        if gl_code in ("ma", "fr") and seniority.lower() in ("senior", "lead", "manager", "head"):
            query_parts.append(f"({seniority} OR Manager OR Responsable OR Lead)")
        else:
            query_parts.append(seniority)
    if title_clause:
        query_parts.append(title_clause)
    if skills:
        query_parts.append(f"({skills})")
    if loc_term:
        query_parts.append(loc_term)

    query = " ".join(query_parts).strip()
    logger.info(f"SerpAPI search query: {query}")
    return query, gl_code, location


async def _serpapi_search(criteria: dict, limit: int = 10, offset: int = 0) -> list[dict]:
    query, gl_code, location = _build_search_query(criteria)

    profiles = []
    seen_urls = set()
    start_offset = max(0, offset)
    max_search_offset = start_offset + 40

    async with httpx.AsyncClient(timeout=50.0) as client:
        while len(profiles) < limit and start_offset <= max_search_offset:
            try:
                response = await client.get(
                    "https://serpapi.com/search",
                    params={
                        "q": query,
                        "api_key": settings.serpapi_api_key,
                        "engine": "google",
                        "num": min(limit * 2, 20),
                        "start": start_offset,
                        "hl": "en",
                        "gl": "us",  # Use US to avoid regional redirect wrappers
                    },
                )
            except (httpx.ReadTimeout, httpx.ConnectTimeout) as timeout_exc:
                logger.warning(f"SerpAPI request timed out at offset {start_offset}: {timeout_exc}")
                if profiles:
                    break
                # Retry once if zero profiles collected so far
                try:
                    response = await client.get(
                        "https://serpapi.com/search",
                        params={
                            "q": query,
                            "api_key": settings.serpapi_api_key,
                            "engine": "google",
                            "num": min(limit, 10),
                            "start": start_offset,
                            "hl": "en",
                            "gl": "us",
                        },
                    )
                except Exception as retry_exc:
                    if profiles:
                        break
                    raise RuntimeError(f"SerpAPI connection timed out: {retry_exc}") from retry_exc

            if response.status_code != 200:
                err_msg = f"🔑 [API Monitor] 🔴 SerpAPI: Returned HTTP {response.status_code} — {response.text[:200]}"
                logger.error(err_msg)
                serpapi_failures.labels(error_type=f"http_{response.status_code}").inc()
                if profiles:
                    break
                raise RuntimeError(err_msg)

            data = response.json()
            if "error" in data:
                err_msg = str(data.get("error", ""))
                if "Google hasn't returned any results" in err_msg or "not found" in err_msg.lower():
                    logger.info(f"🔑 [API Monitor] ℹ️ SerpAPI: Google returned 0 results for query: {query}")
                    break
                logger.error(f"🔑 [API Monitor] 🔴 SerpAPI error: {err_msg}")
                serpapi_failures.labels(error_type="api_error").inc()
                raise RuntimeError(f"SerpAPI error: {err_msg}")

            raw_results = data.get("organic_results", [])
            logger.info(f"🔑 [API Monitor] 🟢 SerpAPI: 200 OK — Successfully retrieved {len(raw_results)} profiles from Google.")
            if not raw_results:
                break

            for result in raw_results:
                if len(profiles) >= limit:
                    break

                # Resolve the real linkedin.com/in/... URL using the dedicated resolver
                link = _resolve_linkedin_url(result)
                # If field-based resolution fails, try HTTP redirect following as last resort
                if not link:
                    async with httpx.AsyncClient(timeout=8.0) as redirect_client:
                        link = await _resolve_linkedin_url_via_redirect(redirect_client, result)
                if not link:
                    logger.warning("Skipping result with no resolvable LinkedIn URL")
                    continue
                if link in seen_urls:
                    continue
                seen_urls.add(link)

                parsed = _parse_serpapi_result(len(profiles), result, criteria, location)
                if parsed:
                    parsed["linkedin_url"] = link
                    profiles.append(parsed)

            start_offset += 20

    # Only run LLM enrichment here if live Apollo enrichment is NOT enabled
    if not settings.has_enrichment and settings.groq_api_key and profiles:
        try:
            enrich_count = min(len(profiles), limit)
            logger.info(f"🧠 Running Groq AI enrichment on snippet fallback for {enrich_count} profiles...")
            sem = asyncio.Semaphore(5)

            async def _bounded_enrich(p):
                async with sem:
                    return await _ai_enrich_profile(p)

            enriched_top = await asyncio.gather(
                *[_bounded_enrich(p) for p in profiles[:enrich_count]], return_exceptions=True
            )
            for idx, res in enumerate(enriched_top):
                if not isinstance(res, Exception) and res:
                    profiles[idx] = res
        except Exception as err:
            logger.warning(f"Snippet AI enrichment warning: {err}")

    return profiles[:limit]


def _estimate_experience_years(headline: str, snippet: str) -> int:
    text = f"{headline} {snippet}".lower()
    match = re.search(r"\b(\d{1,2})\+?\s*(?:y(?:ea)?rs?|ans)\b", text)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            pass
    if any(k in text for k in ["intern", "stagiaire", "stage", "student", "etudiant", "trainee"]):
        return 0
    if any(k in text for k in ["junior", "entry", "debutant", "associate"]):
        return 1
    if any(k in text for k in ["mid-level", "medior"]):
        return 3
    if any(k in text for k in ["senior", "expert", "specialist"]):
        return 5
    if any(k in text for k in ["lead", "principal", "architect", "head", "director", "manager", "vp"]):
        return 8
    return 3


SKILL_CATALOG = [
    # Tech & Dev
    "Python", "Java", "Spring Boot", "React", "Node.js", "TypeScript", "JavaScript",
    "Angular", "Vue.js", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "DevOps",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Kafka", "SQL", "NoSQL",
    "C#", ".NET", "PHP", "Laravel", "Django", "FastAPI", "Flask",
    "GraphQL", "REST API", "Microservices", "CI/CD", "Git",
    "Machine Learning", "Data Engineering", "AI", "PyTorch", "TensorFlow",
    "Flutter", "React Native", "Android", "iOS", "Swift", "Kotlin", "Go", "Rust",
    # Marketing & Digital
    "Digital Marketing", "SEO", "SEM", "Google Ads", "Meta Ads",
    "Social Media Marketing", "Content Strategy", "Growth Hacking", "Email Marketing", "CRM",
    "HubSpot", "Google Analytics", "Performance Marketing", "Brand Strategy",
    "Marketing Automation", "Lead Generation", "Market Research",
    # Product & Design
    "Product Management", "UI/UX Design", "Figma", "Design Thinking", "Product Strategy",
    "Project Management", "A/B Testing",
    # HR, Sales & Business
    "Talent Acquisition", "Technical Recruiting", "HR Management",
    "Sales Management", "Business Development", "Account Management",
    "B2B Sales", "Strategy Consulting", "Operations Management", "Leadership",
]


def _extract_skills(title: str, snippet: str, criteria: dict) -> list[str]:
    combined = f"{title} {snippet}".lower()
    extracted = set()

    # Only extract skills that are in the user's criteria (required or nice-to-have)
    required_skills = criteria.get("required_skills", [])
    nice_to_have_skills = criteria.get("nice_to_have_skills", [])
    all_requested_skills = set([s.lower() for s in required_skills + nice_to_have_skills])

    for kw in required_skills:
        if kw.lower() in combined:
            extracted.add(kw)

    for kw in nice_to_have_skills:
        if kw.lower() in combined:
            extracted.add(kw)

    # Only add skills from catalog if they closely match requested skills
    for tech in SKILL_CATALOG:
        tech_lower = tech.lower()
        # Check if this catalog skill matches any requested skill
        for requested_skill in all_requested_skills:
            if requested_skill in tech_lower or tech_lower in requested_skill:
                if re.search(r"\b" + re.escape(tech_lower) + r"\b", combined):
                    extracted.add(tech)
                    break

    if not extracted:
        # Use Unicode-aware word match to preserve French accents (é, è, à, ç)
        words = [w.capitalize() for w in re.findall(r"[^\W\d_]{3,}", title, re.UNICODE)
                 if w.lower() not in ("and", "for", "with", "the", "lead", "senior", "junior", "manager", "head", "chez")]
        extracted.update(words[:4])

    req_lower = [k.lower() for k in required_skills]
    return sorted(list(extracted), key=lambda s: (s.lower() not in req_lower, s))


def _parse_serpapi_result(idx: int, result: dict, criteria: dict, requested_location: str) -> dict | None:
    title = result.get("title", "")
    snippet = result.get("snippet", "")
    url = result.get("link", "")

    # Extract rich snippet extensions — LinkedIn puts: [location, role, company, school, ...]
    extensions = []
    rich_top = result.get("rich_snippet", {}).get("top", {})
    if isinstance(rich_top, dict):
        ext_list = rich_top.get("extensions", [])
        if isinstance(ext_list, list):
            extensions = [str(x) for x in ext_list if x]

    full_text = f"{title} {snippet} {' '.join(extensions)}"

    # Strip Unicode bidirectional control characters (e.g. U+200F RTL mark) that
    # appear in Moroccan/Arabic LinkedIn profile extension strings and cause
    # charmap codec errors downstream.
    _BDI_CTRL = re.compile(r"[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]")

    def _sanitize(text: str) -> str:
        return _BDI_CTRL.sub("", text).strip()

    extensions = [_sanitize(e) for e in extensions]
    full_text = _sanitize(full_text)

    # Location: LinkedIn always puts candidate location first in extensions
    cand_location = ""
    if extensions:
        first_ext = extensions[0].strip()
        if not any(k in first_ext.lower() for k in ["manager", "engineer", "developer", "specialist", "lead", "director", "consultant"]):
            cand_location = first_ext
    if not cand_location:
        cand_location = requested_location or "Casablanca, Morocco"

    # Safe chained splits for name extraction
    if title:
        temp = title.split(" - ")[0] if " - " in title else title
        temp = temp.split(" | ")[0] if " | " in temp else temp
        name = temp.strip() or f"Profile {idx + 1}"
    else:
        name = f"Profile {idx + 1}"
    
    # Safe role extraction with proper bounds checking
    title_parts = title.split(" - ") if " - " in title else [title]
    if len(title_parts) > 1:
        role = title_parts[1].strip()
    else:
        role = title

    candidate_skills = _extract_skills(role, full_text, criteria)
    exp_years = _estimate_experience_years(role, full_text)

    unique_key = (url or f"{name}-{role}").encode("utf-8")
    profile_hash = hashlib.md5(unique_key, usedforsecurity=False).hexdigest()[:8]  # non-security deduplication ID
    unique_id = f"cand-{profile_hash}"

    email_match = re.search(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b", full_text)
    if email_match:
        cand_email = email_match.group(0)
        email_is_verified = True
    else:
        cand_email = None
        email_is_verified = False

    # Parse current company and clean role from title
    company = ""
    clean_role = role
    for sep in [" @ ", " at ", " chez "]:
        if sep in role:
            parts = role.split(sep, 1)
            clean_role = parts[0].strip()
            if len(parts) > 1 and parts[1].strip():
                # Safe chained splits - each split always returns at least [0]
                temp = parts[1].split(" - ")[0]
                temp = temp.split(" | ")[0]
                temp = temp.split(" · ")[0]
                company_parts = temp.strip()
                company = company_parts[:60] if company_parts else ""
            break

    if not company and " - " in role:
        parts = role.split(" - ")
        if len(parts) >= 2:
            candidate = parts[-1].strip()
            if candidate and not any(k in candidate.lower() for k in ["engineer", "developer", "manager", "lead", "senior", "consultant", "specialist", "director"]):
                company = candidate[:60]
                clean_role = parts[0].strip()

    if not company and len(extensions) > 1:
        for ext in extensions[1:3]:
            if ext and not any(k in ext.lower() for k in ["manager", "engineer", "developer", "specialist", "lead", "director", "consultant"]) and len(ext) < 50:
                company = ext
                break

    # Safe chained splits for clean_role
    if clean_role:
        temp = clean_role.split(" | ")[0] if " | " in clean_role else clean_role
        temp = temp.split(" · ")[0] if " · " in temp else temp
        clean_role = temp.strip() or "Professional"
    else:
        clean_role = "Professional"

    # Smart tenure extraction from snippet & extensions for the current active role
    exp_period = "Present"
    if m_tenure := re.search(r"\b(?:since|depuis|from)\s+(20\d\d|19\d\d)\b", full_text, re.IGNORECASE):
        exp_period = f"{m_tenure.group(1)} - Present"
    elif m_range := re.search(r"\b(20\d\d|19\d\d)\s*[-–—]\s*(Present|Actuel|Current|Aujourd'hui)\b", full_text, re.IGNORECASE):
        exp_period = f"{m_range.group(1)} - Present"

    # Experiences extraction — initialized with the verified current role
    experiences = [
        {
            "role": clean_role,
            "company": company or "See LinkedIn Profile",
            "period": exp_period,
            "description": snippet or f"Active position as {clean_role}."
        }
    ]

    salary_exp = _estimate_salary(exp_years, criteria.get("seniority", ""))

    # 2. Languages — empty unless explicitly provided
    cand_languages = []

    # 3. Generate structured executive overview
    summary_overview = clean_4_line_summary(
        full_name=name,
        headline=clean_role,
        experiences=[
            ExperienceEntry(
                company=company or "Organization",
                title=clean_role,
                role=clean_role,
                period=exp_period,
                description=snippet or f"Active position as {clean_role}."
            )
        ],
        skills=candidate_skills,
    )

    return {
        "id": unique_id,
        "full_name": name,
        "headline": role,
        "location": cand_location,
        "current_company": company or "See LinkedIn Profile",
        "current_role": role,
        "experience_years": exp_years,
        "skills": candidate_skills,
        "seniority": criteria.get("seniority", "N/A"),
        "linkedin_url": url,
        "email": cand_email,
        "email_is_verified": email_is_verified,
        "avatar_url": None,
        "summary": summary_overview,
        "availability": "Open for Outreach",
        "salary_expectation": salary_exp,
        "contract_preference": criteria.get("contract_type", "Any"),
        "languages": cand_languages,
        "experiences": experiences,
        "extensions": extensions,
        "source": "serpapi",
    }


def _estimate_salary(exp_years: int, seniority: str) -> str:
    sen = (seniority or "").lower()
    if exp_years >= 8 or any(k in sen for k in ["lead", "principal", "architect", "director"]):
        return "[Est.] Senior+ Level"
    if exp_years >= 5 or "senior" in sen:
        return "[Est.] Senior Level"
    if exp_years >= 3 or "mid" in sen:
        return "[Est.] Mid Level"
    return "[Est.] Junior Level"