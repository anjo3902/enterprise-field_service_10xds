"""
app/ai/knowledge/taxonomy.py
─────────────────────────────────────────────────────────────────────────────
Domain and fault taxonomies, enterprise policies — structured lookup registries.
"""

from __future__ import annotations
from typing import Dict, List


# ── Domain Taxonomy ───────────────────────────────────────────────────────────
DOMAIN_TAXONOMY: Dict[str, List[str]] = {
    "HVAC": ["air conditioning", "heating", "ventilation", "cooling tower", "chiller"],
    "Electrical": ["power", "generator", "UPS", "circuit breaker", "wiring", "lighting"],
    "Plumbing": ["water", "pipe", "pump", "drainage", "sewage", "leak"],
    "Civil": ["structural", "roofing", "flooring", "painting", "carpentry"],
    "Security": ["CCTV", "access control", "fire alarm", "intrusion", "biometric"],
    "IT/AV": ["server", "network", "projector", "display", "audio", "video conferencing"],
    "Elevator": ["lift", "escalator", "elevator", "cabin"],
    "Cleaning": ["janitorial", "housekeeping", "waste", "sanitation"],
}

# ── Fault Taxonomy ─────────────────────────────────────────────────────────────
FAULT_TAXONOMY: Dict[str, Dict[str, str]] = {
    "HVAC": {
        "not_cooling": "Possible causes: Refrigerant leak, dirty filter, compressor failure.",
        "noise": "Possible causes: Loose components, bearing failure, debris in unit.",
        "not_heating": "Possible causes: Heater element failure, thermostat fault.",
    },
    "Electrical": {
        "power_outage": "Check main breaker, contact utility. If partial — check sub-panel.",
        "tripping": "Overload or earth fault. Inspect load distribution.",
    },
    "Plumbing": {
        "leak": "Isolate water supply. Mark area hazardous. Contact licensed plumber.",
        "no_water": "Check main valve, pump status, and storage tank level.",
    },
}

# ── Enterprise Policies ────────────────────────────────────────────────────────
ENTERPRISE_POLICIES: Dict[str, str] = {
    "priority_escalation":
        "Any ticket unresolved after SLA breach must be escalated to Org Manager and Supervisor.",
    "vendor_sla":
        "Vendors must respond within 2 hours for Critical tickets and 8 hours for High tickets.",
    "safety_isolation":
        "Electrical work requires permit-to-work and isolation certificate before commencement.",
    "asset_downtime":
        "Any critical asset downtime > 4 hours requires a Root Cause Analysis report within 24h.",
}

# ── Maintenance Rules ──────────────────────────────────────────────────────────
MAINTENANCE_RULES: Dict[str, str] = {
    "HVAC_filter":        "Replace filters every 3 months or when pressure differential exceeds threshold.",
    "generator_service":  "Full service every 500 operating hours or 6 months, whichever comes first.",
    "fire_suppression":   "Inspect fire suppression systems monthly; annual third-party certification.",
    "lift_inspection":    "Passenger lifts require annual statutory inspection by certified authority.",
}
