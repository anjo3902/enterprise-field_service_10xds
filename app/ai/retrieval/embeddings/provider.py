"""
app/ai/retrieval/embeddings/provider.py
─────────────────────────────────────────────────────────────────────────────
Embedding provider abstraction. Defaults to Gemini text-embedding.
"""
import os
from typing import List
from app.ai.utils.logger import get_logger

logger = get_logger("ai.retrieval.embedding")

class EmbeddingProvider:
    def __init__(self):
        self._gemini_configured = False
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            self._gemini_configured = True
            
    def get_embedding(self, text: str) -> List[float]:
        """Fetches embedding from Gemini, or returns a mock vector if unconfigured."""
        if not self._gemini_configured:
            # Fallback for isolated testing
            import random
            return [random.uniform(-1.0, 1.0) for _ in range(768)]
            
        try:
            import google.generativeai as genai
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"Embedding failed: {e}")
            return [0.0] * 768

    def get_query_embedding(self, query: str) -> List[float]:
        if not self._gemini_configured:
            import random
            return [random.uniform(-1.0, 1.0) for _ in range(768)]
            
        try:
            import google.generativeai as genai
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=query,
                task_type="retrieval_query"
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"Query embedding failed: {e}")
            return [0.0] * 768
