"""
Prompt templates for diagnosis pipelines.
"""
from .master_prompt import (
    get_validation_prompt,
    get_domain_classification_prompt,
    get_fault_classification_prompt,
    get_severity_assessment_prompt,
    get_combined_classification_prompt,
    get_combined_severity_prompt,
)

__all__ = [
    'get_validation_prompt',
    'get_domain_classification_prompt',
    'get_fault_classification_prompt',
    'get_severity_assessment_prompt',
    'get_combined_classification_prompt',
    'get_combined_severity_prompt',
]
