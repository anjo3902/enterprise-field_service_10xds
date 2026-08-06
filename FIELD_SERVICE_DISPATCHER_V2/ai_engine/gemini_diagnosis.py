"""
Simplified 2-Stage Diagnosis Pipeline for EFS Facilities
Stage 1: Image validation + Domain + Fault classification (single call)
Stage 2: Severity assessment

Design philosophy:
- Only 2 API calls instead of 4 (faster, more reliable)
- No response_mime_type constraint (thinking model needs freedom)
- Generous max_output_tokens (thinking tokens eat into budget)
- Robust JSON extraction handles any model output format
- Validators + HITL + Safety escalation still fully active
"""
from vertexai.generative_models import Part, Image, GenerationConfig, HarmCategory, HarmBlockThreshold
from config.gcp_config import gemini_model
import json
import re
import hashlib
import time

from ai_engine.fault_taxonomy import FAULT_TAXONOMY, get_domain_faults
from ai_engine.validators import (
    validate_fault_type,
    validate_json_structure,
    apply_safety_escalation
)
from ai_engine.hitl_triggers import requires_human_review
from ai_engine.prompts.master_prompt import (
    get_combined_classification_prompt,
    get_combined_severity_prompt,
)


# ============================================================================
# SAFETY SETTINGS (block nothing - maintenance images can look hazardous)
# ============================================================================

SAFETY_SETTINGS = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE
}


# ============================================================================
# CACHE
# ============================================================================

_diagnosis_cache = {}

try:
    from google.api_core.exceptions import ResourceExhausted, TooManyRequests, ServiceUnavailable
except Exception:
    ResourceExhausted = TooManyRequests = ServiceUnavailable = tuple()


def _is_retryable_gemini_error(exc: Exception) -> bool:
    if ResourceExhausted and isinstance(exc, ResourceExhausted):
        return True
    if TooManyRequests and isinstance(exc, TooManyRequests):
        return True
    if ServiceUnavailable and isinstance(exc, ServiceUnavailable):
        return True

    message = str(exc).lower()
    retryable_markers = [
        "resource exhausted",
        "too many requests",
        "rate limit",
        "quota",
        "429",
        "service unavailable",
        "temporarily unavailable",
    ]
    return any(marker in message for marker in retryable_markers)


def _generate_with_retry(parts, generation_config, safety_settings, max_attempts: int = 4):
    last_error = None

    for attempt in range(1, max_attempts + 1):
        try:
            return gemini_model.generate_content(
                parts,
                generation_config=generation_config,
                safety_settings=safety_settings
            )
        except Exception as exc:
            last_error = exc
            if (not _is_retryable_gemini_error(exc)) or attempt == max_attempts:
                raise

            backoff_seconds = 1.0 * (2 ** (attempt - 1))
            print(f"  Gemini busy (attempt {attempt}/{max_attempts}): retrying in {backoff_seconds:.1f}s")
            time.sleep(backoff_seconds)

    raise last_error

def _get_image_hash(image_path: str) -> str:
    try:
        with open(image_path, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()
    except:
        return ""


# ============================================================================
# RESPONSE TEXT EXTRACTION
# ============================================================================

def _get_response_text(response) -> str:
    """Extract text from Gemini response, handling partial/truncated output."""
    try:
        text = response.text
        if text and text.strip():
            return text
    except Exception:
        pass

    # Dig into candidates for partial text
    try:
        if response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and candidate.content:
                if hasattr(candidate.content, 'parts') and candidate.content.parts:
                    parts_text = ""
                    for part in candidate.content.parts:
                        if hasattr(part, 'text') and part.text:
                            parts_text += part.text
                    if parts_text.strip():
                        return parts_text
    except Exception:
        pass

    raise ValueError("Model produced no output text")


# ============================================================================
# JSON EXTRACTION (robust - handles all model output patterns)
# ============================================================================

def _extract_json(text: str) -> dict:
    """Extract JSON from model response. Handles pure JSON, markdown-wrapped, and text+JSON."""
    if not text:
        raise ValueError("Empty response")

    text = text.strip()

    # 1. Markdown code blocks
    md = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if md:
        try:
            return json.loads(md.group(1))
        except json.JSONDecodeError:
            pass

    # 2. Pure JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 3. Find JSON object in text using bracket matching
    for i, c in enumerate(text):
        if c == '{':
            depth = 0
            in_str = False
            esc = False
            for j in range(i, len(text)):
                ch = text[j]
                if esc:
                    esc = False
                    continue
                if ch == '\\' and in_str:
                    esc = True
                    continue
                if ch == '"':
                    in_str = not in_str
                elif not in_str:
                    if ch == '{':
                        depth += 1
                    elif ch == '}':
                        depth -= 1
                        if depth == 0:
                            try:
                                return json.loads(text[i:j+1])
                            except json.JSONDecodeError:
                                break

    raise ValueError(f"No JSON found. Response: {text[:300]}")


# ============================================================================
# BUILD CLASSIFICATION PROMPT (Stage 1 - single call)
# ============================================================================

def _build_classification_prompt(description: str) -> str:
    """
    Single prompt that validates image AND classifies domain + fault.
    Replaces the old 3-call pipeline (Stage 1 + 2A + 2B).
    """
    return get_combined_classification_prompt(description)


# ============================================================================
# BUILD SEVERITY PROMPT (Stage 2)
# ============================================================================

def _build_severity_prompt(fault_type: str, domain: str, description: str) -> str:
    """Severity assessment prompt."""
    return get_combined_severity_prompt(fault_type, domain, description)


# Confidence thresholds for maximum allowed severity.
# This acts as a guardrail against occasional false high/critical predictions.
SEVERITY_CONFIDENCE_THRESHOLDS = {
    "critical": 0.90,
    "high": 0.75,
    "medium": 0.50,
    "low": 0.00,
}


def _apply_confidence_severity_threshold(result: dict) -> dict:
    """
    Apply confidence-based severity guardrail.

    Rule:
    - model confidence < 0.50  -> max allowed severity: low
    - 0.50 to <0.75            -> max allowed severity: medium
    - 0.75 to <0.90            -> max allowed severity: high
    - >=0.90                   -> critical allowed

    This function only downgrades severity (never upgrades it).
    """
    severity_rank = {
        "low": 0,
        "medium": 1,
        "high": 2,
        "critical": 3,
    }

    confidence = float(result.get("confidence", 0.5))
    model_severity = str(result.get("final_severity", "medium")).lower()
    max_allowed_severity = "low"

    if confidence >= SEVERITY_CONFIDENCE_THRESHOLDS["critical"]:
        max_allowed_severity = "critical"
    elif confidence >= SEVERITY_CONFIDENCE_THRESHOLDS["high"]:
        max_allowed_severity = "high"
    elif confidence >= SEVERITY_CONFIDENCE_THRESHOLDS["medium"]:
        max_allowed_severity = "medium"

    if severity_rank.get(model_severity, 1) > severity_rank[max_allowed_severity]:
        original_severity = model_severity
        result["final_severity"] = max_allowed_severity

        # Keep component severities consistent with guarded final severity.
        image_sev = str(result.get("image_severity", max_allowed_severity)).lower()
        desc_sev = str(result.get("description_severity", max_allowed_severity)).lower()
        if severity_rank.get(image_sev, 1) > severity_rank[max_allowed_severity]:
            result["image_severity"] = max_allowed_severity
        if desc_sev != "n/a" and severity_rank.get(desc_sev, 1) > severity_rank[max_allowed_severity]:
            result["description_severity"] = max_allowed_severity

        threshold_note = (
            f" | Threshold adjustment: confidence={confidence:.2f} "
            f"capped severity from {original_severity} to {max_allowed_severity}"
        )
        result["final_reasoning"] = (result.get("final_reasoning") or "") + threshold_note
        result["reason"] = (result.get("reason") or result.get("final_reasoning", "")) + threshold_note

        print(
            "  Threshold guard: "
            f"{original_severity.upper()} -> {max_allowed_severity.upper()} "
            f"(confidence={confidence:.2f})"
        )

    return result


# ============================================================================
# STAGE 1: CLASSIFY (validation + domain + fault in one call)
# ============================================================================

def _stage1_classify(image_path: str, description: str) -> dict:
    """Single API call: validates image + classifies domain + fault."""
    print("  Stage 1: Classifying image...")

    image = Image.load_from_file(image_path)
    prompt = _build_classification_prompt(description)

    config = GenerationConfig(
        temperature=0.1,
        top_p=0.85,
        top_k=20,
        max_output_tokens=8192,
        candidate_count=1
    )

    response = _generate_with_retry(
        [prompt, Part.from_image(image)],
        generation_config=config,
        safety_settings=SAFETY_SETTINGS
    )

    text = _get_response_text(response)
    print(f"  Raw response: {text[:300]}")

    result = _extract_json(text)

    # Parse is_valid
    is_valid = result.get('is_valid', True)
    if isinstance(is_valid, str):
        is_valid = is_valid.lower() in ['true', 'yes', '1']

    if not is_valid:
        return {
            "is_valid": False,
            "rejection_reason": result.get('rejection_reason', 'Not a valid maintenance image')
        }

    # Parse domain
    domain = str(result.get('domain', '')).upper().strip()
    valid_domains = ["PLUMBING", "ELECTRICAL", "FIRE_SAFETY", "HVAC", "MECHANICAL"]

    if domain not in valid_domains:
        # Try substring match
        found = next((d for d in valid_domains if d in domain), None)
        if found:
            domain = found
        else:
            # Description-based fallback
            desc_lower = description.lower()
            if any(w in desc_lower for w in ['water', 'flood', 'leak', 'drain', 'pipe', 'sewage', 'toilet', 'sink', 'blockage', 'overflow']):
                domain = "PLUMBING"
            elif any(w in desc_lower for w in ['electric', 'wire', 'power', 'outlet', 'spark', 'light', 'panel']):
                domain = "ELECTRICAL"
            elif any(w in desc_lower for w in ['fire', 'smoke', 'alarm', 'sprinkler', 'extinguisher']):
                domain = "FIRE_SAFETY"
            elif any(w in desc_lower for w in ['hvac', 'ac ', 'air condition', 'heat', 'vent', 'duct', 'cooling', 'thermostat']):
                domain = "HVAC"
            else:
                domain = "MECHANICAL"
            print(f"  Domain corrected via description: {domain}")

    # Parse fault type
    fault_type = result.get('fault_type') or result.get('fault', f'OTHER_{domain}')
    fault_type = str(fault_type).strip()
    confidence = float(result.get('confidence', 0.8))

    # Validate fault type against taxonomy
    validation = validate_fault_type(fault_type, domain)
    correction_applied = validation["correction_applied"]
    original_fault_type = validation["original"] if correction_applied else None
    fault_type = validation["fault_type"]

    if correction_applied:
        print(f"  Fault corrected: {original_fault_type} -> {fault_type}")

    print(f"  Result: {domain} / {fault_type} (conf: {confidence:.2f})")

    return {
        "is_valid": True,
        "domain": domain,
        "fault_type": fault_type,
        "confidence": confidence,
        "is_listed_fault": not fault_type.startswith('OTHER_'),
        "correction_applied": correction_applied,
        "original_fault_type": original_fault_type,
        "reasoning": result.get('reasoning', '')
    }


# ============================================================================
# STAGE 2: SEVERITY ASSESSMENT
# ============================================================================

def _stage2_severity(image_path: str, description: str, fault_type: str, domain: str) -> dict:
    """Single API call: severity + safety assessment."""
    print("  Stage 2: Assessing severity...")

    image = Image.load_from_file(image_path)
    prompt = _build_severity_prompt(fault_type, domain, description)

    config = GenerationConfig(
        temperature=0.2,
        top_p=0.9,
        top_k=40,
        max_output_tokens=8192,
        candidate_count=1
    )

    response = _generate_with_retry(
        [prompt, Part.from_image(image)],
        generation_config=config,
        safety_settings=SAFETY_SETTINGS
    )

    text = _get_response_text(response)
    print(f"  Raw response: {text[:300]}")

    result = _extract_json(text)

    # Normalize severity fields
    if 'final_severity' not in result and 'severity' in result:
        result['final_severity'] = result['severity']

    result.setdefault('final_severity', 'medium')
    result.setdefault('image_severity', result['final_severity'])
    result.setdefault('description_severity', result['final_severity'])
    result.setdefault('safety_score', 2)
    result.setdefault('operational_impact', 2)
    result.setdefault('escalation_risk', 2)
    result.setdefault('confidence', 0.8)
    result.setdefault('final_reasoning', 'Assessed from image and description')
    result.setdefault('image_reasoning', '')
    result.setdefault('description_reasoning', '')
    result.setdefault('safety_escalation', False)
    result.setdefault('detected_keywords', [])

    # Post-process: validate structure + confidence threshold + safety escalation
    result = validate_json_structure(result)
    result = _apply_confidence_severity_threshold(result)
    result = apply_safety_escalation(result, description)

    print(f"  Result: {result['final_severity'].upper()} (safety_escalation={result['safety_escalation']})")

    return result


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def analyze_fault(image_path: str, description: str) -> dict:
    """
    2-Stage AI Diagnosis Pipeline.
    
    Stage 1: Validates image + classifies domain + fault (single API call)
    Stage 2: Assesses severity + safety (single API call)
    
    Total: 2 Gemini API calls (fast and reliable)
    """
    print("\n" + "="*60)
    print("  AI Diagnosis Pipeline (2-Stage)")
    print("="*60)

    # Check cache
    cache_key = f"{_get_image_hash(image_path)}_{description}"
    if cache_key in _diagnosis_cache:
        print("  Using cached result")
        return _diagnosis_cache[cache_key]

    # ── STAGE 1: Classification ──
    stage1 = _stage1_classify(image_path, description)

    if not stage1.get("is_valid", True):
        rejection_reason = stage1.get("rejection_reason", "Not a valid maintenance image")
        print(f"\n  REJECTED: {rejection_reason}")
        return {
            "fault_type": "INVALID_IMAGE",
            "domain": "NONE",
            "image_severity": "none",
            "description_severity": "none",
            "final_severity": "none",
            "confidence": 0.95,
            "reason": rejection_reason,
            "final_reasoning": rejection_reason,
            "is_valid_maintenance_image": False,
            "rejection_reason": rejection_reason,
            "requires_human_review": False,
            "hitl_triggers": ["INVALID_IMAGE"],
            "review_priority": "none",
            "safety_escalation": False,
            "detected_keywords": [],
            "safety_score": 0,
            "operational_impact": 0,
            "escalation_risk": 0
        }

    domain = stage1["domain"]
    fault_type = stage1["fault_type"]

    # ── STAGE 2: Severity ──
    stage2 = _stage2_severity(image_path, description, fault_type, domain)

    # ── Build final result ──
    final_result = {
        "fault_type": fault_type,
        "domain": domain,
        "image_severity": stage2["image_severity"],
        "description_severity": stage2["description_severity"],
        "final_severity": stage2["final_severity"],
        "confidence": stage1.get("confidence", 0.8),
        "reason": stage2.get("final_reasoning", ""),

        "is_valid_maintenance_image": True,
        "is_listed_fault": stage1.get("is_listed_fault", True),
        "correction_applied": stage1.get("correction_applied", False),
        "original_fault_type": stage1.get("original_fault_type"),
        "safety_escalation": stage2.get("safety_escalation", False),
        "detected_keywords": stage2.get("detected_keywords", []),

        "domain_reasoning": stage1.get("reasoning", ""),
        "fault_reasoning": stage1.get("reasoning", ""),
        "image_reasoning": stage2.get("image_reasoning", ""),
        "description_reasoning": stage2.get("description_reasoning", ""),
        "final_reasoning": stage2.get("final_reasoning", ""),

        "safety_score": stage2.get("safety_score", 0),
        "operational_impact": stage2.get("operational_impact", 0),
        "escalation_risk": stage2.get("escalation_risk", 0)
    }

    # ── HITL evaluation ──
    needs_review, triggers, priority = requires_human_review(final_result)
    final_result["requires_human_review"] = needs_review
    final_result["hitl_triggers"] = [t["type"] for t in triggers]
    final_result["hitl_trigger_details"] = triggers
    final_result["review_priority"] = priority

    if needs_review:
        print(f"\n  HITL: {priority.upper()} - {', '.join(final_result['hitl_triggers'])}")
    else:
        print(f"\n  Auto-approved (high confidence)")

    print("="*60 + "\n")

    # Cache
    _diagnosis_cache[cache_key] = final_result
    return final_result