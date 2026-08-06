from pydantic import BaseModel
from typing import Dict, Any

class AgentEvent(BaseModel):
    event_type: str # e.g., 'task.delegated', 'response.aggregated'
    source_agent: str
    target_agent: str
    payload: Dict[str, Any]
    correlation_id: str

class EventBus:
    """
    In-memory event bus for inter-agent communication during a single orchestration lifecycle.
    Helps decouple agents so they don't call each other directly.
    """
    def __init__(self):
        self.subscribers: Dict[str, list] = {}

    def subscribe(self, event_type: str, callback: callable):
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(callback)

    def publish(self, event: AgentEvent):
        if event.event_type in self.subscribers:
            for callback in self.subscribers[event.event_type]:
                callback(event)
