"""
app/ai/workflows/autonomous_workflows.py
─────────────────────────────────────────────────────────────────────────────
Autonomous Workflows triggered by the Event Engine and executed by Supervisor.
"""
from typing import Any, Dict
from app.ai.schemas.context import SharedContext
from app.ai.workflows.engine import WorkflowEngine
from app.ai.utils.logger import get_logger

logger = get_logger("ai.autonomous.workflows")

class AutonomousWorkflowEngine(WorkflowEngine):
    """
    Extends WorkflowEngine with autonomous-specific workflows (e.g., SLA Protection).
    """

    def run_sla_protection(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"Running SLA Protection workflow. Payload: {payload}")
        agents = self._get_agents()
        ticket_id = payload.get("ticket_id", "unknown")
        
        intent = f"SLA Breach Risk detected for ticket {ticket_id}. Ensure immediate dispatch or escalation."
        
        dispatch_result = agents["dispatch"].execute(intent, self.context)
        notif_result = agents["notification"].execute(
            f"Escalate SLA risk for {ticket_id} to management", self.context
        )

        return {
            "workflow": "sla_protection",
            "status": "completed",
            "steps": [
                {"agent": "dispatch_agent", "result": dispatch_result},
                {"agent": "notification_agent", "result": notif_result},
            ],
        }

    def run_pm_automation(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"Running PM Automation workflow. Payload: {payload}")
        agents = self._get_agents()
        asset_id = payload.get("asset_id", "unknown")
        
        intent = f"PM schedule overdue for asset {asset_id}. Create Work Order."
        
        maint_result = agents["maintenance"].execute(intent, self.context)
        wo_result = agents["work_order"].execute(intent, self.context)
        
        return {
            "workflow": "pm_automation",
            "status": "completed",
            "steps": [
                {"agent": "maintenance_agent", "result": maint_result},
                {"agent": "work_order_agent", "result": wo_result},
            ],
        }

    def run_inventory_restocking(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"Running Inventory Restocking workflow. Payload: {payload}")
        agents = self._get_agents()
        intent = f"Procure parts for shortage: {payload}"
        
        # Procurement often requires HITL approval in enterprise systems
        inv_result = agents["inventory"].execute(intent, self.context)
        vendor_result = agents["vendor"].execute("Select vendor for procurement", self.context)
        
        return {
            "workflow": "inventory_restocking",
            "status": "pending_approval", # Simulated HITL pause logic
            "steps": [
                {"agent": "inventory_agent", "result": inv_result},
                {"agent": "vendor_agent", "result": vendor_result},
            ],
        }

    AUTONOMOUS_MAP = {
        "sla_protection": "run_sla_protection",
        "pm_automation": "run_pm_automation",
        "inventory_restocking": "run_inventory_restocking",
        "asset_failure_prediction": "run_asset_diagnosis_workflow", # reuse existing
        "vendor_escalation": "run_vendor_workflow",                 # reuse existing
    }

    def run_autonomous(self, workflow_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        method_name = self.AUTONOMOUS_MAP.get(workflow_name)
        if not method_name:
            return {"error": True, "message": f"Unknown autonomous workflow: {workflow_name}"}
        
        if hasattr(self, method_name):
            method = getattr(self, method_name)
        else:
            # Fallback to base WorkflowEngine methods if reusing
            method = getattr(super(), method_name)
            
        return method(payload)
