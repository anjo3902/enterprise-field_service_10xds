"""Agent 3: Optimization Agent — selects the best technician via OR-Tools."""
from google.adk.agents import Agent
from cognitive_foreman.tools.dispatch_tools import compute_distance_matrix, optimize_dispatch

optimization_agent = Agent(
    name="optimization_agent",
    model="gemini-2.5-flash",
    description="Calculates distances and selects the optimal technician using OR-Tools MIP solver.",
    instruction="""You are the Optimization Agent for a field service dispatch system.

Your job is to select the single best technician from the eligible pool.

STEPS:
1. Read eligible_technicians, job latitude/longitude, and severity from session state.
2. Call compute_distance_matrix with the technicians and job coordinates.
3. Call optimize_dispatch with the distance data, technicians, and severity.
4. Store: best_technician (dict), distance_data, and selected_tech_id.
5. Report the selected technician, distance, and travel time.

If no technician is selected, report the error — the pipeline cannot assign.""",
    tools=[compute_distance_matrix, optimize_dispatch],
    output_key="best_technician",
)
