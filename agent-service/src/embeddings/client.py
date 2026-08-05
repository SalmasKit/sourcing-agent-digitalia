"""
client.py — Local embedding computation using sentence-transformers.
"""
import asyncio
import logging
from functools import lru_cache

import numpy as np

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _get_model(model_name: str = "all-MiniLM-L6-v2"):
    try:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading embedding model: {model_name}")
        model = SentenceTransformer(model_name)
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
    model = _get_model()
    if model is None:
        return _keyword_overlap_similarity(text_a, text_b)

    loop = asyncio.get_event_loop()

    def _encode():
        embeddings = model.encode([text_a, text_b], convert_to_numpy=True, normalize_embeddings=True)
        return _cosine_similarity(np.asarray(embeddings[0]), np.asarray(embeddings[1]))

    return await loop.run_in_executor(None, _encode)


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
