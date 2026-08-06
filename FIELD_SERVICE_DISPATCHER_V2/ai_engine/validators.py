"""
Post-processing validation, fault correction, and safety escalation
"""
from difflib import SequenceMatcher
from ai_engine.fault_taxonomy import FAULT_CLASSES, get_domain_faults


def validate_fault_type(fault_type: str, domain: str = None) -> dict:
    """
    Validate that fault_type exists in predefined taxonomy.
    If not found, attempt fuzzy matching then fall back to OTHER_ category.

    Returns:
        dict with validated fault_type and correction metadata
    """
    if not fault_type or fault_type.strip() == "":
        other = f"OTHER_{domain}" if domain else "OTHER_MECHANICAL"
        return {
            "fault_type": other,
            "is_valid": False,
            "correction_applied": True,
            "original": fault_type or "",
            "similarity": 0.0
        }

    fault_type = fault_type.strip()

    # Get valid fault list for this domain (or all faults)
    valid_faults = get_domain_faults(domain) if domain else FAULT_CLASSES

    # 1. Exact match
    if fault_type in valid_faults:
        return {
            "fault_type": fault_type,
            "is_valid": True,
            "correction_applied": False,
            "original": fault_type
        }

    # 2. Case-insensitive exact match
    fault_lower = fault_type.lower()
    for vf in valid_faults:
        if vf.lower() == fault_lower:
            return {
                "fault_type": vf,
                "is_valid": True,
                "correction_applied": True,
                "original": fault_type,
                "similarity": 1.0
            }

    # 3. Fuzzy matching with lowered threshold (0.65 instead of 0.8)
    # This catches model variants like "overflowing_toilet" → "toilet_overflow"
    best_match, similarity = find_closest_match(fault_type, valid_faults)

    if similarity >= 0.65:
        return {
            "fault_type": best_match,
            "is_valid": True,
            "correction_applied": True,
            "original": fault_type,
            "similarity": similarity
        }

    # 4. Word overlap matching - check if key words from fault_type appear in any valid fault
    fault_words = set(fault_lower.replace("_", " ").split())
    best_overlap = None
    best_overlap_score = 0.0
    for vf in valid_faults:
        vf_words = set(vf.lower().replace("_", " ").split())
        if fault_words and vf_words:
            overlap = len(fault_words & vf_words) / max(len(fault_words), len(vf_words))
            if overlap > best_overlap_score and overlap >= 0.5:
                best_overlap_score = overlap
                best_overlap = vf

    if best_overlap:
        return {
            "fault_type": best_overlap,
            "is_valid": True,
            "correction_applied": True,
            "original": fault_type,
            "similarity": best_overlap_score
        }

    # 5. Fall back to OTHER_ category
    other_category = f"OTHER_{domain}" if domain else "OTHER_MECHANICAL"
    return {
        "fault_type": other_category,
        "is_valid": False,
        "correction_applied": True,
        "original": fault_type,
        "similarity": similarity
    }


def find_closest_match(text: str, options: list) -> tuple:
    """
    Find closest matching string using fuzzy matching.

    Returns:
        (best_match, similarity_score)
    """
    if not options:
        return (None, 0.0)

    best_match = options[0]
    best_score = 0.0

    for option in options:
        score = SequenceMatcher(None, text.lower(), option.lower()).ratio()
        if score > best_score:
            best_score = score
            best_match = option

    return (best_match, best_score)


def validate_severity(severity: str) -> str:
    """Validate severity is one of the allowed values."""
    valid_severities = ["low", "medium", "high", "critical"]

    if not severity:
        return "medium"

    sev_lower = severity.lower().strip()
    
    if sev_lower == "n/a":
        return "N/A"
        
    if sev_lower in valid_severities:
        return sev_lower

    # Handle variants
    if "crit" in sev_lower:
        return "critical"
    if "high" in sev_lower or "sever" in sev_lower:
        return "high"
    if "low" in sev_lower or "minor" in sev_lower:
        return "low"

    return "medium"


def validate_confidence(confidence) -> float:
    """Ensure confidence is between 0 and 1."""
    try:
        conf = float(confidence)
        return max(0.0, min(1.0, conf))
    except (ValueError, TypeError):
        return 0.5


def validate_json_structure(result: dict) -> dict:
    """
    Ensure result has all required fields with valid values.
    Preserves all existing fields and only fills missing ones.
    """
    required_fields = {
        "fault_type": "unknown",
        "domain": "MECHANICAL",
        "image_severity": "medium",
        "description_severity": "medium",
        "final_severity": "medium",
        "confidence": 0.5,
        "reason": "Assessment completed",
        "final_reasoning": "Assessment completed",
        "safety_score": 2,
        "operational_impact": 2,
        "escalation_risk": 2,
        "safety_escalation": False,
        "detected_keywords": []
    }

    validated = result.copy()

    # Add missing required fields with defaults
    for field, default in required_fields.items():
        if field not in validated or validated[field] is None:
            validated[field] = default

    # Validate specific field types
    validated["image_severity"] = validate_severity(validated.get("image_severity", "medium"))
    validated["description_severity"] = validate_severity(validated.get("description_severity", "medium"))
    validated["final_severity"] = validate_severity(validated.get("final_severity", "medium"))
    validated["confidence"] = validate_confidence(validated.get("confidence", 0.5))

    # Validate domain
    valid_domains = ["PLUMBING", "ELECTRICAL", "FIRE_SAFETY", "HVAC", "MECHANICAL"]
    if validated.get("domain") not in valid_domains:
        validated["domain"] = "MECHANICAL"

    # Ensure numeric scores are valid (0-5 integer)
    for score_field in ["safety_score", "operational_impact", "escalation_risk"]:
        try:
            score = validated.get(score_field, 2)
            validated[score_field] = max(0, min(5, int(float(score))))
        except (ValueError, TypeError):
            validated[score_field] = 2

    # Ensure boolean fields
    if not isinstance(validated.get("safety_escalation"), bool):
        val = validated.get("safety_escalation", False)
        validated["safety_escalation"] = bool(val) if not isinstance(val, str) else val.lower() == "true"

    # Ensure detected_keywords is a list
    if not isinstance(validated.get("detected_keywords"), list):
        validated["detected_keywords"] = []

    return validated


# Safety keywords that trigger escalation
# NOTE: deliberately excludes generic words like "critical", "urgent", "immediate"
# since those appear in normal maintenance descriptions and over-trigger HITL
ESCALATION_KEYWORDS = [
    # Life-safety locations (very specific)
    "hospital", "school", "clinic", "nursery", "care home", "elderly",

    # Water hazards (specific, not generic "water")
    "flooding", "flooded", "flood", "sewage", "contaminated water",
    "sewage overflow", "raw sewage",

    # Electrical hazards are assessed intelligently by the AI model
    # (Removed 'live wire', 'electric shock', 'arcing', 'fire' which were causing false positive overrides)

    # Fire hazards (specific)
    "fire", "smoke detector failure", "sprinkler failure", "exit blocked",
    "evacuation blocked",

    # Structural/entrapment (specific)
    "ceiling collapse", "wall collapse", "structural failure",
    "people trapped", "trapped in elevator", "trapped",
    "falling debris", "roof collapse",

    # Medical/injury
    "patient", "injury", "injured person", "medical emergency",

    # Gas hazards
    "gas leak", "carbon monoxide", "co leak",
]


def apply_safety_escalation(result: dict, description: str) -> dict:
    """
    Auto-escalate severity if safety-critical keywords detected in:
    - The problem description
    - The identified fault type

    Only escalates to HIGH (not CRITICAL - let the AI decide CRITICAL).
    Always records detected safety keywords for display.
    """
    # Always ensure these keys exist with defaults
    result.setdefault("safety_escalation", False)
    result.setdefault("detected_keywords", [])

    description_lower = description.lower()
    fault_type_lower = result.get("fault_type", "").lower().replace("_", " ")

    # Check description for safety keywords
    detected_keywords = []
    for kw in ESCALATION_KEYWORDS:
        kw_lower = kw.lower()
        if kw_lower in description_lower:
            # Prevent false positives like "no exposed wires"
            if f"no {kw_lower}" not in description_lower and f"not {kw_lower}" not in description_lower and f"without {kw_lower}" not in description_lower:
                detected_keywords.append(kw)
        elif kw_lower in fault_type_lower:
            detected_keywords.append(kw)

    high_risk_faults = {
        "flooding": "flooding",
        "sewage backup": "sewage",
        "burst pipe": "burst pipe",
        "structural damage": "structural damage",
        "elevator stuck": "elevator entrapment"
    }
    for fault_key, label in high_risk_faults.items():
        if fault_key in fault_type_lower and label not in detected_keywords:
            detected_keywords.append(label)

    if detected_keywords:
        severity_levels = {"low": 0, "medium": 1, "high": 2, "critical": 3}
        current_level = severity_levels.get(result.get("final_severity", "medium"), 1)

        # Always mark safety escalation and store keywords
        result["safety_escalation"] = True
        result["detected_keywords"] = list(dict.fromkeys(detected_keywords))

        # Append escalation note to reasoning
        kw_display = ", ".join(result["detected_keywords"][:5])
        current_reasoning = result.get("final_reasoning") or result.get("reason", "")
        escalation_note = f" | Safety escalation triggered by: {kw_display}"
        result["final_reasoning"] = current_reasoning + escalation_note
        result["reason"] = result["final_reasoning"]

    return result
