from app.ai.prompts.templates import (
    SUPERVISOR_SYSTEM_PROMPT, TICKET_AGENT_PROMPT, DISPATCH_AGENT_PROMPT,
    WORK_ORDER_AGENT_PROMPT, INVENTORY_AGENT_PROMPT, ASSET_AGENT_PROMPT,
    MAINTENANCE_AGENT_PROMPT, VENDOR_AGENT_PROMPT, ORG_AGENT_PROMPT,
    KNOWLEDGE_AGENT_PROMPT, NOTIFICATION_AGENT_PROMPT, REPORT_AGENT_PROMPT,
    AUDIT_AGENT_PROMPT,
)

_AGENT_PROMPT_MAP = {
    "ticket":       TICKET_AGENT_PROMPT,
    "dispatch":     DISPATCH_AGENT_PROMPT,
    "work_order":   WORK_ORDER_AGENT_PROMPT,
    "inventory":    INVENTORY_AGENT_PROMPT,
    "asset":        ASSET_AGENT_PROMPT,
    "maintenance":  MAINTENANCE_AGENT_PROMPT,
    "vendor":       VENDOR_AGENT_PROMPT,
    "org":          ORG_AGENT_PROMPT,
    "knowledge":    KNOWLEDGE_AGENT_PROMPT,
    "notification": NOTIFICATION_AGENT_PROMPT,
    "report":       REPORT_AGENT_PROMPT,
    "audit":        AUDIT_AGENT_PROMPT,
}

from app.ai.prompt_management.registry import prompt_registry
from app.ai.utils.logger import get_logger

logger = get_logger("ai.prompts.library")

class PromptLibrary:
    @staticmethod
    def get_supervisor_prompt(org_id: str, role: str) -> str:
        try:
            return prompt_registry.get_prompt("supervisor_system", org_id=org_id, role=role)
        except Exception as e:
            logger.error(f"Failed to load from registry: {e}. Falling back to default.")
            return f"You are an enterprise AI supervisor for {org_id}. Your role is {role}."

    @staticmethod
    def get_agent_prompt(agent_name: str) -> str:
        try:
            return prompt_registry.get_prompt(f"{agent_name}_system")
        except Exception:
            return _AGENT_PROMPT_MAP.get(
                agent_name,
                f"You are the {agent_name} agent. Use your tools to assist the user."
            )
