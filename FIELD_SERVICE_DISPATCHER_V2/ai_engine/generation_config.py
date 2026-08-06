"""
Generation configuration for 2-stage diagnosis pipeline

Stage 1: Classification (validation + domain + fault) - low temperature, precise
Stage 2: Severity assessment - slightly higher temperature for nuanced reasoning

IMPORTANT: No response_mime_type set. Gemini 2.5-flash is a thinking model
that needs freedom to reason internally. We handle JSON extraction manually.
max_output_tokens is generous (8192) because thinking tokens count toward the limit.
"""

# Stage 1: Classification — precise, deterministic
CLASSIFICATION_CONFIG = {
    "temperature": 0.1,
    "top_p": 0.85,
    "top_k": 20,
    "max_output_tokens": 8192,
    "candidate_count": 1
}

# Stage 2: Severity — slightly more creative for nuanced assessment
SEVERITY_CONFIG = {
    "temperature": 0.2,
    "top_p": 0.9,
    "top_k": 40,
    "max_output_tokens": 8192,
    "candidate_count": 1
}


def get_generation_config(stage: str) -> dict:
    """Get generation config for a pipeline stage."""
    configs = {
        "classification": CLASSIFICATION_CONFIG,
        "severity": SEVERITY_CONFIG,
        # Legacy aliases for backward compatibility
        "validation": CLASSIFICATION_CONFIG,
        "domain": CLASSIFICATION_CONFIG,
        "fault": CLASSIFICATION_CONFIG,
    }
    return configs.get(stage, CLASSIFICATION_CONFIG)
