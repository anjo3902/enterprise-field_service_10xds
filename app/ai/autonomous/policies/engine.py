"""
app/ai/autonomous/policies/engine.py
─────────────────────────────────────────────────────────────────────────────
Policy Engine maps detected EnterpriseEvents to specific autonomous workflows.
"""
from typing import Dict, Any, Optional
from app.ai.autonomous.events.models import EnterpriseEvent
from app.ai.utils.logger import get_logger

logger = get_logger("ai.autonomous.policies")

class PolicyEngine:
    """
    Evaluates events and decides which workflow to trigger.
    Can be configured via a database or JSON file in production.
    """
    
    # Static declarative rules for this implementation
    RULES = {
        "sla_breach_risk": "sla_protection",
        "pm_overdue": "pm_automation",
        "stock_shortage": "inventory_restocking",
        "asset_health_degraded": "asset_failure_prediction",
        "vendor_sla_drop": "vendor_escalation",
    }
    
    def evaluate(self, event: EnterpriseEvent) -> Optional[str]:
        """
        Returns the workflow name if a policy matches the event.
        """
        workflow = self.RULES.get(event.event_type)
        if workflow:
            logger.info(
                f"Policy Match: Event '{event.event_type}' -> Workflow '{workflow}'"
            )
            return workflow
            
        logger.debug(f"No policy found for event type '{event.event_type}'")
        return None

# Global policy engine
policy_engine = PolicyEngine()
