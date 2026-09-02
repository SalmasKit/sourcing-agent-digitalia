import base64
from unittest.mock import AsyncMock, patch

import jwt
from fastapi.testclient import TestClient

from src.config import get_settings
from src.main import app

client = TestClient(app)


def _make_auth_header() -> dict[str, str]:
    settings = get_settings()
    secret = settings.jwt_secret or "9a4f2c5d6e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c"
    key = base64.b64decode(secret)
    token = jwt.encode({"sub": "test@digitalia.ma", "role": "RECRUITER"}, key, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["data_source"] == "serpapi"


def test_models_endpoint():
    response = client.get("/api/models")
    assert response.status_code == 200
    data = response.json()
    assert "current_model" in data
    assert "embedding_model" in data
    assert data["data_source"] == "serpapi"


def test_search_endpoint_unauthorized():
    """Verify that requests missing a JWT Bearer token return 401 Unauthorized."""
    payload = {
        "query": "Senior Java Developer à Casablanca",
        "max_results": 4,
    }
    response = client.post("/api/search", json=payload)
    assert response.status_code == 401
    assert "Authorization" in response.json()["detail"]


def test_search_endpoint():
    canned_result = {
        "job_id": None,
        "query": "Senior Java Developer à Casablanca",
        "criteria": {"job_title": "Java Developer"},
        "summary": {"total_profiles": 1, "strong_matches": 1, "average_score": 85},
        "profiles": [{"id": "p1", "full_name": "Test Candidate", "match_score": 85}],
    }
    mock_agent = AsyncMock(return_value=canned_result)
    with patch("src.api.routes.run_sourcing_agent", mock_agent):
        payload = {
            "query": "Senior Java Developer à Casablanca",
            "max_results": 4,
        }
        response = client.post("/api/search", json=payload, headers=_make_auth_header())
        assert response.status_code == 200
        data = response.json()
        assert "profiles" in data
        assert len(data["profiles"]) == 1
        # Verify max_results passed through to run_sourcing_agent
        mock_agent.assert_awaited_once_with(
            raw_query="Senior Java Developer à Casablanca",
            job_id=None,
            max_results=4,
        )


def test_search_endpoint_error_propagation():
    """Verify that when search fails, an HTTP 500 error is returned rather than mock data."""
    with patch(
        "src.api.routes.run_sourcing_agent",
        new_callable=AsyncMock,
        side_effect=RuntimeError("SerpAPI returned HTTP 401: Invalid API Key"),
    ):
        payload = {
            "query": "Senior Java Developer à Casablanca",
            "max_results": 4,
        }
        response = client.post("/api/search", json=payload, headers=_make_auth_header())
        assert response.status_code == 500
        data = response.json()
        assert "Invalid API Key" in data["detail"]
