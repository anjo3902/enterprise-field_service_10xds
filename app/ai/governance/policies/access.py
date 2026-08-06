"""
app/ai/governance/policies/access.py
─────────────────────────────────────────────────────────────────────────────
Role-based access control for Agent Invocation.
"""
from typing import List
from app.ai.utils.logger import get_logger

logger = get_logger("ai.governance.access")

class AgentAccessPolicy:
    """Defines which roles can trigger which domain agents."""
    
    # Restrict destructive or high-cost agents to admins or specific roles
    RESTRICTED_AGENTS = {
        "dispatch_agent": ["org_admin", "dispatcher"],
        "vendor_agent": ["org_admin", "procurement"],
        "audit_agent": ["org_admin", "auditor"],
    }

    @classmethod
    def can_access(cls, agent_name: str, user_role: str) -> bool:
        """Returns True if the role is allowed to use the agent."""
        if user_role == "system_admin":
            return True
            
        allowed_roles = cls.RESTRICTED_AGENTS.get(agent_name)
        if allowed_roles and user_role not in allowed_roles:
            logger.warning(f"ACCESS DENIED: Role '{user_role}' attempted to use '{agent_name}'")
            return False
            
        return True
