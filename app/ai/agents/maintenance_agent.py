"""
app/ai/agents/maintenance_agent.py
─────────────────────────────────────────────────────────────────────────────
Maintenance Agent — PM scheduling, AMC/Warranty reasoning, rule-based guidance.
"""

from __future__ import annotations
from typing import Any, Dict
from app.ai.agents.base import BaseAgent
from app.ai.prompts.library import PromptLibrary
from app.ai.tools.edge_functions import get_edge_function_tool
from app.ai.knowledge.service import KnowledgeService
from app.ai.reflection.engine import ReflectionEngine
from app.ai.schemas.context import SharedContext
from app.ai.utils.logger import get_logger

logger = get_logger("ai.agent.maintenance")


class MaintenanceAgent(BaseAgent):

    def __init__(self, context: SharedContext):
        tools = [get_edge_function_tool(context)]
        super().__init__(
            name="maintenance_agent",
            system_prompt=PromptLibrary.get_agent_prompt("maintenance"),
            tools=tools,
        )
        self.context = context
        self.reflector = ReflectionEngine()
        self.knowledge = KnowledgeService()

    def get_pm_schedule(self, asset_id: str) -> Dict[str, Any]:
        edge_tool = self.tools[0]
        result = edge_tool.execute(
            "efn-maintenance-schedule",
            {"action": "get_schedule", "asset_id": asset_id}
        )
        reflection = self.reflector.reflect(
            self.name, result, ["data"], self.context.correlation_id
        )
        return {
            "agent": self.name,
            "action": "get_pm_schedule",
            "backend_result": result,
            "confidence": reflection.confidence,
        }

    def check_warranty(self, asset_id: str) -> Dict[str, Any]:
        edge_tool = self.tools[0]
        result = edge_tool.execute(
            "efn-maintenance-warranty",
            {"action": "check_warranty", "asset_id": asset_id}
        )
        in_warranty = result.get("in_warranty", False)
        recommendation = (
            "Asset is under warranty — escalate to vendor for free repair."
            if in_warranty else "Asset out of warranty — proceed with internal maintenance."
        )
        return {
            "agent": self.name,
            "action": "check_warranty",
            "in_warranty": in_warranty,
            "recommendation": recommendation,
            "backend_result": result,
        }

    def get_maintenance_rule(self, asset_description: str) -> str:
        domain = self.knowledge.classify_domain(asset_description)
        if domain:
            rule_key = f"{domain.replace('/', '_')}_service"
            rule = self.knowledge.get_maintenance_rule(rule_key)
            return rule or f"No specific rule found for domain: {domain}"
        return "Could not classify asset domain — please provide more details."

    def execute(self, prompt: str, context: SharedContext) -> Dict[str, Any]:
        logger.info(f"MaintenanceAgent executing: {prompt[:80]}...",
                    extra={"correlation_id": context.correlation_id})
        return {
            "agent": self.name,
            "status": "success",
            "message": "Maintenance schedule and warranty evaluation complete.",
        }
