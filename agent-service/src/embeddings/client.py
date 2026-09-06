"""
client.py — Local embedding computation using sentence-transformers.
"""
import asyncio
import logging
from functools import lru_cache

import numpy as np
from cachetools import TTLCache

from src.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Cache for embedding results (TTL: 1 hour, max 5000 entries)
_embedding_cache = TTLCache(maxsize=5000, ttl=3600)


@lru_cache(maxsize=1)
def _get_model(model_name: str | None = None):
    name = model_name or settings.embedding_model
    try:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading embedding model: {name}")
        model = SentenceTransformer(name)
        logger.info("Embedding model loaded successfully ✓")
        return model
    except Exception as exc:
        logger.warning(f"sentence-transformers fallback enabled: {exc}")
        return None


def _cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))


async def compute_similarity(text_a: str, text_b: str) -> float:
    # Create cache key from sorted texts to ensure (a,b) and (b,a) hit same cache entry
    cache_key = tuple(sorted([text_a, text_b]))
    
    # Check cache first
    cached = _embedding_cache.get(cache_key)
    if cached is not None:
        return cached
    
    model = _get_model(settings.embedding_model)
    if model is None:
        result = _keyword_overlap_similarity(text_a, text_b)
        _embedding_cache[cache_key] = result
        return result

    loop = asyncio.get_event_loop()

    def _encode():
        embeddings = model.encode([text_a, text_b], convert_to_numpy=True, normalize_embeddings=True)
        return _cosine_similarity(np.asarray(embeddings[0]), np.asarray(embeddings[1]))

    result = await loop.run_in_executor(None, _encode)
    _embedding_cache[cache_key] = result
    return result


def _keyword_overlap_similarity(text_a: str, text_b: str) -> float:
    words_a = set(text_a.lower().split())
    words_b = set(text_b.lower().split())
    stop_words = {"the", "a", "an", "in", "at", "on", "for", "with", "and", "or",
                  "de", "le", "la", "les", "en", "et", "ou", "un", "une"}
    words_a -= stop_words
    words_b -= stop_words
    if not words_a or not words_b:
        return 0.5
    return len(words_a & words_b) / len(words_a | words_b)
