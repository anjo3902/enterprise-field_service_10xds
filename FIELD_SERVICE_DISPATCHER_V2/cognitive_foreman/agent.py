"""
Root agent for the Cognitive Foreman — multi-agent field service dispatch pipeline.

ADK entry point: the `root_agent` variable is discovered by `adk web` and `adk run`.

Pipeline flow (SequentialAgent):
  1. triage_agent      -> AI diagnosis (Stage 1 + Stage 2)
  2. hitl_gate_agent   -> HITL trigger evaluation (may halt pipeline)
  3. skill_match_agent -> Multi-tier technician filtering
  4. optimization_agent -> OR-Tools MIP solver for best technician
  5. route_agent       -> Persist assignment + route re-sequencing
"""

from google.adk.agents import SequentialAgent
from cognitive_foreman.agents.triage_agent import triage_agent
from cognitive_foreman.agents.hitl_gate_agent import hitl_gate_agent
from cognitive_foreman.agents.skill_match_agent import skill_match_agent
from cognitive_foreman.agents.optimization_agent import optimization_agent
from cognitive_foreman.agents.route_agent import route_agent
from cognitive_foreman.callbacks.audit_callbacks import before_agent_callback, after_agent_callback

root_agent = SequentialAgent(
    name="cognitive_foreman",
    description=(
        "Multi-agent pipeline for field service dispatch. "
        "Runs AI diagnosis, HITL evaluation, skill matching, "
        "OR-Tools optimization, and route assignment in sequence."
    ),
    sub_agents=[
        triage_agent,
        hitl_gate_agent,
        skill_match_agent,
        optimization_agent,
        route_agent,
    ],
    before_agent_callback=before_agent_callback,
    after_agent_callback=after_agent_callback,
)
