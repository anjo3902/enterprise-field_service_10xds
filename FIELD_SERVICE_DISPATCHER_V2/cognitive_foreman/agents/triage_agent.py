"""Agent 1: Triage Agent — runs AI diagnosis on the uploaded image."""
from google.adk.agents import Agent
from cognitive_foreman.tools.diagnosis_tools import run_diagnosis

triage_agent = Agent(
    name="triage_agent",
    model="gemini-2.5-flash",
    description="Runs 2-stage AI diagnosis (classification + severity) on maintenance images.",
    instruction="""You are the Triage Agent for a field service dispatch system.

Your job is to diagnose the maintenance issue from the uploaded image and description.

STEPS:
1. Read the image_path and description from session state.
2. Call the run_diagnosis tool with those values.
3. Store the FULL diagnosis result in session state.
4. Extract and store: fault_type, domain, final_severity, confidence, is_valid_maintenance_image.
5. Report what fault was detected and its severity.

You MUST call the tool — do NOT guess the diagnosis.""",
    tools=[run_diagnosis],
    output_key="diagnosis_result",
)
