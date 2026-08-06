"""
app/ai/planning/plan.py
─────────────────────────────────────────────────────────────────────────────
Task Planning Data Models.
Defines the full task lifecycle for multi-agent orchestration.
"""

from __future__ import annotations
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import uuid


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    SKIPPED = "skipped"
    ROLLED_BACK = "rolled_back"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ExecutionStep(BaseModel):
    step_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    agent: str                              # Which specialized agent handles this step
    tool: Optional[str] = None             # Optional specific tool within the agent
    input_payload: Dict[str, Any] = Field(default_factory=dict)
    expected_output_keys: List[str] = Field(default_factory=list)

    # Execution config
    max_retries: int = 3
    timeout_seconds: int = 30
    allow_rollback: bool = True
    depends_on: List[str] = Field(default_factory=list)  # step_ids of dependencies

    # Runtime state
    status: TaskStatus = TaskStatus.PENDING
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    retry_count: int = 0
    confidence_score: float = 0.0


class SubTask(BaseModel):
    subtask_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    steps: List[ExecutionStep] = Field(default_factory=list)
    status: TaskStatus = TaskStatus.PENDING
    result: Optional[Dict[str, Any]] = None


class Task(BaseModel):
    task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    intent: str                            # Original user intent
    priority: TaskPriority = TaskPriority.MEDIUM
    subtasks: List[SubTask] = Field(default_factory=list)
    status: TaskStatus = TaskStatus.PENDING
    final_result: Optional[Dict[str, Any]] = None
    correlation_id: str = ""


class ExecutionPlan(BaseModel):
    plan_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task: Task
    primary_workflow: str                  # e.g., "ticket_creation", "dispatch"
    participating_agents: List[str] = Field(default_factory=list)
    parallel_groups: List[List[str]] = Field(default_factory=list)  # Steps that can run in parallel
    estimated_steps: int = 0
    requires_human_review: bool = False
    confidence_threshold: float = 0.75
