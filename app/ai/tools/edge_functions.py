import requests
import os
from typing import Dict, Any
from app.ai.tools.base import Tool
from app.ai.schemas.context import SharedContext

class EdgeFunctionTool:
    """
    Dynamically calls existing Supabase Edge Functions.
    This ensures that the AI layer delegates business logic, RBAC, and RLS 
    to the already hardened Supabase backend.
    """
    
    @staticmethod
    def call_function(function_name: str, payload: Dict[str, Any], context: SharedContext) -> Dict[str, Any]:
        """
        Executes a remote Supabase Edge Function securely.
        """
        supabase_url = os.environ.get("SUPABASE_URL", "http://localhost:54321")
        # Ensure we point to the functions endpoint
        url = f"{supabase_url}/functions/v1/{function_name}"
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {context.auth.jwt_token}",
            "x-correlation-id": context.correlation_id
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=15)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            # Handle and return structured error for the Agent to reason about
            error_msg = str(e)
            if e.response is not None:
                error_msg = e.response.text
            return {"error": True, "message": f"Failed to execute {function_name}: {error_msg}"}

def get_edge_function_tool(context: SharedContext) -> Tool:
    def wrapper(function_name: str, payload: Dict[str, Any]):
        return EdgeFunctionTool.call_function(function_name, payload, context)
        
    return Tool(
        name="execute_edge_function",
        description="Executes a hardened backend edge function. Provide the function name (e.g. 'efn-ticket-create') and the JSON payload.",
        func=wrapper
    )
