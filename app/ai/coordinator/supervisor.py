"""
app/ai/coordinator/supervisor.py
─────────────────────────────────────────────────────────────────────────────
SupervisorAgent — upgraded with TaskPlanner, ReflectionEngine, and full
multi-agent chain orchestration. Coordinates all domain agents.
"""

from __future__ import annotations
from typing import Any, Dict

from app.ai.schemas.context import SharedContext
from app.ai.planning.planner import TaskPlanner
from app.ai.planning.plan import ExecutionPlan, TaskStatus
from app.ai.reflection.engine import ReflectionEngine
from app.ai.prompts.library import PromptLibrary
from app.ai.utils.logger import get_logger

logger = get_logger("ai.supervisor")

# ── Agent Registry ────────────────────────────────────────────────────────────
def _load_agent(agent_name: str, context: SharedContext):
    """Lazy loads agents to avoid circular imports and reduce startup cost."""
    from app.ai.agents.ticket_agent import TicketAgent
    from app.ai.agents.dispatch_agent import DispatchAgent
    from app.ai.agents.work_order_agent import WorkOrderAgent
    from app.ai.agents.inventory_agent import InventoryAgent
    from app.ai.agents.asset_agent import AssetAgent
    from app.ai.agents.maintenance_agent import MaintenanceAgent
    from app.ai.agents.vendor_agent import VendorAgent
    from app.ai.agents.org_agent import OrgAgent
    from app.ai.agents.knowledge_agent import KnowledgeAgent
    from app.ai.agents.notification_agent import NotificationAgent
    from app.ai.agents.report_agent import ReportAgent
    from app.ai.agents.audit_agent import AuditAgent

    registry = {
        "ticket_agent":       TicketAgent,
        "dispatch_agent":     DispatchAgent,
        "work_order_agent":   WorkOrderAgent,
        "inventory_agent":    InventoryAgent,
        "asset_agent":        AssetAgent,
        "maintenance_agent":  MaintenanceAgent,
        "vendor_agent":       VendorAgent,
        "org_agent":          OrgAgent,
        "knowledge_agent":    KnowledgeAgent,
        "notification_agent": NotificationAgent,
        "report_agent":       ReportAgent,
        "audit_agent":        AuditAgent,
    }
    cls = registry.get(agent_name)
    if not cls:
        raise ValueError(f"Unknown agent: {agent_name}")
    return cls(context)


class SupervisorAgent:
    """
    Central orchestration agent — upgraded with full planning + reflection.
    1. Receives raw user intent.
    2. Builds a structured ExecutionPlan via TaskPlanner.
    3. Executes each step (agent invocation) sequentially, applying reflection.
    4. Handles retry logic and error recovery.
    5. Returns a structured, merged final response.
    """

    def __init__(self, context: SharedContext):
        self.context = context
        self.planner = TaskPlanner()
        self.reflector = ReflectionEngine()
        self.system_prompt = PromptLibrary.get_supervisor_prompt(
            org_id=context.auth.org_id,
            role=context.auth.role,
        )

    # ── Public entry point ────────────────────────────────────────────────────
    def coordinate(self, user_intent: str) -> Dict[str, Any]:
        corr = self.context.correlation_id
        logger.info(f"Supervisor received intent: '{user_intent}'", extra={"correlation_id": corr})

        # 1. Build plan
        plan = self.planner.build_plan(user_intent, corr)
        logger.info(
            f"Plan built: workflow={plan.primary_workflow}, "
            f"agents={plan.participating_agents}, steps={plan.estimated_steps}",
            extra={"correlation_id": corr}
        )

        # 2. Execute plan
        execution_results = self._execute_plan(plan)

        # 3. Aggregate and return
        return {
            "status": "success",
            "orchestrated_by": "supervisor",
            "plan_id": plan.plan_id,
            "workflow": plan.primary_workflow,
            "participating_agents": plan.participating_agents,
            "requires_human_review": plan.requires_human_review,
            "step_results": execution_results,
            "final_message": self._generate_response(plan, execution_results),
        }

    # ── Internal Execution ────────────────────────────────────────────────────
    def _execute_plan(self, plan: ExecutionPlan) -> list:
        results = []
        all_steps = []
        for subtask in plan.task.subtasks:
            all_steps.extend(subtask.steps)

        for step in all_steps:
            corr = self.context.correlation_id
            logger.info(
                f"Executing step: {step.name} → agent={step.agent}",
                extra={"correlation_id": corr}
            )

            # Attempt with retry
            step_result = None
            for attempt in range(1, step.max_retries + 1):
                try:
                    agent = _load_agent(step.agent, self.context)
                    step_result = agent.execute(plan.task.intent, self.context)
                    step.status = TaskStatus.COMPLETED
                    step.output = step_result
                    break
                except Exception as exc:
                    logger.warning(
                        f"Step {step.name} attempt {attempt} failed: {exc}",
                        extra={"correlation_id": corr}
                    )
                    step.retry_count += 1
                    step.error = str(exc)
                    if attempt == step.max_retries:
                        step.status = TaskStatus.FAILED
                        step_result = {"error": True, "message": str(exc)}

            # Reflect on step output
            reflection = self.reflector.reflect(
                step.agent,
                step_result or {},
                step.expected_output_keys,
                corr,
            )
            step.confidence_score = reflection.confidence
            
            # Evaluate the step accuracy and hallucination risk
            from app.ai.evaluation.evaluator import evaluation_engine
            evaluation_engine.evaluate_step(
                step.agent, 
                plan.task.intent, 
                step_result or {}, 
                reflection.confidence
            )

            results.append({
                "step": step.name,
                "agent": step.agent,
                "status": step.status.value,
                "result": step_result,
                "confidence": reflection.confidence,
                "issues": reflection.issues,
            })

        return results

    def _generate_response(self, plan: ExecutionPlan, results: list) -> str:
        """Synthesizes a natural-language summary of the completed workflow."""
        completed = [r for r in results if r["status"] == "completed"]
        failed = [r for r in results if r["status"] == "failed"]

        msg = (
            f"Workflow '{plan.primary_workflow}' completed. "
            f"{len(completed)} of {len(results)} steps succeeded."
        )
        if failed:
            msg += f" {len(failed)} step(s) encountered issues and may require attention."
        if plan.requires_human_review:
            msg += " ⚠️ This task has been flagged for human review due to critical priority."
        return msg

    # ── Autonomous Event Loop ─────────────────────────────────────────────────
    def handle_autonomous_event(self, event) -> Dict[str, Any]:
        """
        Receives an EnterpriseEvent from a Watcher or Webhook.
        1. Evaluates Policy to find workflow.
        2. Checks if HITL approval is required.
        3. Executes Workflow via AutonomousWorkflowEngine.
        4. Handles DLQ on failure.
        """
        from app.ai.autonomous.policies.engine import policy_engine
        from app.ai.autonomous.recovery.manager import dlq_manager
        from app.ai.autonomous.orchestrator.hitl_manager import hitl_manager
        from app.ai.workflows.autonomous_workflows import AutonomousWorkflowEngine

        corr = self.context.correlation_id
        logger.info(f"Supervisor received Event: {event.event_type} from {event.source}", extra={"correlation_id": corr})

        workflow_name = policy_engine.evaluate(event)
        if not workflow_name:
            return {"status": "ignored", "reason": "No policy matched"}

        if event.requires_approval:
            # Hit HITL Pause
            approval_id = hitl_manager.require_approval(
                org_id=event.org_id,
                workflow=workflow_name,
                agent="supervisor",
                intent=f"Event Triggered: {event.event_type}",
                context=event.payload
            )
            return {"status": "paused", "approval_id": approval_id}

        # Execute Autonomous Workflow
        engine = AutonomousWorkflowEngine(self.context)
        try:
            result = engine.run_autonomous(workflow_name, event.payload)
            if result.get("error"):
                dlq_manager.push(event.event_id, workflow_name, event.payload, result["message"])
            return result
        except Exception as e:
            logger.error(f"Autonomous workflow failed: {e}")
            dlq_manager.push(event.event_id, workflow_name, event.payload, str(e))
            return {"status": "failed", "error": str(e)}
