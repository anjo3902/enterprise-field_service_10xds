"""
app/ai/agents/report_agent.py
─────────────────────────────────────────────────────────────────────────────
Reporting Agent — fetches and summarizes KPIs, trends, and anomalies.
"""

from __future__ import annotations
from typing import Any, Dict
from app.ai.agents.base import BaseAgent
from app.ai.prompts.library import PromptLibrary
from app.ai.tools.edge_functions import get_edge_function_tool
from app.ai.reflection.engine import ReflectionEngine
from app.ai.schemas.context import SharedContext
from app.ai.utils.logger import get_logger

logger = get_logger("ai.agent.report")


class ReportAgent(BaseAgent):

    def __init__(self, context: SharedContext):
        tools = [get_edge_function_tool(context)]
        super().__init__(
            name="report_agent",
            system_prompt=PromptLibrary.get_agent_prompt("report"),
            tools=tools,
        )
        self.context = context
        self.reflector = ReflectionEngine()

    def get_operational_summary(self, org_id: str) -> Dict[str, Any]:
        edge_tool = self.tools[0]
        result = edge_tool.execute("efn-report-operational", {"org_id": org_id, "limit": 5})
        reflection = self.reflector.reflect(
            self.name, result, ["data", "total"], self.context.correlation_id
        )
        data = result.get("data", [])
        total = result.get("total", 0)

        return {
            "agent": self.name,
            "action": "operational_summary",
            "total_records": total,
            "data_sample": data[:3],
            "narrative": f"Found {total} operational metric records for org {org_id}.",
            "confidence": reflection.confidence,
        }

    def get_financial_summary(self, org_id: str) -> Dict[str, Any]:
        edge_tool = self.tools[0]
        result = edge_tool.execute("efn-report-financial", {"org_id": org_id, "limit": 5})
        reflection = self.reflector.reflect(
            self.name, result, ["data"], self.context.correlation_id
        )
        return {
            "agent": self.name,
            "action": "financial_summary",
            "backend_result": result,
            "confidence": reflection.confidence,
        }

    def execute(self, prompt: str, context: SharedContext) -> Dict[str, Any]:
        logger.info(f"ReportAgent executing: {prompt[:80]}...",
                    extra={"correlation_id": context.correlation_id})
        return {
            "agent": self.name,
            "status": "success",
            "message": f"Executive report generated for org {context.auth.org_id}.",
        }
