"""
Hierarchical Fault Taxonomy for EFS Facilities
Organized by domain for efficient classification
"""

# Primary service domains
DOMAINS = [
    "PLUMBING",
    "ELECTRICAL", 
    "FIRE_SAFETY",
    "HVAC",
    "MECHANICAL"
]

# Domain-organized fault classes
FAULT_TAXONOMY = {
    
    "PLUMBING": {
        "description": "Water supply, drainage, pipes, toilets, fixtures",
        "faults": [
            # Water Supply Issues
            "burst_pipe",
            "pipe_leakage",
            "water_hammer",
            "frozen_pipe",
            "corroded_pipe",
            "low_water_pressure",
            "no_water_supply",
            
            # Drainage Issues
            "drain_blockage",
            "sewage_backup",
            "overflowing_drain",
            "toilet_overflow",
            "slow_drainage",
            "clogged_toilet",
            "clogged_sink",
            
            # Fixtures & Fittings
            "leaking_faucet",
            "broken_faucet",
            "toilet_running_continuously",
            "toilet_not_flushing",
            "leaking_toilet",
            "broken_flush_valve",
            "water_heater_leakage",
            "water_heater_not_heating",
            "boiler_malfunction",
            
            # Severe Water Damage
            "flooding",
            "water_damage_ceiling",
            "water_damage_wall",
            "water_damage_floor",
            
            # Other
            "OTHER_PLUMBING"
        ]
    },
    
    "ELECTRICAL": {
        "description": "Power systems, wiring, lighting, panels",
        "faults": [
            # Power Issues
            "power_outage",
            "partial_power_loss",
            "circuit_breaker_trip",
            "fuse_blown",
            "flickering_lights",
            "lights_not_working",
            "outlet_not_working",
            
            # Wiring & Safety Hazards
            "exposed_wiring",
            "damaged_wiring",
            "electrical_spark",
            "electrical_burning_smell",
            "overheating_electrical_panel",
            "arcing_electrical_component",
            
            # Equipment Failures
            "lighting_fixture_failure",
            "ceiling_fan_not_working",
            "emergency_lighting_failure",
            "exit_sign_failure",
            "transformer_failure",
            "electrical_panel_issue",
            
            # Dangerous Conditions
            "electrical_shock_hazard",
            "live_exposed_wire",
            "water_near_electrical",
            
            # Other
            "OTHER_ELECTRICAL"
        ]
    },
    
    "FIRE_SAFETY": {
        "description": "Alarms, sprinklers, extinguishers, emergency exits",
        "faults": [
            # Detection Systems
            "smoke_detector_fault",
            "smoke_detector_not_working",
            "fire_alarm_fault",
            "fire_alarm_false_activation",
            "heat_detector_failure",
            "carbon_monoxide_detector_fault",
            
            # Suppression Systems
            "sprinkler_leak",
            "sprinkler_head_damaged",
            "fire_extinguisher_expired",
            "fire_extinguisher_missing",
            "fire_hose_damaged",
            "fire_suppression_system_failure",
            
            # Emergency Access
            "fire_exit_blocked",
            "fire_door_not_closing",
            "emergency_exit_light_failure",
            
            # Other
            "OTHER_FIRE_SAFETY"
        ]
    },
    
    "HVAC": {
        "description": "Heating, ventilation, air conditioning, climate control",
        "faults": [
            # Air Conditioning
            "ac_not_cooling",
            "ac_not_working",
            "ac_leaking_water",
            "ac_making_noise",
            "ac_freezing_up",
            "ac_blowing_warm_air",
            
            # Heating
            "heating_not_working",
            "radiator_leaking",
            "boiler_not_heating",
            "furnace_not_working",
            "heating_element_failure",
            
            # Ventilation
            "ventilation_failure",
            "exhaust_fan_not_working",
            "poor_air_circulation",
            "duct_damage",
            "air_filter_clogged",
            
            # Controls
            "thermostat_fault",
            "thermostat_not_responding",
            "bms_failure",
            "hvac_control_panel_error",
            
            # Other
            "OTHER_HVAC"
        ]
    },
    
    "MECHANICAL": {
        "description": "Elevators, doors, windows, structural, building systems",
        "faults": [
            # Elevators & Lifts
            "elevator_stuck",
            "elevator_not_working",
            "elevator_door_fault",
            "elevator_making_noise",
            "lift_button_not_working",
            
            # Doors & Windows
            "door_not_closing",
            "door_handle_broken",
            "automatic_door_fault",
            "sliding_door_stuck",
            "door_lock_fault",
            "window_broken",
            "window_seal_failure",
            
            # Structural Issues
            "ceiling_damage",
            "wall_crack",
            "floor_damage",
            "ceiling_leak",
            "structural_damage",
            "falling_ceiling_tiles",
            
            # Access Control & Security
            "access_control_fault",
            "keycard_reader_not_working",
            "security_gate_fault",
            "intercom_not_working",
            
            # Building Exterior
            "roof_leak",
            "gutter_blockage",
            "facade_damage",
            "broken_gutter",
            
            # Miscellaneous
            "pest_infestation",
            "mold_growth",
            "foul_odor",
            "noise_complaint",
            "general_wear_and_tear",
            "routine_maintenance_required",
            
            # Other
            "OTHER_MECHANICAL"
        ]
    }
}

# Generate flat list for backward compatibility
FAULT_CLASSES = []
for domain, data in FAULT_TAXONOMY.items():
    FAULT_CLASSES.extend(data["faults"])

# Safety keywords that auto-escalate severity to at least HIGH
# Organized by domain for comprehensive coverage
SAFETY_KEYWORDS = [
    # ELECTRICAL - Life safety hazards
    "exposed_wire", "exposed wiring", "live wire", "live_wire", "electrical_shock", 
    "electrical shock", "sparking", "arcing", "electrical fire", "burning smell electrical",
    "power outage", "total power loss", "electrical panel fire",
    
    # PLUMBING - Major water/sewage hazards
    "flooding", "major flooding", "sewage backup", "sewage", "burst pipe", "burst",
    "contaminated water", "water near electrical", "ceiling collapse water",
    
    # FIRE_SAFETY - Fire detection/suppression critical failures
    "fire", "smoke", "fire alarm failure", "sprinkler failure", "no fire alarm",
    "exit blocked", "fire door blocked", "emergency exit blocked",
    
    # HVAC - Life safety and health hazards
    "gas leak", "carbon monoxide", "no heat winter", "no cooling heatwave",
    "refrigerant leak", "hvac fire",
    
    # MECHANICAL - Structural and entrapment hazards
    "ceiling_collapse", "ceiling collapse", "structural_failure", "structural failure",
    "elevator stuck", "people trapped", "trapped", "structural crack",
    "falling debris", "ceiling falling", "wall collapse",
    
    # General life safety
    "emergency", "evacuation", "injury", "injured", "hospital", "urgent",
    "critical", "danger", "hazard", "immediate"
]

def get_domain_faults(domain: str) -> list:
    """Get fault list for specific domain"""
    return FAULT_TAXONOMY.get(domain, {}).get("faults", [])

def get_all_domains() -> list:
    """Get all domain names"""
    return DOMAINS
