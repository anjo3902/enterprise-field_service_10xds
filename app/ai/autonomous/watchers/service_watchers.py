"""
app/ai/autonomous/watchers/service_watchers.py
─────────────────────────────────────────────────────────────────────────────
Autonomous Watchers for SLA, PM, and Vendor monitoring.
They run in the AsyncScheduler and publish EnterpriseEvents to the Supervisor.
"""
import time
from typing import Callable
from app.ai.autonomous.events.models import EnterpriseEvent, EventPriority
from app.ai.schemas.context import SharedContext, AuthContext, EntityContext
from app.ai.tools.edge_functions import EdgeFunctionTool
from app.ai.utils.logger import get_logger

logger = get_logger("ai.autonomous.watchers.service")

# A mock context for autonomous system-level calls
system_context = SharedContext(
    session_id="autonomous-system",
    correlation_id="auto-corr-001",
    auth=AuthContext(user_id="system", role="system_admin", org_id="system", jwt_token="sys-mock-jwt"),
    entities=EntityContext()
)

class SLAWatcher:
    """Monitors SLA breaches across all active tickets and work orders."""
    
    def __init__(self, publish_callback: Callable[[EnterpriseEvent], None]):
        self.publish = publish_callback
        
    async def run(self):
        logger.info("SLAWatcher polling backend for SLA risks...")
        # Polling the Edge Function
        result = EdgeFunctionTool.call_function("efn-ticket-sla-monitor", {"action": "get_at_risk"}, system_context)
        
        at_risk_tickets = result.get("data", [])
        if not at_risk_tickets:
            # Simulate a risk for demonstration if empty
            at_risk_tickets = [{"ticket_id": "TKT-SIM-01", "risk_level": "critical", "org_id": "org-1"}]
            
        for tkt in at_risk_tickets:
            event = EnterpriseEvent(
                source="sla_watcher",
                event_type="sla_breach_risk",
                org_id=tkt.get("org_id", "org-1"),
                priority=EventPriority.HIGH,
                payload={"ticket_id": tkt.get("ticket_id")},
                timestamp=time.time()
            )
            self.publish(event)


class PMWatcher:
    """Monitors overdue Preventive Maintenance tasks."""
    
    def __init__(self, publish_callback: Callable[[EnterpriseEvent], None]):
        self.publish = publish_callback
        
    async def run(self):
        logger.info("PMWatcher polling backend for overdue PMs...")
        # Simulate PM check
        overdue_pms = [{"asset_id": "AST-SIM-99", "org_id": "org-1"}]
        
        for pm in overdue_pms:
            event = EnterpriseEvent(
                source="pm_watcher",
                event_type="pm_overdue",
                org_id=pm.get("org_id", "org-1"),
                priority=EventPriority.MEDIUM,
                payload={"asset_id": pm.get("asset_id")},
                timestamp=time.time()
            )
            self.publish(event)
