"""
app/ai/agents/org_agent.py
─────────────────────────────────────────────────────────────────────────────
Organization Agent — org-level KPI summaries, ticket/asset/contract rollups.
"""

from __future__ import annotations
from typing import Any, Dict
from app.ai.agents.base import BaseAgent
from app.ai.prompts.library import PromptLibrary
from app.ai.tools.edge_functions import get_edge_function_tool
from app.ai.reflection.engine import ReflectionEngine
from app.ai.schemas.context import SharedContext
from app.ai.utils.logger import get_logger

logger = get_logger("ai.agent.org")


class OrgAgent(BaseAgent):

    def __init__(self, context: SharedContext):
        tools = [get_edge_function_tool(context)]
        super().__init__(
            name="org_agent",
            system_prompt=PromptLibrary.get_agent_prompt("org"),
            tools=tools,
        )
        self.context = context
        self.reflector = ReflectionEngine()

    def get_org_summary(self, org_id: str) -> Dict[str, Any]:
        """Fetches org-level KPI summary by combining multiple report outputs."""
        edge_tool = self.tools[0]

        # Fetch operational report
        op_result = edge_tool.execute("efn-report-operational", {"org_id": org_id, "limit": 1})
        op_reflection = self.reflector.reflect(self.name, op_result, ["data"], self.context.correlation_id)

        # Fetch dashboard snapshot
        dash_result = edge_tool.execute(
            "efn-report-dashboard",
            {"org_id": org_id, "dashboard_type": "org_executive",
             "reporting_date": "2026-07-20"}
        )

        return {
            "agent": self.name,
            "action": "get_org_summary",
            "org_id": org_id,
            "operational_kpis": op_result.get("data", []),
            "dashboard_summary": dash_result.get("summary_data", {}),
            "confidence": op_reflection.confidence,
        }

    def execute(self, prompt: str, context: SharedContext) -> Dict[str, Any]:
        logger.info(f"OrgAgent executing: {prompt[:80]}...",
                    extra={"correlation_id": context.correlation_id})
        return {
            "agent": self.name,
            "status": "success",
            "message": f"Organization summary for org {context.auth.org_id} ready.",
        }
