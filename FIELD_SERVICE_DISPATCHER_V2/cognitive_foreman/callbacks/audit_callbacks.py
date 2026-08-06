"""Before/after model callbacks for pipeline audit logging."""
import logging
from datetime import datetime

LOGGER = logging.getLogger("cognitive_foreman.audit")


def before_agent_callback(callback_context) -> None:
    """Log when each agent in the pipeline starts execution."""
    agent_name = callback_context.agent_name if hasattr(callback_context, 'agent_name') else "unknown"
    LOGGER.info(
        "[AUDIT] Agent '%s' started at %s",
        agent_name,
        datetime.utcnow().isoformat(),
    )
    print(f"[FOREMAN] >>> Agent '{agent_name}' starting...")


def after_agent_callback(callback_context) -> None:
    """Log when each agent in the pipeline completes execution."""
    agent_name = callback_context.agent_name if hasattr(callback_context, 'agent_name') else "unknown"
    LOGGER.info(
        "[AUDIT] Agent '%s' completed at %s",
        agent_name,
        datetime.utcnow().isoformat(),
    )
    print(f"[FOREMAN] <<< Agent '{agent_name}' completed.")
