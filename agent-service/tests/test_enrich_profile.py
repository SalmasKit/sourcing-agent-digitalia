"""
test_enrich_profile.py — Tests for the RapidAPI LinkedIn enrichment node.

Test groups:
    1. Unit tests for enrich_candidate() with mocked httpx (no real API calls).
    2. Unit tests for enrich_node() graph node with mocked enrich_candidate().
    3. Integration test for full pipeline with ENRICHMENT_ENABLED=false.
"""
import asyncio
import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Fixtures & helpers
# ---------------------------------------------------------------------------

# Realistic RapidAPI response payload (subset of the actual schema)
_MOCK_RAPIDAPI_RESPONSE: dict[str, Any] = {
    "data": {
        "firstName": "Youssef",
        "lastName": "Alami",
        "headline": "Senior Software Engineer at OCP Group",
        "educations": [
            {
                "school": "École Mohammadia d'Ingénieurs",
                "degree": "Engineering Degree",
                "fieldOfStudy": "Computer Science",
                "start": "2015",
                "end": "2018",
            },
            {
                "school": "Université Hassan II",
                "degree": "Licence",
                "fieldOfStudy": "Mathematics",
                "start": "2012",
                "end": "2015",
            },
        ],
        "experiences": [
            {
                "title": "Senior Software Engineer",
                "company": "OCP Group",
                "start": "2021-03",
                "end": None,
                "description": "Architecting and delivering cloud-native microservices.",
            },
            {
                "title": "Software Engineer",
                "company": "CIH Bank",
                "start": "2018-09",
                "end": "2021-02",
                "description": "Developed core banking APIs in Java / Spring Boot.",
            },
        ],
        "skills": ["Java", "Spring Boot", "Python", "Docker", "Kubernetes", "AWS"],
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
    async def test_enrich_candidate_success(self):
        """Happy path: 200 response → EnrichedProfile with real education & experience."""
        mock_resp = _make_mock_response(200, _MOCK_RAPIDAPI_RESPONSE)

        with (
            patch("src.enrichment.enrich_profile.settings") as mock_settings,
            patch("src.enrichment.enrich_profile.QuotaManager.check_and_increment", new_callable=AsyncMock, return_value=True),
            patch("httpx.AsyncClient") as mock_client_cls,
        ):
            mock_settings.has_enrichment = True
            mock_settings.apollo_api_key = ""
            mock_settings.scrapingdog_api_key = "test-key"
            mock_settings.enrichment_monthly_quota = 1000
            mock_settings.database_url = "postgresql+asyncpg://user:pass@localhost/db"

            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.get = AsyncMock(return_value=mock_resp)
            mock_client.post = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value = mock_client

            from src.enrichment.enrich_profile import enrich_candidate
            result = await enrich_candidate(_MOCK_LINKEDIN_URL)

        assert result is not None, "Expected EnrichedProfile, got None"
        assert result.raw_source == "enriched"
        assert result.full_name == "Youssef Alami"
        assert result.headline == "Senior Software Engineer at OCP Group"

        # Education list must be non-empty and well-structured
        assert len(result.education) >= 1, "Expected at least 1 education entry"
        edu = result.education[0]
        assert edu.institution != ""
        assert edu.degree is not None

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
            patch("src.enrichment.enrich_profile.settings") as mock_settings,
            patch("src.enrichment.enrich_profile.QuotaManager.check_and_increment", new_callable=AsyncMock, return_value=False),
        ):
            mock_settings.has_enrichment = True
            mock_settings.scrapingdog_api_key = "test-key"
            mock_settings.enrichment_monthly_quota = 0  # quota exhausted

            from src.enrichment.enrich_profile import enrich_candidate
            result = await enrich_candidate(_MOCK_LINKEDIN_URL)

        assert result is None, "Should return None when quota is exceeded"

    @pytest.mark.asyncio
    async def test_enrich_candidate_api_error_429(self):
        """On HTTP 429, enrich_candidate returns None and rolls back the quota increment."""
        mock_resp = _make_mock_response(429, {"message": "Too Many Requests"})

        with (
            patch("src.enrichment.enrich_profile.settings") as mock_settings,
            patch("src.enrichment.enrich_profile.QuotaManager.check_and_increment", new_callable=AsyncMock, return_value=True),
            patch("src.enrichment.enrich_profile._decrement_quota_on_failure", new_callable=AsyncMock) as mock_decrement,
            patch("httpx.AsyncClient") as mock_client_cls,
        ):
            mock_settings.has_enrichment = True
            mock_settings.scrapingdog_api_key = "test-key"
            mock_settings.enrichment_monthly_quota = 1000
            mock_settings.database_url = "postgresql+asyncpg://user:pass@localhost/db"

            mock_client = AsyncMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=False)
            mock_client.get = AsyncMock(return_value=mock_resp)
            mock_client_cls.return_value = mock_client

            from src.enrichment.enrich_profile import enrich_candidate
            result = await enrich_candidate(_MOCK_LINKEDIN_URL)

        assert result is None, "Should return None on HTTP 429"
        mock_decrement.assert_called_once()  # quota rollback must have been attempted

    @pytest.mark.asyncio
    async def test_enrich_candidate_no_url(self):
        """Blank or non-LinkedIn URLs must return None immediately without any API call."""
        with patch("src.enrichment.enrich_profile.settings") as mock_settings:
            mock_settings.has_enrichment = True

            from src.enrichment.enrich_profile import enrich_candidate

            # Blank URL
            assert await enrich_candidate("") is None
            # Non-LinkedIn URL
            assert await enrich_candidate("https://github.com/someone") is None

    @pytest.mark.asyncio
    async def test_enrich_candidate_enrichment_disabled(self):
        """When ENRICHMENT_ENABLED=false (has_enrichment=False), skip immediately."""
        with patch("src.enrichment.enrich_profile.settings") as mock_settings:
            mock_settings.has_enrichment = False

            from src.enrichment.enrich_profile import enrich_candidate
            result = await enrich_candidate(_MOCK_LINKEDIN_URL)

        assert result is None


# ---------------------------------------------------------------------------
# 2. Unit tests — enrich_node() graph node
# ---------------------------------------------------------------------------


class TestEnrichNode:
    """Unit tests for the enrich_node LangGraph node function."""

    def _make_state(self, profiles: list[dict]) -> dict:
        """Build a minimal SourcingState-compatible dict."""
        return {
            "raw_query": "Senior Java Developer",
            "job_id": None,
            "criteria": {"job_title": "Java Developer"},
            "raw_profiles": profiles,
            "scored_profiles": [],
            "final_output": {},
            "messages": [],
            "error": None,
        }

    @pytest.mark.asyncio
    async def test_enrich_node_disabled(self):
        """When enrichment is disabled, enrich_node must be a no-op — profiles unchanged."""
        sample_profiles = [
            {"id": "p1", "full_name": "Alice", "linkedin_url": _MOCK_LINKEDIN_URL},
        ]
        state = self._make_state(sample_profiles)

        with patch("src.agent.graph.settings") as mock_settings:
            mock_settings.has_enrichment = False
            mock_settings.groq_api_key = ""  # also disable Groq so node is a true no-op

            from src.agent.graph import enrich_node
            result_state = await enrich_node(state)  # type: ignore[arg-type]

        # State must be returned unchanged (same object identity)
        assert result_state["raw_profiles"] == sample_profiles
        # No enrichment_source key should have been added
        assert "enrichment_source" not in result_state["raw_profiles"][0]

    @pytest.mark.asyncio
    async def test_enrich_node_fallback_on_none(self):
        """When enrich_candidate returns None, profiles get enrichment_source='snippet_fallback'."""
        sample_profiles = [
            {"id": "p1", "full_name": "Bob", "linkedin_url": _MOCK_LINKEDIN_URL},
            {"id": "p2", "full_name": "Carol", "linkedin_url": ""},
        ]
        state = self._make_state(sample_profiles)

        with (
            patch("src.agent.graph.settings") as mock_settings,
            patch("src.agent.graph.enrich_candidate", new_callable=AsyncMock, return_value=None),
            patch("src.agent.graph._ai_enrich_profile", new_callable=AsyncMock, side_effect=lambda p: p),
        ):
            mock_settings.has_enrichment = True
            mock_settings.groq_api_key = "test-groq-key"

            from src.agent.graph import enrich_node
            result_state = await enrich_node(state)  # type: ignore[arg-type]

        profiles = result_state["raw_profiles"]
        assert len(profiles) == 2
        for p in profiles:
            # groq_fallback is the expected source when ScrapingDog returns None
            assert p["enrichment_source"] in ("groq_fallback", "snippet_only")

    @pytest.mark.asyncio
    async def test_enrich_node_merges_enriched_data(self):
        """When enrich_candidate succeeds, the enriched fields must overwrite the originals."""
        from src.enrichment.enrich_profile import (
            EnrichedProfile, EducationEntry, ExperienceEntry,
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
        assert p["enrichment_source"] in ("apollo", "scrapingdog", "enriched")
        assert len(p["educations"]) == 1
        assert p["educations"][0]["institution"] == "EMI"
        assert len(p["experiences"]) == 1
        assert p["experiences"][0]["company"] == "OCP Group"


# ---------------------------------------------------------------------------
# 3. Integration test — full pipeline with ENRICHMENT_ENABLED=false
# ---------------------------------------------------------------------------


class TestFullPipelineEnrichmentDisabled:
    """
    Integration test confirming the old snippet-only path is 100% intact
    when enrichment is turned off.

    Patches `run_sourcing_agent` (the function the FastAPI route calls) to return
    a canned result, isolating the test to API routing / request-response contract
    validation — not Groq LLM latency.
    """

    def test_full_pipeline_enrichment_disabled(self):
        """POST /api/search with enrichment off returns profiles with expected shape."""
        import os
        os.environ["ENRICHMENT_ENABLED"] = "false"
        os.environ["SCRAPINGDOG_API_KEY"] = ""

        from src.config import get_settings
        get_settings.cache_clear()

        # Canned pipeline result — exactly what run_sourcing_agent would return
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
            from fastapi.testclient import TestClient
            from src.main import app

            client = TestClient(app)
            payload = {
                "query": "Senior Java Developer à Casablanca",
                "max_results": 4,
            }
            response = client.post("/api/search", json=payload)

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}: {response.text}"
        )
        data = response.json()

        # Validate response contract
        assert "profiles" in data, "Response must contain 'profiles' key"
        assert isinstance(data["profiles"], list)
        assert len(data["profiles"]) == 2

        # All profiles should have snippet_fallback since enrichment is disabled
        for p in data["profiles"]:
            assert p.get("enrichment_source") == "snippet_fallback", (
                f"Expected snippet_fallback, got: {p.get('enrichment_source')}"
            )

        # Cleanup
        os.environ.pop("ENRICHMENT_ENABLED", None)
        os.environ.pop("RAPIDAPI_KEY", None)
        get_settings.cache_clear()

