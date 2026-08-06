"""
app/ai/retrieval/loaders/document_loader.py
─────────────────────────────────────────────────────────────────────────────
Ingests various document types. Images are processed via Gemini multimodal vision
(no OCR libraries used).
"""
import base64
import os
from typing import Any, Dict, List
from app.ai.retrieval.schemas import Document, DocumentMetadata
from app.ai.utils.logger import get_logger

logger = get_logger("ai.retrieval.loader")

class DocumentLoader:
    def __init__(self):
        self._gemini_model = None

    def _get_vision_model(self):
        import google.generativeai as genai
        if not self._gemini_model:
            api_key = os.environ.get("GEMINI_API_KEY")
            if api_key:
                genai.configure(api_key=api_key)
                self._gemini_model = genai.GenerativeModel('gemini-1.5-flash')
        return self._gemini_model

    def load_text(self, text: str, source: str, doc_type: str, custom_meta: Dict[str, Any] = None) -> Document:
        meta = DocumentMetadata(source=source, doc_type=doc_type, custom=custom_meta or {})
        return Document(content=text, metadata=meta)

    def load_image(self, image_bytes: bytes, mime_type: str, source: str, custom_meta: Dict[str, Any] = None) -> Document:
        """
        Uses Gemini Vision to interpret the image instead of OCR.
        Extracts both text and semantic context.
        """
        model = self._get_vision_model()
        if not model:
            # Fallback for testing environment without API key
            content = "[Mocked Gemini Vision Extraction: Contains text about facility equipment]"
        else:
            try:
                response = model.generate_content([
                    "Extract all text from this image and describe any relevant mechanical/facility context.",
                    {"mime_type": mime_type, "data": image_bytes}
                ])
                content = response.text
            except Exception as e:
                logger.error(f"Gemini vision failed: {e}")
                content = f"[Image extraction failed: {str(e)}]"

        meta = DocumentMetadata(source=source, doc_type="image_extraction", custom=custom_meta or {})
        return Document(content=content, metadata=meta)
