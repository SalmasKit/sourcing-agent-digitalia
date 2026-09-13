"""
Additional tests for embeddings client helper functions.
"""
import numpy as np

from src.embeddings.client import (
    _cosine_similarity,
    _keyword_overlap_similarity,
)


def test_cosine_similarity_identical():
    """Test cosine similarity of identical vectors."""
    vec_a = np.array([1.0, 0.0, 0.0])
    vec_b = np.array([1.0, 0.0, 0.0])
    
    result = _cosine_similarity(vec_a, vec_b)
    
    assert result == 1.0


def test_cosine_similarity_orthogonal():
    """Test cosine similarity of orthogonal vectors."""
    vec_a = np.array([1.0, 0.0, 0.0])
    vec_b = np.array([0.0, 1.0, 0.0])
    
    result = _cosine_similarity(vec_a, vec_b)
    
    assert result == 0.0


def test_cosine_similarity_zero_vector():
    """Test cosine similarity with zero vector."""
    vec_a = np.array([0.0, 0.0, 0.0])
    vec_b = np.array([1.0, 0.0, 0.0])
    
    result = _cosine_similarity(vec_a, vec_b)
    
    assert result == 0.0


def test_cosine_similarity_partial_match():
    """Test cosine similarity with partial match."""
    vec_a = np.array([1.0, 1.0, 0.0])
    vec_b = np.array([1.0, 0.0, 0.0])
    
    result = _cosine_similarity(vec_a, vec_b)
    
    assert 0.0 < result < 1.0


def test_keyword_overlap_similarity_exact_match():
    """Test keyword overlap with exact match."""
    text_a = "python developer"
    text_b = "python developer"
    
    result = _keyword_overlap_similarity(text_a, text_b)
    
    assert result == 1.0


def test_keyword_overlap_similarity_partial_match():
    """Test keyword overlap with partial match."""
    text_a = "python developer"
    text_b = "java developer"
    
    result = _keyword_overlap_similarity(text_a, text_b)
    
    assert 0.0 < result < 1.0


def test_keyword_overlap_similarity_no_match():
    """Test keyword overlap with no match."""
    text_a = "python developer"
    text_b = "marketing manager"
    
    result = _keyword_overlap_similarity(text_a, text_b)
    
    assert result == 0.0


def test_keyword_overlap_similarity_with_stop_words():
    """Test that stop words are removed."""
    text_a = "the python developer"
    text_b = "a python developer"
    
    result = _keyword_overlap_similarity(text_a, text_b)
    
    assert result == 1.0


def test_keyword_overlap_similarity_french_stop_words():
    """Test that French stop words are removed."""
    text_a = "le développeur python"
    text_b = "un développeur python"
    
    result = _keyword_overlap_similarity(text_a, text_b)
    
    assert result == 1.0


def test_keyword_overlap_similarity_empty_text():
    """Test keyword overlap with empty text."""
    text_a = ""
    text_b = "python developer"
    
    result = _keyword_overlap_similarity(text_a, text_b)
    
    assert result == 0.5


def test_keyword_overlap_similarity_case_insensitive():
    """Test that keyword overlap is case-insensitive."""
    text_a = "Python Developer"
    text_b = "python developer"
    
    result = _keyword_overlap_similarity(text_a, text_b)
    
    assert result == 1.0