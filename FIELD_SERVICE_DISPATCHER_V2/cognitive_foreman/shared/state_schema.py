"""
Shared session state key definitions for the cognitive foreman pipeline.

Every agent reads from and writes to the ADK session state dict using these keys.
This ensures agents are loosely coupled — they communicate through shared state only.
"""

# ─── Input keys (set by the API caller before the pipeline starts) ────────
INPUT_IMAGE_PATH = "input_image_path"
INPUT_DESCRIPTION = "input_description"
INPUT_LOCATION = "input_location"
INPUT_LATITUDE = "input_latitude"
INPUT_LONGITUDE = "input_longitude"
INPUT_CONTACT = "input_contact"
INPUT_CUSTOMER_NAME = "input_customer_name"
INPUT_CUSTOMER_EMAIL = "input_customer_email"
INPUT_CUSTOMER_USER_ID = "input_customer_user_id"

# ─── Triage Agent outputs ─────────────────────────────────────────────────
DIAGNOSIS_RESULT = "diagnosis_result"          # Full dict from DiagnosisEngine.diagnose()
FAULT_TYPE = "fault_type"                       # str: e.g. "burst_pipe"
DOMAIN = "domain"                               # str: e.g. "plumbing"
FINAL_SEVERITY = "final_severity"               # str: "low"|"medium"|"high"|"critical"
CONFIDENCE = "confidence"                       # float: 0.0–1.0
IS_VALID_IMAGE = "is_valid_maintenance_image"   # bool

# ─── HITL Gate Agent outputs ──────────────────────────────────────────────
REQUIRES_HUMAN_REVIEW = "requires_human_review"  # bool
HITL_TRIGGERS = "hitl_triggers"                  # list[dict]
REVIEW_PRIORITY = "review_priority"              # str: "normal"|"high"|"urgent"
HITL_DECISION = "hitl_decision"                  # str: "proceed"|"hold_for_review"

# ─── Skill Match Agent outputs ────────────────────────────────────────────
ELIGIBLE_TECHNICIANS = "eligible_technicians"    # list[dict]
DISPATCH_TIER = "dispatch_tier"                  # str: "exact"|"relaxed_*"|"domain_any"|"none"

# ─── Optimization Agent outputs ───────────────────────────────────────────
BEST_TECHNICIAN = "best_technician"              # dict with technician_id, distance_km, duration_min
DISTANCE_DATA = "distance_data"                  # list[dict] from Google Maps API
SELECTED_TECH_ID = "selected_tech_id"            # int

# ─── Route Agent outputs ──────────────────────────────────────────────────
REQUEST_ID = "request_id"                        # int/str: persisted service request ID
ROUTE_RESULT = "route_result"                    # dict: route plan for assigned technician
ASSIGNMENT_RESULT = "assignment_result"           # dict: final assignment summary

# ─── Pipeline metadata ───────────────────────────────────────────────────
PIPELINE_STATUS = "pipeline_status"              # str: "success"|"failed"|"held_for_review"
PIPELINE_ERROR = "pipeline_error"                # str|None: error message if failed
PIPELINE_STARTED_AT = "pipeline_started_at"      # str: ISO timestamp
PIPELINE_COMPLETED_AT = "pipeline_completed_at"  # str: ISO timestamp
