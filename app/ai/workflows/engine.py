"""
app/ai/workflows/workflows.py
─────────────────────────────────────────────────────────────────────────────
Fully implemented multi-agent workflow definitions.
Each workflow chains multiple agents via the WorkflowEngine.
"""

from __future__ import annotations
from typing import Any, Dict, Optional
from app.ai.schemas.context import SharedContext
from app.ai.utils.logger import get_logger

logger = get_logger("ai.workflows")


class WorkflowEngine:
    """
    Executes pre-defined declarative multi-agent workflows.
    Each workflow coordinates real agent instances from the registry.
    """

    def __init__(self, context: SharedContext):
        self.context = context

    def _get_agents(self):
        """Lazy loads all domain agents bound to the current context."""
        from app.ai.agents.ticket_agent import TicketAgent
        from app.ai.agents.dispatch_agent import DispatchAgent
        from app.ai.agents.work_order_agent import WorkOrderAgent
        from app.ai.agents.inventory_agent import InventoryAgent
        from app.ai.agents.asset_agent import AssetAgent
        from app.ai.agents.maintenance_agent import MaintenanceAgent
        from app.ai.agents.vendor_agent import VendorAgent
        from app.ai.agents.notification_agent import NotificationAgent
        from app.ai.agents.report_agent import ReportAgent
        from app.ai.agents.audit_agent import AuditAgent
        from app.ai.agents.knowledge_agent import KnowledgeAgent

        return {
            "ticket":       TicketAgent(self.context),
            "dispatch":     DispatchAgent(self.context),
            "work_order":   WorkOrderAgent(self.context),
            "inventory":    InventoryAgent(self.context),
            "asset":        AssetAgent(self.context),
            "maintenance":  MaintenanceAgent(self.context),
            "vendor":       VendorAgent(self.context),
            "notification": NotificationAgent(self.context),
            "report":       ReportAgent(self.context),
            "audit":        AuditAgent(self.context),
            "knowledge":    KnowledgeAgent(self.context),
        }

    # ── Workflow 1: Ticket Creation ───────────────────────────────────────────
    def run_ticket_creation_workflow(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Starting Ticket Creation Workflow",
                    extra={"correlation_id": self.context.correlation_id})
        agents = self._get_agents()
        intent = f"Create a ticket for issue: {payload.get('issue', 'unspecified')}"

        ticket_result = agents["ticket"].execute(intent, self.context)
        notif_result = agents["notification"].execute(
            f"Notify about new ticket", self.context
        )

        return {
            "workflow": "ticket_creation",
            "status": "completed",
            "steps": [
                {"agent": "ticket_agent", "result": ticket_result},
                {"agent": "notification_agent", "result": notif_result},
            ],
        }

    # ── Workflow 2: Dispatch ──────────────────────────────────────────────────
    def run_dispatch_workflow(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Starting Dispatch Workflow",
                    extra={"correlation_id": self.context.correlation_id})
        agents = self._get_agents()
        wo_id = payload.get("work_order_id", "unknown")
        intent = f"Dispatch a technician for work order {wo_id}"

        dispatch_result = agents["dispatch"].execute(intent, self.context)
        inv_result = agents["inventory"].execute(
            "Check part availability for dispatch", self.context
        )
        notif_result = agents["notification"].execute(
            "Notify technician of assignment", self.context
        )

        return {
            "workflow": "dispatch",
            "status": "completed",
            "steps": [
                {"agent": "dispatch_agent", "result": dispatch_result},
                {"agent": "inventory_agent", "result": inv_result},
                {"agent": "notification_agent", "result": notif_result},
            ],
        }

    # ── Workflow 3: Work Order ────────────────────────────────────────────────
    def run_work_order_workflow(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Starting Work Order Workflow",
                    extra={"correlation_id": self.context.correlation_id})
        agents = self._get_agents()
        intent = f"Process work order: {payload.get('description', 'unspecified')}"

        wo_result = agents["work_order"].execute(intent, self.context)
        dispatch_result = agents["dispatch"].execute(intent, self.context)
        notif_result = agents["notification"].execute(intent, self.context)

        return {
            "workflow": "work_order",
            "status": "completed",
            "steps": [
                {"agent": "work_order_agent", "result": wo_result},
                {"agent": "dispatch_agent", "result": dispatch_result},
                {"agent": "notification_agent", "result": notif_result},
            ],
        }

    # ── Workflow 4: Asset Diagnosis ───────────────────────────────────────────
    def run_asset_diagnosis_workflow(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Starting Asset Diagnosis Workflow",
                    extra={"correlation_id": self.context.correlation_id})
        agents = self._get_agents()
        asset_id = payload.get("asset_id", "unknown")
        description = payload.get("description", "")
        intent = f"Diagnose asset {asset_id}: {description}"

        knowledge_result = agents["knowledge"].execute(description, self.context)
        asset_result = agents["asset"].execute(intent, self.context)
        maintenance_result = agents["maintenance"].execute(intent, self.context)
        ticket_result = agents["ticket"].execute(
            f"Create maintenance ticket for asset {asset_id}", self.context
        )

        return {
            "workflow": "asset_diagnosis",
            "status": "completed",
            "steps": [
                {"agent": "knowledge_agent", "result": knowledge_result},
                {"agent": "asset_agent", "result": asset_result},
                {"agent": "maintenance_agent", "result": maintenance_result},
                {"agent": "ticket_agent", "result": ticket_result},
            ],
        }

    # ── Workflow 5: Inventory ─────────────────────────────────────────────────
    def run_inventory_workflow(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Starting Inventory Workflow",
                    extra={"correlation_id": self.context.correlation_id})
        agents = self._get_agents()
        intent = f"Inventory check for: {payload.get('description', 'general stock review')}"

        inv_result = agents["inventory"].execute(intent, self.context)
        report_result = agents["report"].execute("Generate inventory report", self.context)

        return {
            "workflow": "inventory",
            "status": "completed",
            "steps": [
                {"agent": "inventory_agent", "result": inv_result},
                {"agent": "report_agent", "result": report_result},
            ],
        }

    # ── Workflow 6: Maintenance ───────────────────────────────────────────────
    def run_maintenance_workflow(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Starting Maintenance Workflow",
                    extra={"correlation_id": self.context.correlation_id})
        agents = self._get_agents()
        intent = f"Execute maintenance for: {payload.get('description', 'scheduled PM')}"

        maint_result = agents["maintenance"].execute(intent, self.context)
        asset_result = agents["asset"].execute(intent, self.context)
        notif_result = agents["notification"].execute(intent, self.context)

        return {
            "workflow": "maintenance",
            "status": "completed",
            "steps": [
                {"agent": "maintenance_agent", "result": maint_result},
                {"agent": "asset_agent", "result": asset_result},
                {"agent": "notification_agent", "result": notif_result},
            ],
        }

    # ── Workflow 7: Vendor ────────────────────────────────────────────────────
    def run_vendor_workflow(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Starting Vendor Workflow",
                    extra={"correlation_id": self.context.correlation_id})
        agents = self._get_agents()
        intent = f"Vendor evaluation for: {payload.get('description', 'general review')}"

        vendor_result = agents["vendor"].execute(intent, self.context)
        report_result = agents["report"].execute("Vendor performance summary", self.context)

        return {
            "workflow": "vendor",
            "status": "completed",
            "steps": [
                {"agent": "vendor_agent", "result": vendor_result},
                {"agent": "report_agent", "result": report_result},
            ],
        }

    # ── Workflow 8: Reporting ─────────────────────────────────────────────────
    def run_reporting_workflow(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Starting Reporting Workflow",
                    extra={"correlation_id": self.context.correlation_id})
        agents = self._get_agents()
        intent = f"Generate report: {payload.get('report_type', 'executive summary')}"

        report_result = agents["report"].execute(intent, self.context)
        audit_result = agents["audit"].execute("Audit report generation event", self.context)

        return {
            "workflow": "reporting",
            "status": "completed",
            "steps": [
                {"agent": "report_agent", "result": report_result},
                {"agent": "audit_agent", "result": audit_result},
            ],
        }

    # ── Workflow 9: Notification ──────────────────────────────────────────────
    def run_notification_workflow(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("Starting Notification Workflow",
                    extra={"correlation_id": self.context.correlation_id})
        agents = self._get_agents()
        intent = f"Send notification for: {payload.get('event_type', 'system event')}"

        notif_result = agents["notification"].execute(intent, self.context)

        return {
            "workflow": "notification",
            "status": "completed",
            "steps": [
                {"agent": "notification_agent", "result": notif_result},
            ],
        }

    # ── Dispatcher ────────────────────────────────────────────────────────────
    WORKFLOW_MAP = {
        "ticket_creation":  "run_ticket_creation_workflow",
        "dispatch":         "run_dispatch_workflow",
        "work_order":       "run_work_order_workflow",
        "asset_diagnosis":  "run_asset_diagnosis_workflow",
        "inventory":        "run_inventory_workflow",
        "maintenance":      "run_maintenance_workflow",
        "vendor":           "run_vendor_workflow",
        "reporting":        "run_reporting_workflow",
        "notification":     "run_notification_workflow",
    }

    def run(self, workflow_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        method_name = self.WORKFLOW_MAP.get(workflow_name)
        if not method_name:
            return {"error": True, "message": f"Unknown workflow: {workflow_name}"}
        method = getattr(self, method_name)
        return method(payload)
