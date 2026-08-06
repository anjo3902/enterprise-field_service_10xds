"""
app/ai/autonomous/events/models.py
─────────────────────────────────────────────────────────────────────────────
Core event definitions for the Autonomous Engine.
"""
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
import uuid
from enum import Enum

class EventPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class EnterpriseEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: str         # e.g., 'sla_watcher', 'inventory_watcher', 'webhook'
    event_type: str     # e.g., 'sla_breach_risk', 'stock_shortage'
    org_id: str
    priority: EventPriority = EventPriority.MEDIUM
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: float = Field(default_factory=lambda: 0.0)  # Injected on publish
    requires_approval: bool = False
