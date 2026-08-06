"""
app/ai/tests/test_agents.py
─────────────────────────────────────────────────────────────────────────────
Unit tests for all specialized agents.
Uses mocked contexts — no live backend connections required.
"""

import pytest
from unittest.mock import patch, MagicMock
from app.ai.schemas.context import SharedContext, AuthContext, EntityContext


def _make_context(session_id="test-session", corr="test-corr") -> SharedContext:
    return SharedContext(
        session_id=session_id,
        correlation_id=corr,
        auth=AuthContext(
            user_id="user-1",
            role="org_admin",
            org_id="org-1",
            jwt_token="mock-jwt",
        ),
        entities=EntityContext(
            ticket_ids=["tkt-1"],
            work_order_ids=["wo-1"],
            asset_ids=["asset-1"],
        ),
    )


class TestKnowledgeAgent:
    """KnowledgeAgent has no backend calls — fully testable in isolation."""

    def test_search_returns_domain(self):
        from app.ai.agents.knowledge_agent import KnowledgeAgent
        ctx = _make_context()
        agent = KnowledgeAgent(ctx)
        result = agent.search_knowledge("AC unit not cooling")
        assert result["domain"] == "HVAC"
        assert result["agent"] == "knowledge_agent"

    def test_search_returns_fault_guidance(self):
        from app.ai.agents.knowledge_agent import KnowledgeAgent
        ctx = _make_context()
        agent = KnowledgeAgent(ctx)
        result = agent.search_knowledge("AC not cooling in lobby")
        assert result["fault_guidance"] is not None

    def test_explain_policy(self):
        from app.ai.agents.knowledge_agent import KnowledgeAgent
        ctx = _make_context()
        agent = KnowledgeAgent(ctx)
        result = agent.explain_policy("vendor_sla")
        assert "respond" in result["policy"].lower()

    def test_execute_returns_success(self):
        from app.ai.agents.knowledge_agent import KnowledgeAgent
        ctx = _make_context()
        agent = KnowledgeAgent(ctx)
        result = agent.execute("Troubleshoot electrical power outage", ctx)
        assert result["status"] == "success"
        assert "domain" in result["knowledge_result"]


class TestInventoryAgent:

    @patch("app.ai.tools.edge_functions.requests.post")
    def test_check_stock_with_surplus(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"quantity_on_hand": 10}
        )
        from app.ai.agents.inventory_agent import InventoryAgent
        ctx = _make_context()
        agent = InventoryAgent(ctx)
        result = agent.check_stock("part-1", 5)
        assert result["shortage"] == 0
        assert "sufficient" in result["recommendation"].lower()

    @patch("app.ai.tools.edge_functions.requests.post")
    def test_check_stock_with_shortage(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"quantity_on_hand": 2}
        )
        from app.ai.agents.inventory_agent import InventoryAgent
        ctx = _make_context()
        agent = InventoryAgent(ctx)
        result = agent.check_stock("part-1", 10)
        assert result["shortage"] == 8
        assert "procurement" in result["recommendation"].lower()


class TestVendorAgent:

    @patch("app.ai.tools.edge_functions.requests.post")
    def test_vendor_performance_excellent(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"data": [{"sla_compliance_rate": 0.97}], "total": 1}
        )
        from app.ai.agents.vendor_agent import VendorAgent
        ctx = _make_context()
        agent = VendorAgent(ctx)
        result = agent.get_vendor_performance("vendor-1")
        assert result["performance_label"] == "Excellent"

    @patch("app.ai.tools.edge_functions.requests.post")
    def test_vendor_performance_poor(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"data": [{"sla_compliance_rate": 0.45}], "total": 1}
        )
        from app.ai.agents.vendor_agent import VendorAgent
        ctx = _make_context()
        agent = VendorAgent(ctx)
        result = agent.get_vendor_performance("vendor-1")
        assert result["performance_label"] == "Poor"


class TestMaintenanceAgent:

    def test_get_maintenance_rule_hvac(self):
        from app.ai.agents.maintenance_agent import MaintenanceAgent
        ctx = _make_context()
        agent = MaintenanceAgent(ctx)
        rule = agent.get_maintenance_rule("HVAC air conditioning unit")
        assert "filter" in rule.lower() or "no specific rule" in rule.lower()
