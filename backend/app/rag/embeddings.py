import os
import logging
import numpy as np
from typing import List

logger = logging.getLogger(__name__)

class EmbeddingService:
    _instance = None
    
    def __init__(self):
        self.model = None
        self.use_fallback = False
        self._init_model()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = EmbeddingService()
        return cls._instance

    def _init_model(self):
        try:
            from sentence_transformers import SentenceTransformer
            # Fast and lightweight BGE/miniLM embedding model
            model_name = "all-MiniLM-L6-v2"
            self.model = SentenceTransformer(model_name)
            logger.info(f"Loaded SentenceTransformer model: {model_name}")
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer ({e}). Using robust TF-IDF embedding fallback.")
            self.use_fallback = True

    def get_embeddings(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.array([], dtype=np.float32)
            
        if self.model and not self.use_fallback:
            try:
                embeddings = self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
                return embeddings.astype(np.float32)
            except Exception as e:
                logger.error(f"Error encoding with model: {e}. Switching to TF-IDF fallback.")
                self.use_fallback = True

        # Robust n-gram TF-IDF embedding fallback
        from sklearn.feature_extraction.text import TfidfVectorizer
        # Seed with diverse vocabulary
        base_corpus = [
            "customer client buyer user order purchase transaction sale invoice",
            "product item good merchandise category brand inventory stock price cost",
            "payment payment_method credit card upi netbanking cash amount status",
            "revenue spending total sum average count max min percentage trend",
            "city state country location region date year month week day time",
            "discount shipping fee refund delivered shipped processing cancelled"
        ]
        vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=128)
        vectorizer.fit(base_corpus + texts)
        dense = vectorizer.transform(texts).toarray().astype(np.float32)
        # Normalize
        norms = np.linalg.norm(dense, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return dense / norms

    def get_embedding(self, text: str) -> np.ndarray:
        return self.get_embeddings([text])[0]

embedding_service = EmbeddingService.get_instance()
