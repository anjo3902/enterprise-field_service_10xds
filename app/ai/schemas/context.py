from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class AuthContext(BaseModel):
    user_id: str
    role: str
    org_id: str
    vendor_id: Optional[str] = None
    jwt_token: str = Field(..., description="The Supabase JWT to pass to Edge Functions")

class EntityContext(BaseModel):
    ticket_ids: List[str] = Field(default_factory=list)
    work_order_ids: List[str] = Field(default_factory=list)
    asset_ids: List[str] = Field(default_factory=list)
    technician_ids: List[str] = Field(default_factory=list)
    
class SharedContext(BaseModel):
    session_id: str
    correlation_id: str
    auth: AuthContext
    entities: EntityContext = Field(default_factory=EntityContext)
    recent_events: List[Dict[str, Any]] = Field(default_factory=list)
    uploaded_files: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
