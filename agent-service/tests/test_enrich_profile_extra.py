"""
Additional tests for enrich_profile.py helper functions.
"""
from src.mcp_server.tools.enrich_profile import (
    EducationEntry,
    ExperienceEntry,
)


def test_education_entry_basic():
    """Test EducationEntry with basic fields."""
    entry = EducationEntry(
        institution="MIT",
        degree="BS",
        field_of_study="Computer Science",
        period="2018-2022",
        start_year=2018,
        end_year=2022
    )
    
    assert entry.institution == "MIT"
    assert entry.degree == "BS"
    assert entry.field_of_study == "Computer Science"
    assert entry.period == "2018-2022"
    assert entry.start_year == 2018
    assert entry.end_year == 2022


def test_education_entry_strip_institution():
    """Test that institution field is stripped."""
    entry = EducationEntry(
        institution="  Stanford University  ",
        degree="MS"
    )
    
    assert entry.institution == "Stanford University"


def test_education_entry_unknown_institution():
    """Test that None institution becomes 'Unknown Institution'."""
    entry = EducationEntry(
        institution=None,
        degree="PhD"
    )
    
    assert entry.institution == "Unknown Institution"


def test_education_entry_empty_institution():
    """Test that empty string institution becomes 'Unknown Institution'."""
    entry = EducationEntry(
        institution="",
        degree="MBA"
    )
    
    assert entry.institution == "Unknown Institution"


def test_experience_entry_basic():
    """Test ExperienceEntry with correct field names."""
    entry = ExperienceEntry(
        company="Google",
        title="Software Engineer",
        start="2020-01-01",
        end="2022-12-31"
    )
    
    assert entry.company == "Google"
    assert entry.title == "Software Engineer"
    assert entry.start == "2020-01-01"
    assert entry.end == "2022-12-31"


def test_experience_entry_strip_fields():
    """Test that company and title fields are stripped."""
    entry = ExperienceEntry(
        company="  Microsoft  ",
        title="  Senior Developer  "
    )
    
    assert entry.company == "Microsoft"
    assert entry.title == "Senior Developer"