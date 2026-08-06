from __future__ import annotations

import argparse
import json
import math
import random
from datetime import datetime, timedelta
from pathlib import Path
import sys

from sqlalchemy import text

PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai_engine.fault_taxonomy import FAULT_TAXONOMY
from dispatch_engine.dispatch_service import sync_technician_job_counters
from dispatch_engine.service_zones import SERVICE_ZONES
from database import db_client

# Preserve Postgres engine import as a non-executed backup (do not import at runtime)
if False:
    from database.postgres_client import engine  # pragma: no cover
else:
    engine = None
from validate_technician_coverage import DISTRICT_ALIASES


DEFAULT_SEED = 20260324
DEFAULT_RADIUS_MIN_KM = 5.0
DEFAULT_RADIUS_MAX_KM = 10.0
DEFAULT_NEARBY_RADIUS_KM = 30.0


GROUP_WEIGHTS = {
    "idle": 0.30,
    "partial": 0.45,
    "full": 0.25,
}


SEVERITY_BY_LEVEL = {
    "junior technician": ["low", "medium"],
    "technician": ["low", "medium", "high"],
    "senior technician": ["medium", "high", "critical"],
    "field engineer": ["high", "critical"],
}


def _safe_json_array(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip().lower() for v in value if str(v).strip()]
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return []
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(v).strip().lower() for v in parsed if str(v).strip()]
        except Exception:
            return [raw.lower()]
    return []


def _domain_faults(primary_domain: str) -> list[str]:
    domain_upper = (primary_domain or "").strip().upper()
    faults = FAULT_TAXONOMY.get(domain_upper, {}).get("faults", [])
    return [str(f).strip().lower() for f in faults if str(f).strip() and not str(f).startswith("OTHER_")]


def _map_zone_to_district(zone: str | None) -> str | None:
    z = (zone or "").strip().lower()
    if not z:
        return None

    best: tuple[int, str] | None = None
    for district, aliases in DISTRICT_ALIASES.items():
        for alias in aliases:
            a = alias.strip().lower()
            if a and a in z:
                cand = (len(a), district)
                if best is None or cand[0] > best[0]:
                    best = cand
    return best[1] if best else None


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)

    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def _random_point_within_radius(center_lat: float, center_lon: float, rng: random.Random, min_km: float, max_km: float) -> tuple[float, float]:
    earth_radius_km = 6371.0
    distance_km = rng.uniform(min_km, max_km)
    angular_distance = distance_km / earth_radius_km
    bearing = rng.uniform(0.0, 2.0 * math.pi)

    lat1 = math.radians(center_lat)
    lon1 = math.radians(center_lon)

    lat2 = math.asin(
        math.sin(lat1) * math.cos(angular_distance)
        + math.cos(lat1) * math.sin(angular_distance) * math.cos(bearing)
    )
    lon2 = lon1 + math.atan2(
        math.sin(bearing) * math.sin(angular_distance) * math.cos(lat1),
        math.cos(angular_distance) - math.sin(lat1) * math.sin(lat2),
    )

    return round(math.degrees(lat2), 6), round(math.degrees(lon2), 6)


def create_job_near_zone(zone: str, rng: random.Random, min_km: float = DEFAULT_RADIUS_MIN_KM, max_km: float = DEFAULT_RADIUS_MAX_KM) -> tuple[float, float]:
    """Generate realistic job coordinates near a known service zone center."""
    if zone not in SERVICE_ZONES:
        zone = rng.choice(list(SERVICE_ZONES.keys()))
    center_lat, center_lon = SERVICE_ZONES[zone]
    return _random_point_within_radius(center_lat, center_lon, rng, min_km=min_km, max_km=max_km)


def _nearest_zone(lat: float, lon: float) -> str:
    best_zone = None
    best_distance = float("inf")
    for zone, (z_lat, z_lon) in SERVICE_ZONES.items():
        d = _haversine_km(lat, lon, z_lat, z_lon)
        if d < best_distance:
            best_distance = d
            best_zone = zone
    return best_zone or "Ernakulam"


def _load_technicians() -> list[dict]:
    techs = db_client.get_technicians() or []
    technicians: list[dict] = []
    for row in techs:
        if row.get("latitude") is None or row.get("longitude") is None:
            continue
        item = dict(row)
        item["primary_domain"] = (item.get("primary_domain") or "mechanical").strip().lower()
        item["experience_level"] = (item.get("experience_level") or "technician").strip().lower()
        item["availability_state"] = (item.get("availability_state") or "available").strip().lower()
        item["max_jobs_per_day"] = int(item.get("max_jobs_per_day") or 0)
        # certified_skills may already be a list in Firestore
        item["certified_skills"] = _safe_json_array(item.get("certified_skills"))
        item["location_zone"] = item.get("location_zone") or _nearest_zone(float(item["latitude"]), float(item["longitude"]))
        technicians.append(item)
    return technicians


def _load_today_job_counts() -> dict[int, int]:
    counts: dict[int, int] = {}
    today = datetime.utcnow().date()
    for j in (db_client.get_jobs() or []):
        try:
            tid = j.get("assigned_technician")
            if tid is None:
                continue
            if j.get("status") not in {"assigned", "in_progress", "completed"}:
                continue
            created = j.get("created_at")
            if not created:
                continue
            if isinstance(created, str):
                created_dt = datetime.fromisoformat(created)
            else:
                created_dt = created
            if created_dt and hasattr(created_dt, "date") and created_dt.date() == today:
                counts[int(tid)] = counts.get(int(tid), 0) + 1
        except Exception:
            continue
    return counts


def _pick_group(rng: random.Random) -> str:
    return rng.choices(
        population=list(GROUP_WEIGHTS.keys()),
        weights=list(GROUP_WEIGHTS.values()),
        k=1,
    )[0]


def _plan_target_jobs(max_jobs: int, group: str, rng: random.Random) -> tuple[int, int]:
    """Return (target_jobs_today, active_jobs) for a technician."""
    if max_jobs <= 0:
        return 0, 0

    if group == "idle":
        return 0, 0

    if group == "full":
        return max_jobs, max_jobs

    if max_jobs == 1:
        return 0, 0

    target = rng.randint(1, max_jobs - 1)
    completed = rng.randint(0, min(2, max(0, target - 1)))
    active = max(1, target - completed)
    return target, active


def _pick_fault_and_severity(tech: dict, rng: random.Random) -> tuple[str, str]:
    skills = tech.get("certified_skills") or []
    domain_faults = _domain_faults(tech.get("primary_domain") or "")

    fault_pool = skills if skills else domain_faults
    if not fault_pool:
        fault_pool = ["other_mechanical"]

    severity_pool = SEVERITY_BY_LEVEL.get(tech.get("experience_level"), ["medium"])
    return rng.choice(fault_pool), rng.choice(severity_pool)


def _has_nearby_capable_technician(
    lat: float,
    lon: float,
    fault_type: str,
    technicians: list[dict],
    projected_jobs_today: dict[int, int],
    nearby_radius_km: float,
) -> bool:
    for tech in technicians:
        max_jobs = int(tech.get("max_jobs_per_day") or 0)
        if max_jobs <= 0:
            continue

        tech_id = int(tech["id"])
        if int(projected_jobs_today.get(tech_id, 0)) >= max_jobs:
            continue

        if fault_type not in (tech.get("certified_skills") or []):
            continue

        distance = _haversine_km(lat, lon, float(tech["latitude"]), float(tech["longitude"]))
        if distance <= nearby_radius_km:
            return True
    return False


def _clean_unrealistic_jobs() -> int:
    """
    Remove synthetic/random legacy jobs while preserving real user-submitted rows.
    Criteria: customer_user_id IS NULL OR obvious test customer naming.
    """
    with engine.connect() as conn:
        deleted = conn.execute(
            text(
                """
                DELETE FROM service_requests
                WHERE customer_user_id IS NULL
                   OR customer_name ILIKE 'Test %'
                   OR customer_name ILIKE 'Demo %'
                """
            )
        )
        conn.commit()
    return int(deleted.rowcount or 0)


def _ensure_service_request_schema() -> None:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS location_zone TEXT"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_service_requests_location_zone ON service_requests(location_zone)"))
        conn.commit()


def _backfill_missing_location_zone() -> int:
    jobs = db_client.get_jobs() or []
    updated = 0
    for row in jobs:
        if (not row.get("location_zone") or str(row.get("location_zone")).strip() == "") and row.get("latitude") is not None and row.get("longitude") is not None:
            zone = _nearest_zone(float(row["latitude"]), float(row["longitude"]))
            db_client.update_service_request(row.get("id"), {"location_zone": zone})
            updated += 1
    return updated


def _insert_generated_jobs(rows: list[dict]) -> int:
    if not rows:
        return 0
    # Persist each generated row into Firestore using the create_service_request wrapper
    created = 0
    for r in rows:
        try:
            db_client.create_service_request(r)
            created += 1
        except Exception:
            # best-effort: skip failures
            continue
    return created


def _update_current_jobs(active_jobs_by_tech: dict[int, int]) -> None:
    if not active_jobs_by_tech:
        return
    for tech_id, active_jobs in active_jobs_by_tech.items():
        try:
            db_client.update_technician(tech_id, {
                "current_jobs": int(active_jobs),
                "workload": int(active_jobs),
                "availability_state": "on_job" if int(active_jobs) > 0 else "available",
                "available": False if int(active_jobs) > 0 else True,
            })
        except Exception:
            pass


def generate_realistic_jobs(seed: int = DEFAULT_SEED, nearby_radius_km: float = DEFAULT_NEARBY_RADIUS_KM) -> dict:
    rng = random.Random(seed)

    _ensure_service_request_schema()
    backfilled = _backfill_missing_location_zone()
    removed = _clean_unrealistic_jobs()

    technicians = _load_technicians()
    if not technicians:
        return {"removed": removed, "generated": 0, "message": "No technicians found"}

    projected_jobs_today = _load_today_job_counts()

    generated_rows: list[dict] = []
    active_jobs_by_tech: dict[int, int] = {}
    group_stats = {"idle": 0, "partial": 0, "full": 0}

    now = datetime.now()
    base_contact = 8800000000 + rng.randint(0, 50000)
    contact_cursor = 0

    for tech in technicians:
        tech_id = int(tech["id"])
        max_jobs = int(tech.get("max_jobs_per_day") or 0)
        if max_jobs <= 0:
            active_jobs_by_tech[tech_id] = 0
            continue

        group = _pick_group(rng)
        target_jobs_today, active_jobs = _plan_target_jobs(max_jobs, group, rng)
        group_stats[group] += 1
        active_jobs_by_tech[tech_id] = active_jobs

        zone = str(tech.get("location_zone") or "").strip() or _nearest_zone(float(tech["latitude"]), float(tech["longitude"]))
        district = _map_zone_to_district(zone) or "kerala"

        for idx in range(target_jobs_today):
            fault_type, severity = _pick_fault_and_severity(tech, rng)

            coordinates = None
            for _ in range(10):
                lat, lon = create_job_near_zone(zone, rng)
                if _has_nearby_capable_technician(
                    lat,
                    lon,
                    fault_type=fault_type,
                    technicians=technicians,
                    projected_jobs_today=projected_jobs_today,
                    nearby_radius_km=nearby_radius_km,
                ):
                    coordinates = (lat, lon)
                    break

            if coordinates is None:
                # Last resort: use assigned technician anchor so dispatch data remains realistic.
                coordinates = (float(tech["latitude"]), float(tech["longitude"]))

            lat, lon = coordinates
            job_status = "assigned" if idx < active_jobs else "completed"

            created_at = now - timedelta(minutes=rng.randint(5, 600))
            assigned_at = created_at + timedelta(minutes=rng.randint(1, 20))
            completed_at = assigned_at + timedelta(minutes=rng.randint(20, 160)) if job_status == "completed" else None

            contact_cursor += 1
            contact_number = str(base_contact + contact_cursor)

            location_text = f"{zone}, {district.title()}"

            generated_rows.append(
                {
                    "customer_name": f"Demo Customer {tech_id:04d}-{idx + 1}",
                    "customer_email": f"demo{tech_id:04d}{idx + 1:02d}@example.com",
                    "contact_number": contact_number,
                    "location_text": location_text,
                    "location_zone": zone,
                    "description": f"Auto-generated realistic {fault_type.replace('_', ' ')} issue near {zone}",
                    "fault_type": fault_type,
                    "severity": severity,
                    "diagnosis_confidence": round(rng.uniform(0.72, 0.96), 2),
                    "image_severity": severity,
                    "description_severity": severity,
                    "safety_score": int(rng.randint(1, 3)),
                    "operational_impact": int(rng.randint(1, 3)),
                    "escalation_risk": int(rng.randint(1, 3)),
                    "safety_escalation": False,
                    "ai_domain": tech.get("primary_domain") or "mechanical",
                    "diagnosis_reason": f"Synthetic realistic {severity} {fault_type.replace('_', ' ')} for {zone} zone coverage.",
                    "final_reasoning": "Generated job aligned to technician domain, zone proximity, and workload policy.",
                    "latitude": lat,
                    "longitude": lon,
                    "assigned_technician": tech_id,
                    "distance_km": round(_haversine_km(float(tech["latitude"]), float(tech["longitude"]), lat, lon), 2),
                    "travel_time_min": int(max(8, _haversine_km(float(tech["latitude"]), float(tech["longitude"]), lat, lon) * 4.5)),
                    "status": job_status,
                    "created_at": created_at,
                    "assigned_at": assigned_at,
                    "completed_at": completed_at,
                }
            )

            projected_jobs_today[tech_id] = int(projected_jobs_today.get(tech_id, 0)) + 1

    inserted = _insert_generated_jobs(generated_rows)
    _update_current_jobs(active_jobs_by_tech)
    sync_technician_job_counters()

    return {
        "removed": removed,
        "backfilled": backfilled,
        "generated": inserted,
        "groups": group_stats,
    }


def _parse_args():
    parser = argparse.ArgumentParser(description="Generate geo-aware realistic service requests")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Deterministic random seed")
    parser.add_argument("--nearby-radius-km", type=float, default=DEFAULT_NEARBY_RADIUS_KM, help="Nearby capable technician radius")
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    result = generate_realistic_jobs(seed=args.seed, nearby_radius_km=args.nearby_radius_km)
    print("Geo-aware generation complete")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
