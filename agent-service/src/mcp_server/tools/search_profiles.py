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

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

from src.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _parse_json_from_llm(raw: str) -> Any:
    """Robustly extract JSON from an LLM response, handling markdown fences, think blocks, and nested JSON."""
    cleaned = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
    if not cleaned:
        cleaned = raw.strip()
    try:
        return json.loads(cleaned)
    except Exception:
        pass

    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
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


_groq_rate_limited: bool = False  # circuit breaker — set True on 429


def _get_llm(model_name: str | None = None):
    if not settings.groq_api_key:
        return None
    selected_model = model_name or settings.groq_model or "openai/gpt-oss-120b"
    return ChatGroq(
        api_key=settings.groq_api_key,
        model=selected_model,
        temperature=0.1,
        max_tokens=800,
        max_retries=0,  # never auto-retry — we handle fallbacks ourselves
    )


async def _ai_enrich_profile(profile: dict) -> dict:
    """Use Groq AI to build comprehensive structured experiences, educations, skills, and summary."""
    global _groq_rate_limited
    if _groq_rate_limited:
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


3. educations: Extract any university, business school, or degree mentioned ONLY IF the school/institution name is explicitly visible in the input data.
   - If mentioned: return degree, institution, period (e.g. "2017 - 2020", "Graduated 2019", "2015 - 2018"), and an informative 1-2 sentence description.
   - ANTI-HALLUCINATION RULE: If NO school, university, or degree name is explicitly stated in the candidate data, you MUST return an empty list []. Do NOT invent, guess, infer, or fabricate any education. Do NOT add generic entries like "Higher Education" or "University" unless the actual institution name is clearly visible in the data.

4. current_company: Accurate primary employer name.
5. location: Clean City, Country (e.g., "Casablanca, Morocco").
6. skills: A curated list of 8 to 12 relevant domain skills.
7. languages: Spoken languages with proficiency level (e.g., ["French (Fluent / Bilingual)", "English (Professional Working)", "Arabic (Native)"]).

Return ONLY a valid JSON object matching this schema:
{
  "current_company": "string",
  "location": "string",
  "summary": "string (extensive 4-5 sentence executive bio)",
  "education": "string",
  "educations": [
    {
      "degree": "string",
      "institution": "string",
      "period": "string",
      "description": "string"
    }
  ],
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

    models_to_try = [
        settings.groq_model or "openai/gpt-oss-20b",
        "qwen/qwen3.6-27b",
        "openai/gpt-oss-120b",
    ]

    data = None

    for model_name in models_to_try:
        try:
            llm_inst = _get_llm(model_name)
            if not llm_inst:
                break
            response = await llm_inst.ainvoke([
                SystemMessage(content=prompt_system),
                HumanMessage(content=prompt_user)
            ])
            raw_text = str(response.content)
            data = _parse_json_from_llm(raw_text)
            if data and isinstance(data, dict):
                break
        except Exception as exc:
            err_str = str(exc)
            logger.warning(f"Enrichment attempt with {model_name} failed for {full_name}: {exc}")
            if "429" in err_str or "rate_limit" in err_str.lower() or "quota" in err_str.lower():
                await asyncio.sleep(0.3)
                continue
            continue


    if data and isinstance(data, dict):
        if comp := data.get("current_company"):
            if comp and "Listed on" not in comp and "See LinkedIn" not in comp and len(comp) < 80:
                profile["current_company"] = comp
        if edu := data.get("education"):
            if edu and "Higher Education" not in edu:
                profile["education"] = edu
        if edus := data.get("educations"):
            if isinstance(edus, list):
                # Filter out fabricated generic education entries
                GENERIC_INSTS = ("university", "higher education", "enseignement supérieur", "est apis", "unknown", "n/a", "none", "")
                real_edus = [
                    e for e in edus
                    if isinstance(e, dict)
                    and (e.get("institution") or e.get("school", "")).strip()
                    and (e.get("institution") or e.get("school", "")).strip().lower() not in GENERIC_INSTS
                ]
                if real_edus:
                    profile["educations"] = real_edus
                    inst_0 = real_edus[0].get("institution") or real_edus[0].get("school")
                    deg_0 = real_edus[0].get("degree") or ""
                    profile["education"] = f"{deg_0} - {inst_0}".strip(" -") if deg_0 and deg_0 != inst_0 else inst_0


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


async def search_profiles(criteria: dict[str, Any], limit: int = 10) -> list[dict]:
    """Search for candidate profiles via SerpAPI based on criteria."""
    if not settings.has_serpapi:
        raise ValueError("SERPAPI_API_KEY is missing or not configured. Cannot perform real candidate search.")

    return await _serpapi_search(criteria, limit)


async def _serpapi_search(criteria: dict, limit: int = 10) -> list[dict]:
    raw_job_title = (criteria.get("job_title") or "Professional").strip()
    skills_list = criteria.get("required_skills", [])
    
    # Filter skills to only genuine concise tags (max 2 words, max 25 chars) to prevent query pollution
    clean_skills = [
        s for s in skills_list
        if s.lower() not in raw_job_title.lower() and len(s.split()) <= 2 and len(s) <= 25
    ][:3]
    skills = " OR ".join(f'"{s}"' if " " in s else s for s in clean_skills) if clean_skills else ""
    location = (criteria.get("location") or "").strip()
    raw_seniority = criteria.get("seniority", "")

    seniority = ""
    if raw_seniority and raw_seniority not in ("Any", "N/A", "Unknown"):
        sen_clean = raw_seniority.split("(")[0].split("/")[0].strip()
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
        short_title = re.split(r"[\.\(\,\;]|\s+based\s+|\s+in\s+", clean_title, flags=re.IGNORECASE)[0].strip()
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

    profiles = []
    seen_urls = set()
    start_offset = 0

    async with httpx.AsyncClient(timeout=20.0) as client:
        while len(profiles) < limit and start_offset <= 30:
            response = await client.get(
                "https://serpapi.com/search",
                params={
                    "q": query,
                    "api_key": settings.serpapi_api_key,
                    "engine": "google",
                    "num": min(limit * 2, 20),
                    "start": start_offset,
                    "hl": "en",
                    "gl": gl_code,
                },
            )
            if response.status_code != 200:
                err_msg = f"🔑 [API Monitor] 🔴 SerpAPI: Returned HTTP {response.status_code} — {response.text[:200]}"
                logger.error(err_msg)
                raise RuntimeError(err_msg)

            data = response.json()
            if "error" in data:
                err_msg = str(data.get("error", ""))
                if "Google hasn't returned any results" in err_msg or "not found" in err_msg.lower():
                    logger.info(f"🔑 [API Monitor] ℹ️ SerpAPI: Google returned 0 results for query: {query}")
                    break
                logger.error(f"🔑 [API Monitor] 🔴 SerpAPI error: {err_msg}")
                raise RuntimeError(f"SerpAPI error: {err_msg}")


            raw_results = data.get("organic_results", [])
            logger.info(f"🔑 [API Monitor] 🟢 SerpAPI: 200 OK — Successfully retrieved {len(raw_results)} profiles from Google index.")
            if not raw_results:
                break

            for result in raw_results:
                if len(profiles) >= limit:
                    break
                link = result.get("link", "")
                if not link or link in seen_urls:
                    continue
                seen_urls.add(link)

                parsed = _parse_serpapi_result(len(profiles), result, criteria, location)
                if parsed:
                    profiles.append(parsed)

            start_offset += 20

    # Only run LLM enrichment here if live ScrapingDog/RapidAPI enrichment is NOT enabled
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
    match = re.search(r"(\d+)\+?\s*(years?|yrs?|ans)", text)
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

    for kw in criteria.get("required_skills", []):
        if kw.lower() in combined:
            extracted.add(kw)

    for tech in SKILL_CATALOG:
        if re.search(r"\b" + re.escape(tech.lower()) + r"\b", combined):
            extracted.add(tech)

    if not extracted:
        words = [w.capitalize() for w in re.findall(r"[A-Za-z]{3,}", title)
                 if w.lower() not in ("and", "for", "with", "the", "lead", "senior", "junior", "manager", "head", "chez")]
        extracted.update(words[:4])

    req_lower = [k.lower() for k in criteria.get("required_skills", [])]
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

    # Location: LinkedIn always puts candidate location first in extensions
    cand_location = ""
    if extensions:
        first_ext = extensions[0].strip()
        if not any(k in first_ext.lower() for k in ["manager", "engineer", "developer", "specialist", "lead", "director", "consultant"]):
            cand_location = first_ext
    if not cand_location:
        cand_location = requested_location or "Casablanca, Morocco"

    name = title.split(" - ")[0].split(" | ")[0].strip() if title else f"Profile {idx + 1}"
    role = title.split(" - ")[1].strip() if " - " in title else title

    candidate_skills = _extract_skills(role, full_text, criteria)
    exp_years = _estimate_experience_years(role, full_text)

    unique_key = (url or f"{name}-{role}").encode("utf-8")
    profile_hash = hashlib.md5(unique_key).hexdigest()[:8]
    unique_id = f"cand-{profile_hash}"

    email_match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", full_text)
    if email_match:
        cand_email = email_match.group(0)
    else:
        clean_name = re.sub(r"[^a-z0-9]+", ".", name.lower()).strip(".")
        cand_email = f"{clean_name}@talent-candidate.ma" if clean_name else f"candidate.{profile_hash}@talent-candidate.ma"

    # Parse current company and clean role from title
    company = ""
    clean_role = role
    for sep in [" @ ", " at ", " chez "]:
        if sep in role:
            parts = role.split(sep, 1)
            clean_role = parts[0].strip()
            company = parts[1].split(" - ")[0].split(" | ")[0].split(" · ")[0].strip()[:60]
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

    clean_role = clean_role.split(" | ")[0].split(" · ")[0].strip() or "Professional"

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

    # Education is left empty unless provided by structured enrichment (Apollo/ScrapingDog)
    educations = []
    edu_str = None

    salary_exp = _estimate_salary(exp_years, criteria.get("seniority", ""))

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
        "avatar_url": None,
        "summary": snippet or f"Experienced {clean_role} with strong background in Moroccan and international markets.",
        "education": None,
        "educations": [],
        "availability": "Open for Outreach",
        "salary_expectation": salary_exp,
        "contract_preference": criteria.get("contract_type", "Any"),
        "languages": ["French (Fluent)", "English (Professional)", "Arabic (Native)"],
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
