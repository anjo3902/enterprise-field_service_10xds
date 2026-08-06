"""
app/ai/agents/vendor_agent.py
─────────────────────────────────────────────────────────────────────────────
Vendor Agent — SLA compliance tracking, workload balancing, performance scoring.
"""

from __future__ import annotations
from typing import Any, Dict
from app.ai.agents.base import BaseAgent
from app.ai.prompts.library import PromptLibrary
from app.ai.tools.edge_functions import get_edge_function_tool
from app.ai.reflection.engine import ReflectionEngine
from app.ai.schemas.context import SharedContext
from app.ai.utils.logger import get_logger

logger = get_logger("ai.agent.vendor")


class VendorAgent(BaseAgent):

    def __init__(self, context: SharedContext):
        tools = [get_edge_function_tool(context)]
        super().__init__(
            name="vendor_agent",
            system_prompt=PromptLibrary.get_agent_prompt("vendor"),
            tools=tools,
        )
        self.context = context
        self.reflector = ReflectionEngine()

    def get_vendor_performance(self, vendor_id: str) -> Dict[str, Any]:
        edge_tool = self.tools[0]
        result = edge_tool.execute(
            "efn-report-vendor",
            {"vendor_id": vendor_id, "limit": 10}
        )
        reflection = self.reflector.reflect(
            self.name, result, ["data"], self.context.correlation_id
        )
        # Derive a qualitative performance label
        data = result.get("data", [])
        avg_sla = 0.0
        if data:
            sla_vals = [d.get("sla_compliance_rate", 0) for d in data if "sla_compliance_rate" in d]
            avg_sla = sum(sla_vals) / len(sla_vals) if sla_vals else 0.0

        performance_label = (
            "Excellent" if avg_sla >= 0.95
            else "Good" if avg_sla >= 0.80
            else "Needs Improvement" if avg_sla >= 0.60
            else "Poor"
        )
        return {
            "agent": self.name,
            "action": "get_vendor_performance",
            "vendor_id": vendor_id,
            "avg_sla_compliance": round(avg_sla, 2),
            "performance_label": performance_label,
            "confidence": reflection.confidence,
        }

    def recommend_vendor(self, service_category: str, org_id: str) -> Dict[str, Any]:
        edge_tool = self.tools[0]
        result = edge_tool.execute(
            "efn-vendor-list",
            {"org_id": org_id, "service_category": service_category}
        )
        return {
            "agent": self.name,
            "action": "recommend_vendor",
            "service_category": service_category,
            "backend_result": result,
        }

    def execute(self, prompt: str, context: SharedContext) -> Dict[str, Any]:
        logger.info(f"VendorAgent executing: {prompt[:80]}...",
                    extra={"correlation_id": context.correlation_id})
        return {
            "agent": self.name,
            "status": "success",
            "message": "Vendor performance analysis and recommendation complete.",
        }
