"""Tool wrappers for technician skill matching."""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from dispatch_engine.skill_matcher import (
    get_eligible_technicians,
    get_eligible_technicians_with_fallback,
    get_required_domain,
)


def find_eligible_technicians(fault_type: str, severity_level: str) -> dict:
    """Find technicians eligible to handle a service request using multi-tier fallback.

    Applies progressive filtering:
    - Level 1: Exact experience match (e.g., critical -> field engineer)
    - Level 2: Relaxed experience hierarchy (e.g., senior -> field engineer fallback)
    - Level 3: Any available technician in the domain

    For critical severity, all levels enforce critical_fault_eligible=TRUE.

    Args:
        fault_type: The diagnosed fault type (e.g., "burst_pipe", "power_outage").
        severity_level: Severity level ("low", "medium", "high", "critical").

    Returns:
        dict with keys:
        - technicians: list of eligible technician dicts
        - dispatch_tier: str indicating which tier matched ("exact", "relaxed_*", "domain_any", "none")
        - count: number of eligible technicians found
    """
    technicians, tier = get_eligible_technicians_with_fallback(fault_type, severity_level)
    return {
        "technicians": technicians,
        "dispatch_tier": tier,
        "count": len(technicians),
    }


def resolve_fault_domain(fault_type: str) -> dict:
    """Resolve the required technician domain for a given fault type.

    Args:
        fault_type: The fault type string (e.g., "burst_pipe").

    Returns:
        dict with key "domain" (str or None if fault not in taxonomy).
    """
    domain = get_required_domain(fault_type)
    return {"domain": domain}
