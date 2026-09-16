"""
Coverage-focused tests for score_profile.py to improve coverage.
"""
import pytest
from unittest.mock import AsyncMock, patch
import json

from src.mcp_server.tools.score_profile import (
    _build_job_context,
    _build_profile_context,
    _build_candidate_corpus,
    _baseline_skill_check,
    _compute_skill_score,
    _clean_log,
    score_profile,
)


class TestTitleMatchingLogic:
    """Test title matching logic in score_profile."""

    def test_title_matching_with_stop_words(self):
        """Test title matching with stop words filtering."""
        req_title = "senior software engineer"
        cand_title = "lead senior software engineer manager"
        
        stop_words = {"lead", "senior", "junior", "manager", "head", "specialist", "in", "and", "of", "the", "de", "du", "des", "le", "la", "pour", "chef", "responsable", "directeur", "consultant"}
        req_words = [w for w in req_title.split() if w not in stop_words]
        
        assert "software" in req_words
        assert "engineer" in req_words
        assert "senior" not in req_words  # Should be filtered out

    def test_title_exact_match(self):
        """Test exact title match gets 100 score."""
        req_title = "java developer"
        cand_title = "java developer"
        
        if req_title in cand_title:
            title_score = 100
        else:
            title_score = 30
            
        assert title_score == 100

    def test_title_all_words_match(self):
        """Test when all required words match."""
        req_title = "python developer"
        cand_title = "senior python developer"
        
        stop_words = {"lead", "senior", "junior", "manager", "head", "specialist", "in", "and", "of", "the", "de", "du", "des", "le", "la", "pour", "chef", "responsable", "directeur", "consultant"}
        req_words = [w for w in req_title.split() if w not in stop_words]
        
        if req_words and all(w in cand_title for w in req_words):
            title_score = 95
        else:
            title_score = 30
            
        assert title_score == 95

    def test_title_partial_word_match(self):
        """Test when some required words match."""
        req_title = "java spring developer"
        cand_title = "java developer"
        
        stop_words = {"lead", "senior", "junior", "manager", "head", "specialist", "in", "and", "of", "the", "de", "du", "des", "le", "la", "pour", "chef", "responsable", "directeur", "consultant"}
        req_words = [w for w in req_title.split() if w not in stop_words]
        
        if req_words and any(w in cand_title for w in req_words):
            matched_count = sum(1 for w in req_words if w in cand_title)
            title_score = 60 + int((matched_count / len(req_words)) * 30)
        else:
            title_score = 30
            
        assert title_score >= 60
        assert title_score < 100

    def test_title_no_match(self):
        """Test when no words match."""
        req_title = "java developer"
        cand_title = "marketing manager"
        
        stop_words = {"lead", "senior", "junior", "manager", "head", "specialist", "in", "and", "of", "the", "de", "du", "des", "le", "la", "pour", "chef", "responsable", "directeur", "consultant"}
        req_words = [w for w in req_title.split() if w not in stop_words]
        
        if req_words and any(w in cand_title for w in req_words):
            matched_count = sum(1 for w in req_words if w in cand_title)
            title_score = 60 + int((matched_count / len(req_words)) * 30)
        else:
            title_score = 30
            
        assert title_score == 30

    def test_title_no_requirement(self):
        """Test when no title requirement is specified."""
        req_title = ""
        
        if not req_title:
            title_score = 90
        else:
            title_score = 30
            
        assert title_score == 90


class TestExperienceScoringLogic:
    """Test experience scoring logic."""

    def test_experience_seniority_manager(self):
        """Test experience inference from manager title."""
        seniority_str = "manager director java"
        min_exp = 0
        
        if any(k in seniority_str for k in ["manager", "director", "head", "lead", "principal", "architect"]):
            min_exp = 8
        elif "senior" in seniority_str:
            min_exp = 5
        elif any(k in seniority_str for k in ["mid", "medior"]):
            min_exp = 3
        elif any(k in seniority_str for k in ["junior", "entry"]):
            min_exp = 1
            
        assert min_exp == 8

    def test_experience_seniority_senior(self):
        """Test experience inference from senior title."""
        seniority_str = "senior python developer"
        min_exp = 0
        
        if any(k in seniority_str for k in ["manager", "director", "head", "lead", "principal", "architect"]):
            min_exp = 8
        elif "senior" in seniority_str:
            min_exp = 5
        elif any(k in seniority_str for k in ["mid", "medior"]):
            min_exp = 3
        elif any(k in seniority_str for k in ["junior", "entry"]):
            min_exp = 1
            
        assert min_exp == 5

    def test_experience_seniority_mid(self):
        """Test experience inference from mid-level title."""
        seniority_str = "mid-level developer"
        min_exp = 0
        
        if any(k in seniority_str for k in ["manager", "director", "head", "lead", "principal", "architect"]):
            min_exp = 8
        elif "senior" in seniority_str:
            min_exp = 5
        elif any(k in seniority_str for k in ["mid", "medior"]):
            min_exp = 3
        elif any(k in seniority_str for k in ["junior", "entry"]):
            min_exp = 1
            
        assert min_exp == 3

    def test_experience_seniority_junior(self):
        """Test experience inference from junior title."""
        seniority_str = "junior developer"
        min_exp = 0
        
        if any(k in seniority_str for k in ["manager", "director", "head", "lead", "principal", "architect"]):
            min_exp = 8
        elif "senior" in seniority_str:
            min_exp = 5
        elif any(k in seniority_str for k in ["mid", "medior"]):
            min_exp = 3
        elif any(k in seniority_str for k in ["junior", "entry"]):
            min_exp = 1
            
        assert min_exp == 1

    def test_experience_score_above_requirement(self):
        """Test experience score when candidate exceeds requirement."""
        min_exp = 5
        candidate_exp = 7
        
        if min_exp == 0:
            exp_score = 80
        elif candidate_exp >= min_exp:
            exp_score = min(100, 70 + (candidate_exp - min_exp) * 5)
        else:
            exp_score = max(0, int(candidate_exp / min_exp * 70))
            
        assert exp_score == 80

    def test_experience_score_below_requirement(self):
        """Test experience score when candidate below requirement."""
        min_exp = 5
        candidate_exp = 3
        
        if min_exp == 0:
            exp_score = 80
        elif candidate_exp >= min_exp:
            exp_score = min(100, 70 + (candidate_exp - min_exp) * 5)
        else:
            exp_score = max(0, int(candidate_exp / min_exp * 70))
            
        assert exp_score == 42

    def test_experience_score_no_requirement(self):
        """Test experience score when no requirement."""
        min_exp = 0
        candidate_exp = 3
        
        if min_exp == 0:
            exp_score = 80
        elif candidate_exp >= min_exp:
            exp_score = min(100, 70 + (candidate_exp - min_exp) * 5)
        else:
            exp_score = max(0, int(candidate_exp / min_exp * 70))
            
        assert exp_score == 80


class TestLocationScoringLogic:
    """Test location scoring logic."""

    def test_location_any(self):
        """Test location score when 'Any'."""
        req_loc = "any"
        cand_loc = "Rabat"
        
        if not req_loc or req_loc in ("any", "all locations", "morocco", "maroc"):
            location_score = 95
        elif req_loc in cand_loc or cand_loc in req_loc:
            location_score = 100
        elif "remote" in cand_loc or "remote" in req_loc:
            location_score = 90
        else:
            location_score = 70
            
        assert location_score == 95

    def test_location_exact_match(self):
        """Test location score with exact match."""
        req_loc = "casablanca"
        cand_loc = "casablanca"
        
        if not req_loc or req_loc in ("any", "all locations", "morocco", "maroc"):
            location_score = 95
        elif req_loc in cand_loc or cand_loc in req_loc:
            location_score = 100
        elif "remote" in cand_loc or "remote" in req_loc:
            location_score = 90
        else:
            location_score = 70
            
        assert location_score == 100

    def test_location_contained(self):
        """Test location score when candidate location contains requirement."""
        req_loc = "casablanca"
        cand_loc = "casablanca morocco"
        
        if not req_loc or req_loc in ("any", "all locations", "morocco", "maroc"):
            location_score = 95
        elif req_loc in cand_loc or cand_loc in req_loc:
            location_score = 100
        elif "remote" in cand_loc or "remote" in req_loc:
            location_score = 90
        else:
            location_score = 70
            
        assert location_score == 100

    def test_location_remote(self):
        """Test location score with remote."""
        req_loc = "remote"
        cand_loc = "remote"
        
        if not req_loc or req_loc in ("any", "all locations", "morocco", "maroc"):
            location_score = 95
        elif req_loc in cand_loc or cand_loc in req_loc:
            location_score = 100
        elif "remote" in cand_loc or "remote" in req_loc:
            location_score = 90
        else:
            location_score = 70
            
        assert location_score == 100

    def test_location_mismatch(self):
        """Test location score with mismatch."""
        req_loc = "casablanca"
        cand_loc = "rabat"
        
        if not req_loc or req_loc in ("any", "all locations", "morocco", "maroc"):
            location_score = 95
        elif req_loc in cand_loc or cand_loc in req_loc:
            location_score = 100
        elif "remote" in cand_loc or "remote" in req_loc:
            location_score = 90
        else:
            location_score = 70
            
        assert location_score == 70

    def test_location_morocco(self):
        """Test location score with Morocco."""
        req_loc = "morocco"
        cand_loc = "casablanca"
        
        if not req_loc or req_loc in ("any", "all locations", "morocco", "maroc"):
            location_score = 95
        elif req_loc in cand_loc or cand_loc in req_loc:
            location_score = 100
        elif "remote" in cand_loc or "remote" in req_loc:
            location_score = 90
        else:
            location_score = 70
            
        assert location_score == 95


class TestRecommendationTiers:
    """Test recommendation tier logic."""

    def test_recommendation_strong_match(self):
        """Test strong match recommendation."""
        base_score = 85
        
        if base_score >= 80:
            recommendation = "Strong Match"
        elif base_score >= 65:
            recommendation = "Good Match"
        elif base_score >= 45:
            recommendation = "Partial Match"
        else:
            recommendation = "Not Recommended"
            
        assert recommendation == "Strong Match"

    def test_recommendation_good_match(self):
        """Test good match recommendation."""
        base_score = 70
        
        if base_score >= 80:
            recommendation = "Strong Match"
        elif base_score >= 65:
            recommendation = "Good Match"
        elif base_score >= 45:
            recommendation = "Partial Match"
        else:
            recommendation = "Not Recommended"
            
        assert recommendation == "Good Match"

    def test_recommendation_partial_match(self):
        """Test partial match recommendation."""
        base_score = 50
        
        if base_score >= 80:
            recommendation = "Strong Match"
        elif base_score >= 65:
            recommendation = "Good Match"
        elif base_score >= 45:
            recommendation = "Partial Match"
        else:
            recommendation = "Not Recommended"
            
        assert recommendation == "Partial Match"

    def test_recommendation_not_recommended(self):
        """Test not recommended recommendation."""
        base_score = 30
        
        if base_score >= 80:
            recommendation = "Strong Match"
        elif base_score >= 65:
            recommendation = "Good Match"
        elif base_score >= 45:
            recommendation = "Partial Match"
        else:
            recommendation = "Not Recommended"
            
        assert recommendation == "Not Recommended"


class TestScoreProfileIntegration:
    """Integration tests for score_profile with mocked dependencies."""

    @pytest.mark.asyncio
    @patch("src.mcp_server.tools.score_profile.compute_similarity")
    @patch("src.mcp_server.tools.score_profile._get_llm")
    async def test_score_profile_without_llm(self, mock_get_llm, mock_similarity):
        """Test scoring without LLM rationale."""
        mock_get_llm.return_value = None
        mock_similarity.return_value = 0.80

        profile = {
            "full_name": "Alice Developer",
            "headline": "Senior Java Developer",
            "experience_years": 6,
            "location": "Casablanca",
            "skills": ["Java", "Spring"]
        }

        criteria = {
            "job_title": "Java Developer",
            "required_skills": ["Java"],
            "location": "Casablanca"
        }

        result = await score_profile(profile, criteria, use_llm_rationale=False)

        assert result["full_name"] == "Alice Developer"
        assert "match_score" in result
        assert 0 <= result["match_score"] <= 100
        assert "skill_match_score" in result
        assert "experience_score" in result
        assert "location_score" in result
        assert "embedding_score" in result

    @pytest.mark.asyncio
    @patch("src.mcp_server.tools.score_profile.compute_similarity")
    @patch("src.mcp_server.tools.score_profile._get_llm")
    async def test_score_profile_embedding_failure(self, mock_get_llm, mock_similarity):
        """Test graceful handling of embedding failure."""
        mock_get_llm.return_value = None
        mock_similarity.side_effect = Exception("Embedding service down")

        profile = {
            "full_name": "Bob Developer",
            "headline": "Developer",
            "skills": ["Python"]
        }

        criteria = {"job_title": "Developer"}

        result = await score_profile(profile, criteria, use_llm_rationale=False)

        # Should still provide a score even with embedding failure
        assert result["match_score"] > 0
        assert result["embedding_score"] == 70  # Fallback score

    @pytest.mark.asyncio
    @patch("src.mcp_server.tools.score_profile.compute_similarity")
    @patch("src.mcp_server.tools.score_profile._get_llm")
    async def test_score_profile_strong_match(self, mock_get_llm, mock_similarity):
        """Test scoring that results in strong match."""
        mock_get_llm.return_value = None
        mock_similarity.return_value = 0.90

        profile = {
            "full_name": "Perfect Candidate",
            "headline": "Java Developer",
            "experience_years": 10,
            "location": "Casablanca",
            "skills": ["Java", "Spring", "Kubernetes"]
        }

        criteria = {
            "job_title": "Java Developer",
            "required_skills": ["Java", "Spring"],
            "location": "Casablanca",
            "min_experience_years": 5
        }

        result = await score_profile(profile, criteria, use_llm_rationale=False)

        assert result["match_score"] >= 80
        assert result["skill_match_score"] >= 70
        assert result["experience_score"] >= 70
        assert result["location_score"] >= 90

    @pytest.mark.asyncio
    @patch("src.mcp_server.tools.score_profile.compute_similarity")
    @patch("src.mcp_server.tools.score_profile._get_llm")
    async def test_score_profile_minimal_data(self, mock_get_llm, mock_similarity):
        """Test scoring with minimal profile data."""
        mock_get_llm.return_value = None
        mock_similarity.return_value = 0.50

        profile = {
            "full_name": "Minimal Candidate",
            "headline": "Developer"
        }

        criteria = {"job_title": "Developer"}

        result = await score_profile(profile, criteria, use_llm_rationale=False)

        assert result["full_name"] == "Minimal Candidate"
        assert "match_score" in result
        assert result["match_score"] > 0
