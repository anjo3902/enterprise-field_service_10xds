"""
app/ai/tests/test_retrieval.py
─────────────────────────────────────────────────────────────────────────────
Unit tests for the Enterprise RAG pipeline.
"""
import pytest
from unittest.mock import patch, MagicMock
from app.ai.retrieval.schemas import Document, DocumentMetadata, Chunk
from app.ai.retrieval.loaders.document_loader import DocumentLoader
from app.ai.retrieval.chunking.chunker import SemanticChunker
from app.ai.retrieval.cache.vector_store import InMemoryVectorStore, cosine_similarity

def test_cosine_similarity():
    # Orthogonal
    assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == 0.0
    # Same direction
    assert cosine_similarity([1.0, 0.0], [2.0, 0.0]) == 1.0
    # Opposite
    assert cosine_similarity([1.0, 0.0], [-1.0, 0.0]) == -1.0

class TestDocumentLoader:
    def test_load_text(self):
        loader = DocumentLoader()
        doc = loader.load_text("This is an HVAC manual.", "hvac_manual.pdf", "manual", {"org_id": "org-1"})
        assert doc.content == "This is an HVAC manual."
        assert doc.metadata.source == "hvac_manual.pdf"
        assert doc.metadata.custom.get("org_id") == "org-1"

    @patch("app.ai.retrieval.loaders.document_loader.DocumentLoader._get_vision_model")
    def test_load_image_fallback(self, mock_vision):
        mock_vision.return_value = None
        loader = DocumentLoader()
        doc = loader.load_image(b"fake_image", "image/png", "diagram.png")
        assert "Mocked" in doc.content
        assert doc.metadata.doc_type == "image_extraction"

class TestChunker:
    def test_semantic_chunker(self):
        # 10 words total
        text = "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10"
        doc = Document(
            content=text, 
            metadata=DocumentMetadata(source="test", doc_type="txt")
        )
        
        # Chunk size 5, overlap 2.
        # Chunk 1: word1 word2 word3 word4 word5
        # Start next at index: 5 - 2 = 3
        # Chunk 2: word4 word5 word6 word7 word8
        # Start next at index: 3 + (5-2) = 6
        # Chunk 3: word7 word8 word9 word10
        chunker = SemanticChunker(chunk_size=5, overlap=2)
        chunks = chunker.chunk_document(doc)
        
        assert len(chunks) == 3
        assert chunks[0].content == "word1 word2 word3 word4 word5"
        assert chunks[1].content == "word4 word5 word6 word7 word8"
        assert chunks[2].content == "word7 word8 word9 word10"
        assert chunks[0].doc_id == doc.doc_id

class TestVectorStore:
    def test_vector_search(self):
        store = InMemoryVectorStore()
        c1 = Chunk(doc_id="1", content="HVAC", embedding=[1.0, 0.0], metadata=DocumentMetadata(source="", doc_type=""))
        c2 = Chunk(doc_id="2", content="Plumbing", embedding=[0.0, 1.0], metadata=DocumentMetadata(source="", doc_type=""))
        store.add_chunks([c1, c2])
        
        # Query heavily towards HVAC
        res = store.search([0.9, 0.1], top_k=1)
        assert len(res) == 1
        assert res[0].content == "HVAC"
        assert res[0].score > 0.8

    def test_vector_search_with_metadata_filter(self):
        store = InMemoryVectorStore()
        meta1 = DocumentMetadata(source="1", doc_type="t", custom={"org_id": "orgA"})
        meta2 = DocumentMetadata(source="2", doc_type="t", custom={"org_id": "orgB"})
        
        c1 = Chunk(doc_id="1", content="X", embedding=[1.0, 0.0], metadata=meta1)
        c2 = Chunk(doc_id="2", content="X", embedding=[1.0, 0.0], metadata=meta2)
        store.add_chunks([c1, c2])
        
        res = store.search([1.0, 0.0], filter_meta={"org_id": "orgA"})
        assert len(res) == 1
        assert res[0].metadata.custom["org_id"] == "orgA"
