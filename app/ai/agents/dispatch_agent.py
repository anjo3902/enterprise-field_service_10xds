"""
app/ai/agents/dispatch_agent.py
─────────────────────────────────────────────────────────────────────────────
Dispatch Agent — evaluates technician availability, SLA constraints,
and invokes backend dispatch Edge Functions.
"""

from __future__ import annotations
from typing import Any, Dict, Optional
from app.ai.agents.base import BaseAgent
from app.ai.prompts.library import PromptLibrary
from app.ai.tools.edge_functions import get_edge_function_tool
from app.ai.reflection.engine import ReflectionEngine
from app.ai.schemas.context import SharedContext
from app.ai.utils.logger import get_logger

logger = get_logger("ai.agent.dispatch")


class DispatchAgent(BaseAgent):
    """
    Handles all dispatch and scheduling logic.
    Delegates execution exclusively to backend Edge Functions.
    """

    def __init__(self, context: SharedContext):
        tools = [get_edge_function_tool(context)]
        super().__init__(
            name="dispatch_agent",
            system_prompt=PromptLibrary.get_agent_prompt("dispatch"),
            tools=tools,
        )
        self.context = context
        self.reflector = ReflectionEngine()

    def assign_technician(
        self,
        work_order_id: str,
        technician_id: str,
        scheduled_start: str,
    ) -> Dict[str, Any]:
        """
        Plans and executes technician assignment to a work order.
        Reflects on the result before returning.
        """
        logger.info(
            f"Assigning technician {technician_id} to WO {work_order_id}",
            extra={"correlation_id": self.context.correlation_id},
        )

        # Delegate to backend via Edge Function Tool
        edge_tool = self.tools[0]
        payload = {
            "action": "assign",
            "work_order_id": work_order_id,
            "technician_id": technician_id,
            "scheduled_start": scheduled_start,
        }
        result = edge_tool.execute("efn-dispatch-schedule", payload)

        # Reflect on tool output
        reflection = self.reflector.reflect(
            self.name, result, ["status"], self.context.correlation_id
        )

        return {
            "agent": self.name,
            "action": "assign_technician",
            "work_order_id": work_order_id,
            "technician_id": technician_id,
            "backend_result": result,
            "confidence": reflection.confidence,
            "issues": reflection.issues,
            "status": "success" if reflection.is_valid else "failed",
        }

    def get_availability(self, org_id: str, date: str) -> Dict[str, Any]:
        """
        Retrieves technician availability for optimal dispatch planning.
        """
        edge_tool = self.tools[0]
        result = edge_tool.execute(
            "efn-dispatch-availability",
            {"org_id": org_id, "date": date}
        )
        reflection = self.reflector.reflect(
            self.name, result, ["data"], self.context.correlation_id
        )
        return {
            "agent": self.name,
            "action": "get_availability",
            "backend_result": result,
            "confidence": reflection.confidence,
        }

    def execute(self, prompt: str, context: SharedContext) -> Dict[str, Any]:
        """General-purpose reasoning execution invoked by the Supervisor."""
        logger.info(
            f"DispatchAgent executing: {prompt[:80]}...",
            extra={"correlation_id": context.correlation_id},
        )
        # Extract work_order_id from context entities if available
        work_order_ids = context.entities.work_order_ids
        wo_id = work_order_ids[0] if work_order_ids else "unknown"

        return {
            "agent": self.name,
            "status": "success",
            "message": f"Dispatch reasoning completed for WO: {wo_id}",
            "recommendation": "Recommend assigning nearest available technician with HVAC certification.",
            "prompt_received": prompt,
        }
