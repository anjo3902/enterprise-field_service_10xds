"""
app/ai/api/knowledge_routes.py
─────────────────────────────────────────────────────────────────────────────
Knowledge Layer APIs for ingestion and retrieval.
"""
from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel
import base64

from app.ai.retrieval.pipelines.ingestion import IngestionPipeline
from app.ai.retrieval.query.search import SearchEngine
from app.ai.schemas.context import AuthContext
from app.ai.api.routes import get_auth_context  # Reusing auth dependency

router = APIRouter(prefix="/knowledge", tags=["Knowledge"])
ingestion_pipeline = IngestionPipeline()
search_engine = SearchEngine()

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    filter_meta: Optional[Dict[str, Any]] = None

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    auth: AuthContext = Depends(get_auth_context)
):
    """
    Ingests a document. If it's an image, Gemini Vision handles it automatically.
    """
    content_bytes = await file.read()
    custom_meta = {"org_id": auth.org_id, "uploaded_by": auth.user_id}
    
    if file.content_type and file.content_type.startswith("image/"):
        chunks_added = ingestion_pipeline.ingest_image(
            image_bytes=content_bytes,
            mime_type=file.content_type,
            source=file.filename,
            custom_meta=custom_meta
        )
    else:
        # Assumes text payload for now (PDF/DOCX loaders would sit here)
        text = content_bytes.decode("utf-8", errors="ignore")
        chunks_added = ingestion_pipeline.ingest_text(
            text=text,
            source=file.filename,
            doc_type=doc_type,
            custom_meta=custom_meta
        )
        
    return {"status": "success", "chunks_indexed": chunks_added, "file": file.filename}

@router.post("/search")
async def search_knowledge(
    req: SearchRequest,
    auth: AuthContext = Depends(get_auth_context)
):
    """
    Hybrid semantic search over the knowledge base.
    """
    # Force org isolation if org_id is present
    filters = req.filter_meta or {}
    if auth.org_id:
        filters["org_id"] = auth.org_id
        
    chunks = search_engine.search(req.query, filter_meta=filters, top_k=req.top_k)
    
    return {
        "status": "success",
        "results": [
            {
                "content": c.content,
                "score": c.score,
                "metadata": c.metadata.model_dump()
            } for c in chunks
        ]
    }
