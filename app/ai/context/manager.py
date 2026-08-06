from app.ai.schemas.context import SharedContext, AuthContext, EntityContext
from typing import Dict, Any

class ContextManager:
    """
    Manages the global state and context passed between the Supervisor and Specialized Agents.
    """
    
    def __init__(self, session_id: str, correlation_id: str, auth_data: Dict[str, Any]):
        self.context = SharedContext(
            session_id=session_id,
            correlation_id=correlation_id,
            auth=AuthContext(**auth_data)
        )
        
    def get_context(self) -> SharedContext:
        return self.context
        
    def add_entity(self, entity_type: str, entity_id: str):
        """Adds an entity to the working context so other agents know about it."""
        if entity_type == "ticket" and entity_id not in self.context.entities.ticket_ids:
            self.context.entities.ticket_ids.append(entity_id)
        elif entity_type == "work_order" and entity_id not in self.context.entities.work_order_ids:
            self.context.entities.work_order_ids.append(entity_id)
        elif entity_type == "asset" and entity_id not in self.context.entities.asset_ids:
            self.context.entities.asset_ids.append(entity_id)
            
    def add_event(self, event_name: str, payload: Dict[str, Any]):
        self.context.recent_events.append({
            "event": event_name,
            "payload": payload,
            "timestamp": "now" # In real implementation, use datetime.utcnow().isoformat()
        })
