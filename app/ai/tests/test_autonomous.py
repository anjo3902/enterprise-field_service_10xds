"""
app/ai/tests/test_autonomous.py
─────────────────────────────────────────────────────────────────────────────
Unit tests for the Autonomous Enterprise Engine.
"""
import pytest
from unittest.mock import patch, MagicMock
from app.ai.autonomous.events.models import EnterpriseEvent, EventPriority
from app.ai.autonomous.policies.engine import policy_engine
from app.ai.autonomous.orchestrator.hitl_manager import hitl_manager
from app.ai.autonomous.recovery.manager import dlq_manager
from app.ai.coordinator.supervisor import SupervisorAgent
from app.ai.schemas.context import SharedContext, AuthContext, EntityContext

def _make_context() -> SharedContext:
    return SharedContext(
        session_id="test-auto",
        correlation_id="auto-corr",
        auth=AuthContext(user_id="u1", role="org_admin", org_id="org-1", jwt_token="mock"),
        entities=EntityContext()
    )

class TestPolicyEngine:
    def test_sla_breach_policy(self):
        event = EnterpriseEvent(source="test", event_type="sla_breach_risk", org_id="o1")
        assert policy_engine.evaluate(event) == "sla_protection"

    def test_unknown_event_policy(self):
        event = EnterpriseEvent(source="test", event_type="unknown_event", org_id="o1")
        assert policy_engine.evaluate(event) is None

class TestHITLManager:
    def test_require_approval(self):
        hitl_manager._pending.clear()
        app_id = hitl_manager.require_approval("org1", "inventory_restocking", "test_agent", "Test Intent", {"part": "123"})
        assert app_id is not None
        pending = hitl_manager.get_pending("org1")
        assert len(pending) == 1
        assert pending[0]["workflow_name"] == "inventory_restocking"

    def test_resolve_approval(self):
        hitl_manager._pending.clear()
        app_id = hitl_manager.require_approval("org1", "wf1", "ag1", "int1", {})
        res = hitl_manager.resolve_approval(app_id, True)
        assert res["status"] == "approved"
        assert len(hitl_manager.get_pending()) == 0

class TestDLQManager:
    def test_dlq_push_pop(self):
        dlq_manager.failed_tasks.clear()
        dlq_manager.push("t1", "wf1", {"a": 1}, "Backend timeout")
        assert len(dlq_manager.get_all()) == 1
        task = dlq_manager.pop("t1")
        assert task["workflow"] == "wf1"
        assert task["error"] == "Backend timeout"
        assert len(dlq_manager.get_all()) == 0

@patch("app.ai.tools.edge_functions.requests.post")
class TestSupervisorAutonomous:
    def test_handle_autonomous_event_success(self, mock_post):
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"status": "success"})
        ctx = _make_context()
        sup = SupervisorAgent(ctx)
        
        event = EnterpriseEvent(
            source="test", 
            event_type="sla_breach_risk", 
            org_id="org-1", 
            payload={"ticket_id": "TKT-123"}
        )
        
        res = sup.handle_autonomous_event(event)
        assert res["workflow"] == "sla_protection"
        assert res["status"] == "completed"

    def test_handle_autonomous_event_hitl_pause(self, mock_post):
        ctx = _make_context()
        sup = SupervisorAgent(ctx)
        
        event = EnterpriseEvent(
            source="test", 
            event_type="stock_shortage", 
            org_id="org-1",
            requires_approval=True,
            payload={"part_id": "P-123"}
        )
        
        res = sup.handle_autonomous_event(event)
        assert res["status"] == "paused"
        assert "approval_id" in res
