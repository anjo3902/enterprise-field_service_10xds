"""
app/ai/tests/test_planning.py
─────────────────────────────────────────────────────────────────────────────
Tests for TaskPlanner and ReflectionEngine.
"""

import pytest
from app.ai.planning.planner import TaskPlanner
from app.ai.planning.plan import TaskPriority, TaskStatus
from app.ai.reflection.engine import ReflectionEngine


class TestTaskPlanner:

    def setup_method(self):
        self.planner = TaskPlanner()

    def test_classify_ticket_intent(self):
        assert self.planner.classify_intent("I want to raise a ticket for AC issue") == "ticket_creation"

    def test_classify_dispatch_intent(self):
        assert self.planner.classify_intent("Please schedule a technician") == "dispatch"

    def test_classify_asset_intent(self):
        assert self.planner.classify_intent("Asset failure analysis needed") == "asset_diagnosis"

    def test_classify_reporting_intent(self):
        assert self.planner.classify_intent("Generate KPI report") == "reporting"

    def test_classify_unknown_falls_back(self):
        assert self.planner.classify_intent("What is the weather?") == "general"

    def test_critical_priority(self):
        assert self.planner.classify_priority("URGENT: complete system down") == TaskPriority.CRITICAL

    def test_high_priority(self):
        assert self.planner.classify_priority("High priority repair needed ASAP") == TaskPriority.HIGH

    def test_medium_priority_default(self):
        assert self.planner.classify_priority("Schedule a routine inspection") == TaskPriority.MEDIUM

    def test_build_plan_returns_correct_workflow(self):
        plan = self.planner.build_plan("create a ticket for broken elevator", "test-corr")
        assert plan.primary_workflow == "ticket_creation"
        assert "ticket_agent" in plan.participating_agents
        assert plan.estimated_steps >= 1

    def test_build_plan_steps_have_agents(self):
        plan = self.planner.build_plan("dispatch a technician urgently", "test-corr-2")
        for subtask in plan.task.subtasks:
            for step in subtask.steps:
                assert step.agent != ""

    def test_critical_plan_requires_human_review(self):
        plan = self.planner.build_plan("CRITICAL: complete power outage", "test-corr-3")
        assert plan.requires_human_review is True


class TestReflectionEngine:

    def setup_method(self):
        self.engine = ReflectionEngine()

    def test_valid_output_passes(self):
        output = {"status": "success", "data": [{"id": 1}]}
        result = self.engine.reflect("test_agent", output, ["status", "data"], "corr-1")
        assert result.is_valid is True
        assert result.confidence > 0.6

    def test_error_output_fails(self):
        output = {"error": True, "message": "Backend unreachable"}
        result = self.engine.reflect("test_agent", output, ["status"], "corr-2")
        assert result.is_valid is False
        assert result.confidence < 0.6

    def test_missing_keys_reduce_confidence(self):
        output = {"status": "success"}
        result = self.engine.reflect("test_agent", output, ["status", "data", "total"], "corr-3")
        assert result.confidence < 1.0
        assert len(result.issues) > 0

    def test_empty_data_flags_issue(self):
        output = {"status": "success", "data": []}
        result = self.engine.reflect("test_agent", output, ["data"], "corr-4")
        assert any("empty" in i.lower() for i in result.issues)

    def test_should_retry_on_low_confidence(self):
        output = {"status": "success"}
        result = self.engine.reflect(
            "test_agent", output, ["status", "data", "total", "count"], "corr-5"
        )
        assert isinstance(result.should_retry, bool)
