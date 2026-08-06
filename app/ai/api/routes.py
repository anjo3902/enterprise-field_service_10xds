from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import Dict, Any
from app.ai.coordinator.supervisor import SupervisorAgent
from app.ai.context.manager import ContextManager
import uuid

router = APIRouter(prefix="/agents", tags=["Agents"])

class ChatRequest(BaseModel):
    session_id: str
    message: str
    auth_context: Dict[str, Any] # Contains jwt, org_id, user_id, role

@router.post("/chat")
async def chat_with_agent(request: Request, payload: ChatRequest):
    """
    Main conversational endpoint. Routes intent to the Supervisor.
    """
    correlation_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    
    # Initialize Shared Context for this request
    context_manager = ContextManager(
        session_id=payload.session_id,
        correlation_id=correlation_id,
        auth_data=payload.auth_context
    )
    
    supervisor = SupervisorAgent(context_manager.get_context())
    result = supervisor.coordinate(payload.message)
    
    return result

class ExecuteRequest(BaseModel):
    workflow_name: str
    payload: Dict[str, Any]
    auth_context: Dict[str, Any]

@router.post("/workflow")
async def execute_workflow(request: Request, payload: ExecuteRequest):
    """
    Executes a predefined declarative workflow.
    """
    correlation_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    
    context_manager = ContextManager(
        session_id="workflow-" + str(uuid.uuid4()),
        correlation_id=correlation_id,
        auth_data=payload.auth_context
    )
    
    from app.ai.workflows.engine import WorkflowEngine
    engine = WorkflowEngine(context_manager.get_context())
    
    if payload.workflow_name == "ticket_creation":
        result = engine.run_ticket_creation_workflow(payload.payload)
        return result
        
    return {"error": "Unknown workflow"}
