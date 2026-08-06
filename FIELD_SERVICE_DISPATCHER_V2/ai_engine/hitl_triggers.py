"""
Human-in-the-Loop (HITL) trigger system
Determines when AI results require human expert review

Design intent:
- CRITICAL_REQUIRES_VERIFICATION → Always requires human sign-off before dispatch
- SAFETY_ESCALATION              → High-risk keywords detected (hospital, flooding, sparks, etc.)
- LOW_CONFIDENCE                 → AI is uncertain, human should verify
- INVALID_IMAGE                  → Image rejected by Stage 1 guardrails
- UNLISTED_FAULT                 → Fault not in taxonomy with low confidence

STRICT RULE: Only the 5 keys in VALID_TRIGGERS may appear in hitl_triggers lists.
Any other key is stripped by sanitize_triggers() before storage or API response.
"""

# ─── Canonical trigger enum ───────────────────────────────────────────────────
# These 5 keys are the single source of truth.
# They match what is already stored in the database.

VALID_TRIGGERS = {
    "LOW_CONFIDENCE": (
        "Low Confidence Classification",
        "The AI classification confidence is below the 50% threshold. "
        "A human should verify the fault type and severity before dispatch.",
    ),
    "INVALID_IMAGE": (
        "Invalid Maintenance Image",
        "The submitted image was not recognised as a valid facility maintenance issue. "
        "The request cannot be auto-approved until a valid image or manual override is provided.",
    ),
    "UNLISTED_FAULT": (
        "Unlisted Fault – Low Confidence",
        "The fault type does not appear in the predefined taxonomy and the AI confidence is low. "
        "Admin should confirm the correct fault category before dispatch.",
    ),
    "CRITICAL_REQUIRES_VERIFICATION": (
        "Critical Severity Review",
        "Critical-severity faults require human authorisation before a technician is dispatched, "
        "to prevent incorrect or unsafe assignment.",
    ),
    "SAFETY_ESCALATION": (
        "Safety Escalation",
        "Safety-critical keywords were detected (e.g. hospital, school, flooding, sparks). "
        "Elevated risk — requires immediate human attention before dispatch.",
    ),
}

# Aliases: any code that accidentally uses a renamed key gets mapped back to the original.
_ALIAS_MAP = {
    "LOW_CONFIDENCE_CLASSIFICATION":   "LOW_CONFIDENCE",
    "INVALID_MAINTENANCE_IMAGE":       "INVALID_IMAGE",
    "UNLISTED_FAULT_LOW_CONFIDENCE":   "UNLISTED_FAULT",
    "CRITICAL_SEVERITY_REVIEW":        "CRITICAL_REQUIRES_VERIFICATION",
    "SEVERITY_POLICY_REVIEW":          "CRITICAL_REQUIRES_VERIFICATION",
    # The rogue fallback trigger — always stripped
    "DISPATCH_FALLBACK_REVIEW":        None,
}


def sanitize_triggers(triggers: list) -> list:
    """
    Validate and normalise a list of HITL triggers.

    - Accepts triggers as dicts ({"type": "...", "reason": "..."}) or plain strings.
    - Aliases any variant names back to the canonical 5 keys.
    - Silently drops any trigger whose type is not in VALID_TRIGGERS.

    Call this before persisting to DB or returning triggers in an API response.
    """
    sanitized: list = []
    seen = set()
    for trigger in triggers:
        if isinstance(trigger, dict):
            raw_type = trigger.get("type", "")
        elif isinstance(trigger, str):
            raw_type = trigger
        else:
            continue  # unexpected shape — drop

        canonical = _ALIAS_MAP.get(raw_type, raw_type)  # resolve alias
        if canonical and canonical in VALID_TRIGGERS and canonical not in seen:
            seen.add(canonical)
            if isinstance(trigger, dict):
                sanitized.append({**trigger, "type": canonical})
            else:
                sanitized.append(canonical)
        # else: invalid or duplicate — silently drop

    return sanitized


def requires_human_review(result: dict) -> tuple:
    """
    Analyse a diagnosis result dict and decide if human review is needed.

    Returns:
        (needs_review: bool, triggers: list[dict], priority: str)
        priority: "normal" | "high" | "urgent"
    """
    triggers = []
    priority = "normal"

    confidence = float(result.get("confidence") or 0.5)

    # Trigger 1 — Low confidence classification
    if confidence < 0.50:
        triggers.append({
            "type": "LOW_CONFIDENCE",
            "value": confidence,
            "reason": (
                f"AI confidence ({confidence:.0%}) is below the 50% threshold — "
                "human verification recommended."
            ),
        })

    # Trigger 2 — Invalid maintenance image
    if result.get("is_valid_maintenance_image") is False:
        triggers.append({
            "type": "INVALID_IMAGE",
            "reason": result.get(
                "rejection_reason",
                "Image not recognised as a valid maintenance issue.",
            ),
        })
        priority = "high"

    # Trigger 3 — Unlisted fault (OTHER_*) with low confidence
    fault_type = result.get("fault_type") or ""
    if fault_type.startswith("OTHER_") and confidence < 0.60:
        triggers.append({
            "type": "UNLISTED_FAULT",
            "value": fault_type,
            "reason": "Fault type is not in the predefined taxonomy and confidence is low.",
        })

    # Trigger 4 — Critical severity (intentional safety gate)
    # Guard: only add once even if called multiple times
    if result.get("final_severity") == "critical" and not any(
        t.get("type") == "CRITICAL_REQUIRES_VERIFICATION" for t in triggers
    ):
        triggers.append({
            "type": "CRITICAL_REQUIRES_VERIFICATION",
            "reason": (
                "Critical severity faults require human authorisation "
                "before technician dispatch."
            ),
        })
        priority = "urgent"

    # Trigger 5 — Safety escalation keywords
    if result.get("safety_escalation"):
        severity = result.get("final_severity", "medium")
        if severity == "critical":
            triggers.append({
                "type": "SAFETY_ESCALATION",
                "keywords": result.get("detected_keywords", []),
                "reason": (
                    "Safety-critical keywords detected — elevated risk "
                    "requiring immediate attention."
                ),
            })
            priority = "urgent"

    # Final pass: sanitize (resolves aliases, strips invalid) + deduplicates by type
    triggers = sanitize_triggers(triggers)
    needs_review = len(triggers) > 0

    return needs_review, triggers, priority


def generate_review_message(triggers: list, priority: str) -> str:
    """Generate human-readable message for the review queue."""
    if not triggers:
        return "No review required"

    priority_labels = {"normal": "[INFO]", "high": "[WARNING]", "urgent": "[URGENT]"}
    label = priority_labels.get(priority, "[INFO]")
    message = f"{label} Human Review Required (Priority: {priority.upper()})\n\n"

    for i, trigger in enumerate(triggers, 1):
        t_type = trigger["type"] if isinstance(trigger, dict) else trigger
        reason = trigger.get("reason", "") if isinstance(trigger, dict) else ""
        title, _ = VALID_TRIGGERS.get(t_type, (t_type.replace("_", " ").title(), ""))
        message += f"{i}. {title}\n"
        if reason:
            message += f"   - {reason}\n"
        message += "\n"

    return message


def get_review_priority_score(priority: str, num_triggers: int) -> int:
    """Calculate numeric priority score for queue ordering (higher = more urgent)."""
    priority_weights = {"urgent": 100, "high": 50, "normal": 10}
    return priority_weights.get(priority, 10) + num_triggers * 5


def should_auto_approve(result: dict) -> bool:
    """
    Return True only if ALL conditions are met:
    - High confidence (>= 0.80)
    - Not critical severity
    - Valid maintenance image
    - Listed fault type (not OTHER_*)
    - No corrections applied
    - No safety escalation
    """
    checks = [
        float(result.get("confidence") or 0) >= 0.80,
        result.get("final_severity") not in ["critical"],
        result.get("is_valid_maintenance_image", True) is True,
        not (result.get("fault_type") or "").startswith("OTHER_"),
        not result.get("correction_applied", False),
        not result.get("safety_escalation", False),
    ]
    return all(checks)
