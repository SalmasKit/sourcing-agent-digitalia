"""
test_api.py — FastAPI endpoint tests.
"""
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_models_endpoint():
    response = client.get("/api/models")
    assert response.status_code == 200
    assert "available_models" in response.json()


def test_search_endpoint():
    payload = {
        "query": "Senior Java Developer à Paris",
        "max_results": 4
    }
    response = client.post("/api/search", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "profiles" in data
