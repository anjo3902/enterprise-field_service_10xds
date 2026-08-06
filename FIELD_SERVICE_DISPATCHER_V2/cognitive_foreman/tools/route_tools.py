"""Tool wrappers for route planning and service request persistence."""
import sys
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database import db_client
from dispatch_engine.dispatch_service import sync_technician_job_counters
from dispatch_engine.service_zones import SERVICE_ZONES


def _nearest_service_zone(lat: float, lon: float) -> str:
    """Find the nearest service zone for a coordinate."""
    best_zone = None
    best_score = None
    for zone, (zone_lat, zone_lon) in SERVICE_ZONES.items():
        score = (float(lat) - float(zone_lat)) ** 2 + (float(lon) - float(zone_lon)) ** 2
        if best_score is None or score < best_score:
            best_score = score
            best_zone = zone
    return best_zone


def persist_and_assign(
    fault_type: str,
    severity: str,
    job_lat: float,
    job_lon: float,
    tech_id: int,
    distance_km: float,
    duration_min: float,
    customer_name: str = "",
    customer_email: str = "",
    customer_user_id: int = None,
    contact_number: str = "",
    location_text: str = "",
    description: str = "",
    diagnosis_confidence: float = None,
) -> dict:
    """Persist a new service request in Firestore and assign the selected technician.

    This creates the service_request document with all denormalized fields,
    syncs technician job counters, and triggers route re-sequencing.

    Args:
        fault_type: Diagnosed fault type.
        severity: Severity level.
        job_lat: Job site latitude.
        job_lon: Job site longitude.
        tech_id: Selected technician ID.
        distance_km: Distance from technician to job.
        duration_min: Estimated travel time in minutes.
        customer_name: Customer name.
        customer_email: Customer email.
        customer_user_id: Customer user ID.
        contact_number: Customer contact number.
        location_text: Human-readable address string.
        description: Issue description.
        diagnosis_confidence: AI confidence score.

    Returns:
        dict with request_id, assigned_technician, distance_km, duration_min.
    """
    tech_record = db_client.get_technician_by_id(tech_id) or {}

    location_zone = _nearest_service_zone(job_lat, job_lon)

    doc_data = {
        "customer_user_id": customer_user_id,
        "customer_id": customer_user_id,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "contact_number": contact_number,
        "location_text": location_text,
        "location_zone": location_zone,
        "description": description,
        "fault_type": fault_type,
        "severity": severity,
        "diagnosis_confidence": diagnosis_confidence,
        "latitude": job_lat,
        "longitude": job_lon,
        "assigned_technician": tech_id,
        "assigned_technician_name": tech_record.get("name") or "",
        "assigned_technician_phone_number": db_client.resolve_technician_phone(tech_record),
        "assigned_technician_zone": tech_record.get("zone") or tech_record.get("location_zone") or tech_record.get("service_zone") or "",
        "assigned_technician_latitude": tech_record.get("current_latitude") or tech_record.get("latitude"),
        "assigned_technician_longitude": tech_record.get("current_longitude") or tech_record.get("longitude"),
        "distance_km": distance_km,
        "travel_time_min": duration_min,
        "assigned_at": datetime.utcnow(),
        "status": "assigned",
    }

    request_id = db_client.create_service_request(doc_data)

    # Sync counters
    try:
        db_client.sync_technician_job_counters_firestore(tech_id)
    except Exception:
        pass

    # Route re-sequencing
    try:
        from dispatch_engine.route_planner import insert_job_into_route
        insert_job_into_route(tech_id, request_id)
    except Exception:
        pass

    return {
        "request_id": request_id,
        "assigned_technician": tech_id,
        "distance_km": distance_km,
        "duration_min": duration_min,
    }
