"""Tool wrappers for Human-in-the-Loop trigger evaluation."""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai_engine.hitl_triggers import requires_human_review, sanitize_triggers


def evaluate_hitl_triggers(diagnosis_result: dict) -> dict:
    """Evaluate whether an AI diagnosis result requires human review.

    Checks for 5 trigger types:
    - LOW_CONFIDENCE: AI confidence below 50%
    - INVALID_IMAGE: Image not recognized as maintenance issue
    - UNLISTED_FAULT: Fault not in taxonomy + low confidence
    - CRITICAL_REQUIRES_VERIFICATION: Critical severity needs human sign-off
    - SAFETY_ESCALATION: High-risk keywords detected (hospital, flooding, sparks, etc.)

    Args:
        diagnosis_result: Full diagnosis dict from the triage agent.

    Returns:
        dict with:
        - requires_human_review: bool
        - triggers: list of trigger dicts (sanitized)
        - review_priority: "normal"|"high"|"urgent"
        - decision: "proceed" if no review needed, "hold_for_review" if review required
    """
    needs_review, triggers, priority = requires_human_review(diagnosis_result)
    clean_triggers = sanitize_triggers(triggers)

    return {
        "requires_human_review": needs_review,
        "triggers": clean_triggers,
        "review_priority": priority,
        "decision": "hold_for_review" if needs_review else "proceed",
    }
