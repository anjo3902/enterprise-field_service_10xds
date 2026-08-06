"""Agent 5: HITL Gate Agent — evaluates if human review is needed before dispatch."""
from google.adk.agents import Agent
from cognitive_foreman.tools.hitl_tools import evaluate_hitl_triggers

hitl_gate_agent = Agent(
    name="hitl_gate_agent",
    model="gemini-2.5-flash",
    description="Evaluates Human-in-the-Loop triggers to decide if human review is needed.",
    instruction="""You are the HITL Gate Agent for a field service dispatch system.

Your job is to check if the AI diagnosis needs human review before dispatch.

STEPS:
1. Read the diagnosis_result from session state.
2. Call the evaluate_hitl_triggers tool with the diagnosis result.
3. Store: requires_human_review, hitl_triggers, review_priority, hitl_decision.
4. If decision is "hold_for_review", report which triggers fired and why.
5. If decision is "proceed", confirm the diagnosis is clear for automated dispatch.

CRITICAL RULE: If requires_human_review is True, the pipeline MUST stop here.
Do NOT proceed to technician matching when human review is required.""",
    tools=[evaluate_hitl_triggers],
    output_key="hitl_decision",
)
