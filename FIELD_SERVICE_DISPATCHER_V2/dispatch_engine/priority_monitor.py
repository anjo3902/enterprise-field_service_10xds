"""
dispatch_engine/priority_monitor.py — Background critical-request monitor.

Periodically scans Firestore for active critical/urgent requests that have
not yet been evaluated for rerouting.  Uses filtered queries (never a full
collection scan) and marks every evaluated document so it is not revisited.

When conditions warrant (critical arrival **or** load threshold exceeded AND
cooldown has elapsed) the monitor delegates to the DVRP global optimizer.
Otherwise it falls back to per-request ``evaluate_reroute()`` exactly as
before — so behaviour is strictly additive.

Designed to run as a daemon thread started once at server boot.
"""

from __future__ import annotations

import logging
import time
import traceback

from google.cloud.firestore_v1.base_query import FieldFilter

from database import db_client

LOGGER = logging.getLogger(__name__)

# How often the monitor wakes up (seconds).
_POLL_INTERVAL_SECONDS = 5


def _get_db():
    """Shortcut to the Firestore client instance."""
    return db_client._get_db()


def _collect_candidates() -> list[dict]:
    """Return unchecked critical/urgent/high requests from Firestore."""
    db = _get_db()
    coll = db.collection("service_requests")

    # ── Query 1: critical severity, not yet checked ───────────────────────
    try:
        critical_docs = list(
            coll.where(filter=FieldFilter("severity", "==", "critical"))
                .where(filter=FieldFilter("reroute_checked", "==", False))
                .stream()
        )
    except Exception:
        critical_docs = []

    # ── Query 2: status-based (assigned + pending_review) without reroute_checked
    status_docs = []
    for status_val in ("assigned", "pending_review"):
        try:
            docs = list(
                coll.where(filter=FieldFilter("status", "==", status_val))
                    .where(filter=FieldFilter("reroute_checked", "==", False))
                    .stream()
            )
            status_docs.extend(docs)
        except Exception:
            pass

    # Deduplicate by document id
    seen: set[str] = set()
    candidates: list[dict] = []
    for doc in critical_docs + status_docs:
        if doc.id in seen:
            continue
        seen.add(doc.id)
        data = doc.to_dict() or {}
        reassignment_status = str(data.get("reassignment_status") or "").lower()
        if data.get("reassignment_requested") or reassignment_status in {"requested", "pending", "processing"}:
            continue
        sev = str(data.get("severity", "")).lower()
        priority = str(data.get("review_priority", "")).lower()
        if sev in ("critical", "high") or priority in ("critical", "urgent"):
            data["id"] = doc.id
            candidates.append(data)

    return candidates


def _collect_available_technicians() -> list[dict]:
    """Return available technicians from the database for DVRP input."""
    try:
        from dispatch_engine.skill_matcher import get_eligible_technicians_with_fallback
        # Use a broad query — "blockage" + "medium" gives domain-any tier
        # which returns the widest pool.  The DVRP solver handles capacity
        # constraints internally.
        techs, _tier = get_eligible_technicians_with_fallback("blockage", "medium")
        return techs
    except Exception:
        LOGGER.exception("[PRIORITY] Failed to fetch technicians for DVRP")
        return []


def check_for_critical_requests() -> int:
    """Scan for un-checked critical/urgent requests and evaluate rerouting.

    If DVRP conditions are met (critical arrival or load threshold, cooldown
    elapsed) the function runs the global optimizer.  Otherwise it falls
    back to per-request ``evaluate_reroute()``.

    Returns the number of requests evaluated in this cycle.
    """
    # Lazy imports to break circular dependencies.
    from dispatch_engine.reroute_service import evaluate_reroute, apply_dvrp_routes
    from dispatch_engine.dvrp_optimizer import optimize_routes
    from dispatch_engine.route_state_manager import (
        should_optimize,
        record_optimization,
        can_reroute_request,
    )

    candidates = _collect_candidates()
    if not candidates:
        return 0

    LOGGER.info("[PRIORITY] Found %d candidate request(s)", len(candidates))

    has_critical = any(
        str(c.get("severity", "")).lower() == "critical" for c in candidates
    )

    # ── DVRP path ─────────────────────────────────────────────────────────
    if should_optimize(has_critical=has_critical, pending_count=len(candidates)):
        technicians = _collect_available_technicians()
        if technicians:
            print(f"[DVRP] Optimization started — {len(candidates)} requests, {len(technicians)} technicians")
            try:
                dvrp_result = optimize_routes(candidates, technicians)
            except Exception:
                LOGGER.exception("[DVRP] Solver crashed — falling back to greedy dispatch")
                print("[DVRP] Fallback triggered")
                dvrp_result = None

            if dvrp_result is not None:
                record_optimization(dvrp_result)
                updated = apply_dvrp_routes(dvrp_result)
                return updated
            else:
                # Solver returned None → record the attempt so cooldown resets
                record_optimization(None)
                print("[DVRP] Fallback triggered — no feasible DVRP solution")

    # ── Fallback: per-request greedy evaluation ───────────────────────────
    evaluated = 0
    for req in candidates:
        req_id = str(req.get("id", ""))
        if not can_reroute_request(req_id):
            # Mark as checked so we don't revisit
            try:
                db_client.update_service_request(req_id, {"reroute_checked": True})
            except Exception:
                pass
            continue

        try:
            result = evaluate_reroute(req)
            evaluated += 1
            LOGGER.debug("[PRIORITY] Evaluated %s → %s", req_id, result.get("action"))
        except Exception:
            LOGGER.exception("[PRIORITY] Error evaluating request %s", req_id)
            try:
                db_client.update_service_request(req_id, {"reroute_checked": True})
            except Exception:
                pass

    return evaluated


def start_priority_monitor() -> None:
    """Long-running loop — intended to be the target of a daemon thread."""
    LOGGER.info("[PRIORITY] Background priority monitor started (poll every %ds)", _POLL_INTERVAL_SECONDS)
    while True:
        try:
            check_for_critical_requests()
        except Exception:
            print("[REROUTE ERROR]", traceback.format_exc())
        time.sleep(_POLL_INTERVAL_SECONDS)