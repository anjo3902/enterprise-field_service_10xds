from typing import List, Dict, Any, Optional
from app.ai.tools.base import Tool
from app.ai.schemas.context import SharedContext
from app.ai.retrieval.query.search import SearchEngine
from app.ai.governance.guardrails.scanner import GuardrailScanner
from app.ai.governance.policies.access import AgentAccessPolicy
from app.ai.metrics.tracker import metrics_tracker
from app.ai.models.registry import model_registry
from app.ai.utils.logger import get_logger
import time

logger = get_logger("ai.agent.base")

class BaseAgent:
    """
    Base class for all Specialized Domain Agents.
    Integrates with Google ADK / Gemini API and the Enterprise Knowledge Layer.
    """
    
    def __init__(self, name: str, system_prompt: str, tools: List[Tool]):
        self.name = name
        self.system_prompt = system_prompt
        self.tools = tools
        self.search_engine = SearchEngine()
        
        # Configure Model via Enterprise Model Registry
        self.model = model_registry.get_model(task_type="reasoning")
            
    def pre_reasoning_retrieval(self, prompt: str, org_id: str) -> str:
        """
        Automatically retrieves authoritative enterprise context before reasoning.
        Filters by org_id if applicable.
        """
        logger.info(f"[{self.name}] Executing pre-reasoning retrieval for context.")
        # Filter metadata by org_id if necessary, or globally available knowledge
        filter_meta = {"org_id": org_id} if org_id else None
        
        chunks = self.search_engine.search(prompt, filter_meta=filter_meta, top_k=3)
        if not chunks:
            return ""
            
        context_str = "\n\n--- ENTERPRISE KNOWLEDGE CONTEXT ---\n"
        for i, chunk in enumerate(chunks):
            source = chunk.metadata.source
            doc_type = chunk.metadata.doc_type
            context_str += f"[Source {i+1}: {source} ({doc_type})]\n{chunk.content}\n\n"
        context_str += "--- END CONTEXT ---\n"
        
        return context_str
            
    def execute(self, prompt: str, context: SharedContext) -> Dict[str, Any]:
        """
        Executes the agent reasoning loop with Guardrails, Policies, and Metrics.
        """
        start_time = time.time()
        
        # 1. Access Control
        if not AgentAccessPolicy.can_access(self.name, context.auth.role):
            metrics_tracker.track_execution(self.name, 0, 0, False)
            return {"status": "failed", "message": "Access Denied by Policy"}
            
        # 2. Input Guardrails
        safe, msg = GuardrailScanner.scan_input(prompt)
        if not safe:
            metrics_tracker.track_execution(self.name, 0, 0, False)
            return {"status": "failed", "message": msg}
            
        # 3. Pre-reasoning Context (RAG)
        retrieved_context = self.pre_reasoning_retrieval(prompt, context.auth.org_id)
        enriched_prompt = f"{retrieved_context}\nUser Request: {prompt}" if retrieved_context else prompt
        
        # 4. Model Execution (Simulated)
        # In a real execution, we'd count actual tokens returned by the LLM
        simulated_tokens = len(enriched_prompt.split()) + 150 
        
        # 5. Output Guardrails
        simulated_output = f"Processed by {self.name}"
        safe_out, msg_out = GuardrailScanner.scan_output(simulated_output)
        if not safe_out:
            metrics_tracker.track_execution(self.name, simulated_tokens, (time.time() - start_time) * 1000, False)
            return {"status": "failed", "message": msg_out}
            
        # 6. Track Metrics
        latency = (time.time() - start_time) * 1000
        metrics_tracker.track_execution(self.name, simulated_tokens, latency, True)
        
        return {
            "agent": self.name,
            "status": "success",
            "message": simulated_output,
            "retrieved_context_used": bool(retrieved_context),
            "raw_prompt": prompt,
            "context_used": context.correlation_id,
            "tokens": simulated_tokens,
            "latency_ms": latency
        }
