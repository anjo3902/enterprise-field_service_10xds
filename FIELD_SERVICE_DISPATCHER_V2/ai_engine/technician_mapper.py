"""
Technician Recommendation Engine for EFS Facilities

Maps detected fault type and severity level to
an appropriate technician role using industry-style
maintenance hierarchy.

Production-ready mapping covering ALL 117 fault types across 5 domains.
"""


# Comprehensive domain mapping for ALL fault classes (including toilet_overflow fix)
FAULT_DOMAIN_MAP = {

    # ============ PLUMBING ============
    # Water Supply
    "burst_pipe": "Plumbing",
    "pipe_leakage": "Plumbing",
    "water_hammer": "Plumbing",
    "frozen_pipe": "Plumbing",
    "corroded_pipe": "Plumbing",
    "low_water_pressure": "Plumbing",
    "no_water_supply": "Plumbing",

    # Drainage
    "drain_blockage": "Plumbing",
    "sewage_backup": "Plumbing",
    "overflowing_drain": "Plumbing",
    "toilet_overflow": "Plumbing",       # ← was missing!
    "slow_drainage": "Plumbing",
    "clogged_toilet": "Plumbing",
    "clogged_sink": "Plumbing",

    # Fixtures
    "leaking_faucet": "Plumbing",
    "broken_faucet": "Plumbing",
    "toilet_running_continuously": "Plumbing",
    "toilet_not_flushing": "Plumbing",
    "leaking_toilet": "Plumbing",
    "broken_flush_valve": "Plumbing",
    "water_heater_leakage": "Plumbing",
    "water_heater_not_heating": "Plumbing",
    "boiler_malfunction": "Plumbing",

    # Water Damage
    "flooding": "Plumbing",
    "water_damage_ceiling": "Plumbing",
    "water_damage_wall": "Plumbing",
    "water_damage_floor": "Plumbing",

    # Other
    "OTHER_PLUMBING": "Plumbing",

    # ============ ELECTRICAL ============
    # Power Issues
    "power_outage": "Electrical",
    "partial_power_loss": "Electrical",
    "circuit_breaker_trip": "Electrical",
    "fuse_blown": "Electrical",
    "flickering_lights": "Electrical",
    "lights_not_working": "Electrical",
    "outlet_not_working": "Electrical",

    # Wiring & Safety
    "exposed_wiring": "Electrical",
    "damaged_wiring": "Electrical",
    "electrical_spark": "Electrical",
    "electrical_burning_smell": "Electrical",
    "overheating_electrical_panel": "Electrical",
    "arcing_electrical_component": "Electrical",

    # Equipment
    "lighting_fixture_failure": "Electrical",
    "ceiling_fan_not_working": "Electrical",
    "emergency_lighting_failure": "Electrical",
    "exit_sign_failure": "Electrical",
    "transformer_failure": "Electrical",
    "electrical_panel_issue": "Electrical",

    # Hazards
    "electrical_shock_hazard": "Electrical",
    "live_exposed_wire": "Electrical",
    "water_near_electrical": "Electrical",

    # Other
    "OTHER_ELECTRICAL": "Electrical",

    # ============ FIRE SAFETY ============
    # Detection
    "smoke_detector_fault": "Fire Safety",
    "smoke_detector_not_working": "Fire Safety",
    "fire_alarm_fault": "Fire Safety",
    "fire_alarm_false_activation": "Fire Safety",
    "heat_detector_failure": "Fire Safety",
    "carbon_monoxide_detector_fault": "Fire Safety",

    # Suppression
    "sprinkler_leak": "Fire Safety",
    "sprinkler_head_damaged": "Fire Safety",
    "fire_extinguisher_expired": "Fire Safety",
    "fire_extinguisher_missing": "Fire Safety",
    "fire_hose_damaged": "Fire Safety",
    "fire_suppression_system_failure": "Fire Safety",

    # Emergency Access
    "fire_exit_blocked": "Fire Safety",
    "fire_door_not_closing": "Fire Safety",
    "emergency_exit_light_failure": "Fire Safety",

    # Other
    "OTHER_FIRE_SAFETY": "Fire Safety",

    # ============ HVAC ============
    # Air Conditioning
    "ac_not_cooling": "HVAC",
    "ac_not_working": "HVAC",
    "ac_leaking_water": "HVAC",
    "ac_making_noise": "HVAC",
    "ac_freezing_up": "HVAC",
    "ac_blowing_warm_air": "HVAC",

    # Heating
    "heating_not_working": "HVAC",
    "radiator_leaking": "HVAC",
    "boiler_not_heating": "HVAC",
    "furnace_not_working": "HVAC",
    "heating_element_failure": "HVAC",

    # Ventilation
    "ventilation_failure": "HVAC",
    "exhaust_fan_not_working": "HVAC",
    "poor_air_circulation": "HVAC",
    "duct_damage": "HVAC",
    "air_filter_clogged": "HVAC",

    # Controls
    "thermostat_fault": "HVAC",
    "thermostat_not_responding": "HVAC",
    "bms_failure": "HVAC",
    "hvac_control_panel_error": "HVAC",

    # Other
    "OTHER_HVAC": "HVAC",

    # ============ MECHANICAL ============
    # Elevators
    "elevator_stuck": "Mechanical",
    "elevator_not_working": "Mechanical",
    "elevator_door_fault": "Mechanical",
    "elevator_making_noise": "Mechanical",
    "lift_button_not_working": "Mechanical",

    # Doors & Windows
    "door_not_closing": "General Maintenance",
    "door_handle_broken": "General Maintenance",
    "automatic_door_fault": "Mechanical",
    "sliding_door_stuck": "General Maintenance",
    "door_lock_fault": "General Maintenance",
    "window_broken": "General Maintenance",
    "window_seal_failure": "General Maintenance",

    # Structural
    "ceiling_damage": "Civil / Structural",
    "wall_crack": "Civil / Structural",
    "floor_damage": "Civil / Structural",
    "ceiling_leak": "Civil / Structural",
    "structural_damage": "Civil / Structural",
    "falling_ceiling_tiles": "Civil / Structural",

    # Access Control
    "access_control_fault": "Security Systems",
    "keycard_reader_not_working": "Security Systems",
    "security_gate_fault": "Security Systems",
    "intercom_not_working": "Security Systems",

    # Building Exterior
    "roof_leak": "Civil / Structural",
    "gutter_blockage": "General Maintenance",
    "facade_damage": "Civil / Structural",
    "broken_gutter": "General Maintenance",

    # Miscellaneous
    "pest_infestation": "General Maintenance",
    "mold_growth": "General Maintenance",
    "foul_odor": "General Maintenance",
    "noise_complaint": "General Maintenance",
    "general_wear_and_tear": "General Maintenance",
    "routine_maintenance_required": "General Maintenance",

    # Other
    "OTHER_MECHANICAL": "General Maintenance",
}


# Technician hierarchy based on severity
TECHNICIAN_LEVEL_MAP = {
    "none": "No Technician Required",
    "low": "Junior Technician",
    "medium": "Technician",
    "high": "Senior Technician",
    "critical": "Field Engineer"
}


def map_technician(fault_type: str, severity: str = "medium") -> str:
    """
    Determine technician role based on fault domain and severity.

    Returns descriptive technician role string, e.g.:
    - "Junior Technician - Plumbing"
    - "Senior Technician - Electrical"
    - "Field Engineer - Fire Safety"
    """

    # Handle invalid images
    if fault_type == "INVALID_IMAGE":
        return "No Technician Required (Invalid Image)"

    # Handle unknown faults - still assign based on domain if possible
    if fault_type in (None, "", "unknown"):
        return "Customer Service - Review Required"

    # Handle severity "none" (rejected images)
    if severity == "none":
        return "No Technician Required"

    # Look up domain from fault type
    domain = FAULT_DOMAIN_MAP.get(fault_type)

    # If fault not found in explicit map, try to derive domain from OTHER_ prefix
    if domain is None:
        if fault_type.startswith("OTHER_"):
            domain_key = fault_type.replace("OTHER_", "")
            domain_map = {
                "PLUMBING": "Plumbing",
                "ELECTRICAL": "Electrical",
                "FIRE_SAFETY": "Fire Safety",
                "HVAC": "HVAC",
                "MECHANICAL": "General Maintenance"
            }
            domain = domain_map.get(domain_key, "General Maintenance")
        else:
            domain = "General Maintenance"

    level = TECHNICIAN_LEVEL_MAP.get(severity.lower(), "Technician")

    return f"{level} - {domain}"