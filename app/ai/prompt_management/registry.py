"""
app/ai/prompt_management/registry.py
─────────────────────────────────────────────────────────────────────────────
Prompt Management System handling versioning and template validation.
"""
from typing import Dict, Any, List
from pydantic import BaseModel
from app.ai.utils.logger import get_logger

logger = get_logger("ai.prompt_management.registry")

class PromptVersion(BaseModel):
    version: str
    template: str
    required_vars: List[str]

class PromptRegistry:
    """In-memory registry for prompt versions. Replaces hardcoded prompts."""
    
    def __init__(self):
        self.prompts: Dict[str, Dict[str, PromptVersion]] = {}
        # Pre-seed with a default Supervisor prompt
        self.register("supervisor_system", "v1.0", PromptVersion(
            version="v1.0",
            template="You are an enterprise AI supervisor for {org_id}. Your role is {role}.",
            required_vars=["org_id", "role"]
        ))

    def register(self, name: str, version: str, prompt: PromptVersion):
        if name not in self.prompts:
            self.prompts[name] = {}
        self.prompts[name][version] = prompt
        logger.info(f"Registered prompt '{name}' version '{version}'")

    def get_prompt(self, prompt_name: str, version: str = "latest", **kwargs) -> str:
        """Retrieves and formats a prompt, validating required variables."""
        if prompt_name not in self.prompts:
            raise ValueError(f"Prompt '{prompt_name}' not found in registry.")
            
        versions = self.prompts[prompt_name]
        if version == "latest":
            # Just grab the last registered for this basic implementation
            version = list(versions.keys())[-1]
            
        prompt_def = versions.get(version)
        if not prompt_def:
            raise ValueError(f"Version '{version}' for prompt '{prompt_name}' not found.")
            
        # Validate variables
        missing = [v for v in prompt_def.required_vars if v not in kwargs]
        if missing:
            raise ValueError(f"Missing variables for prompt '{prompt_name}': {missing}")
            
        return prompt_def.template.format(**kwargs)

# Global registry instance
prompt_registry = PromptRegistry()
