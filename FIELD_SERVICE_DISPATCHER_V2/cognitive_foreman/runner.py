"""
ADK Runner integration for programmatic pipeline execution from FastAPI.

Usage:
    from cognitive_foreman.runner import run_pipeline
    result = await run_pipeline(image_path="/path/to/img.jpg", description="Leaking pipe")
"""

import uuid
from datetime import datetime
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from cognitive_foreman.agent import root_agent


_session_service = InMemorySessionService()
_runner = Runner(
    agent=root_agent,
    app_name="field_service_foreman",
    session_service=_session_service,
)

APP_NAME = "field_service_foreman"


async def run_pipeline(
    image_path: str,
    description: str = "",
    latitude: float = None,
    longitude: float = None,
    customer_name: str = "",
    customer_email: str = "",
    customer_user_id: int = None,
    contact_number: str = "",
    location_text: str = "",
) -> dict:
    """Execute the full multi-agent dispatch pipeline.

    Args:
        image_path: Path to the uploaded maintenance image.
        description: Customer issue description.
        latitude: Job site latitude.
        longitude: Job site longitude.
        customer_name: Customer name.
        customer_email: Customer email.
        customer_user_id: Customer user ID from auth.
        contact_number: Customer contact.
        location_text: Human-readable address.

    Returns:
        dict with pipeline results including request_id, assigned_technician,
        diagnosis details, and any HITL flags.
    """
    session_id = str(uuid.uuid4())
    user_id = f"user_{customer_user_id or 'anonymous'}"

    # Create session with initial state
    session = await _session_service.create_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=session_id,
        state={
            "input_image_path": image_path,
            "input_description": description,
            "input_latitude": latitude,
            "input_longitude": longitude,
            "input_customer_name": customer_name,
            "input_customer_email": customer_email,
            "input_customer_user_id": customer_user_id,
            "input_contact": contact_number,
            "input_location": location_text,
            "pipeline_started_at": datetime.utcnow().isoformat(),
        },
    )

    # Build the user message that kicks off the pipeline
    user_message = (
        f"Process this field service request:\n"
        f"Image: {image_path}\n"
        f"Description: {description}\n"
        f"Location: ({latitude}, {longitude}) {location_text}\n"
        f"Customer: {customer_name} ({customer_email})\n"
        f"Contact: {contact_number}"
    )

    user_content = types.Content(
        role="user",
        parts=[types.Part.from_text(text=user_message)],
    )

    # Run the pipeline and collect the final response
    final_response = None
    async for event in _runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=user_content,
    ):
        if event.is_final_response():
            final_response = event

    # Collect results from session state
    updated_session = await _session_service.get_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=session_id,
    )

    state = updated_session.state if updated_session else {}

    return {
        "pipeline_status": state.get("pipeline_status", "completed"),
        "diagnosis_result": state.get("diagnosis_result"),
        "fault_type": state.get("fault_type"),
        "domain": state.get("domain"),
        "final_severity": state.get("final_severity"),
        "confidence": state.get("confidence"),
        "requires_human_review": state.get("requires_human_review", False),
        "hitl_triggers": state.get("hitl_triggers", []),
        "review_priority": state.get("review_priority", "normal"),
        "hitl_decision": state.get("hitl_decision"),
        "dispatch_tier": state.get("dispatch_tier"),
        "best_technician": state.get("best_technician"),
        "request_id": state.get("request_id"),
        "assignment_result": state.get("assignment_result"),
        "pipeline_started_at": state.get("pipeline_started_at"),
        "pipeline_completed_at": datetime.utcnow().isoformat(),
        "agent_response": (
            final_response.content.parts[0].text
            if final_response and final_response.content and final_response.content.parts
            else None
        ),
    }
