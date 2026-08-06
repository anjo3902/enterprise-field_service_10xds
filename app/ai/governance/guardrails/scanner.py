"""
app/ai/governance/guardrails/scanner.py
─────────────────────────────────────────────────────────────────────────────
Enterprise Guardrails for Prompt Injection, PII detection, and Unsafe actions.
"""
import re
from typing import Tuple, Optional
from app.ai.utils.logger import get_logger

logger = get_logger("ai.governance.guardrails")

class GuardrailScanner:
    # Basic signatures of injection attempts
    INJECTION_PATTERNS = [
        r"(?i)ignore all previous instructions",
        r"(?i)system prompt",
        r"(?i)bypass restrictions",
        r"(?i)you are now a",
    ]
    
    # Basic PII signatures (SSN, credit cards) for demo
    PII_PATTERNS = [
        r"\b\d{3}-\d{2}-\d{4}\b",  # SSN
        r"\b(?:\d[ -]*?){13,16}\b" # CC
    ]

    @classmethod
    def scan_input(cls, user_intent: str) -> Tuple[bool, Optional[str]]:
        """Scans the user prompt for injection or PII violations."""
        for pattern in cls.INJECTION_PATTERNS:
            if re.search(pattern, user_intent):
                logger.warning(f"GUARDRAIL: Prompt Injection detected: {pattern}")
                return False, "Security Violation: Prompt Injection attempt detected."
                
        for pattern in cls.PII_PATTERNS:
            if re.search(pattern, user_intent):
                logger.warning("GUARDRAIL: PII detected in prompt.")
                return False, "Security Violation: Sensitive Data (PII) detected."
                
        return True, None

    @classmethod
    def scan_output(cls, model_output: str) -> Tuple[bool, Optional[str]]:
        """Scans the generated response before returning it to the user."""
        # Simple loop detection or hallucination filters could go here
        if "ignore all previous instructions" in model_output.lower():
             return False, "Security Violation: Model output generated unsafe instructions."
        return True, None
