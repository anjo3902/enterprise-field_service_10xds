"""
app/ai/agents/inventory_agent.py
─────────────────────────────────────────────────────────────────────────────
Inventory Agent — stock verification, shortage detection, procurement triggers.
"""

from __future__ import annotations
from typing import Any, Dict
from app.ai.agents.base import BaseAgent
from app.ai.prompts.library import PromptLibrary
from app.ai.tools.edge_functions import get_edge_function_tool
from app.ai.reflection.engine import ReflectionEngine
from app.ai.schemas.context import SharedContext
from app.ai.utils.logger import get_logger

logger = get_logger("ai.agent.inventory")


class InventoryAgent(BaseAgent):

    def __init__(self, context: SharedContext):
        tools = [get_edge_function_tool(context)]
        super().__init__(
            name="inventory_agent",
            system_prompt=PromptLibrary.get_agent_prompt("inventory"),
            tools=tools,
        )
        self.context = context
        self.reflector = ReflectionEngine()

    def check_stock(self, part_id: str, required_qty: int) -> Dict[str, Any]:
        """Verifies available stock for a part and recommends action."""
        edge_tool = self.tools[0]
        result = edge_tool.execute(
            "efn-inventory-stock",
            {"action": "check_stock", "part_id": part_id}
        )
        reflection = self.reflector.reflect(
            self.name, result, ["quantity_on_hand"], self.context.correlation_id
        )
        available = result.get("quantity_on_hand", 0)
        shortage = max(0, required_qty - available)
        recommendation = (
            "Stock sufficient." if shortage == 0
            else f"Shortage of {shortage} units. Recommend initiating procurement request."
        )
        return {
            "agent": self.name,
            "action": "check_stock",
            "part_id": part_id,
            "available": available,
            "required": required_qty,
            "shortage": shortage,
            "recommendation": recommendation,
            "confidence": reflection.confidence,
        }

    def reserve_part(self, work_order_id: str, part_id: str, quantity: int) -> Dict[str, Any]:
        edge_tool = self.tools[0]
        result = edge_tool.execute(
            "efn-inventory-reserve",
            {"action": "reserve_part", "work_order_id": work_order_id,
             "part_id": part_id, "quantity": quantity}
        )
        reflection = self.reflector.reflect(
            self.name, result, ["reservation_id"], self.context.correlation_id
        )
        return {
            "agent": self.name,
            "action": "reserve_part",
            "backend_result": result,
            "confidence": reflection.confidence,
            "status": "success" if reflection.is_valid else "failed",
        }

    def execute(self, prompt: str, context: SharedContext) -> Dict[str, Any]:
        logger.info(f"InventoryAgent executing: {prompt[:80]}...",
                    extra={"correlation_id": context.correlation_id})
        return {
            "agent": self.name,
            "status": "success",
            "message": "Inventory analysis complete. Awaiting part specifications.",
        }
