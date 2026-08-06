"""
app/ai/retrieval/pipelines/ingestion.py
─────────────────────────────────────────────────────────────────────────────
End-to-end ingestion pipeline: Load -> Chunk -> Embed -> Store
"""
from typing import Any, Dict, List
from app.ai.retrieval.loaders.document_loader import DocumentLoader
from app.ai.retrieval.chunking.chunker import SemanticChunker
from app.ai.retrieval.embeddings.provider import EmbeddingProvider
from app.ai.retrieval.cache.vector_store import vector_store
from app.ai.utils.logger import get_logger

logger = get_logger("ai.retrieval.pipeline")

class IngestionPipeline:
    def __init__(self):
        self.loader = DocumentLoader()
        self.chunker = SemanticChunker(chunk_size=300, overlap=50)
        self.embed_provider = EmbeddingProvider()

    def ingest_text(self, text: str, source: str, doc_type: str, custom_meta: Dict[str, Any] = None) -> int:
        """Processes raw text into the vector store."""
        doc = self.loader.load_text(text, source, doc_type, custom_meta)
        chunks = self.chunker.chunk_document(doc)
        
        for chunk in chunks:
            chunk.embedding = self.embed_provider.get_embedding(chunk.content)
            
        vector_store.add_chunks(chunks)
        logger.info(f"Ingested text '{source}': {len(chunks)} chunks.")
        return len(chunks)

    def ingest_image(self, image_bytes: bytes, mime_type: str, source: str, custom_meta: Dict[str, Any] = None) -> int:
        """Processes an image using Gemini vision into the vector store."""
        doc = self.loader.load_image(image_bytes, mime_type, source, custom_meta)
        chunks = self.chunker.chunk_document(doc)
        
        for chunk in chunks:
            chunk.embedding = self.embed_provider.get_embedding(chunk.content)
            
        vector_store.add_chunks(chunks)
        logger.info(f"Ingested image '{source}': {len(chunks)} chunks.")
        return len(chunks)
