from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


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


def test_search_endpoint():
    canned_result = {
        "job_id": None,
        "query": "Senior Java Developer à Casablanca",
        "criteria": {"job_title": "Java Developer"},
        "summary": {"total_profiles": 1, "strong_matches": 1, "average_score": 85},
        "profiles": [{"id": "p1", "full_name": "Test Candidate", "match_score": 85}],
    }
    with patch("src.api.routes.run_sourcing_agent", new_callable=AsyncMock, return_value=canned_result):
        payload = {
            "query": "Senior Java Developer à Casablanca",
            "max_results": 4,
        }
        response = client.post("/api/search", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "profiles" in data
        assert len(data["profiles"]) == 1


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
        response = client.post("/api/search", json=payload)
        assert response.status_code == 500
        data = response.json()
        assert "Invalid API Key" in data["detail"]
