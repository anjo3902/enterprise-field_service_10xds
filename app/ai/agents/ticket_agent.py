from app.ai.agents.base import BaseAgent
from app.ai.prompts.library import PromptLibrary
from app.ai.tools.edge_functions import get_edge_function_tool
from app.ai.schemas.context import SharedContext

class TicketAgent(BaseAgent):
    """
    Specialized agent for managing Tickets.
    """
    def __init__(self, context: SharedContext):
        # Specific tools for this agent
        tools = [
            get_edge_function_tool(context)
        ]
        
        system_prompt = PromptLibrary.get_agent_prompt("ticket")
        
        super().__init__(
            name="ticket_agent",
            system_prompt=system_prompt,
            tools=tools
        )
