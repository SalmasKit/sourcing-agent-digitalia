"""
Additional tests for dedup.py helper functions.
"""
from src.mcp_server.tools.dedup import _canonical_fingerprint


def test_canonical_fingerprint_with_linkedin_url():
    """Test fingerprint generation with LinkedIn URL."""
    profile = {
        "linkedin_url": "https://www.linkedin.com/in/john-doe-123"
    }
    
    fp = _canonical_fingerprint(profile)
    
    assert fp == "li:john-doe-123"


def test_canonical_fingerprint_with_source_url():
    """Test fingerprint generation with source_url."""
    profile = {
        "source_url": "https://www.linkedin.com/in/jane-smith-456"
    }
    
    fp = _canonical_fingerprint(profile)
    
    assert fp == "li:jane-smith-456"


def test_canonical_fingerprint_with_trailing_slash():
    """Test that trailing slash is removed from LinkedIn slug."""
    profile = {
        "linkedin_url": "https://www.linkedin.com/in/bob-wilson/"
    }
    
    fp = _canonical_fingerprint(profile)
    
    assert fp == "li:bob-wilson"


def test_canonical_fingerprint_name_company_fallback():
    """Test fingerprint generation using name+company fallback."""
    profile = {
        "full_name": "John Doe",
        "current_company": "Google"
    }
    
    fp = _canonical_fingerprint(profile)
    
    assert fp.startswith("nc:")
    assert len(fp) > 3  # Should have MD5 hash


def test_canonical_fingerprint_name_company_fallback_with_company_field():
    """Test fingerprint using company field when current_company missing."""
    profile = {
        "full_name": "Jane Smith",
        "company": "Microsoft"
    }
    
    fp = _canonical_fingerprint(profile)
    
    assert fp.startswith("nc:")


def test_canonical_fingerprint_empty_profile():
    """Test fingerprint with empty profile."""
    profile = {}
    
    fp = _canonical_fingerprint(profile)
    
    assert fp.startswith("nc:")


def test_canonical_fingerprint_with_special_chars():
    """Test that special characters are removed from name/company."""
    profile = {
        "full_name": "John-Doe Jr.",
        "current_company": "Google Inc."
    }
    
    fp = _canonical_fingerprint(profile)
    
    assert fp.startswith("nc:")
    assert "-" not in fp.split(":")[1]  # Dashes removed
    assert "." not in fp.split(":")[1]  # Dots removed


def test_canonical_fingerprint_case_insensitive():
    """Test that fingerprint is case-insensitive."""
    profile1 = {"linkedin_url": "https://www.linkedin.com/in/JohnDoe"}
    profile2 = {"linkedin_url": "https://www.linkedin.com/in/johndoe"}
    
    fp1 = _canonical_fingerprint(profile1)
    fp2 = _canonical_fingerprint(profile2)
    
    assert fp1 == fp2


def test_canonical_fingerprint_non_linkedin_url():
    """Test that non-LinkedIn URLs fall back to name+company."""
    profile = {
        "linkedin_url": "https://example.com/profile/john"
    }
    
    fp = _canonical_fingerprint(profile)
    
    assert fp.startswith("nc:")


def test_canonical_fingerprint_with_special_slug_chars():
    """Test LinkedIn slug with special characters."""
    profile = {
        "linkedin_url": "https://www.linkedin.com/in/john_doe-123%40test"
    }
    
    fp = _canonical_fingerprint(profile)
    
    assert fp.startswith("li:")
    assert "john_doe-123%40test" in fp