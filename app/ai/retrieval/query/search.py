"""
app/ai/retrieval/query/search.py
─────────────────────────────────────────────────────────────────────────────
Hybrid search engine combining embeddings, filtering, and re-ranking.
"""
from typing import List
from app.ai.retrieval.schemas import Chunk
from app.ai.retrieval.embeddings.provider import EmbeddingProvider
from app.ai.retrieval.cache.vector_store import vector_store
from app.ai.retrieval.ranking.reranker import ReRanker
from app.ai.utils.logger import get_logger

logger = get_logger("ai.retrieval.search")

class SearchEngine:
    def __init__(self):
        self.embed_provider = EmbeddingProvider()
        self.reranker = ReRanker()

    def search(self, query: str, filter_meta: dict = None, top_k: int = 3) -> List[Chunk]:
        """
        1. Embed query
        2. Vector search over cache
        3. Re-rank results
        """
        logger.info(f"Executing RAG search for: '{query}'")
        
        # 1. Embed Query
        q_emb = self.embed_provider.get_query_embedding(query)
        
        # 2. Vector Search (retrieves top 10 for re-ranking)
        initial_results = vector_store.search(q_emb, top_k=10, filter_meta=filter_meta)
        
        if not initial_results:
            logger.info("No matching chunks found in RAG store.")
            return []
            
        # 3. Re-rank and compress to top_k
        final_results = self.reranker.rerank(query, initial_results, top_k=top_k)
        
        logger.info(f"Retrieved {len(final_results)} chunks after re-ranking.")
        return final_results
