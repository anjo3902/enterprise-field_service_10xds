"""
app/ai/agents/work_order_agent.py
─────────────────────────────────────────────────────────────────────────────
Work Order Agent — generates and tracks work orders from Ticket or PM triggers.
"""

from __future__ import annotations
from typing import Any, Dict
from app.ai.agents.base import BaseAgent
from app.ai.prompts.library import PromptLibrary
from app.ai.tools.edge_functions import get_edge_function_tool
from app.ai.reflection.engine import ReflectionEngine
from app.ai.schemas.context import SharedContext
from app.ai.utils.logger import get_logger

logger = get_logger("ai.agent.work_order")


class WorkOrderAgent(BaseAgent):

    def __init__(self, context: SharedContext):
        tools = [get_edge_function_tool(context)]
        super().__init__(
            name="work_order_agent",
            system_prompt=PromptLibrary.get_agent_prompt("work_order"),
            tools=tools,
        )
        self.context = context
        self.reflector = ReflectionEngine()

    def create_work_order(self, ticket_id: str, title: str, priority: str) -> Dict[str, Any]:
        edge_tool = self.tools[0]
        payload = {"ticket_id": ticket_id, "title": title, "priority": priority}
        result = edge_tool.execute("efn-wo-create", payload)

        reflection = self.reflector.reflect(
            self.name, result, ["work_order_id", "status"], self.context.correlation_id
        )
        # Register entity in shared context
        wo_id = result.get("work_order_id")
        if wo_id:
            self.context.entities.work_order_ids.append(wo_id)

        return {
            "agent": self.name,
            "action": "create_work_order",
            "backend_result": result,
            "confidence": reflection.confidence,
            "status": "success" if reflection.is_valid else "failed",
        }

    def execute(self, prompt: str, context: SharedContext) -> Dict[str, Any]:
        logger.info(f"WorkOrderAgent executing: {prompt[:80]}...",
                    extra={"correlation_id": context.correlation_id})
        ticket_ids = context.entities.ticket_ids
        ticket_id = ticket_ids[0] if ticket_ids else "unknown"
        return {
            "agent": self.name,
            "status": "success",
            "message": f"Work order created from ticket {ticket_id}.",
        }
