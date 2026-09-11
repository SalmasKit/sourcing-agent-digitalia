"""
Unit tests for weighted skill scoring logic.
"""

from src.mcp_server.tools.score_profile import _baseline_skill_check, _compute_skill_score


def test_baseline_skill_check_exact_match():
    """Test exact skill match in profile."""
    profile_skills = ["python", "java", "react"]
    full_corpus = "python developer with java and react experience"
    assert _baseline_skill_check("python", full_corpus, profile_skills) is True


def test_baseline_skill_check_case_insensitive():
    """Test case-insensitive matching."""
    profile_skills = ["Python", "Java", "React"]
    full_corpus = "python developer with java and react experience"
    assert _baseline_skill_check("python", full_corpus, profile_skills) is True


def test_baseline_skill_check_substring_long():
    """Test substring match for terms longer than 3 characters."""
    # profile_skills does NOT contain "script" to force elif branch
    profile_skills = ["java", "python"]
    full_corpus = "experienced in javascript and typescript"
    assert _baseline_skill_check("script", full_corpus, profile_skills) is True


def test_baseline_skill_check_word_boundary_short():
    """Test word boundary matching for short terms (<=3 chars)."""
    # profile_skills does NOT contain "c++" to force regex branch
    profile_skills = ["golang", "ruby"]
    full_corpus = "developer with c++ and go experience"
    assert _baseline_skill_check("c++", full_corpus, profile_skills) is True


def test_baseline_skill_check_short_symbol_hash():
    """C# (symbol at end, different char than +) must match via containment fallback."""
    profile_skills = ["dotnet", "java"]
    full_corpus = "senior c# developer with dotnet experience"
    assert _baseline_skill_check("c#", full_corpus, profile_skills) is True


def test_baseline_skill_check_no_match():
    """Test when skill is not found."""
    profile_skills = ["python", "java"]
    full_corpus = "developer with javascript experience"
    assert _baseline_skill_check("rust", full_corpus, profile_skills) is False


def test_baseline_skill_check_parentheses_expansion():
    """Test expansion of terms in parentheses."""
    profile_skills = ["ppc", "pay-per-click"]
    full_corpus = "expert in ppc and pay-per-click advertising"
    assert _baseline_skill_check("Pay-Per-Click (PPC)", full_corpus, profile_skills) is True


def test_baseline_skill_check_parentheses_abbreviation():
    """Test matching abbreviation from parentheses."""
    profile_skills = ["cro"]
    full_corpus = "specialist in conversion rate optimization"
    assert _baseline_skill_check("Conversion Rate Optimization (CRO)", full_corpus, profile_skills) is True


def test_compute_skill_score_no_required_skills():
    """Test scoring when no required skills are provided."""
    required_skills = []
    matched_skills = []
    nice_to_have_skills = ["python", "java"]
    full_corpus = "developer with python experience"
    profile_skills = ["python"]

    score, nice_matched = _compute_skill_score(
        required_skills, matched_skills, nice_to_have_skills, full_corpus, profile_skills
    )

    assert score == 75  # 70 base + 5 bonus (1/2 * 10)
    assert nice_matched == ["python"]


def test_compute_skill_score_no_required_skills_no_nice():
    """Test scoring when no required or nice-to-have skills."""
    required_skills = []
    matched_skills = []
    nice_to_have_skills = []
    full_corpus = "developer"
    profile_skills = []

    score, nice_matched = _compute_skill_score(
        required_skills, matched_skills, nice_to_have_skills, full_corpus, profile_skills
    )

    assert score == 70  # base score with no bonus
    assert nice_matched == []


def test_compute_skill_score_all_required_matched():
    """Test scoring when all required skills are matched."""
    required_skills = ["python", "java", "react", "typescript"]
    matched_skills = ["python", "java", "react", "typescript"]
    nice_to_have_skills = ["docker"]
    full_corpus = "python java react typescript docker"
    profile_skills = ["python", "java", "react", "typescript", "docker"]

    score, nice_matched = _compute_skill_score(
        required_skills, matched_skills, nice_to_have_skills, full_corpus, profile_skills
    )

    assert score == 100  # all required matched + nice bonus
    assert "docker" in nice_matched


def test_compute_skill_score_partial_required_matched():
    """Test scoring when only some required skills are matched."""
    required_skills = ["python", "java", "react"]
    matched_skills = ["python", "react"]
    nice_to_have_skills = []
    full_corpus = "python and react developer"
    profile_skills = ["python", "react"]

    score, nice_matched = _compute_skill_score(
        required_skills, matched_skills, nice_to_have_skills, full_corpus, profile_skills
    )

    # Weights: python=3, java=2, react=1. Matched: python(3) + react(1) = 4/6 = 66.67% -> round(66.67) = 67
    assert score == 67
    assert nice_matched == []


def test_compute_skill_score_weighted_first_three():
    """Test that first 3 skills get higher weights."""
    required_skills = ["python", "java", "react", "typescript", "go"]
    matched_skills = ["python", "react", "go"]
    nice_to_have_skills = []
    full_corpus = "python react go developer"
    profile_skills = ["python", "react", "go"]

    score, nice_matched = _compute_skill_score(
        required_skills, matched_skills, nice_to_have_skills, full_corpus, profile_skills
    )

    # Weights: python=3, java=2, react=1, typescript=1, go=1
    # Matched: python(3) + react(1) + go(1) = 5/8 = 62.5% -> round(62.5) = 62
    assert score == 62
    assert nice_matched == []


def test_compute_skill_score_nice_to_have_bonus():
    """Test nice-to-have skills add bonus without affecting base score."""
    required_skills = ["python", "java"]
    matched_skills = ["python"]
    nice_to_have_skills = ["docker", "kubernetes"]
    full_corpus = "python docker kubernetes"
    profile_skills = ["python", "docker", "kubernetes"]

    score, nice_matched = _compute_skill_score(
        required_skills, matched_skills, nice_to_have_skills, full_corpus, profile_skills
    )

    # Base: python(3)/5 = 60%. Bonus: 2/2 * 10 = 10. Total: 70%
    assert score == 70
    assert set(nice_matched) == {"docker", "kubernetes"}


def test_compute_skill_score_nice_to_have_partial_bonus():
    """Test partial nice-to-have matching gives partial bonus."""
    required_skills = ["python"]
    matched_skills = ["python"]
    nice_to_have_skills = ["docker", "kubernetes", "aws"]
    full_corpus = "python docker"
    profile_skills = ["python", "docker"]

    score, nice_matched = _compute_skill_score(
        required_skills, matched_skills, nice_to_have_skills, full_corpus, profile_skills
    )

    # Base: 100%. Bonus: 1/3 * 10 = 3.33. Total: 100 (capped)
    assert score == 100
    assert nice_matched == ["docker"]


def test_compute_skill_score_capped_at_100():
    """Test that score is capped at 100 even with high bonus."""
    required_skills = ["python"]
    matched_skills = ["python"]
    nice_to_have_skills = ["docker", "kubernetes", "aws", "gcp"]
    full_corpus = "python docker kubernetes aws gcp"
    profile_skills = ["python", "docker", "kubernetes", "aws", "gcp"]

    score, nice_matched = _compute_skill_score(
        required_skills, matched_skills, nice_to_have_skills, full_corpus, profile_skills
    )

    assert score == 100  # capped at 100


def test_compute_skill_score_empty_profile_skills():
    """Test scoring when profile has no skills."""
    required_skills = ["python", "java"]
    matched_skills = []
    nice_to_have_skills = ["docker"]
    full_corpus = "developer"
    profile_skills = []

    score, nice_matched = _compute_skill_score(
        required_skills, matched_skills, nice_to_have_skills, full_corpus, profile_skills
    )

    assert score == 0  # no required skills matched
    assert nice_matched == []


def test_compute_skill_score_single_required():
    """Test scoring with single required skill."""
    required_skills = ["python"]
    matched_skills = ["python"]
    nice_to_have_skills = []
    full_corpus = "python developer"
    profile_skills = ["python"]

    score, nice_matched = _compute_skill_score(
        required_skills, matched_skills, nice_to_have_skills, full_corpus, profile_skills
    )

    assert score == 100  # single skill gets weight 3, matched = 3/3 = 100%
    assert nice_matched == []


def test_compute_skill_score_many_required():
    """Test scoring with many required skills."""
    required_skills = ["python", "java", "react", "typescript", "go", "rust", "c++"]
    matched_skills = ["python", "java", "react", "typescript"]
    nice_to_have_skills = []
    full_corpus = "python java react typescript"
    profile_skills = ["python", "java", "react", "typescript"]

    score, nice_matched = _compute_skill_score(
        required_skills, matched_skills, nice_to_have_skills, full_corpus, profile_skills
    )

    # Weights: 3,2,1,1,1,1,1 = 10 total. Matched: 3+2+1+1 = 7/10 = 70%
    assert score == 70
    assert nice_matched == []
