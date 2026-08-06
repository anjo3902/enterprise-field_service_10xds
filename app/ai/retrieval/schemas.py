"""
app/ai/retrieval/schemas.py
─────────────────────────────────────────────────────────────────────────────
Core Pydantic models for the RAG pipeline.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import uuid

class DocumentMetadata(BaseModel):
    source: str
    doc_type: str  # e.g., 'manual', 'policy', 'ticket', 'image'
    org_id: Optional[str] = None
    author: Optional[str] = None
    date_added: Optional[str] = None
    custom: Dict[str, Any] = Field(default_factory=dict)

class Document(BaseModel):
    doc_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    metadata: DocumentMetadata

class Chunk(BaseModel):
    chunk_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    doc_id: str
    content: str
    metadata: DocumentMetadata
    embedding: Optional[List[float]] = None
    score: Optional[float] = None  # Used during retrieval
