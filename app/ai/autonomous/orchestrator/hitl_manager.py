"""
app/ai/autonomous/orchestrator/hitl_manager.py
─────────────────────────────────────────────────────────────────────────────
Human-in-the-Loop (HITL) Manager. Pauses and resumes autonomous workflows.
"""
from typing import Any, Dict
from pydantic import BaseModel, Field
import uuid
import time
from app.ai.utils.logger import get_logger

logger = get_logger("ai.autonomous.hitl")

class PendingApproval(BaseModel):
    approval_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    org_id: str
    workflow_name: str
    agent_name: str
    task_intent: str
    context: Dict[str, Any]
    created_at: float = Field(default_factory=lambda: time.time())

class HITLManager:
    def __init__(self):
        self._pending: Dict[str, PendingApproval] = {}

    def require_approval(self, org_id: str, workflow: str, agent: str, intent: str, context: dict) -> str:
        """Flags a task for approval and stores it in memory."""
        approval = PendingApproval(
            org_id=org_id,
            workflow_name=workflow,
            agent_name=agent,
            task_intent=intent,
            context=context
        )
        self._pending[approval.approval_id] = approval
        logger.warning(
            f"HITL PAUSE: Workflow '{workflow}' requires human approval. "
            f"ID: {approval.approval_id}"
        )
        return approval.approval_id

    def get_pending(self, org_id: str = None) -> list:
        if org_id:
            return [p.model_dump() for p in self._pending.values() if p.org_id == org_id]
        return [p.model_dump() for p in self._pending.values()]

    def resolve_approval(self, approval_id: str, approved: bool) -> Dict[str, Any]:
        """Approves or rejects a paused task. Return the paused context to resume it."""
        if approval_id not in self._pending:
            return {"error": True, "message": "Approval ID not found"}
            
        approval = self._pending.pop(approval_id)
        status = "approved" if approved else "rejected"
        logger.info(f"HITL RESOLUTION: {approval_id} was {status}.")
        
        return {
            "error": False,
            "status": status,
            "workflow": approval.workflow_name,
            "context": approval.context
        }

# Global HITL instance
hitl_manager = HITLManager()
