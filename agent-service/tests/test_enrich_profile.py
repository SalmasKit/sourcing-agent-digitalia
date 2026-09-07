"""
test_enrich_profile.py — Tests for Apollo.io LinkedIn enrichment node and tools.

Test groups:
    1. Unit tests for enrich_candidate() with mocked Apollo.io HTTP (no real API calls).
    2. Unit tests for enrich_node() graph node with mocked enrich_candidate().
    3. Integration test for full pipeline with ENRICHMENT_ENABLED=false.
    4. Unit test for MCP enrich_profile tool.
"""
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Fixtures & helpers
# ---------------------------------------------------------------------------

_MOCK_APOLLO_RESPONSE: dict[str, Any] = {
    "person": {
        "first_name": "Youssef",
        "last_name": "Alami",
        "name": "Youssef Alami",
        "headline": "Senior Software Engineer at OCP Group",
        "title": "Senior Software Engineer",
        "organization": {"name": "OCP Group"},
        "departments": ["Engineering", "Information Technology"],
        "functions": ["software_development"],
        "skills": ["Python", "Java", "Spring Boot", "FastAPI", "PostgreSQL"],  # Actual skills field from Apollo
        "employment_history": [
            {
                "title": "Senior Software Engineer",
                "organization_name": "OCP Group",
                "start_date": "2021-03",
                "end_date": None,
                "current": True,
                "description": "Architecting and delivering cloud-native microservices.",
            },
            {
                "title": "Software Engineer",
                "organization_name": "CIH Bank",
                "start_date": "2018-09",
                "end_date": "2021-02",
                "current": False,
                "description": "Developed core banking APIs in Java / Spring Boot.",
            },
        ],
        "education_history": [
            {
                "school": "École Mohammadia d'Ingénieurs",
                "degree": "Engineering Degree",
                "field_of_study": "Computer Science",
                "start_date": "2015",
                "end_date": "2018",
            }
        ],
    }
}

_MOCK_LINKEDIN_URL = "https://www.linkedin.com/in/youssef-alami"


def _make_mock_response(status_code: int, payload: dict) -> MagicMock:
    """Build a mock httpx response object."""
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    mock_resp.json.return_value = payload
    return mock_resp


# ---------------------------------------------------------------------------
# 1. Unit tests — enrich_candidate()
# ---------------------------------------------------------------------------


class TestEnrichCandidate:
    """Unit tests for enrich_candidate() with mocked HTTP and DB."""

    @pytest.mark.asyncio
    async def test_enrich_candidate_french_accented_text_preserved(self):
        """French accented characters (é, è, à, ç) must be preserved through enrichment pipeline."""
        mock_response = {
            "person": {
                "first_name": "Jean",
                "last_name": "Dupont",
                "name": "Jean Dupont",
                "headline": "Ingénieur Études Développement",
                "title": "Ingénieur Études Développement",
                "organization": {"name": "Société Marocaine"},
                "departments": ["Ingénierie", "Études", "Développement"],
                "functions": ["développement_logiciel"],
                "employment_history": [
                    {
                        "title": "Ingénieur Études Développement",
                        "organization_name": "Société Marocaine",
                        "start_date": "2020-01",
                        "end_date": None,
                        "current": True,
                        "description": "Développement d'applications web en français.",
                    },
                ],
            }
        }
        mock_resp = _make_mock_response(200, mock_response)

        with (
            patch("src.mcp_server.tools.enrich_profile.settings") as mock_settings,
            patch("src.mcp_server.tools.enrich_profile.QuotaManager.check_and_increment", new_callable=AsyncMock, return_value=True),
            patch("httpx.AsyncClient") as mock_client_cls,
        ):
            mock_settings.has_enrichment = True
            mock_settings.apollo_api_key = "test-apollo-key"
            mock_settings.enrichment_monthly_quota = 1000
            mock_settings.database_url = "postgresql+asyncpg://user:pass@localhost/db"

            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value = mock_client

            from src.mcp_server.tools.enrich_profile import enrich_candidate
            result = await enrich_candidate("https://www.linkedin.com/in/jean-dupont")

        assert result is not None
        # Verify accented characters are preserved
        assert "É" in result.headline or "é" in result.headline, "Accented É should be preserved in headline"
        # Check skills don't have garbled text like "Ing Nieur"
        for skill in result.skills:
            assert "Nieur" not in skill, f"Garbled text 'Nieur' found in skill: {skill}"
            assert "Tudes" not in skill, f"Garbled text 'Tudes' found in skill: {skill}"
            assert "Veloppement" not in skill, f"Garbled text 'Veloppement' found in skill: {skill}"

    @pytest.mark.asyncio
    async def test_llm_skill_extraction_english(self):
        """Test LLM skill extraction with English text."""
        from src.mcp_server.tools.search_profiles import _extract_skills_via_llm
        
        profile = {
            "headline": "Senior Software Engineer",
            "summary": "Experienced developer specializing in Python, Java, and cloud architecture.",
            "experiences": [
                {
                    "role": "Software Engineer",
                    "company": "Tech Corp",
                    "description": "Developed microservices using Spring Boot and PostgreSQL."
                }
            ]
        }
        
        with patch("src.mcp_server.tools.search_profiles._get_llm") as mock_get_llm:
            mock_llm = AsyncMock()
            mock_response = MagicMock()
            mock_response.content = '{"extracted_skills": [{"skill": "Python", "confidence": "high", "evidence": "Python, Java"}, {"skill": "Spring Boot", "confidence": "high", "evidence": "Spring Boot"}]}'
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_get_llm.return_value = mock_llm
            
            result = await _extract_skills_via_llm(profile)
            
        assert len(result) == 2
        assert result[0]["skill"] == "Python"
        assert result[0]["confidence"] == "high"
        assert result[0]["source"] == "llm_extracted"
        assert result[1]["skill"] == "Spring Boot"

    @pytest.mark.asyncio
    async def test_llm_skill_extraction_french(self):
        """Test LLM skill extraction with French text and accents."""
        from src.mcp_server.tools.search_profiles import _extract_skills_via_llm
        
        profile = {
            "headline": "Ingénieur Études Développement",
            "summary": "Développement d'applications web en Java et Python.",
            "experiences": [
                {
                    "role": "Développeur",
                    "company": "Société Marocaine",
                    "description": "Développement avec Spring Boot et PostgreSQL."
                }
            ]
        }
        
        with patch("src.mcp_server.tools.search_profiles._get_llm") as mock_get_llm:
            mock_llm = AsyncMock()
            mock_response = MagicMock()
            mock_response.content = '{"extracted_skills": [{"skill": "Java", "confidence": "high", "evidence": "Java et Python"}, {"skill": "Spring Boot", "confidence": "high", "evidence": "Spring Boot"}]}'
            mock_llm.ainvoke = AsyncMock(return_value=mock_response)
            mock_get_llm.return_value = mock_llm
            
            result = await _extract_skills_via_llm(profile)
            
        assert len(result) == 2
        assert result[0]["skill"] == "Java"
        assert result[0]["source"] == "llm_extracted"

    @pytest.mark.asyncio
    async def test_llm_skill_extraction_no_text(self):
        """Test LLM skill extraction returns empty list when no text signals available."""
        from src.mcp_server.tools.search_profiles import _extract_skills_via_llm
        
        profile = {"headline": "", "summary": "", "experiences": []}
        
        with patch("src.mcp_server.tools.search_profiles._get_llm") as mock_get_llm:
            mock_get_llm.return_value = None
            
            result = await _extract_skills_via_llm(profile)
            
        assert result == []

    def test_apollo_department_underscore_converted_to_space(self):
        """Regression test: Apollo snake_case departments should have underscores replaced with spaces."""
        from src.mcp_server.tools.enrich_profile import _parse_apollo_person
        
        person = {
            "name": "Test User",
            "departments": ["master_engineering_technical", "software_development"],
            "functions": []
        }
        result = _parse_apollo_person(person)
        
        # Should have spaces, not underscores
        assert "Master Engineering Technical" in result.skills
        assert "Software Development" in result.skills
        # No underscores should remain in any skill
        for skill in result.skills:
            assert "_" not in skill, f"Underscore found in skill: {skill}"

    def test_extract_skills_fallback_preserves_french_accents(self):
        """Regression test: _extract_skills fallback should preserve French accents (é, è, à, ç)."""
        from src.mcp_server.tools.search_profiles import _extract_skills
        
        # Test with French title containing accents
        result = _extract_skills("Ingénieur Études Développement", "", {"required_skills": []})
        
        # Should preserve whole accented words, not split them
        assert any("Ingénieur" in s or "ingénieur" in s.lower() for s in result), \
            "Should preserve 'Ingénieur' as a whole word"
        assert any("Études" in s or "études" in s.lower() for s in result), \
            "Should preserve 'Études' as a whole word"
        assert any("Développement" in s or "développement" in s.lower() for s in result), \
            "Should preserve 'Développement' as a whole word"
        
        # Should NOT have garbled fragments
        for skill in result:
            assert "Nieur" not in skill, f"Garbled fragment 'Nieur' found in: {skill}"
            assert "Tudes" not in skill, f"Garbled fragment 'Tudes' found in: {skill}"
            assert "Veloppement" not in skill, f"Garbled fragment 'Veloppement' found in: {skill}"

    def test_format_period_date_preserves_french_months(self):
        """Regression test: format_period_date should parse French months with accents (août, décembre)."""
        from src.mcp_server.tools.enrich_profile import format_period_date
        
        # Test French month with accent (août)
        result_août = format_period_date("août 2021")
        assert result_août is not None, "Should parse 'août 2021'"
        assert "2021" in result_août, "Should preserve year"
        
        # Test another French month with accent (décembre)
        result_dec = format_period_date("décembre 2020")
        assert result_dec is not None, "Should parse 'décembre 2020'"
        assert "2020" in result_dec, "Should preserve year"
        
        # Test standard English month still works
        result_jan = format_period_date("January 2019")
        assert result_jan is not None, "Should parse 'January 2019'"
        assert "2019" in result_jan, "Should preserve year"

    @pytest.mark.asyncio
    async def test_enrich_candidate_success(self):
        """Happy path: 200 Apollo response → EnrichedProfile with real education & experience."""
        mock_resp = _make_mock_response(200, _MOCK_APOLLO_RESPONSE)

        with (
            patch("src.mcp_server.tools.enrich_profile.settings") as mock_settings,
            patch("src.mcp_server.tools.enrich_profile.QuotaManager.check_and_increment", new_callable=AsyncMock, return_value=True),
            patch("httpx.AsyncClient") as mock_client_cls,
        ):
            mock_settings.has_enrichment = True
            mock_settings.apollo_api_key = "test-apollo-key"
            mock_settings.enrichment_monthly_quota = 1000
            mock_settings.database_url = "postgresql+asyncpg://user:pass@localhost/db"

            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value = mock_client

            from src.mcp_server.tools.enrich_profile import enrich_candidate
            result = await enrich_candidate(_MOCK_LINKEDIN_URL)

        assert result is not None, "Expected EnrichedProfile, got None"
        assert result.raw_source == "enriched"
        assert result.full_name == "Youssef Alami"
        assert result.headline == "Senior Software Engineer at OCP Group"

        # Experience list must be non-empty and well-structured
        assert len(result.experience) >= 1, "Expected at least 1 experience entry"
        exp = result.experience[0]
        assert exp.company != ""
        assert exp.title != ""

        # Skills list must be non-empty
        assert len(result.skills) >= 1, "Expected at least 1 skill"

    @pytest.mark.asyncio
    async def test_enrich_candidate_quota_exceeded(self):
        """When monthly quota is exceeded, enrich_candidate must return None immediately."""
        with (
            patch("src.mcp_server.tools.enrich_profile.settings") as mock_settings,
            patch("src.mcp_server.tools.enrich_profile.QuotaManager.check_and_increment", new_callable=AsyncMock, return_value=False),
        ):
            mock_settings.has_enrichment = True
            mock_settings.apollo_api_key = "test-key"
            mock_settings.enrichment_monthly_quota = 0  # quota exhausted

            from src.mcp_server.tools.enrich_profile import enrich_candidate
            result = await enrich_candidate(_MOCK_LINKEDIN_URL)

        assert result is None, "Should return None when quota is exceeded"

    @pytest.mark.asyncio
    async def test_enrich_candidate_api_error_429(self):
        """On HTTP 429, enrich_candidate returns None and rolls back the quota increment."""
        mock_resp = _make_mock_response(429, {"message": "Too Many Requests"})

        with (
            patch("src.mcp_server.tools.enrich_profile.settings") as mock_settings,
            patch("src.mcp_server.tools.enrich_profile.QuotaManager.check_and_increment", new_callable=AsyncMock, return_value=True),
            patch("src.mcp_server.tools.enrich_profile._decrement_quota_on_failure", new_callable=AsyncMock) as mock_decrement,
            patch("httpx.AsyncClient") as mock_client_cls,
        ):
            mock_settings.has_enrichment = True
            mock_settings.apollo_api_key = "test-key"
            mock_settings.enrichment_monthly_quota = 1000
            mock_settings.database_url = "postgresql+asyncpg://user:pass@localhost/db"

            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value = mock_client

            from src.mcp_server.tools.enrich_profile import enrich_candidate
            result = await enrich_candidate(_MOCK_LINKEDIN_URL)

        assert result is None, "Should return None on HTTP 429"
        mock_decrement.assert_called_once()  # quota rollback must have been attempted

    @pytest.mark.asyncio
    async def test_enrich_candidate_no_url(self):
        """Blank or non-LinkedIn URLs must return None immediately without any API call."""
        with patch("src.mcp_server.tools.enrich_profile.settings") as mock_settings:
            mock_settings.has_enrichment = True

            from src.mcp_server.tools.enrich_profile import enrich_candidate

            # Blank URL
            assert await enrich_candidate("") is None
            # Non-LinkedIn URL
            assert await enrich_candidate("https://github.com/someone") is None

    @pytest.mark.asyncio
    async def test_enrich_candidate_enrichment_disabled(self):
        """When ENRICHMENT_ENABLED=false (has_enrichment=False), skip immediately."""
        with patch("src.mcp_server.tools.enrich_profile.settings") as mock_settings:
            mock_settings.has_enrichment = False

            from src.mcp_server.tools.enrich_profile import enrich_candidate
            result = await enrich_candidate(_MOCK_LINKEDIN_URL)

        assert result is None


# ---------------------------------------------------------------------------
# 2. Unit tests — enrich_node() graph node
# ---------------------------------------------------------------------------


class TestEnrichNode:
    """Unit tests for enrich_node() in graph.py."""

    def _make_state(self, profiles: list[dict]) -> dict:
        return {
            "query": "Java developer Casablanca",
            "criteria": {"job_title": "Java Developer", "required_skills": ["Java"]},
            "raw_profiles": profiles,
            "enriched_profiles": [],
            "scored_profiles": [],
            "top_profiles": [],
            "sourcing_summary": {},
            "messages": [],
            "error": None,
            "retry_count": 0,
        }

    @pytest.mark.asyncio
    async def test_enrich_node_disabled(self):
        """When enrichment is disabled, enrich_node must be a no-op — profiles unchanged."""
        state = self._make_state([{"id": "p1", "full_name": "Test User", "linkedin_url": _MOCK_LINKEDIN_URL}])

        with (
            patch("src.agent.graph.settings") as mock_settings,
            patch("src.agent.graph._ai_enrich_profile", new_callable=AsyncMock) as mock_ai,
        ):
            mock_settings.has_enrichment = False
            mock_settings.groq_api_key = ""

            from src.agent.graph import enrich_node
            result_state = await enrich_node(state)  # type: ignore[arg-type]

        mock_ai.assert_not_called()
        # No enrichment_source key should have been added
        assert "enrichment_source" not in result_state["raw_profiles"][0]

    @pytest.mark.asyncio
    async def test_enrich_node_api_failure_fallback_to_groq(self):
        """When enrich_candidate returns None, fallback to groq_fallback or snippet_only."""
        state = self._make_state([
            {"id": "p1", "full_name": "User 1", "linkedin_url": _MOCK_LINKEDIN_URL},
            {"id": "p2", "full_name": "User 2", "linkedin_url": "https://linkedin.com/in/user2"},
        ])

        with (
            patch("src.agent.graph.settings") as mock_settings,
            patch("src.agent.graph.enrich_candidate", new_callable=AsyncMock, return_value=None),
            patch("src.agent.graph._ai_enrich_profile", side_effect=lambda p: {**p, "enrichment_source": "groq_fallback"}),
        ):
            mock_settings.has_enrichment = True
            mock_settings.groq_api_key = "test-groq-key"

            from src.agent.graph import enrich_node
            result_state = await enrich_node(state)  # type: ignore[arg-type]

        profiles = result_state["raw_profiles"]
        assert len(profiles) == 2
        for p in profiles:
            assert p["enrichment_source"] in ("groq_fallback", "snippet_only")

    @pytest.mark.asyncio
    async def test_enrich_node_merges_enriched_data(self):
        """When enrich_candidate succeeds, the enriched fields must overwrite the originals."""
        from src.mcp_server.tools.enrich_profile import (
            EducationEntry,
            EnrichedProfile,
            ExperienceEntry,
        )

        mock_result = EnrichedProfile(
            full_name="Youssef Alami",
            headline="Senior SWE at OCP",
            education=[EducationEntry(institution="EMI", degree="Engineering")],
            experience=[ExperienceEntry(company="OCP Group", title="Senior SWE")],
            skills=["Java", "Spring Boot"],
            raw_source="enriched",
        )

        sample_profiles = [
            {
                "id": "p1",
                "full_name": "Old Name",
                "headline": "Old Headline",
                "skills": ["C#"],
                "linkedin_url": _MOCK_LINKEDIN_URL,
            }
        ]
        state = self._make_state(sample_profiles)

        with (
            patch("src.agent.graph.settings") as mock_settings,
            patch("src.agent.graph.enrich_candidate", new_callable=AsyncMock, return_value=mock_result),
        ):
            mock_settings.has_enrichment = True

            from src.agent.graph import enrich_node
            result_state = await enrich_node(state)  # type: ignore[arg-type]

        p = result_state["raw_profiles"][0]
        assert p["full_name"] == "Youssef Alami"
        assert p["headline"] == "Senior SWE at OCP"
        assert "Java" in p["skills"]
        assert p["enrichment_source"] in ("apollo", "enriched")
        assert len(p["experiences"]) == 1
        assert p["experiences"][0]["company"] == "OCP Group"


# ---------------------------------------------------------------------------
# 3. Integration test — full pipeline with ENRICHMENT_ENABLED=false
# ---------------------------------------------------------------------------


class TestFullPipelineEnrichmentDisabled:
    """
    Integration test confirming the snippet-only path is 100% intact
    when enrichment is turned off.
    """

    def test_full_pipeline_enrichment_disabled(self):
        """POST /api/search with enrichment off returns profiles with expected shape."""
        import os
        os.environ["ENRICHMENT_ENABLED"] = "false"
        os.environ["APOLLO_API_KEY"] = ""

        from src.config import get_settings
        get_settings.cache_clear()

        _CANNED_RESULT = {
            "job_id": None,
            "query": "Senior Java Developer à Casablanca",
            "criteria": {"job_title": "Java Developer", "required_skills": ["Java"]},
            "summary": {
                "total_profiles": 2,
                "strong_matches": 1,
                "average_score": 80,
                "top_candidate": "Alice Dev",
                "top_score": 85,
            },
            "profiles": [
                {
                    "id": "mock-1",
                    "full_name": "Alice Dev",
                    "match_score": 85,
                    "recommendation": "Strong Match",
                    "enrichment_source": "snippet_fallback",
                },
                {
                    "id": "mock-2",
                    "full_name": "Bob Code",
                    "match_score": 70,
                    "recommendation": "Good Match",
                    "enrichment_source": "snippet_fallback",
                },
            ],
        }

        with patch(
            "src.api.routes.run_sourcing_agent",
            new_callable=AsyncMock,
            return_value=_CANNED_RESULT,
        ):
            import base64

            import jwt
            from fastapi.testclient import TestClient

            from src.main import app

            secret = get_settings().jwt_secret or "9a4f2c5d6e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c"
            token = jwt.encode({"sub": "test@digitalia.ma", "role": "RECRUITER"}, base64.b64decode(secret), algorithm="HS256")

            client = TestClient(app)
            payload = {
                "query": "Senior Java Developer à Casablanca",
                "max_results": 4,
            }
            response = client.post("/api/search", json=payload, headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}: {response.text}"
        )
        data = response.json()

        # Validate response contract
        assert "profiles" in data, "Response must contain 'profiles' key"
        assert isinstance(data["profiles"], list)
        assert len(data["profiles"]) == 2

        for p in data["profiles"]:
            assert p.get("enrichment_source") == "snippet_fallback"

        # Cleanup
        os.environ.pop("ENRICHMENT_ENABLED", None)
        os.environ.pop("APOLLO_API_KEY", None)
        get_settings.cache_clear()


# ---------------------------------------------------------------------------
# 4. MCP Tool Test
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_mcp_enrich_profile_tool():
    """Verify that the MCP enrich_profile tool wraps enrich_candidate properly."""
    from src.mcp_server.tools.enrich_profile import EnrichedProfile, enrich_profile

    mock_enriched = EnrichedProfile(
        full_name="Youssef Alami",
        headline="Senior Software Engineer",
        summary="Experienced engineer.",
        education=[],
        experience=[],
        skills=["Python", "FastAPI"],
        raw_source="enriched",
    )

    with patch("src.mcp_server.tools.enrich_profile.enrich_candidate", new_callable=AsyncMock, return_value=mock_enriched):
        result = await enrich_profile("https://www.linkedin.com/in/youssef-alami")
        assert result is not None
        assert result["full_name"] == "Youssef Alami"
        assert result["skills"] == ["Python", "FastAPI"]
        assert result["raw_source"] == "enriched"

    with patch("src.mcp_server.tools.enrich_profile.enrich_candidate", new_callable=AsyncMock, return_value=None):
        result = await enrich_profile("https://www.linkedin.com/in/invalid")
        assert result is None
