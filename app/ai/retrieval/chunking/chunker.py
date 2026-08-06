"""
app/ai/retrieval/chunking/chunker.py
─────────────────────────────────────────────────────────────────────────────
Splits documents into overlapping chunks while preserving metadata.
"""
from typing import List
from app.ai.retrieval.schemas import Document, Chunk

class SemanticChunker:
    def __init__(self, chunk_size: int = 500, overlap: int = 50):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk_document(self, doc: Document) -> List[Chunk]:
        """
        Simple word-based chunker with overlap.
        In a production setting, this could use recursive character splitting or semantic boundaries.
        """
        words = doc.content.split()
        chunks = []
        
        if not words:
            return chunks

        start = 0
        while start < len(words):
            end = min(start + self.chunk_size, len(words))
            chunk_words = words[start:end]
            chunk_text = " ".join(chunk_words)
            
            chunks.append(
                Chunk(
                    doc_id=doc.doc_id,
                    content=chunk_text,
                    metadata=doc.metadata
                )
            )
            if end == len(words):
                break
                
            start += (self.chunk_size - self.overlap)
            
        return chunks
