from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.ai.utils.logger import get_logger, generate_correlation_id
import time

logger = get_logger("ai.main")

app = FastAPI(
    title="Enterprise Agentic Platform",
    description="Multi-Agent Orchestration Layer powered by Google ADK Patterns",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_correlation_id_and_log(request: Request, call_next):
    correlation_id = request.headers.get("x-correlation-id", generate_correlation_id())
    # Attach to request state for access in endpoints
    request.state.correlation_id = correlation_id
    
    start_time = time.time()
    logger.info(f"Incoming {request.method} {request.url.path}", extra={"correlation_id": correlation_id})
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    response.headers["x-correlation-id"] = correlation_id
    
    logger.info(
        f"Completed {response.status_code} in {process_time:.3f}s",
        extra={"correlation_id": correlation_id}
    )
    
    return response

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "agentic-platform"}

from app.ai.api.routes import router as agent_router
from app.ai.api.knowledge_routes import router as knowledge_router
from app.ai.api.autonomous_routes import router as autonomous_router
from app.ai.api.production_routes import router as production_router

app.include_router(agent_router)
app.include_router(knowledge_router)
app.include_router(autonomous_router)
app.include_router(production_router)
