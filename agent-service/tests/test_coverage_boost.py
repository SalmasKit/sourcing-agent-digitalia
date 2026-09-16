import pytest
from src.mcp_server.tools.search_profiles import (
    _parse_json_from_llm as sp_parse_json,
    _estimate_experience_years,
    _parse_serpapi_result,
    _build_search_query,
)
from src.mcp_server.tools.score_profile import (
    _clean_log,
    _build_job_context,
    _build_profile_context,
    _build_candidate_corpus,
    _baseline_skill_check,
    _compute_skill_score,
)
from src.api.routes import _sanitize_log


# ---------------------------------------------------------------------------
# search_profiles helpers
# ---------------------------------------------------------------------------

def test_sp_parse_json_all_branches():
    # Branch 1: direct JSON with <think> tag
    res1 = sp_parse_json("<think>some internal thought</think> {\"name\": \"Alice\"}")
    assert res1 == {"name": "Alice"}

    # Branch 2: Markdown code fence ```json ... ```
    res2 = sp_parse_json("Here is the result:\n```json\n{\"skills\": [\"Python\"]}\n```")
    assert res2 == {"skills": ["Python"]}

    # Branch 3: Extract between first { and last }
    res3 = sp_parse_json("Prefix text {\"role\": \"Lead\"} suffix text")
    assert res3 == {"role": "Lead"}

    # Branch 4: Invalid JSON
    assert sp_parse_json("no json here at all") is None
    assert sp_parse_json("") is None


def test_estimate_experience_years_all_branches():
    # Regex match: explicit digit
    assert _estimate_experience_years("Developer", "Has 7+ years of experience in AI") == 7
    assert _estimate_experience_years("Developer", "3 ans d'experience") == 3
    # Keyword: intern/stage → 0
    assert _estimate_experience_years("Intern", "Stage de fin d'études") == 0
    # Keyword: junior/entry → 1
    assert _estimate_experience_years("Junior Developer", "Entry level engineer") == 1
    # Keyword: mid-level/medior → 3
    assert _estimate_experience_years("Mid-level Developer", "Medior engineer") == 3
    # Keyword: senior → 5 (checked before lead)
    assert _estimate_experience_years("Senior Tech Lead", "Directeur Technique") == 5
    # No match → fallback default is 3
    assert _estimate_experience_years("Unknown", "No clear timeline") == 3


def test_parse_serpapi_result():
    crit = {"required_skills": ["Python", "Docker"]}
    raw = {
        "title": "Jean Dupont - Senior Lead @ Digitalia | LinkedIn",
        "snippet": "Contact: jean.dupont@digitalia.io. 5+ years experience with Python and Docker.",
        "link": "https://linkedin.com/in/jean-dupont-12345",
        "rich_snippet": {
            "top": {
                "extensions": ["Casablanca, Morocco", "Senior Lead"]
            }
        }
    }
    p = _parse_serpapi_result(0, raw, crit, "Casablanca, Morocco")
    assert p is not None
    assert p["full_name"] == "Jean Dupont"
    assert p["email"] == "jean.dupont@digitalia.io"
    assert p["current_company"] == "Digitalia"
    assert p["experience_years"] == 5

    raw2 = {
        "title": "Fatima Zahra - Développeur chez InnoTech",
        "snippet": "Software engineering and React enthusiast.",
        "link": "https://linkedin.com/in/fatima-zahra",
    }
    p2 = _parse_serpapi_result(1, raw2, crit, "Rabat, Morocco")
    assert p2 is not None
    assert p2["full_name"] == "Fatima Zahra"
    assert p2["current_company"] == "InnoTech"
    assert p2["email"] is None


def test_build_search_query():
    # Senior Python engineer in Rabat → gl=fr
    crit1 = {
        "job_title": "Python Engineer",
        "required_skills": ["FastAPI", "PostgreSQL"],
        "location": "Rabat, France",
        "seniority": "Senior",
        "exclude_companies": ["OldCorp"],
    }
    q1, gl1, loc1 = _build_search_query(crit1)
    assert "site:linkedin.com/in" in q1
    assert gl1 == "fr"
    assert "Rabat" in loc1 or loc1 == "Rabat, France"

    # Lead Data Scientist in Morocco → gl=ma
    crit2 = {
        "job_title": "Data Scientist",
        "required_skills": ["PyTorch"],
        "location": "Casablanca, Morocco",
        "seniority": "Lead",
    }
    q2, gl2, _loc2 = _build_search_query(crit2)
    assert "Data Scientist" in q2 or "linkedin" in q2
    assert gl2 == "ma"

    # No location → defaults to us
    crit3 = {"job_title": "Backend Developer", "required_skills": [], "location": "", "seniority": ""}
    _q3, gl3, _loc3 = _build_search_query(crit3)
    assert gl3 == "us"


# ---------------------------------------------------------------------------
# score_profile helpers
# ---------------------------------------------------------------------------

def test_build_job_context():
    crit = {
        "job_title": "Backend Developer",
        "seniority": "Senior",
        "required_skills": ["Python", "FastAPI"],
        "nice_to_have_skills": ["Kubernetes"],
        "location": "Rabat",
        "min_experience_years": 4,
    }
    ctx = _build_job_context(crit)
    assert "Title: Backend Developer" in ctx
    assert "Required skills (must-have): Python, FastAPI" in ctx
    assert "Nice-to-have skills" in ctx
    assert "Min experience: 4 years" in ctx

    # Empty criteria → empty string
    assert _build_job_context({}) == ""


def test_build_profile_context():
    prof = {
        "full_name": "Sophie Martin",
        "headline": "Senior Backend Developer",
        "experience_years": 6,
        "location": "Rabat, France",
        "skills": ["Python", "FastAPI", "Docker"],
        "summary": "Passionate backend engineer",
    }
    ctx = _build_profile_context(prof)
    assert "Name: Sophie Martin" in ctx
    assert "Experience: 6 years" in ctx
    assert "Skills: Python, FastAPI, Docker" in ctx

    # Empty profile → empty string
    assert _build_profile_context({}) == ""


def test_build_candidate_corpus():
    prof = {
        "full_name": "Sophie Martin",
        "headline": "Senior Backend Developer",
        "experience_years": 6,
        "location": "Rabat, France",
        "skills": ["Python", "FastAPI", "Docker"],
        "summary": "Passionate backend engineer",
    }
    corpus, clean_skills = _build_candidate_corpus(prof)
    assert "python" in corpus
    assert "fastapi" in clean_skills
    assert "docker" in clean_skills

    # Profile with experiences dict entries
    prof2 = {
        "skills": ["Go"],
        "experiences": [{"title": "Software Engineer", "description": "Built APIs"}],
        "extensions": ["Open Source Contributor"],
    }
    corpus2, _ = _build_candidate_corpus(prof2)
    assert "software engineer" in corpus2
    assert "open source contributor" in corpus2

    # Empty profile
    corpus3, skills3 = _build_candidate_corpus({})
    assert corpus3 == ""
    assert skills3 == []


def test_baseline_skill_check():
    corpus = "python fastapi postgresql docker kubernetes"
    skills = ["python", "fastapi", "postgresql"]

    assert _baseline_skill_check("Python", corpus, skills) is True
    assert _baseline_skill_check("FastAPI", corpus, skills) is True
    # Skill not present
    assert _baseline_skill_check("React", corpus, skills) is False
    # Short term with symbols
    assert _baseline_skill_check("C++", "c++ rust go", []) is True
    assert _baseline_skill_check("", corpus, skills) is False
    # Parenthetical abbreviation: "Pay-Per-Click (PPC)" -> matches "ppc" in corpus
    assert _baseline_skill_check("Pay-Per-Click (PPC)", "ppc marketing seo", []) is True


def test_compute_skill_score():
    # All required skills matched + nice-to-have matched.
    # matched_skills must use the same case as required_skills (case-sensitive containment check).
    score, nice = _compute_skill_score(
        required_skills=["Python", "FastAPI"],
        matched_skills=["Python", "FastAPI"],
        nice_to_have_skills=["Docker"],
        full_corpus="python fastapi docker",
        profile_skills=["python", "fastapi", "docker"],
    )
    assert score >= 90
    assert "Docker" in nice

    # No required skills matched
    score2, _ = _compute_skill_score(
        required_skills=["Java", "Spring"],
        matched_skills=[],
        nice_to_have_skills=[],
        full_corpus="python react",
        profile_skills=["python", "react"],
    )
    assert score2 == 0

    # No required skills at all → base 70 + nice bonus
    score3, _ = _compute_skill_score(
        required_skills=[],
        matched_skills=[],
        nice_to_have_skills=["Docker"],
        full_corpus="docker kubernetes",
        profile_skills=["docker"],
    )
    assert score3 >= 70


# ---------------------------------------------------------------------------
# Sanitize / log helpers
# ---------------------------------------------------------------------------

def test_sanitize_and_clean_log():
    dirty = "user\r\ninput\ninjection\ttext"
    assert "\r" not in _sanitize_log(dirty)
    assert "\n" not in _sanitize_log(dirty)
    assert "\r" not in _clean_log(dirty)
    assert "\n" not in _clean_log(dirty)

    # None input
    assert _clean_log(None) == ""
