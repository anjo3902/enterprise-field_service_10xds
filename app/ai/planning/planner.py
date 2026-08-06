"""
app/ai/planning/planner.py
─────────────────────────────────────────────────────────────────────────────
TaskPlanner — converts raw user intent into a validated ExecutionPlan.
Uses keyword-based intent classification (extensible to LLM-based classification).
"""

from __future__ import annotations
from typing import Dict, List, Tuple
from app.ai.planning.plan import (
    ExecutionPlan, Task, SubTask, ExecutionStep,
    TaskPriority, TaskStatus
)
from app.ai.utils.logger import get_logger

logger = get_logger("ai.planner")


# ── Intent → Workflow Mapping ─────────────────────────────────────────────────
INTENT_PATTERNS: List[Tuple[List[str], str]] = [
    (["ticket", "complaint", "issue", "fault", "report problem"], "ticket_creation"),
    (["dispatch", "assign", "schedule", "technician", "send tech"], "dispatch"),
    (["work order", "job", "repair", "fix"], "work_order"),
    (["inventory", "stock", "part", "spare", "warehouse"], "inventory"),
    (["asset", "equipment", "machine", "device", "failure", "health"], "asset_diagnosis"),
    (["maintenance", "pm", "preventive", "amc", "warranty"], "maintenance"),
    (["vendor", "contractor", "supplier", "sla"], "vendor"),
    (["report", "analytics", "dashboard", "kpi", "summary"], "reporting"),
    (["notify", "alert", "notification", "send message"], "notification"),
]

# ── Workflow → Agent Chain Mapping ────────────────────────────────────────────
WORKFLOW_AGENT_CHAINS: Dict[str, List[str]] = {
    "ticket_creation":  ["ticket_agent", "dispatch_agent", "notification_agent"],
    "dispatch":         ["dispatch_agent", "inventory_agent", "notification_agent"],
    "work_order":       ["work_order_agent", "dispatch_agent", "notification_agent"],
    "asset_diagnosis":  ["asset_agent", "maintenance_agent", "ticket_agent"],
    "inventory":        ["inventory_agent", "report_agent"],
    "maintenance":      ["maintenance_agent", "asset_agent", "notification_agent"],
    "vendor":           ["vendor_agent", "report_agent"],
    "reporting":        ["report_agent", "audit_agent"],
    "notification":     ["notification_agent"],
}


class TaskPlanner:
    """
    Converts user intent into a structured, validated ExecutionPlan.
    The Supervisor delegates planning to this class.
    """

    def classify_intent(self, intent: str) -> str:
        """Returns the matched workflow name, or 'general' if unrecognized."""
        intent_lower = intent.lower()
        for keywords, workflow in INTENT_PATTERNS:
            if any(kw in intent_lower for kw in keywords):
                return workflow
        return "general"

    def classify_priority(self, intent: str) -> TaskPriority:
        intent_lower = intent.lower()
        if any(w in intent_lower for w in ["critical", "emergency", "urgent", "down"]):
            return TaskPriority.CRITICAL
        if any(w in intent_lower for w in ["high", "asap", "immediately"]):
            return TaskPriority.HIGH
        if any(w in intent_lower for w in ["low", "whenever", "flexible"]):
            return TaskPriority.LOW
        return TaskPriority.MEDIUM

    def build_plan(self, intent: str, correlation_id: str) -> ExecutionPlan:
        """
        Constructs a full ExecutionPlan from user intent.
        """
        workflow = self.classify_intent(intent)
        priority = self.classify_priority(intent)
        agents = WORKFLOW_AGENT_CHAINS.get(workflow, ["knowledge_agent"])

        logger.info(
            f"Building plan: workflow={workflow}, agents={agents}",
            extra={"correlation_id": correlation_id}
        )

        # Build execution steps — one step per agent in the chain
        steps: List[ExecutionStep] = []
        for i, agent in enumerate(agents):
            step = ExecutionStep(
                name=f"Step {i + 1}: {agent}",
                agent=agent,
                input_payload={"intent": intent},
                expected_output_keys=["status", "result"],
                depends_on=[steps[i - 1].step_id] if i > 0 else [],
            )
            steps.append(step)

        subtask = SubTask(
            name=f"{workflow.replace('_', ' ').title()} Subtask",
            description=f"Execute {workflow} workflow for: {intent}",
            steps=steps,
        )

        task = Task(
            name=workflow.replace("_", " ").title(),
            description=intent,
            intent=intent,
            priority=priority,
            subtasks=[subtask],
            correlation_id=correlation_id,
        )

        return ExecutionPlan(
            task=task,
            primary_workflow=workflow,
            participating_agents=agents,
            estimated_steps=len(steps),
            requires_human_review=(priority == TaskPriority.CRITICAL),
        )
