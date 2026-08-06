"""
app/ai/tests/test_workflows.py
─────────────────────────────────────────────────────────────────────────────
Multi-agent workflow integration tests.
Patches all backend HTTP calls to isolate workflow logic from live Supabase.
"""

import pytest
from unittest.mock import patch, MagicMock
from app.ai.workflows.engine import WorkflowEngine
from app.ai.schemas.context import SharedContext, AuthContext, EntityContext
from app.ai.planning.planner import TaskPlanner


def _make_context() -> SharedContext:
    return SharedContext(
        session_id="wf-test",
        correlation_id="wf-corr",
        auth=AuthContext(user_id="u1", role="org_admin", org_id="org-1", jwt_token="mock-jwt"),
        entities=EntityContext(ticket_ids=["tkt-1"], work_order_ids=["wo-1"], asset_ids=["a-1"]),
    )


@patch("app.ai.tools.edge_functions.requests.post")
class TestWorkflowExecution:

    def test_ticket_creation_workflow(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200, json=lambda: {"status": "success", "ticket_id": "tkt-99"}
        )
        ctx = _make_context()
        engine = WorkflowEngine(ctx)
        result = engine.run_ticket_creation_workflow({"issue": "Water leak in lobby"})
        assert result["workflow"] == "ticket_creation"
        assert result["status"] == "completed"
        agents_used = [s["agent"] for s in result["steps"]]
        assert "ticket_agent" in agents_used
        assert "notification_agent" in agents_used

    def test_dispatch_workflow(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200, json=lambda: {"status": "success"}
        )
        ctx = _make_context()
        engine = WorkflowEngine(ctx)
        result = engine.run_dispatch_workflow({"work_order_id": "wo-1"})
        assert result["workflow"] == "dispatch"
        agents_used = [s["agent"] for s in result["steps"]]
        assert "dispatch_agent" in agents_used
        assert "inventory_agent" in agents_used

    def test_asset_diagnosis_workflow(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200, json=lambda: {"status": "success", "asset_name": "Chiller A"}
        )
        ctx = _make_context()
        engine = WorkflowEngine(ctx)
        result = engine.run_asset_diagnosis_workflow({
            "asset_id": "a-1", "description": "Chiller not cooling"
        })
        assert result["workflow"] == "asset_diagnosis"
        agents_used = [s["agent"] for s in result["steps"]]
        assert "knowledge_agent" in agents_used
        assert "asset_agent" in agents_used
        assert "maintenance_agent" in agents_used

    def test_workflow_dispatcher(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200, json=lambda: {"data": [], "total": 0}
        )
        ctx = _make_context()
        engine = WorkflowEngine(ctx)
        result = engine.run("reporting", {"report_type": "operational"})
        assert result["workflow"] == "reporting"

    def test_unknown_workflow_returns_error(self, mock_post):
        ctx = _make_context()
        engine = WorkflowEngine(ctx)
        result = engine.run("nonexistent_workflow", {})
        assert result["error"] is True


class TestSupervisorOrchestration:

    @patch("app.ai.tools.edge_functions.requests.post")
    def test_supervisor_ticket_intent_delegates_correctly(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200, json=lambda: {"status": "success", "ticket_id": "tkt-99"}
        )
        from app.ai.coordinator.supervisor import SupervisorAgent
        ctx = _make_context()
        supervisor = SupervisorAgent(ctx)
        result = supervisor.coordinate("I need to raise a ticket for broken HVAC")
        assert result["status"] == "success"
        assert result["workflow"] == "ticket_creation"
        assert "ticket_agent" in result["participating_agents"]

    @patch("app.ai.tools.edge_functions.requests.post")
    def test_supervisor_critical_flags_human_review(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200, json=lambda: {"status": "success"}
        )
        from app.ai.coordinator.supervisor import SupervisorAgent
        ctx = _make_context()
        supervisor = SupervisorAgent(ctx)
        result = supervisor.coordinate("CRITICAL: complete power failure emergency")
        assert result["requires_human_review"] is True
