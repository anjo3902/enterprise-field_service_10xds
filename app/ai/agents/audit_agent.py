"""
app/ai/agents/audit_agent.py
─────────────────────────────────────────────────────────────────────────────
Audit Agent — audit trail explanation, activity summarization, anomaly detection.
"""

from __future__ import annotations
from typing import Any, Dict, List
from app.ai.agents.base import BaseAgent
from app.ai.prompts.library import PromptLibrary
from app.ai.tools.edge_functions import get_edge_function_tool
from app.ai.reflection.engine import ReflectionEngine
from app.ai.schemas.context import SharedContext
from app.ai.utils.logger import get_logger

logger = get_logger("ai.agent.audit")

# Actions that should be flagged as potentially suspicious
SUSPICIOUS_ACTIONS = {
    "MASS_DELETE", "ROLE_ESCALATION", "EXPORT_REQUESTED",
    "BULK_STATUS_CHANGE", "SETTINGS_MODIFIED"
}


class AuditAgent(BaseAgent):

    def __init__(self, context: SharedContext):
        tools = [get_edge_function_tool(context)]
        super().__init__(
            name="audit_agent",
            system_prompt=PromptLibrary.get_agent_prompt("audit"),
            tools=tools,
        )
        self.context = context
        self.reflector = ReflectionEngine()

    def get_audit_trail(self, entity_id: str, entity_type: str) -> Dict[str, Any]:
        edge_tool = self.tools[0]
        result = edge_tool.execute(
            "efn-audit-trail",
            {"entity_id": entity_id, "entity_type": entity_type, "limit": 20}
        )
        reflection = self.reflector.reflect(
            self.name, result, ["data"], self.context.correlation_id
        )

        # Build human-readable summary of audit events
        audit_entries = result.get("data", [])
        summary_lines = [
            f"[{e.get('timestamp', 'N/A')}] {e.get('actor_role', 'unknown')} performed "
            f"'{e.get('action', 'N/A')}' on {entity_type}"
            for e in audit_entries[:5]
        ]

        return {
            "agent": self.name,
            "action": "get_audit_trail",
            "entity_id": entity_id,
            "entity_type": entity_type,
            "summary": "\n".join(summary_lines) or "No recent audit events found.",
            "confidence": reflection.confidence,
        }

    def detect_anomalies(self, org_id: str) -> Dict[str, Any]:
        """Scans recent audit logs for suspicious actions."""
        edge_tool = self.tools[0]
        result = edge_tool.execute(
            "efn-audit-org-events",
            {"org_id": org_id, "limit": 100}
        )
        audit_entries: List[Dict[str, Any]] = result.get("data", [])
        flagged = [
            e for e in audit_entries
            if e.get("action", "").upper() in SUSPICIOUS_ACTIONS
        ]
        return {
            "agent": self.name,
            "action": "detect_anomalies",
            "org_id": org_id,
            "total_scanned": len(audit_entries),
            "suspicious_events": flagged,
            "alert": f"{len(flagged)} suspicious audit events detected." if flagged else "No anomalies detected.",
        }

    def execute(self, prompt: str, context: SharedContext) -> Dict[str, Any]:
        logger.info(f"AuditAgent executing: {prompt[:80]}...",
                    extra={"correlation_id": context.correlation_id})
        return {
            "agent": self.name,
            "status": "success",
            "message": "Audit trail analysis complete.",
        }
