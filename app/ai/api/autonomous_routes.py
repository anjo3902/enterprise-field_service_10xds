"""
app/ai/api/autonomous_routes.py
─────────────────────────────────────────────────────────────────────────────
FastAPI routes for the Autonomous Enterprise Engine.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List

from app.ai.autonomous.schedulers.async_scheduler import scheduler
from app.ai.autonomous.orchestrator.hitl_manager import hitl_manager
from app.ai.autonomous.recovery.manager import dlq_manager
from app.ai.autonomous.events.models import EnterpriseEvent
from app.ai.coordinator.supervisor import SupervisorAgent
from app.ai.schemas.context import AuthContext, SharedContext
from app.ai.api.routes import get_auth_context

# Initialize watchers and bind to supervisor processing
from app.ai.autonomous.watchers.service_watchers import SLAWatcher, PMWatcher, system_context
from app.ai.autonomous.watchers.resource_watchers import InventoryWatcher, AssetHealthWatcher

router = APIRouter(prefix="/autonomous", tags=["Autonomous Engine"])

def process_event(event: EnterpriseEvent):
    """Callback for watchers to publish events to the Supervisor."""
    supervisor = SupervisorAgent(system_context)
    supervisor.handle_autonomous_event(event)

# Register Watchers
scheduler.add_job("sla_monitor", SLAWatcher(process_event).run, interval_seconds=300)
scheduler.add_job("pm_monitor", PMWatcher(process_event).run, interval_seconds=3600)
scheduler.add_job("inventory_monitor", InventoryWatcher(process_event).run, interval_seconds=600)
scheduler.add_job("asset_monitor", AssetHealthWatcher(process_event).run, interval_seconds=900)


@router.post("/start")
async def start_autonomous_engine(auth: AuthContext = Depends(get_auth_context)):
    if auth.role != "system_admin":
        raise HTTPException(status_code=403, detail="System Admin required")
    scheduler.start_all()
    return {"status": "success", "message": "Autonomous Watchers started."}

@router.post("/stop")
async def stop_autonomous_engine(auth: AuthContext = Depends(get_auth_context)):
    if auth.role != "system_admin":
        raise HTTPException(status_code=403, detail="System Admin required")
    scheduler.stop_all()
    return {"status": "success", "message": "Autonomous Watchers stopped."}

@router.get("/status")
async def get_engine_status(auth: AuthContext = Depends(get_auth_context)):
    jobs = [{"name": name, "running": job.is_running} for name, job in scheduler.jobs.items()]
    return {"status": "success", "watchers": jobs}

@router.get("/hitl/pending")
async def get_pending_approvals(auth: AuthContext = Depends(get_auth_context)):
    pending = hitl_manager.get_pending(auth.org_id)
    return {"status": "success", "pending": pending}

@router.post("/hitl/approve/{approval_id}")
async def resolve_approval(approval_id: str, approved: bool, auth: AuthContext = Depends(get_auth_context)):
    """Resolves a HITL pause and resumes execution if approved."""
    result = hitl_manager.resolve_approval(approval_id, approved)
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["message"])
        
    if result["status"] == "approved":
        # Resume the workflow via Supervisor
        context = SharedContext(session_id="hitl-resume", correlation_id=f"hitl-{approval_id}", auth=auth, entities=None)
        supervisor = SupervisorAgent(context)
        from app.ai.workflows.autonomous_workflows import AutonomousWorkflowEngine
        engine = AutonomousWorkflowEngine(context)
        resume_result = engine.run_autonomous(result["workflow"], result["context"])
        return {"status": "success", "message": "Workflow resumed.", "result": resume_result}
    else:
        return {"status": "success", "message": "Workflow rejected and cancelled."}

@router.get("/dlq")
async def get_dead_letter_queue(auth: AuthContext = Depends(get_auth_context)):
    if auth.role != "system_admin":
        raise HTTPException(status_code=403, detail="System Admin required")
    return {"status": "success", "failed_tasks": dlq_manager.get_all()}
