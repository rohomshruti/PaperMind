import numpy as np
from typing import List
import logging

logger = logging.getLogger(__name__)

class EmbeddingService:
    """
    Singleton service that loads and caches the SentenceTransformer model
    sentence-transformers/all-MiniLM-L6-v2.
    """
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
        return cls._instance

    def _ensure_model_loaded(self):
        if self._model is None:
            logger.info("Loading SentenceTransformer model: sentence-transformers/all-MiniLM-L6-v2...")
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
            logger.info("SentenceTransformer model loaded successfully.")

    def embed_text(self, text: str) -> np.ndarray:
        """
        Embeds a single query string into a 1D normalized float32 numpy array.
        """
        self._ensure_model_loaded()
        vec = self._model.encode(text, normalize_embeddings=True)
        return np.array(vec, dtype=np.float32)

    def embed_batch(self, texts: List[str]) -> np.ndarray:
        """
        Embeds a batch of texts into a 2D normalized float32 numpy array (N, 384).
        """
        if not texts:
            return np.empty((0, 384), dtype=np.float32)
        self._ensure_model_loaded()
        vecs = self._model.encode(texts, batch_size=32, show_progress_bar=False, normalize_embeddings=True)
        return np.array(vecs, dtype=np.float32)

# Global singleton instance
embedding_service = EmbeddingService()
