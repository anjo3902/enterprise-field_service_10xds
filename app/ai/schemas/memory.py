from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class Message(BaseModel):
    role: str # 'user', 'assistant', 'system', 'tool'
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_outputs: Optional[List[Dict[str, Any]]] = None

class SessionMemorySchema(BaseModel):
    session_id: str
    messages: List[Message] = Field(default_factory=list)
    task_history: List[str] = Field(default_factory=list)
    summary: Optional[str] = None
