"""
app/ai/agents/knowledge_agent.py
─────────────────────────────────────────────────────────────────────────────
Knowledge Agent — semantic retrieval, troubleshooting guides, policy lookups.
"""

from __future__ import annotations
from typing import Any, Dict
from app.ai.agents.base import BaseAgent
from app.ai.prompts.library import PromptLibrary
from app.ai.knowledge.service import KnowledgeService
from app.ai.schemas.context import SharedContext
from app.ai.utils.logger import get_logger

logger = get_logger("ai.agent.knowledge")


class KnowledgeAgent(BaseAgent):

    def __init__(self, context: SharedContext):
        super().__init__(
            name="knowledge_agent",
            system_prompt=PromptLibrary.get_agent_prompt("knowledge"),
            tools=[],  # No backend tools — operates entirely on local knowledge base
        )
        self.context = context
        self.knowledge = KnowledgeService()

    def search_knowledge(self, query: str) -> Dict[str, Any]:
        """Unified search across domain taxonomy, fault guides, and policies."""
        result = self.knowledge.search(query)
        return {
            "agent": self.name,
            "action": "search_knowledge",
            "query": query,
            "domain": result.get("domain"),
            "fault_guidance": result.get("fault_guidance"),
            "relevant_policies": result.get("relevant_policies", {}),
            "maintenance_rules": result.get("maintenance_rules", {}),
        }

    def explain_policy(self, policy_key: str) -> Dict[str, Any]:
        policy = self.knowledge.get_policy(policy_key)
        return {
            "agent": self.name,
            "action": "explain_policy",
            "policy_key": policy_key,
            "policy": policy or "Policy not found in the enterprise knowledge base.",
        }

    def execute(self, prompt: str, context: SharedContext) -> Dict[str, Any]:
        logger.info(f"KnowledgeAgent executing: {prompt[:80]}...",
                    extra={"correlation_id": context.correlation_id})
        result = self.knowledge.search(prompt)
        return {
            "agent": self.name,
            "status": "success",
            "knowledge_result": result,
        }
