"""
app/ai/agents/notification_agent.py
─────────────────────────────────────────────────────────────────────────────
Notification Agent — determines recipients, sets priority, summarizes events.
"""

from __future__ import annotations
from typing import Any, Dict, List
from app.ai.agents.base import BaseAgent
from app.ai.prompts.library import PromptLibrary
from app.ai.tools.edge_functions import get_edge_function_tool
from app.ai.reflection.engine import ReflectionEngine
from app.ai.schemas.context import SharedContext
from app.ai.utils.logger import get_logger

logger = get_logger("ai.agent.notification")


class NotificationAgent(BaseAgent):

    def __init__(self, context: SharedContext):
        tools = [get_edge_function_tool(context)]
        super().__init__(
            name="notification_agent",
            system_prompt=PromptLibrary.get_agent_prompt("notification"),
            tools=tools,
        )
        self.context = context
        self.reflector = ReflectionEngine()

    def send_notification(
        self,
        recipient_id: str,
        template_code: str,
        variables: Dict[str, Any],
    ) -> Dict[str, Any]:
        edge_tool = self.tools[0]
        result = edge_tool.execute(
            "efn-notification-send",
            {
                "action": "send_notification",
                "recipient_id": recipient_id,
                "template_code": template_code,
                "variables": variables,
            }
        )
        reflection = self.reflector.reflect(
            self.name, result, ["notification_id"], self.context.correlation_id
        )
        return {
            "agent": self.name,
            "action": "send_notification",
            "recipient_id": recipient_id,
            "template_code": template_code,
            "backend_result": result,
            "confidence": reflection.confidence,
            "status": "success" if reflection.is_valid else "failed",
        }

    def determine_recipients(self, event_type: str, context: SharedContext) -> List[str]:
        """
        Decides who should be notified based on event type and org context.
        Could be extended to call a backend endpoint for dynamic recipient resolution.
        """
        recipients_map = {
            "ticket_created": [context.auth.user_id],
            "work_order_assigned": [context.auth.user_id],
            "sla_breach": [context.auth.user_id],
            "asset_critical": [context.auth.user_id],
        }
        return recipients_map.get(event_type, [context.auth.user_id])

    def execute(self, prompt: str, context: SharedContext) -> Dict[str, Any]:
        logger.info(f"NotificationAgent executing: {prompt[:80]}...",
                    extra={"correlation_id": context.correlation_id})
        return {
            "agent": self.name,
            "status": "success",
            "message": "Notification dispatch decisions complete.",
        }
