"""
Integration tests for graph.py to improve coverage.
"""
import pytest
from unittest.mock import AsyncMock, patch

from src.agent.graph import (
    _get_llm,
    _parse_json_from_llm,
    interpret_request,
    search_node,
    score_node,
    format_output,
)
from src.agent.state import SourcingState


class TestGetLLM:
    """Test _get_llm function."""

    def test_get_llm_with_api_key(self):
        """Test LLM creation when API key is configured."""
        with patch("src.agent.graph.settings") as mock_settings:
            mock_settings.groq_api_key = "test-key"
            mock_settings.groq_model = "llama-3.3-70b"
            mock_settings.groq_temperature = 0.1
            
            llm = _get_llm(max_tokens=2048)
            
            assert llm is not None
            # Check that LLM was created successfully (model name is accessible)
            assert hasattr(llm, 'model_name')

    def test_get_llm_without_api_key(self):
        """Test LLM creation when API key is missing."""
        with patch("src.agent.graph.settings") as mock_settings:
            mock_settings.groq_api_key = ""
            mock_settings.groq_model = "llama-3.3-70b"
            
            llm = _get_llm()
            
            assert llm is None

    def test_get_llm_without_model(self):
        """Test LLM creation when model is missing."""
        with patch("src.agent.graph.settings") as mock_settings:
            mock_settings.groq_api_key = "test-key"
            mock_settings.groq_model = ""
            
            llm = _get_llm()
            
            assert llm is None


class TestParseJsonFromLLM:
    """Test _parse_json_from_llm function."""

    def test_parse_json_clean_input(self):
        """Test parsing clean JSON input."""
        result = _parse_json_from_llm('{"key": "value"}')
        assert result == {"key": "value"}

    def test_parse_json_with_markdown_fence(self):
        """Test parsing JSON with markdown code fence."""
        result = _parse_json_from_llm('```json\n{"key": "value"}\n```')
        assert result == {"key": "value"}

    def test_parse_json_with_think_blocks(self):
        """Test parsing JSON with think blocks."""
        result = _parse_json_from_llm('\n```json\n{"key": "value"}\n```')
        assert result == {"key": "value"}

    def test_parse_json_invalid_json(self):
        """Test handling of invalid JSON."""
        result = _parse_json_from_llm('not valid json')
        assert result is None

    def test_parse_json_empty_string(self):
        """Test handling of empty string."""
        result = _parse_json_from_llm('')
        assert result is None

    def test_parse_json_nested_json(self):
        """Test parsing nested JSON structure."""
        result = _parse_json_from_llm('{"outer": {"inner": "value"}}')
        assert result == {"outer": {"inner": "value"}}

    def test_parse_json_array(self):
        """Test parsing JSON array."""
        result = _parse_json_from_llm('[{"key": "value1"}, {"key": "value2"}]')
        assert result == [{"key": "value1"}, {"key": "value2"}]


class TestInterpretRequest:
    """Test interpret_request node function."""

    @pytest.mark.asyncio
    @patch("src.agent.graph._get_llm")
    @patch("src.agent.graph._groq_breaker")
    async def test_interpret_request_fallback_no_api_key(self, mock_breaker, mock_get_llm):
        """Test fallback when no API key."""
        mock_get_llm.return_value = None
        mock_breaker.is_rate_limited.return_value = False

        state = SourcingState(
            raw_query="Java Developer in Casablanca",
            job_id="test-job",
            max_results=10,
            offset=0,
            criteria={},
            raw_profiles=[],
            scored_profiles=[],
            final_output={},
            messages=[],
            error=None
        )

        result = await interpret_request(state)

        assert "criteria" in result
        assert result["criteria"]["job_title"] == "Java Developer"
        assert len(result["messages"]) > 0

    @pytest.mark.asyncio
    @patch("src.agent.graph._get_llm")
    @patch("src.agent.graph._groq_breaker")
    async def test_interpret_request_rate_limited(self, mock_breaker, mock_get_llm):
        """Test fallback when rate limited."""
        mock_get_llm.return_value = None
        mock_breaker.is_rate_limited.return_value = True

        state = SourcingState(
            raw_query="Senior Python Developer",
            job_id="test-job",
            max_results=10,
            offset=0,
            criteria={},
            raw_profiles=[],
            scored_profiles=[],
            final_output={},
            messages=[],
            error=None
        )

        result = await interpret_request(state)

        assert "criteria" in result
        # Fallback extraction should happen
        assert "job_title" in result["criteria"]
        # Check that fallback message was added
        assert len(result["messages"]) > 0
        assert "fallback" in result["messages"][-1].content.lower()

    @pytest.mark.asyncio
    @patch("src.agent.graph._get_llm")
    @patch("src.agent.graph._groq_breaker")
    async def test_interpret_request_with_llm(self, mock_breaker, mock_get_llm):
        """Test successful LLM interpretation."""
        mock_breaker.is_rate_limited.return_value = False
        
        mock_llm = AsyncMock()
        mock_response = AsyncMock()
        mock_response.content = '{"job_title": "Java Developer", "required_skills": ["Java", "Spring"]}'
        mock_llm.ainvoke.return_value = mock_response
        mock_get_llm.return_value = mock_llm

        state = SourcingState(
            raw_query="Java Developer with Spring Boot",
            job_id="test-job",
            max_results=10,
            offset=0,
            criteria={},
            raw_profiles=[],
            scored_profiles=[],
            final_output={},
            messages=[],
            error=None
        )

        result = await interpret_request(state)

        assert "criteria" in result
        assert result["criteria"]["job_title"] == "Java Developer"
        assert "Java" in result["criteria"]["required_skills"]
        assert "Spring" in result["criteria"]["required_skills"]

    @pytest.mark.asyncio
    @patch("src.agent.graph._get_llm")
    @patch("src.agent.graph._groq_breaker")
    async def test_interpret_request_empty_llm_response(self, mock_breaker, mock_get_llm):
        """Test handling of empty LLM response with reasoning_content."""
        mock_breaker.is_rate_limited.return_value = False
        
        mock_llm = AsyncMock()
        mock_response = AsyncMock()
        mock_response.content = ""
        mock_response.additional_kwargs = {
            "reasoning_content": '{"job_title": "Fallback Developer"}'
        }
        mock_llm.ainvoke.return_value = mock_response
        mock_get_llm.return_value = mock_llm

        state = SourcingState(
            raw_query="Some Developer",
            job_id="test-job",
            max_results=10,
            offset=0,
            criteria={},
            raw_profiles=[],
            scored_profiles=[],
            final_output={},
            messages=[],
            error=None
        )

        result = await interpret_request(state)

        assert "criteria" in result
        assert result["criteria"]["job_title"] == "Fallback Developer"

    @pytest.mark.asyncio
    @patch("src.agent.graph._get_llm")
    @patch("src.agent.graph._groq_breaker")
    async def test_interpret_request_invalid_json(self, mock_breaker, mock_get_llm):
        """Test handling of invalid JSON from LLM."""
        mock_breaker.is_rate_limited.return_value = False
        
        mock_llm = AsyncMock()
        mock_response = AsyncMock()
        mock_response.content = "This is not JSON"
        mock_llm.ainvoke.return_value = mock_response
        mock_get_llm.return_value = mock_llm

        state = SourcingState(
            raw_query="Developer",
            job_id="test-job",
            max_results=10,
            offset=0,
            criteria={},
            raw_profiles=[],
            scored_profiles=[],
            final_output={},
            messages=[],
            error=None
        )

        result = await interpret_request(state)

        # Should fall back to criteria extraction
        assert "criteria" in result
        assert result["criteria"]["job_title"] == "Developer"


class TestSearchNode:
    """Test search_node function."""

    @pytest.mark.asyncio
    @patch("src.agent.graph.search_profiles")
    async def test_search_node_success(self, mock_search):
        """Test successful search node."""
        mock_search.return_value = [
            {"id": "1", "full_name": "Alice", "match_score": 85},
            {"id": "2", "full_name": "Bob", "match_score": 75}
        ]

        state = SourcingState(
            raw_query="Java Developer",
            job_id="test-job",
            max_results=10,
            offset=0,
            criteria={"job_title": "Java Developer"},
            raw_profiles=[],
            scored_profiles=[],
            final_output={},
            messages=[],
            error=None
        )

        result = await search_node(state)

        assert len(result["raw_profiles"]) == 2
        assert result["raw_profiles"][0]["full_name"] == "Alice"
        assert result["error"] is None

    @pytest.mark.asyncio
    @patch("src.agent.graph.search_profiles")
    async def test_search_node_error(self, mock_search):
        """Test search node with error."""
        mock_search.side_effect = Exception("Search service down")

        state = SourcingState(
            raw_query="Java Developer",
            job_id="test-job",
            max_results=10,
            offset=0,
            criteria={"job_title": "Java Developer"},
            raw_profiles=[],
            scored_profiles=[],
            final_output={},
            messages=[],
            error=None
        )

        result = await search_node(state)

        assert len(result["raw_profiles"]) == 0
        assert result["error"] is not None
        assert "Search service down" in str(result["error"])


class TestScoreNode:
    """Test score_node function."""

    @pytest.mark.asyncio
    @patch("src.agent.graph.score_profiles_batch")
    async def test_score_node_success(self, mock_score):
        """Test successful score node."""
        mock_score.return_value = [
            {"id": "1", "full_name": "Alice", "match_score": 85},
            {"id": "2", "full_name": "Bob", "match_score": 90}
        ]

        state = SourcingState(
            raw_query="Java Developer",
            job_id="test-job",
            max_results=10,
            offset=0,
            criteria={"job_title": "Java Developer"},
            raw_profiles=[
                {"id": "1", "full_name": "Alice"},
                {"id": "2", "full_name": "Bob"}
            ],
            scored_profiles=[],
            final_output={},
            messages=[],
            error=None
        )

        result = await score_node(state)

        assert len(result["scored_profiles"]) == 2
        assert result["scored_profiles"][0]["match_score"] == 85
        assert result["error"] is None

    @pytest.mark.asyncio
    @patch("src.agent.graph.score_profiles_batch")
    async def test_score_node_error(self, mock_score):
        """Test score node with error."""
        mock_score.side_effect = Exception("Scoring service down")

        state = SourcingState(
            raw_query="Java Developer",
            job_id="test-job",
            max_results=10,
            offset=0,
            criteria={"job_title": "Java Developer"},
            raw_profiles=[{"id": "1", "full_name": "Alice"}],
            scored_profiles=[],
            final_output={},
            messages=[],
            error=None
        )

        result = await score_node(state)

        # When scoring fails, it returns unscored profiles
        assert len(result["scored_profiles"]) == 1
        # Error is logged but may not be in state
        # Check that the profile is still present


class TestFormatOutputNode:
    """Test format_output node function."""

    @pytest.mark.asyncio
    @patch("src.agent.graph.store_candidate_pool_batch")
    async def test_format_output_success(self, mock_store):
        """Test successful format output."""
        mock_store.return_value = None

        state = SourcingState(
            raw_query="Java Developer",
            job_id="test-job",
            max_results=10,
            offset=0,
            criteria={"job_title": "Java Developer"},
            raw_profiles=[],
            scored_profiles=[
                {"id": "1", "full_name": "Alice", "match_score": 85},
                {"id": "2", "full_name": "Bob", "match_score": 90}
            ],
            final_output={},
            messages=[],
            error=None
        )

        result = await format_output(state)

        assert "final_output" in result
        assert len(result["final_output"]["profiles"]) == 2
        assert result["final_output"]["query"] == "Java Developer"
        assert result["error"] is None
        mock_store.assert_called_once()

    @pytest.mark.asyncio
    @patch("src.agent.graph.store_candidate_pool_batch")
    async def test_format_output_pool_failure_non_fatal(self, mock_store):
        """Test format output handles pool storage failure gracefully."""
        mock_store.side_effect = Exception("Database connection failed")

        state = SourcingState(
            raw_query="Java Developer",
            job_id="test-job",
            max_results=10,
            offset=0,
            criteria={"job_title": "Java Developer"},
            raw_profiles=[],
            scored_profiles=[
                {"id": "1", "full_name": "Alice", "match_score": 85}
            ],
            final_output={},
            messages=[],
            error=None
        )

        result = await format_output(state)

        # Should still produce output despite pool failure
        assert "final_output" in result
        assert len(result["final_output"]["profiles"]) == 1
        assert result["error"] is None

    @pytest.mark.asyncio
    @patch("src.agent.graph.store_candidate_pool_batch")
    async def test_format_output_empty_profiles(self, mock_store):
        """Test format output with no profiles."""
        mock_store.return_value = None

        state = SourcingState(
            raw_query="Java Developer",
            job_id="test-job",
            max_results=10,
            offset=0,
            criteria={"job_title": "Java Developer"},
            raw_profiles=[],
            scored_profiles=[],
            final_output={},
            messages=[],
            error=None
        )

        result = await format_output(state)

        assert "final_output" in result
        assert len(result["final_output"]["profiles"]) == 0
        # Check that it doesn't crash without total_profiles key


class TestGraphStateTransitions:
    """Test state transitions through the graph."""

    @pytest.mark.asyncio
    @patch("src.agent.graph._get_llm")
    @patch("src.agent.graph._groq_breaker")
    @patch("src.agent.graph.search_profiles")
    @patch("src.agent.graph.score_profiles_batch")
    @patch("src.agent.graph.store_candidate_pool_batch")
    async def test_full_graph_flow(self, mock_store, mock_score, mock_search, mock_breaker, mock_get_llm):
        """Test complete flow through all graph nodes."""
        # Setup mocks
        mock_breaker.is_rate_limited.return_value = False
        mock_get_llm.return_value = None
        mock_search.return_value = [{"id": "1", "full_name": "Alice"}]
        mock_score.return_value = [{"id": "1", "full_name": "Alice", "match_score": 85}]
        mock_store.return_value = None

        # Initial state
        state = SourcingState(
            raw_query="Java Developer",
            job_id="test-job",
            max_results=10,
            offset=0,
            criteria={},
            raw_profiles=[],
            scored_profiles=[],
            final_output={},
            messages=[],
            error=None
        )

        # Node 1: interpret_request
        state = await interpret_request(state)
        assert "criteria" in state

        # Node 2: search_node
        state = await search_node(state)
        assert len(state["raw_profiles"]) > 0

        # Node 3: score_node
        state = await score_node(state)
        assert len(state["scored_profiles"]) > 0

        # Node 4: format_output
        state = await format_output(state)
        assert "final_output" in state
        assert state["error"] is None
