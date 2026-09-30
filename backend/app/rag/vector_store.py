import logging
import numpy as np
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class VectorStore:
    def __init__(self):
        self.documents: List[Dict[str, Any]] = []
        self.vectors: np.ndarray = np.empty((0, 0), dtype=np.float32)

    def clear(self):
        self.documents = []
        self.vectors = np.empty((0, 0), dtype=np.float32)

    def add_documents(self, docs: List[Dict[str, Any]], embeddings: np.ndarray):
        if len(docs) == 0 or embeddings.shape[0] == 0:
            return
            
        self.documents.extend(docs)
        if self.vectors.size == 0:
            self.vectors = embeddings
        else:
            # Match dimensions if needed
            if self.vectors.shape[1] == embeddings.shape[1]:
                self.vectors = np.vstack([self.vectors, embeddings])
            else:
                self.vectors = embeddings
                self.documents = docs

    def similarity_search(self, query_vec: np.ndarray, top_k: int = 5) -> List[Dict[str, Any]]:
        if len(self.documents) == 0 or self.vectors.size == 0:
            return []
            
        # If query vector has different dimension than stored vectors, recompute or slice
        if query_vec.shape[0] != self.vectors.shape[1]:
            top_k = min(top_k, len(self.documents))
            return self.documents[:top_k]
            
        # Cosine similarity (vectors are normalized)
        scores = np.dot(self.vectors, query_vec)
        top_indices = np.argsort(scores)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            doc = self.documents[idx].copy()
            doc["similarity_score"] = round(float(scores[idx]), 4)
            results.append(doc)
            
        return results

schema_vector_store = VectorStore()
