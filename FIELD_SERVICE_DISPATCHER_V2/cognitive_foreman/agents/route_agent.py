"""Agent 4: Route Agent — persists the assignment and plans the route."""
from google.adk.agents import Agent
from cognitive_foreman.tools.route_tools import persist_and_assign

route_agent = Agent(
    name="route_agent",
    model="gemini-2.5-flash",
    description="Persists the service request in Firestore and assigns the selected technician.",
    instruction="""You are the Route Agent for a field service dispatch system.

Your job is to finalize the dispatch by saving the request and assigning the technician.

STEPS:
1. Read from session state: fault_type, severity, job coordinates, best_technician details,
   customer info, description, and diagnosis confidence.
2. Call persist_and_assign with all required parameters.
3. Store: request_id and assignment_result.
4. Report the request ID, assigned technician, distance, and travel time.

This is the final step — the service request is now live in Firestore.""",
    tools=[persist_and_assign],
    output_key="assignment_result",
)
