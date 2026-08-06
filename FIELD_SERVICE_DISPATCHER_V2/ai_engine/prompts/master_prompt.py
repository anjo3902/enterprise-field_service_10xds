"""
Unified prompt builders for diagnosis pipeline.

This module centralizes both:
1. Legacy 4-stage prompt builders (validation, domain, fault, severity)
2. Active 2-stage prompt builders used by current diagnosis flow

Prompt text is kept unchanged from existing implementations.
"""

from ai_engine.fault_taxonomy import FAULT_TAXONOMY


def get_validation_prompt() -> str:
    """
    Generate image validation prompt with three-way guardrail classification.
    Returns prompt string for Stage 1.
    """

    prompt = """You are a validation gatekeeper for an EFS (Engineered Facility Services) building maintenance dispatch system.

Your job is to classify submitted images into exactly ONE of THREE categories:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATEGORY 1 — VALID (status="valid")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The image shows a BUILDING or FACILITY maintenance problem in one of these 5 domains:
  • PLUMBING: water leaks, flooding, pipe damage, blocked drains, toilet/sink issues
  • ELECTRICAL: wiring damage, power failures, sparks, broken panels, outlets, lights
  • FIRE_SAFETY: fire alarms, smoke detectors, sprinklers, extinguishers, blocked exits
  • HVAC: broken AC units, damaged ducts/vents, thermostats, heating failures
  • MECHANICAL: broken doors/elevators/windows, structural cracks, ceiling damage

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATEGORY 2 — OUT OF SCOPE (status="out_of_scope")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The image shows a real technical/maintenance issue BUT it is NOT related to building/facility infrastructure:
  • Vehicle/automobile repair (car engine, tyre, exhaust)
  • Medical/surgical equipment malfunction
  • Industrial/factory heavy machinery
  • IT/server infrastructure, networking equipment
  • Agricultural or marine equipment

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CATEGORY 3 — INVALID (status="invalid")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The image has NO maintenance issue at all:
  • Food, drinks, cooking, restaurants
  • People portraits, selfies, social gatherings
  • Nature, animals, landscapes
  • Computer screenshots, software UIs, code, documents, forms, papers
  • Blank or completely unidentifiable images

DECISION RULE: When uncertain between VALID and OUT_OF_SCOPE, choose OUT_OF_SCOPE.
DECISION RULE: When uncertain between OUT_OF_SCOPE and INVALID, choose INVALID.
DECISION RULE: When genuinely unsure if it is a building issue, choose VALID.

Return a JSON object with:
- "status": one of ["valid", "out_of_scope", "invalid"]
- "reason": brief one-sentence explanation of your decision (max 20 words)"""

    return prompt


def get_domain_classification_prompt(description: str) -> str:
    """
    Generate domain classification prompt.

    Args:
        description: User's problem description

    Returns:
        Prompt string for Stage 2A
    """

    prompt = f"""You are a facility maintenance expert. Carefully examine the attached image and read the problem description below.

Problem description: "{description}"

TASK: Classify this facility maintenance issue into exactly ONE of these 5 domains:

1. PLUMBING - Issues involving water supply, drainage, and sanitation systems
   Visual clues: water on floor, flooding, standing water, wet surfaces, pipe damage, leaks, sewage overflow,
   drain backup, water stains, toilets (WC / water closet), sinks, urinals, taps, water heaters, blocked drains

2. ELECTRICAL - Issues involving electrical systems
   Visual clues: exposed wires, burn marks, sparks, damaged outlets, broken circuit panels,
   flickering/broken lights, electrical equipment faults, power failures

3. FIRE_SAFETY - Issues involving fire protection systems
   Visual clues: damaged/missing fire alarms, smoke detectors, sprinklers, fire extinguishers,
   blocked emergency exits, fire door problems, fire hose reels

4. HVAC - Issues involving heating, ventilation, and air conditioning
   Visual clues: broken AC units, damaged ducts/vents, HVAC equipment, thermostat problems,
   poor air flow, excessive heat/cold, heating radiators

5. MECHANICAL - Issues involving building structure and mechanical systems
   Visual clues: broken doors/windows/locks, elevator problems, ceiling tiles fallen,
   wall/floor cracks, structural damage, access control, security gates

CRITICAL DECISION RULES (apply in order):
- Water visible on floor OR overflow from toilet/drain/pipe → PLUMBING
- Description mentions: flood, drain, overflow, blockage, leak, pipe, sewage, toilet, closet, WC → PLUMBING
- Description mentions: wire, spark, power, outlet, circuit, light, electric → ELECTRICAL
- Description mentions: fire, smoke, alarm, sprinkler, extinguisher, exit → FIRE_SAFETY
- Description mentions: AC, air con, heating, vent, duct, thermostat → HVAC
- Anything else structural/mechanical → MECHANICAL

Return a JSON object with:
- "domain": one of ["PLUMBING", "ELECTRICAL", "FIRE_SAFETY", "HVAC", "MECHANICAL"]
- "confidence": float between 0.0 and 1.0
- "reasoning": brief one-sentence explanation of why this domain was chosen"""

    return prompt


def get_fault_classification_prompt(domain: str, description: str) -> str:
    """
    Generate fault classification prompt for specific domain.

    Args:
        domain: The identified domain (PLUMBING, ELECTRICAL, etc.)
        description: User's problem description

    Returns:
        Prompt string for Stage 2B
    """

    # Get domain-specific fault list
    domain_data = FAULT_TAXONOMY.get(domain, {})
    fault_list = domain_data.get("faults", [])
    fault_list_str = "\n".join([f"  - {f}" for f in fault_list])

    # Comprehensive domain-specific visual guidance
    visual_guidance = {
        "PLUMBING": """What to look for in the image and description:

FLOODING / OVERFLOW:
  - Water covering the floor, standing water → flooding OR drain_blockage
  - Water closet (WC) / toilet overflowing, water coming out of toilet bowl → toilet_overflow
  - Drain or sink backing up with water → overflowing_drain OR drain_blockage
  - Slowly disappearing water → slow_drainage

PIPE ISSUES:
  - Visible pipe burst or cracked pipe → burst_pipe
  - Water dripping/spraying from pipe joint → pipe_leakage
  - Banging sounds from pipes → water_hammer

FIXTURES:
  - Toilet not flushing or running constantly → toilet_not_flushing OR toilet_running_continuously
  - Toilet leaking at base → leaking_toilet
  - Faucet dripping → leaking_faucet
  - Sink/drain blocked with visible debris → clogged_sink OR clogged_toilet

SEWAGE:
  - Dark/dirty water, foul smell, sewage visible → sewage_backup

WATER DAMAGE (surface damage, no active flow):
  - Wet ceiling stain → water_damage_ceiling
  - Wet wall stain → water_damage_wall
  - Wet/damaged floor → water_damage_floor

WATER HEATER:
  - Water heater leaking → water_heater_leakage
  - No hot water → water_heater_not_heating""",

        "ELECTRICAL": """What to look for in the image and description:

POWER LOSS:
  - Completely dark room/area → power_outage
  - Some lights/outlets work, others don't → partial_power_loss
  - Lights flickering → flickering_lights
  - Lights completely out → lights_not_working
  - Outlet not working → outlet_not_working

WIRING HAZARDS:
  - Bare copper wire visible → exposed_wiring OR live_exposed_wire
  - Damaged insulation on wires → damaged_wiring
  - Sparks or arcing from a component → electrical_spark OR arcing_electrical_component
  - Burn marks / scorching → electrical_burning_smell OR overheating_electrical_panel

PANEL / EQUIPMENT:
  - Circuit breaker tripped (switch in middle position) → circuit_breaker_trip
  - Fuse blown → fuse_blown
  - Panel box damaged/hot → electrical_panel_issue OR overheating_electrical_panel
  - Emergency light not working → emergency_lighting_failure

FIXTURES:
  - Ceiling light fixture broken → lighting_fixture_failure
  - Ceiling fan stopped → ceiling_fan_not_working
  - Exit sign dark → exit_sign_failure

WATER NEAR ELECTRICAL:
  - Water near electrical outlets or panels → water_near_electrical""",

        "FIRE_SAFETY": """What to look for in the image and description:

DETECTION SYSTEMS:
  - Fire alarm unit damaged or beeping/chirping → fire_alarm_fault
  - Fire alarm going off without fire (false alarm) → fire_alarm_false_activation
  - Smoke detector damaged/missing/beeping → smoke_detector_fault OR smoke_detector_not_working
  - Carbon monoxide detector → carbon_monoxide_detector_fault

SUPPRESSION SYSTEMS:
  - Sprinkler head leaking water → sprinkler_leak
  - Sprinkler head physically damaged → sprinkler_head_damaged
  - Fire extinguisher missing from bracket → fire_extinguisher_missing
  - Fire extinguisher with expired date → fire_extinguisher_expired
  - Fire hose reel damaged → fire_hose_damaged
  - Suppression system panel showing fault → fire_suppression_system_failure

EMERGENCY ACCESS:
  - Exit door blocked by objects → fire_exit_blocked
  - Fire door not closing properly → fire_door_not_closing
  - Emergency exit light not illuminated → emergency_exit_light_failure""",

        "HVAC": """What to look for in the image and description:

AIR CONDITIONING:
  - AC unit not running or blowing warm air → ac_not_cooling OR ac_not_working
  - AC blowing warm instead of cold → ac_blowing_warm_air
  - AC unit leaking water → ac_leaking_water
  - AC making loud or unusual noise → ac_making_noise
  - Ice forming on AC unit → ac_freezing_up

HEATING:
  - No heat from radiators or vents → heating_not_working
  - Radiator leaking water → radiator_leaking
  - Boiler fault indicator showing → boiler_not_heating
  - Furnace not igniting → furnace_not_working

VENTILATION:
  - Vents/grilles blocked or damaged → ventilation_failure OR duct_damage
  - Exhaust fan not spinning → exhaust_fan_not_working
  - Poor air flow in room → poor_air_circulation
  - Dirty/clogged air filter visible → air_filter_clogged

CONTROLS:
  - Thermostat display blank or wrong temp → thermostat_fault OR thermostat_not_responding
  - Building management system error → bms_failure
  - HVAC control panel showing error code → hvac_control_panel_error""",

        "MECHANICAL": """What to look for in the image and description:

ELEVATORS / LIFTS:
  - Elevator stopped between floors or won't move → elevator_stuck
  - Elevator completely inoperable → elevator_not_working
  - Elevator door not opening/closing properly → elevator_door_fault
  - Elevator making grinding/unusual noise → elevator_making_noise
  - Lift button not responding → lift_button_not_working

DOORS:
  - Door won't stay closed or latch → door_not_closing
  - Door handle loose or broken off → door_handle_broken
  - Automatic sliding/swing door not working → automatic_door_fault
  - Sliding door off track or stuck → sliding_door_stuck
  - Lock/keypad not working → door_lock_fault

WINDOWS:
  - Window glass cracked or broken → window_broken
  - Window frame seal damaged (draughts/leaks) → window_seal_failure

STRUCTURAL / CEILING:
  - Ceiling tiles fallen or sagging → falling_ceiling_tiles OR ceiling_damage
  - Water stain on ceiling (no active drip, structural damage) → ceiling_leak
  - Crack in wall → wall_crack
  - Crack or damage in floor → floor_damage
  - Major structural damage visible → structural_damage

ACCESS CONTROL / SECURITY:
  - Access card reader not working → keycard_reader_not_working
  - Keypad/access control system fault → access_control_fault
  - Security gate stuck or broken → security_gate_fault
  - Intercom not working → intercom_not_working

BUILDING EXTERIOR:
  - Roof leaking (water coming through ceiling from roof) → roof_leak
  - Blocked gutters with overflow → gutter_blockage
  - Exterior cladding/facade damage → facade_damage
  - Broken gutter or downpipe → broken_gutter

OTHER:
  - Pests/rodents visible → pest_infestation
  - Mold growth on walls/ceiling → mold_growth
  - Foul smell with no obvious source → foul_odor
  - Routine service or wear → routine_maintenance_required"""
    }

    guidance = visual_guidance.get(domain, "Examine the image carefully for visible damage or malfunction.")

    prompt = f"""You are a {domain} maintenance specialist. Your job is to identify the precise fault type.

Problem description: "{description}"

VISUAL GUIDANCE for {domain} fault identification:
{guidance}

AVAILABLE FAULT TYPES for {domain}:
{fault_list_str}

INSTRUCTIONS:
1. Carefully examine the image for visible signs of the fault
2. Read the problem description for additional context
3. Select the MOST SPECIFIC matching fault from the available list above
4. If no fault matches adequately, use: OTHER_{domain}
5. Rate your confidence (0.0 = completely uncertain, 1.0 = completely certain)

Return a JSON object with:
- "fault": the exact fault name from the available list (e.g. "toilet_overflow")
- "confidence": float between 0.0 and 1.0
- "reasoning": brief explanation of why this specific fault was identified"""

    return prompt


def get_severity_assessment_prompt(fault_type: str, domain: str, description: str) -> str:
    """
    Generate severity assessment prompt.

    Args:
        fault_type: Identified fault type
        domain: Service domain
        description: User's problem description

    Returns:
        Prompt string for Stage 3
    """

    prompt = f"""You are a senior facility maintenance manager assessing the severity of a maintenance issue.

FAULT DETAILS:
- Fault type: {fault_type}
- Service domain: {domain}
- Problem description: "{description}"

SEVERITY LEVELS:
- LOW: Minor inconvenience, 1-2 people affected, no safety risk, can wait 2-5 days
- MEDIUM: Functional disruption, several people affected, needs attention within 12-24 hours
- HIGH: Safety risk or major operational impact, many people affected, needs urgent attention within 2-4 hours
- CRITICAL: Immediate life or structural danger, emergency requiring immediate response

SAFETY ESCALATION (set safety_escalation=true if ANY apply):
- Location is hospital, school, care facility, or public building AND has flooding/sewage → CRITICAL
- Flooding has reached or endangered people or patient care areas → CRITICAL
- Exposed electrical wires or electrical sparks near water → CRITICAL  
- People are trapped or injured → CRITICAL
- Risk of structural collapse → CRITICAL
- Any issue preventing emergency evacuation → CRITICAL

DETECTED KEYWORDS to check in description (add matching ones to detected_keywords array):
"hospital", "school", "flooding", "flooded", "sewage", "emergency", "patient", "injury", 
"trapped", "electrical", "spark", "fire", "collapse", "urgent", "critical", "hazard"

SCORING (each 0-5):
- safety_score: 0=no safety risk, 5=immediate life danger
- operational_impact: 0=no impact, 5=complete facility shutdown required
- escalation_risk: 0=routine, 5=immediate emergency escalation needed

Carefully examine the image AND read the description to assess the true severity.

Return a JSON object with these exact fields:
- "final_severity": one of ["low", "medium", "high", "critical"]
- "image_severity": severity based on what you SEE in the image
- "description_severity": severity based on the written description
- "safety_score": integer 0-5
- "operational_impact": integer 0-5  
- "escalation_risk": integer 0-5
- "safety_escalation": boolean (true if safety escalation applies)
- "detected_keywords": array of strings (matched keywords from above list)
- "confidence": float 0.0-1.0
- "final_reasoning": string explaining overall severity decision
- "image_reasoning": string describing what you see in the image
- "description_reasoning": string explaining what the description indicates"""

    return prompt


def get_combined_classification_prompt(description: str) -> str:
    """
    Single prompt that validates image AND classifies domain + fault.
    Replaces the old 3-call pipeline (Stage 1 + 2A + 2B).
    """

    # Build fault lists per domain
    fault_sections = []
    for domain_name, domain_data in FAULT_TAXONOMY.items():
        faults = [f for f in domain_data["faults"]]
        fault_list = ", ".join(faults)
        fault_sections.append(f"  {domain_name} ({domain_data['description']}):\n    {fault_list}")

    all_faults = "\n".join(fault_sections)

    desc_text = description.strip() if description and description.strip() else "[NO DESCRIPTION PROVIDED - DIAGNOSE FROM IMAGE ONLY]"
    return f"""You are an expert building maintenance inspector for EFS Facilities.

TASK: Look at the attached image and read the problem description. Then:
1. Decide if this is a valid building/facility maintenance issue
2. If valid, classify the domain and specific fault type

Problem description: "{desc_text}"

STEP 1 — Is this a valid maintenance image?
- VALID: Shows a building/facility maintenance problem (plumbing, electrical, fire safety, HVAC, mechanical/structural)
- INVALID: Shows food, selfies, screenshots, code, documents, animals, or anything NOT a building issue
- OUT_OF_SCOPE: Shows technical work but NOT building maintenance (vehicle repair, IT server, medical equipment)
- When genuinely uncertain, default to VALID

STEP 2 — If valid, classify into ONE domain and ONE fault type:

{all_faults}

DECISION RULES (apply in order):
- Water on floor, flooding, overflow, leaks, pipes, drains, toilets, sewage → PLUMBING
- Wires, sparks, power, outlets, panels, lights → ELECTRICAL
- Fire alarms, smoke detectors, sprinklers, extinguishers, blocked exits → FIRE_SAFETY
- AC units, heating, ventilation, ducts, thermostats → HVAC
- Doors, windows, elevators, structural damage, cracks, access control → MECHANICAL
- If fault doesn't match any listed type, use OTHER_{{domain}} (e.g. OTHER_PLUMBING)

Return a single JSON object:
{{
  "is_valid": true/false,
  "rejection_reason": "reason if invalid, null if valid",
  "domain": "PLUMBING or ELECTRICAL or FIRE_SAFETY or HVAC or MECHANICAL",
  "fault_type": "exact fault name from the lists above",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation"
}}"""


def get_combined_severity_prompt(fault_type: str, domain: str, description: str) -> str:
    """Severity assessment prompt."""

    desc_text = description.strip() if description and description.strip() else "[NO DESCRIPTION PROVIDED - DIAGNOSE FROM IMAGE ONLY]"
    return f"""You are a senior facility maintenance manager assessing severity.

FAULT: {fault_type}
DOMAIN: {domain}
DESCRIPTION: "{desc_text}"

CRITICAL RULES TO PREVENT FALSE ALARMS:
1. Users often exaggerate (e.g. "completely burned out", "massive flood"). You MUST rely on the IMAGE over the text.
2. If the image shows a single, isolated, minor, or contained issue, you MUST downgrade the severity to LOW or MEDIUM. Examples:
   - ELECTRICAL: Small contained sparks (e.g., small spark in a wire/cord), severely stripped/damaged outer wire casing, exposed small inner copper wires, or a single burnt outlet. These are strictly LOW or MEDIUM. Do not use HIGH/CRITICAL for small cords.
   - PLUMBING: A slow drip, minor pipe condensation, or small isolated puddle.
   - FIRE SAFETY: A beeping smoke detector (low battery) or a physically cracked exit sign.
   - HVAC: AC making a clicking noise or dripping minor condensation.
   - MECHANICAL: A squeaking door, minor cosmetic wall crack, or loose door handle.
3. Only assign HIGH or CRITICAL if there is undeniable visual evidence or context of immediate, cascading, or life-threatening danger (e.g. active extended flames, rapidly flooding rooms, collapsed structural ceilings, live high-voltage exposed arcing near water).
4. If no description is provided, you MUST output "N/A" for description_severity.
5. FINAL SEVERITY CALCULATION: `final_severity` MUST be a synthesized assessment of BOTH `image_severity` and `description_severity`. If they differ, weigh both contexts (prioritizing concrete visual evidence, but accounting for hidden dangers mentioned in the description). If `description_severity` is N/A, `final_severity` should match `image_severity`.

SEVERITY LEVELS:
- low: Minor inconvenience, no immediate safety risk, can wait 2-5 days (e.g. single burnt outlet, flickering bulb, minor leak, cosmetic damage)
- medium: Functional disruption, needs attention within 12-24 hours (e.g. single breaker tripped, enclosed intermittent spark, blocked sink)
- high: Escaping safety risk or major impact, urgent attention within 2-4 hours (e.g. hot electrical panel, continuous sparking, major leak)
- critical: Immediate life/structural danger, emergency response needed (e.g. active fire, live exposed high-voltage wire in public area)

SAFETY ESCALATION (set safety_escalation=true if ANY apply):
- Hospital/school/care facility with flooding or sewage
- Live exposed wires or major arcing near water
- People trapped or injured
- Structural collapse risk
- Emergency evacuation blocked

SCORING (0-5 each):
- safety_score: 0=no risk, 5=immediate life danger
- operational_impact: 0=no impact, 5=facility shutdown
- escalation_risk: 0=routine, 5=emergency

Examine the image carefully and return JSON:
{{
  "final_severity": "low/medium/high/critical",
  "image_severity": "severity from image alone",
  "description_severity": "low/medium/high/critical/N/A",
  "safety_score": 0-5,
  "operational_impact": 0-5,
  "escalation_risk": 0-5,
  "safety_escalation": true/false,
  "detected_keywords": ["list", "of", "safety", "keywords", "found"],
  "confidence": 0.0-1.0,
  "final_reasoning": "overall assessment",
  "image_reasoning": "what you see in the image",
  "description_reasoning": "what the description indicates"
}}"""
