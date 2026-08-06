"""
app/ai/retrieval/cache/vector_store.py
─────────────────────────────────────────────────────────────────────────────
In-memory vector store implementing cosine similarity search.
To be replaced by Supabase pgvector in production.
"""
import math
from typing import List, Tuple
from app.ai.retrieval.schemas import Chunk

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a * a for a in v1))
    mag2 = math.sqrt(sum(b * b for b in v2))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot_product / (mag1 * mag2)

class InMemoryVectorStore:
    def __init__(self):
        self.chunks: List[Chunk] = []

    def add_chunks(self, chunks: List[Chunk]):
        self.chunks.extend(chunks)

    def search(self, query_embedding: List[float], top_k: int = 5, filter_meta: dict = None) -> List[Chunk]:
        results = []
        for chunk in self.chunks:
            # Apply metadata filtering if specified
            if filter_meta:
                match = True
                for k, v in filter_meta.items():
                    if getattr(chunk.metadata, k, None) != v and chunk.metadata.custom.get(k) != v:
                        match = False
                        break
                if not match:
                    continue

            if chunk.embedding:
                sim = cosine_similarity(query_embedding, chunk.embedding)
                if sim > 0.3: # Threshold
                    # create a copy to avoid mutating the cached chunk score
                    scored_chunk = chunk.model_copy()
                    scored_chunk.score = sim
                    results.append(scored_chunk)
                    
        # Sort by score descending
        results.sort(key=lambda x: x.score or 0.0, reverse=True)
        return results[:top_k]

# Global instance for the application lifecycle
vector_store = InMemoryVectorStore()
