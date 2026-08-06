"""
app/ai/reflection/engine.py
─────────────────────────────────────────────────────────────────────────────
ReflectionEngine — validates agent outputs, scores confidence, and triggers retry.
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
from app.ai.utils.logger import get_logger

logger = get_logger("ai.reflection")


class ReflectionResult:
    def __init__(
        self,
        is_valid: bool,
        confidence: float,
        issues: List[str],
        should_retry: bool,
        corrected_payload: Optional[Dict[str, Any]] = None,
    ):
        self.is_valid = is_valid
        self.confidence = confidence
        self.issues = issues
        self.should_retry = should_retry
        self.corrected_payload = corrected_payload

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "confidence": self.confidence,
            "issues": self.issues,
            "should_retry": self.should_retry,
        }


class ReflectionEngine:
    """
    Post-execution validator for each agent step.
    Checks tool output for consistency and completeness before the Supervisor proceeds.
    """

    def reflect(
        self,
        agent_name: str,
        tool_output: Dict[str, Any],
        expected_keys: List[str],
        correlation_id: str,
    ) -> ReflectionResult:
        issues: List[str] = []
        confidence = 1.0

        # 1. Check for explicit error signals
        if tool_output.get("error"):
            issues.append(f"Tool returned error: {tool_output.get('message', 'unknown')}")
            confidence -= 0.5

        # 2. Validate expected keys are present
        for key in expected_keys:
            if key not in tool_output:
                issues.append(f"Missing expected output key: '{key}'")
                confidence -= 0.1

        # 3. Check for empty data where data is required
        data = tool_output.get("data")
        if data is not None and isinstance(data, list) and len(data) == 0:
            issues.append("Tool returned empty dataset — may indicate a filtering issue.")
            confidence -= 0.1

        confidence = max(0.0, round(confidence, 2))
        is_valid = confidence >= 0.6 and not tool_output.get("error")
        should_retry = not is_valid and confidence > 0.2  # Retry if salvageable

        if issues:
            logger.warning(
                f"[{agent_name}] Reflection issues: {issues}",
                extra={"correlation_id": correlation_id}
            )
        else:
            logger.info(
                f"[{agent_name}] Reflection PASSED. Confidence={confidence}",
                extra={"correlation_id": correlation_id}
            )

        return ReflectionResult(
            is_valid=is_valid,
            confidence=confidence,
            issues=issues,
            should_retry=should_retry,
        )
