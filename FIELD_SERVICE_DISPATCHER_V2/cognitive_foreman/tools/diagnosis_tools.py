"""Tool wrappers for AI diagnosis functions."""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai_engine.diagnosis_engine import DiagnosisEngine

_engine = DiagnosisEngine()


def run_diagnosis(image_path: str, description: str) -> dict:
    """Run the 2-stage AI diagnosis pipeline on a maintenance image.

    Stage 1: Validates the image and classifies domain + fault type.
    Stage 2: Assesses severity level (low/medium/high/critical).

    Args:
        image_path: Absolute file path to the uploaded maintenance image.
        description: Customer's text description of the issue.

    Returns:
        dict with keys: fault_type, domain, final_severity, confidence,
        is_valid_maintenance_image, requires_human_review, hitl_triggers,
        review_priority, recommended_technician, reason, and detailed reasoning fields.
    """
    result = _engine.diagnose(image_path, description)
    return result
