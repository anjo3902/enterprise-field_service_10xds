"""Skill-based technician pre-filtering for dispatch optimization."""

from __future__ import annotations

import json
import os
from pathlib import Path
import sys

# Allow running this file directly: python dispatch_engine/skill_matcher.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai_engine.fault_taxonomy import FAULT_TAXONOMY
from database import db_client


def _build_fault_domain_map() -> dict:
    """Create fault-to-domain map from shared AI taxonomy."""
    mapping = {}
    for domain_upper, config in FAULT_TAXONOMY.items():
        domain_lower = domain_upper.lower()
        for fault in config.get("faults", []):
            mapping[fault] = domain_lower
    return mapping


FAULT_DOMAIN_MAP = _build_fault_domain_map()
MAX_ACTIVE_JOBS_PER_TECHNICIAN = int(os.getenv("MAX_ACTIVE_JOBS_PER_TECHNICIAN", "8"))


def get_required_domain(fault_type: str) -> str | None:
    """Resolve required technician domain for a fault type."""
    if not fault_type:
        return None
    normalized_fault = fault_type.strip().lower()
    return FAULT_DOMAIN_MAP.get(normalized_fault)


# ─── Experience upgrade hierarchy ─────────────────────────────────────────────
# Maps severity level to an ordered list of acceptable experience levels.
# First entry = ideal match; subsequent entries = fallback tiers (Tier 1 → N).
_EXPERIENCE_FALLBACK_TIERS: dict[str, list[str]] = {
    "low": [
        "junior technician",   # ideal
        "technician",          # tier-2: overqualified but available
        "senior technician",   # tier-3
        "field engineer",      # tier-4 (last resort)
    ],
    "medium": [
        "technician",          # ideal
        "senior technician",   # tier-2
        "field engineer",      # tier-3
        "junior technician",   # tier-4 (underqualified as very last resort)
    ],
    "high": [
        "senior technician",   # ideal
        "field engineer",      # tier-2
        "technician",          # tier-3
        "junior technician",   # tier-4
    ],
    "critical": [
        "field engineer",      # ideal + critical_fault_eligible=TRUE required
        "senior technician",   # tier-2: eligible if critical_fault_eligible=TRUE
    ],
}


# ─── Firestore-based helpers ─────────────────────────────────────────────────

def _normalize_skills(raw) -> list[str]:
    """Return certified_skills as a list of lowercase strings."""
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return []
    if isinstance(raw, list):
        return [s.strip().lower() for s in raw if isinstance(s, str)]
    return []


def _fetch_eligible_technicians(required_domain: str, fault_type: str) -> list[dict]:
    """
    Fetch available technicians from Firestore for a domain, then filter
    in Python for certified_skills match and capacity.
    """
    techs = db_client.get_available_technicians(required_domain)
    normalized_fault = fault_type.strip().lower()
    result: list[dict] = []

    for tech in techs:
        # Certified skills check
        skills = _normalize_skills(tech.get("certified_skills"))
        if normalized_fault not in skills:
            continue

        # Capacity check
        current_jobs = int(tech.get("current_jobs") or 0)
        max_jobs = int(tech.get("max_jobs_per_day") or 8)
        cap = min(max_jobs, MAX_ACTIVE_JOBS_PER_TECHNICIAN) if MAX_ACTIVE_JOBS_PER_TECHNICIAN > 0 else max_jobs
        if current_jobs >= cap:
            continue

        # Coalesce coordinates (prefer live GPS position)
        tech["latitude"] = tech.get("current_latitude") or tech.get("latitude")
        tech["longitude"] = tech.get("current_longitude") or tech.get("longitude")

        # Backward-compat: jobs_today mirrors current_jobs
        tech["jobs_today"] = current_jobs

        result.append(tech)

    return result


def _apply_sort(technicians: list[dict]) -> list[dict]:
    """Sort: jobs_today ASC, current_jobs ASC, max_jobs_per_day DESC, id ASC."""
    return sorted(
        technicians,
        key=lambda t: (
            int(t.get("jobs_today") or 0),
            int(t.get("current_jobs") or 0),
            -(int(t.get("max_jobs_per_day") or 0)),
            int(t.get("id") or 0),
        ),
    )


def get_eligible_technicians(fault_type: str, severity_level: str) -> list[dict]:
    """
    Return technicians eligible to handle a request.

    Filters applied:
    1) Domain match (primary_domain)
    2) Fault in certified_skills
    3) availability_state = 'available'
    4) jobs_today < max_jobs_per_day
    5) Strict severity-to-experience mapping:
         - low: junior technician
         - medium: technician
         - high: senior technician
         - critical: field engineer + critical_fault_eligible = TRUE
    """
    required_domain = get_required_domain(fault_type)
    if required_domain is None:
        return []

    pool = _fetch_eligible_technicians(required_domain, fault_type)
    normalized_severity = (severity_level or "").strip().lower()

    experience_map = {
        "low": "junior technician",
        "medium": "technician",
        "high": "senior technician",
        "critical": "field engineer",
    }

    required_exp = experience_map.get(normalized_severity)
    if required_exp:
        pool = [t for t in pool if (t.get("experience_level") or "").strip().lower() == required_exp]

    if normalized_severity == "critical":
        pool = [t for t in pool if t.get("critical_fault_eligible")]

    return _apply_sort(pool)


def get_eligible_technicians_with_fallback(
    fault_type: str, severity_level: str
) -> tuple[list[dict], str]:
    """
    Multi-tier dispatch fallback — industry-standard progressive search.

    LEVEL 1 — Exact experience match (strict, same as get_eligible_technicians)
    LEVEL 2 — Relaxed experience levels (upward domain hierarchy per severity)
    LEVEL 3 — Any available technician in the domain (no experience filter)

    For CRITICAL severity Levels 1-3 still enforce critical_fault_eligible = TRUE.

    Returns:
        (technicians: list[dict], tier_used: str)
        tier_used: 'exact' | 'relaxed_<level>' | 'domain_any' | 'none' | 'no_domain'
    """
    required_domain = get_required_domain(fault_type)
    if required_domain is None:
        return [], "no_domain"

    normalized_fault = fault_type.strip().lower()
    normalized_severity = (severity_level or "medium").strip().lower()

    pool = _fetch_eligible_technicians(required_domain, normalized_fault)

    tiers = _EXPERIENCE_FALLBACK_TIERS.get(
        normalized_severity, _EXPERIENCE_FALLBACK_TIERS["medium"]
    )

    # ── Levels 1 & 2: try each acceptable experience level in priority order ──
    for idx, level in enumerate(tiers):
        filtered = [
            t for t in pool
            if (t.get("experience_level") or "").strip().lower() == level
        ]
        if normalized_severity == "critical":
            filtered = [t for t in filtered if t.get("critical_fault_eligible")]

        if filtered:
            label = "exact" if idx == 0 else f"relaxed_{level.replace(' ', '_')}"
            return _apply_sort(filtered), label

    # ── Level 3: domain-only fallback (no experience filter) ─────────────────
    # Critical jobs still require critical_fault_eligible even here.
    fallback = pool
    if normalized_severity == "critical":
        fallback = [t for t in fallback if t.get("critical_fault_eligible")]

    if fallback:
        return _apply_sort(fallback), "domain_any"

    return [], "none"


if __name__ == "__main__":
    example = get_eligible_technicians_with_fallback("burst_pipe", "high")
    print(f"Eligible technicians: {len(example[0])} | Tier: {example[1]}")
    if example[0]:
        print(example[0][0])