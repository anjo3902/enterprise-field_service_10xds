from app.ai.schemas.memory import SessionMemorySchema, Message
from typing import Dict

class MemoryManager:
    """
    Pluggable memory manager. Currently uses in-memory dict, 
    but designed to swap to Redis or Postgres for persistence.
    """
    def __init__(self):
        # session_id -> SessionMemorySchema
        self._storage: Dict[str, SessionMemorySchema] = {}

    def get_session(self, session_id: str) -> SessionMemorySchema:
        if session_id not in self._storage:
            self._storage[session_id] = SessionMemorySchema(session_id=session_id)
        return self._storage[session_id]

    def add_message(self, session_id: str, message: Message):
        session = self.get_session(session_id)
        session.messages.append(message)
        
        # Simple sliding window logic could go here to avoid context limits
        if len(session.messages) > 100:
            session.messages = session.messages[-50:]

    def summarize(self, session_id: str) -> str:
        """Called periodically by a background task or agent to summarize old context."""
        session = self.get_session(session_id)
        # Dummy summary logic
        session.summary = f"Conversation had {len(session.messages)} messages."
        return session.summary
