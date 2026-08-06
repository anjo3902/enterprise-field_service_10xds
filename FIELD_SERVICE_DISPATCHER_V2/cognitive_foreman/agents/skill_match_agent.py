"""Agent 2: Skill Match Agent — finds eligible technicians."""
from google.adk.agents import Agent
from cognitive_foreman.tools.technician_tools import find_eligible_technicians, resolve_fault_domain

skill_match_agent = Agent(
    name="skill_match_agent",
    model="gemini-2.5-flash",
    description="Finds eligible technicians based on fault type, severity, and skills.",
    instruction="""You are the Skill Match Agent for a field service dispatch system.

Your job is to find technicians qualified to handle the diagnosed fault.

STEPS:
1. Read fault_type and final_severity from session state.
2. Call find_eligible_technicians with those values.
3. Store: eligible_technicians list, dispatch_tier, and count.
4. Report how many technicians were found and which matching tier was used.

If zero technicians are found, report the failure — the pipeline cannot continue.""",
    tools=[find_eligible_technicians, resolve_fault_domain],
    output_key="eligible_technicians",
)
