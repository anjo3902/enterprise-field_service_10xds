"""
app/ai/knowledge/service.py
─────────────────────────────────────────────────────────────────────────────
KnowledgeService — semantic retrieval over the taxonomy and enterprise policies.
Used by KnowledgeAgent, AssetAgent, and MaintenanceAgent.
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from app.ai.knowledge.taxonomy import (
    DOMAIN_TAXONOMY, FAULT_TAXONOMY, ENTERPRISE_POLICIES, MAINTENANCE_RULES
)
from app.ai.utils.logger import get_logger

logger = get_logger("ai.knowledge")


class KnowledgeService:
    """
    Provides keyword-based retrieval over the enterprise knowledge base.
    Designed to be extended with vector search (e.g., pgvector) for semantic matching.
    """

    def classify_domain(self, text: str) -> Optional[str]:
        """Returns the best-matching domain for a given text."""
        text_lower = text.lower()
        best_domain: Optional[str] = None
        best_score = 0
        for domain, keywords in DOMAIN_TAXONOMY.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > best_score:
                best_score = score
                best_domain = domain
        return best_domain

    def lookup_fault(self, domain: str, fault_text: str) -> Optional[str]:
        """Returns troubleshooting guidance for a known fault."""
        domain_faults = FAULT_TAXONOMY.get(domain, {})
        fault_text_lower = fault_text.lower()
        for fault_key, guidance in domain_faults.items():
            if fault_key.replace("_", " ") in fault_text_lower:
                return guidance
        return None

    def get_policy(self, policy_key: str) -> Optional[str]:
        return ENTERPRISE_POLICIES.get(policy_key)

    def get_maintenance_rule(self, rule_key: str) -> Optional[str]:
        return MAINTENANCE_RULES.get(rule_key)

    def search(self, query: str) -> Dict[str, Any]:
        """
        Unified search across all knowledge sources.
        Returns domain classification, fault guidance, and relevant policies.
        """
        domain = self.classify_domain(query)
        fault_guidance = None
        if domain:
            fault_guidance = self.lookup_fault(domain, query)

        relevant_policies = {
            k: v for k, v in ENTERPRISE_POLICIES.items()
            if any(word in v.lower() for word in query.lower().split())
        }

        relevant_rules = {
            k: v for k, v in MAINTENANCE_RULES.items()
            if domain and domain.lower() in k.lower()
        }

        logger.info(f"Knowledge search for: '{query}' → domain={domain}")
        return {
            "domain": domain,
            "fault_guidance": fault_guidance,
            "relevant_policies": relevant_policies,
            "maintenance_rules": relevant_rules,
        }
