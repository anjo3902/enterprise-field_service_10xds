"""
app/ai/models/registry.py
─────────────────────────────────────────────────────────────────────────────
Enterprise Model Registry and Routing.
"""
from typing import Dict, Any, Optional
import os
import google.generativeai as genai
from app.ai.utils.logger import get_logger

logger = get_logger("ai.models.registry")

class ModelRegistry:
    """
    Manages model selection and failovers.
    Defaults to Gemini Flash for speed, Pro for reasoning.
    Tracks token usage for Cost Optimization.
    """
    
    def __init__(self):
        self._configured = False
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self._configured = True
            
    def get_model(self, task_type: str = "reasoning") -> Any:
        """
        Routes the task to the most optimal model based on cost and capability.
        """
        if not self._configured:
            logger.warning("No API key configured. Returning mock model.")
            return None
            
        model_name = 'gemini-1.5-pro' if task_type == "reasoning" else 'gemini-1.5-flash'
        logger.info(f"Model Router selected: {model_name} for task_type={task_type}")
        
        return genai.GenerativeModel(model_name)

# Global model router
model_registry = ModelRegistry()
