import base64
from unittest.mock import AsyncMock, patch

import jwt
import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

from src.config import get_settings
from src.main import app
from src.mcp_server.tools.outreach import generate_outreach

client = TestClient(app)


def _make_auth_header() -> dict[str, str]:
    settings = get_settings()
    secret = settings.jwt_secret or "9a4f2c5d6e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c"
    key = base64.b64decode(secret)
    token = jwt.encode({"sub": "test@digitalia.ma", "role": "RECRUITER"}, key, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_generate_outreach_linkedin():
    mock_llm_response = AIMessage(
        content="Hi Alex, noticed your work on distributed systems. We're building next-gen cloud infra. Open to a quick chat?"
    )
    with (
        patch("src.mcp_server.tools.outreach.settings.groq_api_key", "test-groq-key"),
        patch("src.mcp_server.tools.outreach.ChatGroq.ainvoke", new_callable=AsyncMock, return_value=mock_llm_response),
    ):
        candidate = {
            "full_name": "Alex Smith",
            "headline": "Senior Cloud Architect",
            "skills": ["Distributed Systems", "Go", "Kubernetes"],
            "experiences": [{"description": "Led cloud migration of high-throughput services."}],
        }
        job_ctx = {"job_title": "Lead Cloud Engineer", "company": "TechCorp"}

        result = await generate_outreach(candidate, job_ctx, channel="linkedin")
        assert result["channel"] == "linkedin"
        assert "Alex" in result["draft"]
        assert "subject" not in result


@pytest.mark.asyncio
async def test_generate_outreach_email():
    draft_response = AIMessage(
        content="Hi Alex,\n\nI was impressed by your experience with distributed systems at scale. We are looking for a Lead Cloud Engineer at TechCorp.\n\nWould you be open to speaking this week?\n\nBest regards,\n[Your name]"
    )
    subject_response = AIMessage(content="Lead Cloud Engineer opportunity at TechCorp")

    with (
        patch("src.mcp_server.tools.outreach.settings.groq_api_key", "test-groq-key"),
        patch("src.mcp_server.tools.outreach.ChatGroq.ainvoke", new_callable=AsyncMock) as mock_ainvoke,
    ):
        mock_ainvoke.side_effect = [draft_response, subject_response]

        candidate = {
            "full_name": "Alex Smith",
            "headline": "Senior Cloud Architect",
            "skills": ["Distributed Systems", "Go", "Kubernetes"],
            "experiences": [{"description": "Led cloud migration."}],
        }
        job_ctx = {"job_title": "Lead Cloud Engineer", "company": "TechCorp"}

        result = await generate_outreach(candidate, job_ctx, channel="email")
        assert result["channel"] == "email"
        assert "Lead Cloud Engineer" in result["draft"]
        assert "subject" in result
        assert result["subject"] == "Lead Cloud Engineer opportunity at TechCorp"


@pytest.mark.asyncio
async def test_generate_outreach_missing_api_key():
    with patch("src.mcp_server.tools.outreach.settings.groq_api_key", None):
        candidate = {"full_name": "Alex Smith"}
        with pytest.raises(RuntimeError, match="GROQ_API_KEY not configured"):
            await generate_outreach(candidate, {}, channel="linkedin")


def test_api_outreach_unauthorized():
    payload = {
        "candidate": {"full_name": "Alex Smith"},
        "channel": "linkedin",
    }
    response = client.post("/api/outreach", json=payload)
    assert response.status_code == 401


def test_api_outreach_endpoint_success():
    mock_result = {
        "channel": "linkedin",
        "draft": "Hi Alex, noticed your profile. Open to chat?",
    }
    with patch("src.mcp_server.tools.outreach.generate_outreach", new_callable=AsyncMock, return_value=mock_result):
        payload = {
            "candidate": {"full_name": "Alex Smith", "headline": "DevOps Engineer"},
            "job_context": {"job_title": "DevOps Lead"},
            "channel": "linkedin",
        }
        response = client.post("/api/outreach", json=payload, headers=_make_auth_header())
        assert response.status_code == 200
        data = response.json()
        assert data["channel"] == "linkedin"
        assert data["draft"] == "Hi Alex, noticed your profile. Open to chat?"
