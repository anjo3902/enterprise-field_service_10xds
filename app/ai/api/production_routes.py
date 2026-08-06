"""
app/ai/api/production_routes.py
─────────────────────────────────────────────────────────────────────────────
Operational Excellence and Governance APIs.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel

from app.ai.schemas.context import AuthContext
from app.ai.api.routes import get_auth_context
from app.ai.metrics.tracker import metrics_tracker
from app.ai.evaluation.evaluator import evaluation_engine
from app.ai.governance.guardrails.scanner import GuardrailScanner
from app.ai.prompt_management.registry import prompt_registry, PromptVersion

router = APIRouter(prefix="/production", tags=["Production & Governance"])

def enforce_admin(auth: AuthContext):
    if auth.role not in ["system_admin", "org_admin"]:
        raise HTTPException(status_code=403, detail="Admin permissions required.")

class PromptValidationRequest(BaseModel):
    prompt_text: str

class PromptRegistrationRequest(BaseModel):
    name: str
    version: str
    template: str
    required_vars: List[str]

@router.get("/metrics")
async def get_system_metrics(auth: AuthContext = Depends(get_auth_context)):
    """Returns token usage, cost estimates, and latency per agent."""
    enforce_admin(auth)
    return {"status": "success", "metrics": metrics_tracker.get_report()}

@router.get("/evaluation/benchmark")
async def get_evaluation_benchmark(auth: AuthContext = Depends(get_auth_context)):
    """Returns hallucination risks and confidence scores."""
    enforce_admin(auth)
    return {"status": "success", "benchmark": evaluation_engine.get_benchmark_report()}

@router.post("/guardrails/scan")
async def manual_guardrail_scan(req: PromptValidationRequest, auth: AuthContext = Depends(get_auth_context)):
    """Tests a prompt against the injection and PII scanners."""
    safe, msg = GuardrailScanner.scan_input(req.prompt_text)
    return {"safe": safe, "violation": msg}

@router.post("/prompts/register")
async def register_prompt_version(req: PromptRegistrationRequest, auth: AuthContext = Depends(get_auth_context)):
    """Registers a new prompt template version."""
    enforce_admin(auth)
    prompt_registry.register(req.name, req.version, PromptVersion(
        version=req.version,
        template=req.template,
        required_vars=req.required_vars
    ))
    return {"status": "success", "message": f"Prompt {req.name} v{req.version} registered."}
