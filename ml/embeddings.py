from functools import lru_cache

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def _get_model():
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer(MODEL_NAME)


def embed(text: str) -> list[float]:
    """Return the embedding for one text as a plain list of floats."""
    return _get_model().encode(text).tolist()
