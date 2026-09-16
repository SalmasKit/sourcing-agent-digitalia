import pytest
from src.agent.graph import (
    _format_clean_summary,
    _get_exp_field,
    _extract_min_experience_from_query,
    _build_fallback_criteria,
    build_sourcing_graph,
    _parse_json_from_llm,
)


def test_format_clean_summary_full():
    profile = {
        "full_name": "Alice Dupont",
        "headline": "Senior Software Engineer | Tech Lead",
        "current_company": "Acme Corp",
        "skills": ["Python", "FastAPI", "React", "PostgreSQL"],
        "experiences": [
            {
                "role": "Senior Software Engineer",
                "company": "Acme Corp",
                "description": "Led high-scale backend microservices architecture.",
            }
        ],
    }
    summary = _format_clean_summary(profile)
    assert "Alice Dupont" in summary
    assert "Acme Corp" in summary
    assert "Python" in summary
    assert "Senior Software Engineer" in summary


def test_format_clean_summary_minimal():
    profile = {
        "full_name": "Bob Martin",
        "headline": "DevOps Engineer",
        "skills": ["Docker", "Kubernetes"],
    }
    summary = _format_clean_summary(profile)
    assert "Bob Martin" in summary
    assert "DevOps Engineer" in summary


def test_format_clean_summary_fallback_experience():
    profile = {
        "experiences": [
            {
                "title": "Lead Architect",
                "organization": "OpenTech",
                "description": "Designed cloud systems.",
            }
        ]
    }
    summary = _format_clean_summary(profile)
    assert "Lead Architect" in summary
    assert "OpenTech" in summary


def test_get_exp_field():
    exp = {"position": "Engineering Manager", "org": "Global Corp"}
    assert _get_exp_field(exp, "role", "title", "position") == "Engineering Manager"
    assert _get_exp_field(exp, "company", "org") == "Global Corp"
    assert _get_exp_field(exp, "nonexistent") == ""


def test_extract_min_experience_from_query():
    assert _extract_min_experience_from_query("Looking for developer with 5+ years experience") == 5
    assert _extract_min_experience_from_query("Senior with 3 ans d'expérience") == 3
    assert _extract_min_experience_from_query("Junior developer") is None


def test_build_fallback_criteria():
    criteria = _build_fallback_criteria("Senior Python Developer in Rabat with Docker")
    assert isinstance(criteria, dict)
    assert "job_title" in criteria or "required_skills" in criteria


def test_parse_json_from_llm():
    valid = _parse_json_from_llm('```json\n{"role": "developer"}\n```')
    assert valid == {"role": "developer"}
    invalid = _parse_json_from_llm("not json")
    assert invalid is None


def test_build_sourcing_graph():
    graph = build_sourcing_graph()
    assert graph is not None
