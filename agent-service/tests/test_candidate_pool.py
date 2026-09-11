"""
Tests for candidate_pool.py — Persistent semantic talent pool tool.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest


class TestFailOrWarnPgvector:
    """Tests for _fail_or_warn_pgvector function."""

    def test_fail_or_warn_production_raises(self):
        """Test that production environment raises RuntimeError."""
        with patch("src.mcp_server.tools.candidate_pool.settings") as mock_settings:
            mock_settings.app_env = "production"
            from src.mcp_server.tools.candidate_pool import _fail_or_warn_pgvector
            with pytest.raises(RuntimeError):
                _fail_or_warn_pgvector("Test error", Exception("test"))

    def test_fail_or_warn_non_production_warns(self):
        """Test that non-production environment logs warning but doesn't raise."""
        with patch("src.mcp_server.tools.candidate_pool.settings") as mock_settings:
            mock_settings.app_env = "development"
            from src.mcp_server.tools.candidate_pool import _fail_or_warn_pgvector
            # Should not raise
            _fail_or_warn_pgvector("Test error", Exception("test"))


class TestStoreCandidateEmbedding:
    """Tests for store_candidate_embedding function."""

    @pytest.mark.asyncio
    async def test_store_candidate_no_id(self):
        """Test that candidate without id returns early."""
        candidate = {"name": "John", "summary": "Engineer"}
        from src.mcp_server.tools.candidate_pool import store_candidate_embedding
        # Should return without error
        await store_candidate_embedding(candidate)

    @pytest.mark.asyncio
    async def test_store_candidate_with_id(self):
        """Test storing candidate with valid id."""
        candidate = {"id": "123", "name": "John", "summary": "Engineer"}
        mock_conn = AsyncMock()
        
        # Create a proper async context manager mock
        mock_context_manager = MagicMock()
        mock_context_manager.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_context_manager.__aexit__ = AsyncMock(return_value=None)
        
        with patch("src.mcp_server.tools.candidate_pool.get_pool", new_callable=AsyncMock) as mock_get_pool:
            mock_pool = AsyncMock()
            mock_pool.acquire = MagicMock(return_value=mock_context_manager)
            mock_get_pool.return_value = mock_pool
            
            from src.mcp_server.tools.candidate_pool import store_candidate_embedding
            await store_candidate_embedding(candidate)
            
            # Verify SQL was executed
            assert mock_conn.execute.called

    @pytest.mark.asyncio
    async def test_store_candidate_no_model(self):
        """Test storing candidate when embedding model is unavailable."""
        candidate = {"id": "123", "name": "John", "summary": "Engineer"}
        mock_conn = AsyncMock()
        
        # Create a proper async context manager mock
        mock_context_manager = MagicMock()
        mock_context_manager.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_context_manager.__aexit__ = AsyncMock(return_value=None)
        
        with patch("src.mcp_server.tools.candidate_pool.get_pool", new_callable=AsyncMock) as mock_get_pool:
            mock_pool = AsyncMock()
            mock_pool.acquire = MagicMock(return_value=mock_context_manager)
            mock_get_pool.return_value = mock_pool
            with patch("src.mcp_server.tools.candidate_pool._get_model") as mock_get_model:
                mock_get_model.return_value = None
                
                from src.mcp_server.tools.candidate_pool import store_candidate_embedding
                await store_candidate_embedding(candidate)
                
                # Should still store with NULL embedding
                assert mock_conn.execute.called


class TestStoreCandidatePoolBatch:
    """Tests for store_candidate_pool_batch function."""

    @pytest.mark.asyncio
    async def test_store_batch_empty_list(self):
        """Test storing empty batch."""
        from src.mcp_server.tools.candidate_pool import store_candidate_pool_batch
        await store_candidate_pool_batch([])
        # Should complete without error

    @pytest.mark.asyncio
    async def test_store_batch_multiple_candidates(self):
        """Test storing multiple candidates."""
        candidates = [
            {"id": "1", "name": "John"},
            {"id": "2", "name": "Jane"},
        ]
        
        with patch("src.mcp_server.tools.candidate_pool.store_candidate_embedding") as mock_store:
            from src.mcp_server.tools.candidate_pool import store_candidate_pool_batch
            await store_candidate_pool_batch(candidates)
            
            # Should call store for each candidate
            assert mock_store.call_count == 2


class TestRerankPool:
    """Tests for rerank_pool function."""

    @pytest.mark.asyncio
    async def test_rerank_empty_query(self):
        """Test that empty query returns empty list."""
        from src.mcp_server.tools.candidate_pool import rerank_pool
        result = await rerank_pool("")
        assert result == []

    @pytest.mark.asyncio
    async def test_rerank_whitespace_query(self):
        """Test that whitespace-only query returns empty list."""
        from src.mcp_server.tools.candidate_pool import rerank_pool
        result = await rerank_pool("   ")
        assert result == []

    @pytest.mark.asyncio
    async def test_rerank_no_model_fallback(self):
        """Test fallback to text matching when model is unavailable."""
        mock_conn = AsyncMock()
        mock_conn.fetch.return_value = [
            {"profile_json": '{"name": "John"}', "similarity": 0.75}
        ]
        
        # Create a proper async context manager mock
        mock_context_manager = MagicMock()
        mock_context_manager.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_context_manager.__aexit__ = AsyncMock(return_value=None)
        
        with patch("src.mcp_server.tools.candidate_pool.get_pool", new_callable=AsyncMock) as mock_get_pool:
            mock_pool = AsyncMock()
            mock_pool.acquire = MagicMock(return_value=mock_context_manager)
            mock_get_pool.return_value = mock_pool
            with patch("src.mcp_server.tools.candidate_pool._get_model") as mock_get_model:
                mock_get_model.return_value = None
                
                from src.mcp_server.tools.candidate_pool import rerank_pool
                result = await rerank_pool("software engineer", limit=5)
                
                # Should use fallback text matching
                assert len(result) == 1
                assert result[0]["pool_similarity"] == 75

    @pytest.mark.asyncio
    async def test_rerank_with_embeddings(self):
        """Test semantic search with embeddings."""
        mock_conn = AsyncMock()
        mock_conn.fetch.return_value = [
            {"profile_json": '{"name": "John"}', "similarity": 0.9}
        ]
        
        # Create a proper async context manager mock
        mock_context_manager = MagicMock()
        mock_context_manager.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_context_manager.__aexit__ = AsyncMock(return_value=None)
        
        with patch("src.mcp_server.tools.candidate_pool.get_pool", new_callable=AsyncMock) as mock_get_pool:
            mock_pool = AsyncMock()
            mock_pool.acquire = MagicMock(return_value=mock_context_manager)
            mock_get_pool.return_value = mock_pool
            with patch("src.mcp_server.tools.candidate_pool._get_model") as mock_get_model:
                mock_model = MagicMock()
                mock_model.encode.return_value = np.array([0.1] * 384)
                mock_get_model.return_value = mock_model
                
                from src.mcp_server.tools.candidate_pool import rerank_pool
                result = await rerank_pool("software engineer", limit=5)
                
                # Should use semantic search
                assert len(result) == 1
                assert result[0]["pool_similarity"] == 90

    @pytest.mark.asyncio
    async def test_rerank_database_error(self):
        """Test handling of database connection errors."""
        with patch("src.mcp_server.tools.candidate_pool.get_pool", new_callable=AsyncMock) as mock_get_pool:
            mock_get_pool.side_effect = Exception("DB error")
            
            from src.mcp_server.tools.candidate_pool import rerank_pool
            result = await rerank_pool("software engineer")
            
            # Should return empty list on error
            assert result == []

    @pytest.mark.asyncio
    async def test_rerank_limit_parameter(self):
        """Test that limit parameter is respected."""
        mock_conn = AsyncMock()
        mock_conn.fetch.return_value = [
            {"profile_json": '{"name": "John"}', "similarity": 0.9}
        ]
        
        # Create a proper async context manager mock
        mock_context_manager = MagicMock()
        mock_context_manager.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_context_manager.__aexit__ = AsyncMock(return_value=None)
        
        with patch("src.mcp_server.tools.candidate_pool.get_pool", new_callable=AsyncMock) as mock_get_pool:
            mock_pool = AsyncMock()
            mock_pool.acquire = MagicMock(return_value=mock_context_manager)
            mock_get_pool.return_value = mock_pool
            with patch("src.mcp_server.tools.candidate_pool._get_model") as mock_get_model:
                mock_model = MagicMock()
                mock_model.encode.return_value = np.array([0.1] * 384)
                mock_get_model.return_value = mock_model
                
                from src.mcp_server.tools.candidate_pool import rerank_pool
                result = await rerank_pool("software engineer", limit=3)
                assert result is not None
                
                # Verify limit was passed to query
                assert mock_conn.fetch.called
                call_args = mock_conn.fetch.call_args
                # call_args[0] is (sql_string, query_vec_str, limit)
                assert call_args[0][2] == 3  # limit parameter


class TestAssertPgvectorAvailable:
    """Tests for assert_pgvector_available function."""

    @pytest.mark.asyncio
    async def test_assert_pgvector_success(self):
        """Test successful pgvector availability check."""
        mock_conn = AsyncMock()
        mock_conn.execute.return_value = None
        mock_conn.fetchval.return_value = True
        
        # Create a proper async context manager mock
        mock_context_manager = MagicMock()
        mock_context_manager.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_context_manager.__aexit__ = AsyncMock(return_value=None)
        
        with patch("src.mcp_server.tools.candidate_pool.get_pool", new_callable=AsyncMock) as mock_get_pool:
            mock_pool = AsyncMock()
            mock_pool.acquire = MagicMock(return_value=mock_context_manager)
            mock_get_pool.return_value = mock_pool
            
            from src.mcp_server.tools.candidate_pool import assert_pgvector_available
            # Should not raise
            await assert_pgvector_available()

    @pytest.mark.asyncio
    async def test_assert_pgvector_failure_production(self):
        """Test pgvector failure in production raises error."""
        mock_conn = AsyncMock()
        mock_conn.execute.side_effect = Exception("Extension not found")
        
        # Create a proper async context manager mock
        mock_context_manager = MagicMock()
        mock_context_manager.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_context_manager.__aexit__ = AsyncMock(return_value=None)
        
        with patch("src.mcp_server.tools.candidate_pool.get_pool", new_callable=AsyncMock) as mock_get_pool:
            mock_pool = AsyncMock()
            mock_pool.acquire = MagicMock(return_value=mock_context_manager)
            mock_get_pool.return_value = mock_pool
            with patch("src.mcp_server.tools.candidate_pool.settings") as mock_settings:
                mock_settings.app_env = "production"
                
                from src.mcp_server.tools.candidate_pool import assert_pgvector_available
                with pytest.raises(RuntimeError):
                    await assert_pgvector_available()

    @pytest.mark.asyncio
    async def test_assert_pgvector_failure_development(self):
        """Test pgvector failure in development logs warning but doesn't raise."""
        mock_conn = AsyncMock()
        mock_conn.execute.side_effect = Exception("Extension not found")
        
        # Create a proper async context manager mock
        mock_context_manager = MagicMock()
        mock_context_manager.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_context_manager.__aexit__ = AsyncMock(return_value=None)
        
        with patch("src.mcp_server.tools.candidate_pool.get_pool", new_callable=AsyncMock) as mock_get_pool:
            mock_pool = AsyncMock()
            mock_pool.acquire = MagicMock(return_value=mock_context_manager)
            mock_get_pool.return_value = mock_pool
            with patch("src.mcp_server.tools.candidate_pool.settings") as mock_settings:
                mock_settings.app_env = "development"
                
                from src.mcp_server.tools.candidate_pool import assert_pgvector_available
                # Should not raise in development
                await assert_pgvector_available()
