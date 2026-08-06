"""
app/ai/autonomous/recovery/manager.py
─────────────────────────────────────────────────────────────────────────────
Dead-Letter Queue (DLQ) and recovery for failed autonomous workflows.
"""
from typing import Dict, Any
from app.ai.utils.logger import get_logger

logger = get_logger("ai.autonomous.dlq")

class DLQManager:
    """
    In-memory DLQ for storing failed workflows.
    In production, this would persist to Postgres.
    """
    def __init__(self):
        self.failed_tasks: Dict[str, Dict[str, Any]] = {}

    def push(self, task_id: str, workflow_name: str, payload: dict, error_msg: str):
        self.failed_tasks[task_id] = {
            "workflow": workflow_name,
            "payload": payload,
            "error": error_msg,
            "retry_count": 0
        }
        logger.error(f"DLQ PUSH: Task {task_id} ({workflow_name}) failed. Reason: {error_msg}")

    def pop(self, task_id: str) -> Dict[str, Any]:
        return self.failed_tasks.pop(task_id, None)
        
    def get_all(self):
        return self.failed_tasks

# Global DLQ instance
dlq_manager = DLQManager()
