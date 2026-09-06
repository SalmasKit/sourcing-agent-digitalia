"""
Integration tests for critical API flows (search, enrich, score).
These tests verify end-to-end behavior of the main user journeys.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock


class TestSearchFlow:
    """Integration tests for the search flow."""

    @pytest.mark.skip(reason="Integration tests require actual API endpoints and auth")
    @pytest.mark.asyncio
    async def test_search_endpoint_with_valid_request(self):
        """Test search endpoint with valid request returns profiles."""
        from src.main import app
        client = TestClient(app)
        
        mock_profiles = [
            {
                "id": "1",
                "name": "John Doe",
                "headline": "Software Engineer",
                "summary": "Python developer",
                "match_score": 85,
                "source": "serpapi"
            }
        ]
        
        with patch("src.mcp_server.tools.search_profiles.search_profiles") as mock_search:
            mock_search.return_value = mock_profiles
            
            response = client.post("/api/search", json={
                "job_title": "Software Engineer",
                "location": "Casablanca",
                "required_skills": ["Python"],
                "limit": 5
            })
            
            assert response.status_code == 200
            data = response.json()
            assert "profiles" in data
            assert len(data["profiles"]) == 1
            assert data["profiles"][0]["name"] == "John Doe"

    @pytest.mark.skip(reason="Integration tests require actual API endpoints and auth")
    @pytest.mark.asyncio
    async def test_search_endpoint_missing_serpapi_key(self):
        """Test search endpoint fails when SerpAPI key is missing."""
        from src.main import app
        client = TestClient(app)
        
        with patch("src.mcp_server.tools.search_profiles.settings") as mock_settings:
            mock_settings.has_serpapi = False
            
            response = client.post("/api/search", json={
                "job_title": "Software Engineer",
                "limit": 5
            })
            
            assert response.status_code == 500


class TestEnrichFlow:
    """Integration tests for the enrichment flow."""

    @pytest.mark.skip(reason="Integration tests require actual API endpoints and auth")
    @pytest.mark.asyncio
    async def test_enrich_endpoint_with_valid_linkedin_url(self):
        """Test enrichment endpoint with valid LinkedIn URL."""
        from src.main import app
        client = TestClient(app)
        
        mock_enriched = {
            "id": "1",
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+1234567890",
            "company": "Tech Corp",
            "title": "Senior Software Engineer"
        }
        
        with patch("src.mcp_server.tools.enrich_profile.enrich_candidate") as mock_enrich:
            mock_enrich.return_value = mock_enriched
            
            response = client.post("/api/enrich", json={
                "linkedin_url": "https://linkedin.com/in/johndoe"
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "John Doe"
            assert data["email"] == "john@example.com"

    @pytest.mark.skip(reason="Integration tests require actual API endpoints and auth")
    @pytest.mark.asyncio
    async def test_enrich_endpoint_invalid_linkedin_url(self):
        """Test enrichment endpoint with invalid LinkedIn URL."""
        from src.main import app
        client = TestClient(app)
        
        response = client.post("/api/enrich", json={
            "linkedin_url": "https://example.com/not-linkedin"
        })
        
        assert response.status_code == 400


class TestScoreFlow:
    """Integration tests for the scoring flow."""

    @pytest.mark.skip(reason="Integration tests require actual API endpoints and auth")
    @pytest.mark.asyncio
    async def test_score_endpoint_with_valid_candidate(self):
        """Test scoring endpoint with valid candidate data."""
        from src.main import app
        client = TestClient(app)
        
        with patch("src.mcp_server.tools.score_profile.score_candidate") as mock_score:
            mock_score.return_value = {"match_score": 92, "reasoning": "Strong match"}
            
            response = client.post("/api/score", json={
                "candidate": {
                    "name": "John Doe",
                    "headline": "Software Engineer",
                    "summary": "Python developer with 5 years experience",
                    "skills": ["Python", "Django", "PostgreSQL"]
                },
                "job_criteria": {
                    "job_title": "Senior Python Developer",
                    "required_skills": ["Python", "Django"],
                    "seniority": "Senior"
                }
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["match_score"] == 92
            assert "reasoning" in data


class TestPoolSearchFlow:
    """Integration tests for the candidate pool search flow."""

    @pytest.mark.skip(reason="Integration tests require actual API endpoints and auth")
    @pytest.mark.asyncio
    async def test_pool_search_endpoint_with_query(self):
        """Test pool search endpoint with valid query."""
        from src.main import app
        client = TestClient(app)
        
        mock_results = [
            {
                "id": "1",
                "name": "Jane Doe",
                "headline": "Data Scientist",
                "pool_similarity": 88,
                "match_score": 88,
                "source": "talent_pool"
            }
        ]
        
        with patch("src.mcp_server.tools.candidate_pool.rerank_pool") as mock_rerank:
            mock_rerank.return_value = mock_results
            
            response = client.post("/api/pool/search", json={
                "query": "senior data scientist python machine learning",
                "limit": 10
            })
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["name"] == "Jane Doe"
            assert data[0]["pool_similarity"] == 88

    @pytest.mark.skip(reason="Integration tests require actual API endpoints and auth")
    @pytest.mark.asyncio
    async def test_pool_search_endpoint_empty_query(self):
        """Test pool search endpoint with empty query returns empty list."""
        from src.main import app
        client = TestClient(app)
        
        response = client.post("/api/pool/search", json={
            "query": "",
            "limit": 10
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data == []


class TestOutreachFlow:
    """Integration tests for the outreach generation flow."""

    @pytest.mark.skip(reason="Integration tests require actual API endpoints and auth")
    @pytest.mark.asyncio
    async def test_outreach_endpoint_with_valid_data(self):
        """Test outreach endpoint with valid candidate and job data."""
        from src.main import app
        client = TestClient(app)
        
        mock_outreach = {
            "subject": "Exciting opportunity at Tech Corp",
            "body": "Hi John, I came across your profile...",
            "tone": "professional"
        }
        
        with patch("src.mcp_server.tools.outreach.generate_outreach") as mock_gen:
            mock_gen.return_value = mock_outreach
            
            response = client.post("/api/outreach", json={
                "candidate": {
                    "name": "John Doe",
                    "headline": "Software Engineer",
                    "company": "Current Corp"
                },
                "job_details": {
                    "title": "Senior Software Engineer",
                    "company": "Tech Corp",
                    "description": "We are looking for..."
                },
                "tone": "professional"
            })
            
            assert response.status_code == 200
            data = response.json()
            assert "subject" in data
            assert "body" in data
            assert data["tone"] == "professional"


class TestHealthEndpoint:
    """Integration tests for the health endpoint."""

    @pytest.mark.skip(reason="Integration tests require actual API endpoints and auth")
    def test_health_endpoint_returns_status(self):
        """Test health endpoint returns system status."""
        from src.main import app
        client = TestClient(app)
        
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "data_sources" in data


class TestRateLimiting:
    """Integration tests for rate limiting."""

    @pytest.mark.skip(reason="Integration tests require actual API endpoints and auth")
    def test_search_endpoint_rate_limiting(self):
        """Test that search endpoint is rate limited."""
        from src.main import app
        client = TestClient(app)
        
        # Mock the search to avoid actual API calls
        with patch("src.mcp_server.tools.search_profiles.search_profiles") as mock_search:
            mock_search.return_value = []
            
            # Make multiple requests - should be rate limited after threshold
            for _ in range(11):  # Limit is 10 per minute
                response = client.post("/api/search", json={
                    "job_title": "Software Engineer",
                    "limit": 5
                })
            
            # Last request should be rate limited
            assert response.status_code == 429
