"""
app/ai/sessions/conversation.py
─────────────────────────────────────────────────────────────────────────────
ConversationManager — multi-turn context carry-over, goal tracking, clarification.
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import uuid


class ConversationGoal(BaseModel):
    goal_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    is_achieved: bool = False
    progress_notes: List[str] = Field(default_factory=list)


class ConversationTurn(BaseModel):
    turn_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_message: str
    agent_response: str
    intent_detected: Optional[str] = None
    agents_involved: List[str] = Field(default_factory=list)
    entities_mentioned: Dict[str, Any] = Field(default_factory=dict)


class ConversationState(BaseModel):
    session_id: str
    goals: List[ConversationGoal] = Field(default_factory=list)
    turns: List[ConversationTurn] = Field(default_factory=list)
    pending_clarifications: List[str] = Field(default_factory=list)
    context_carry: Dict[str, Any] = Field(default_factory=dict)  # e.g., last ticket ID, asset ID


class ConversationManager:
    """
    Manages multi-turn conversation state, goals, and context carry-over between turns.
    """

    def __init__(self):
        self._sessions: Dict[str, ConversationState] = {}

    def get_or_create(self, session_id: str) -> ConversationState:
        if session_id not in self._sessions:
            self._sessions[session_id] = ConversationState(session_id=session_id)
        return self._sessions[session_id]

    def add_turn(
        self, session_id: str, user_msg: str, agent_response: str,
        intent: Optional[str] = None, agents: Optional[List[str]] = None,
        entities: Optional[Dict[str, Any]] = None,
    ) -> ConversationTurn:
        state = self.get_or_create(session_id)
        turn = ConversationTurn(
            user_message=user_msg,
            agent_response=agent_response,
            intent_detected=intent,
            agents_involved=agents or [],
            entities_mentioned=entities or {},
        )
        state.turns.append(turn)
        # Carry over key entities to context
        if entities:
            state.context_carry.update(entities)
        return turn

    def carry_context(self, session_id: str) -> Dict[str, Any]:
        """Returns persisted entity context for the session (e.g., last ticket_id)."""
        return self.get_or_create(session_id).context_carry

    def add_clarification(self, session_id: str, question: str):
        state = self.get_or_create(session_id)
        state.pending_clarifications.append(question)

    def resolve_clarification(self, session_id: str):
        state = self.get_or_create(session_id)
        if state.pending_clarifications:
            state.pending_clarifications.pop(0)

    def get_summary(self, session_id: str) -> str:
        state = self.get_or_create(session_id)
        num_turns = len(state.turns)
        last_intent = state.turns[-1].intent_detected if state.turns else "none"
        return (
            f"Session {session_id}: {num_turns} turns. "
            f"Last intent: {last_intent}. "
            f"Context: {state.context_carry}"
        )
