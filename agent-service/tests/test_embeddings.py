"""
Tests for embeddings/client.py — Local embedding computation using sentence-transformers.
"""
import pytest
from unittest.mock import patch, MagicMock
import numpy as np


class TestCosineSimilarity:
    """Tests for _cosine_similarity function."""

    def test_cosine_similarity_identical(self):
        """Test similarity of identical vectors is 1.0."""
        from src.embeddings.client import _cosine_similarity
        vec_a = np.array([1.0, 0.0, 0.0])
        vec_b = np.array([1.0, 0.0, 0.0])
        result = _cosine_similarity(vec_a, vec_b)
        assert result == 1.0

    def test_cosine_similarity_orthogonal(self):
        """Test similarity of orthogonal vectors is 0.0."""
        from src.embeddings.client import _cosine_similarity
        vec_a = np.array([1.0, 0.0, 0.0])
        vec_b = np.array([0.0, 1.0, 0.0])
        result = _cosine_similarity(vec_a, vec_b)
        assert result == 0.0

    def test_cosine_similarity_opposite(self):
        """Test similarity of opposite vectors is -1.0."""
        from src.embeddings.client import _cosine_similarity
        vec_a = np.array([1.0, 0.0, 0.0])
        vec_b = np.array([-1.0, 0.0, 0.0])
        result = _cosine_similarity(vec_a, vec_b)
        assert result == -1.0

    def test_cosine_similarity_zero_vector(self):
        """Test similarity with zero vector returns 0.0."""
        from src.embeddings.client import _cosine_similarity
        vec_a = np.array([0.0, 0.0, 0.0])
        vec_b = np.array([1.0, 0.0, 0.0])
        result = _cosine_similarity(vec_a, vec_b)
        assert result == 0.0

    def test_cosine_similarity_partial_match(self):
        """Test partial similarity."""
        from src.embeddings.client import _cosine_similarity
        vec_a = np.array([1.0, 1.0, 0.0])
        vec_b = np.array([1.0, 0.0, 0.0])
        result = _cosine_similarity(vec_a, vec_b)
        assert 0.0 < result < 1.0


class TestKeywordOverlapSimilarity:
    """Tests for _keyword_overlap_similarity function."""

    def test_keyword_overlap_identical(self):
        """Test identical texts have high similarity."""
        from src.embeddings.client import _keyword_overlap_similarity
        result = _keyword_overlap_similarity("python developer", "python developer")
        assert result == 1.0

    def test_keyword_overlap_no_overlap(self):
        """Test texts with no common words have low similarity."""
        from src.embeddings.client import _keyword_overlap_similarity
        result = _keyword_overlap_similarity("python developer", "java engineer")
        assert result == 0.0

    def test_keyword_overlap_partial_overlap(self):
        """Test texts with some common words."""
        from src.embeddings.client import _keyword_overlap_similarity
        result = _keyword_overlap_similarity("python developer", "python engineer")
        assert 0.0 < result < 1.0

    def test_keyword_overlap_stop_words_removed(self):
        """Test that stop words are removed from comparison."""
        from src.embeddings.client import _keyword_overlap_similarity
        result = _keyword_overlap_similarity("the python developer", "python developer")
        assert result == 1.0

    def test_keyword_overlap_empty_text(self):
        """Test empty text returns 0.5."""
        from src.embeddings.client import _keyword_overlap_similarity
        result = _keyword_overlap_similarity("", "python developer")
        assert result == 0.5

    def test_keyword_overlap_french_stop_words(self):
        """Test that French stop words are removed."""
        from src.embeddings.client import _keyword_overlap_similarity
        result = _keyword_overlap_similarity("le python développeur", "python développeur")
        assert result == 1.0


class TestGetModel:
    """Tests for _get_model function."""

    def test_get_model_default(self):
        """Test getting default model."""
        with patch("src.embeddings.client.settings") as mock_settings:
            mock_settings.embedding_model = "all-MiniLM-L6-v2"
            with patch("src.embeddings.client.SentenceTransformer") as mock_transformer:
                mock_transformer.return_value = MagicMock()
                from src.embeddings.client import _get_model
                result = _get_model()
                assert result is not None

    def test_get_model_custom(self):
        """Test getting custom model."""
        with patch("src.embeddings.client.settings") as mock_settings:
            mock_settings.embedding_model = "custom-model"
            with patch("src.embeddings.client.SentenceTransformer") as mock_transformer:
                mock_transformer.return_value = MagicMock()
                from src.embeddings.client import _get_model
                result = _get_model("custom-model")
                assert result is not None

    def test_get_model_failure(self):
        """Test model loading failure returns None."""
        with patch("src.embeddings.client.settings") as mock_settings:
            mock_settings.embedding_model = "all-MiniLM-L6-v2"
            with patch("src.embeddings.client.SentenceTransformer") as mock_transformer:
                mock_transformer.side_effect = Exception("Load failed")
                from src.embeddings.client import _get_model
                result = _get_model()
                assert result is None


class TestComputeSimilarity:
    """Tests for compute_similarity function."""

    @pytest.mark.asyncio
    async def test_compute_similarity_with_model(self):
        """Test similarity computation with embedding model."""
        mock_model = MagicMock()
        mock_model.encode.return_value = np.array([[0.1, 0.2, 0.3], [0.1, 0.2, 0.4]])
        
        with patch("src.embeddings.client._get_model") as mock_get_model:
            mock_get_model.return_value = mock_model
            with patch("src.embeddings.client.settings") as mock_settings:
                mock_settings.embedding_model = "all-MiniLM-L6-v2"
                
                from src.embeddings.client import compute_similarity
                result = await compute_similarity("text a", "text b")
                
                assert isinstance(result, float)
                assert 0.0 <= result <= 1.0

    @pytest.mark.asyncio
    async def test_compute_similarity_without_model(self):
        """Test similarity computation without model uses keyword overlap."""
        with patch("src.embeddings.client._get_model") as mock_get_model:
            mock_get_model.return_value = None
            
            from src.embeddings.client import compute_similarity
            result = await compute_similarity("python developer", "python engineer")
            
            assert isinstance(result, float)
            assert 0.0 <= result <= 1.0

    @pytest.mark.asyncio
    async def test_compute_similarity_cache_hit(self):
        """Test that cache is used for repeated calls."""
        mock_model = MagicMock()
        mock_model.encode.return_value = np.array([[0.1, 0.2, 0.3], [0.1, 0.2, 0.4]])
        
        with patch("src.embeddings.client._get_model") as mock_get_model:
            mock_get_model.return_value = mock_model
            with patch("src.embeddings.client.settings") as mock_settings:
                mock_settings.embedding_model = "all-MiniLM-L6-v2"
                
                from src.embeddings.client import compute_similarity
                result1 = await compute_similarity("text a", "text b")
                result2 = await compute_similarity("text a", "text b")
                
                # Second call should use cache
                assert result1 == result2

    @pytest.mark.asyncio
    async def test_compute_similarity_reversed_order(self):
        """Test that (a,b) and (b,a) use same cache entry."""
        mock_model = MagicMock()
        mock_model.encode.return_value = np.array([[0.1, 0.2, 0.3], [0.1, 0.2, 0.4]])
        
        with patch("src.embeddings.client._get_model") as mock_get_model:
            mock_get_model.return_value = mock_model
            with patch("src.embeddings.client.settings") as mock_settings:
                mock_settings.embedding_model = "all-MiniLM-L6-v2"
                
                from src.embeddings.client import compute_similarity
                result1 = await compute_similarity("text a", "text b")
                result2 = await compute_similarity("text b", "text a")
                
                # Should be identical due to sorted cache key
                assert result1 == result2
