"""
app/ai/retrieval/ranking/reranker.py
─────────────────────────────────────────────────────────────────────────────
Re-ranks retrieved chunks based on secondary heuristics or LLM cross-encoding.
"""
from typing import List
from app.ai.retrieval.schemas import Chunk

class ReRanker:
    def rerank(self, query: str, chunks: List[Chunk], top_k: int = 3) -> List[Chunk]:
        """
        Currently a pass-through that just respects the semantic score.
        Can be upgraded to cross-encoder or LLM-based re-ranking.
        """
        # Sort just to be safe, assuming 'score' is populated from vector search
        sorted_chunks = sorted(chunks, key=lambda c: c.score or 0.0, reverse=True)
        
        # Keyword boost: if chunk contains exact keywords from query, boost score slightly
        query_words = set(query.lower().split())
        for chunk in sorted_chunks:
            chunk_words = set(chunk.content.lower().split())
            overlap = len(query_words.intersection(chunk_words))
            if overlap > 0 and chunk.score:
                chunk.score += (0.01 * overlap)

        # Re-sort after boost
        final_chunks = sorted(sorted_chunks, key=lambda c: c.score or 0.0, reverse=True)
        return final_chunks[:top_k]
