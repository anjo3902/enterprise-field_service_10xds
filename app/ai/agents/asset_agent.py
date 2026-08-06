"""
app/ai/agents/asset_agent.py
─────────────────────────────────────────────────────────────────────────────
Asset Agent — asset history analysis, failure pattern detection, health scoring.
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

logger = get_logger("ai.agent.asset")


class AssetAgent(BaseAgent):

    def __init__(self, context: SharedContext):
        tools = [get_edge_function_tool(context)]
        super().__init__(
            name="asset_agent",
            system_prompt=PromptLibrary.get_agent_prompt("asset"),
            tools=tools,
        )
        self.context = context
        self.reflector = ReflectionEngine()
        self.knowledge = KnowledgeService()

    def analyze_asset(self, asset_id: str) -> Dict[str, Any]:
        """Fetches asset data, analyzes failure patterns, and scores health."""
        edge_tool = self.tools[0]
        result = edge_tool.execute(
            "efn-asset-get",
            {"action": "get_asset", "asset_id": asset_id}
        )
        reflection = self.reflector.reflect(
            self.name, result, ["asset_name", "status"], self.context.correlation_id
        )

        # Simple health scoring based on status
        status = result.get("status", "unknown")
        health_map = {"operational": 1.0, "degraded": 0.6, "under_repair": 0.4,
                      "decommissioned": 0.0, "unknown": 0.5}
        health_score = health_map.get(status, 0.5)

        # Domain-specific guidance
        asset_name = result.get("asset_name", "")
        domain = self.knowledge.classify_domain(asset_name)
        guidance = None
        if domain:
            guidance = self.knowledge.lookup_fault(domain, result.get("fault_description", ""))

        return {
            "agent": self.name,
            "action": "analyze_asset",
            "asset_id": asset_id,
            "asset_name": asset_name,
            "status": status,
            "health_score": health_score,
            "domain": domain,
            "fault_guidance": guidance,
            "confidence": reflection.confidence,
        }

    def get_maintenance_history(self, asset_id: str) -> Dict[str, Any]:
        edge_tool = self.tools[0]
        result = edge_tool.execute(
            "efn-asset-maintenance-history",
            {"asset_id": asset_id}
        )
        return {
            "agent": self.name,
            "action": "maintenance_history",
            "backend_result": result,
        }

    def execute(self, prompt: str, context: SharedContext) -> Dict[str, Any]:
        logger.info(f"AssetAgent executing: {prompt[:80]}...",
                    extra={"correlation_id": context.correlation_id})
        asset_ids = context.entities.asset_ids
        asset_id = asset_ids[0] if asset_ids else "unknown"
        return {
            "agent": self.name,
            "status": "success",
            "message": f"Asset health analysis complete for asset {asset_id}.",
        }
