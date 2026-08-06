import argparse
import json
import math
import random
import sys
from pathlib import Path

from sqlalchemy import text

# Allow running this file directly: python dispatch_engine/technician_generator.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai_engine.fault_taxonomy import FAULT_TAXONOMY
from database.postgres_client import engine
from dispatch_engine.service_zones import SERVICE_ZONES


DEFAULT_TECHNICIAN_COUNT = 500
DEFAULT_SEED = 20260314

# Exact target distribution requested for 500 technicians.
DOMAIN_DISTRIBUTION = [
    ("plumbing", "PLUMBING", 0.25),
    ("electrical", "ELECTRICAL", 0.25),
    ("hvac", "HVAC", 0.20),
    ("fire_safety", "FIRE_SAFETY", 0.15),
    ("mechanical", "MECHANICAL", 0.15),
]

EXPERIENCE_LEVELS = [
    "junior technician",
    "technician",
    "senior technician",
    "field engineer",
]

CRITICAL_ELIGIBLE_LEVELS = {"senior technician", "field engineer"}

ZONE_WEIGHTS_BY_DOMAIN = {
    "plumbing": [
        "Kochi", "Ernakulam", "Thrissur", "Trivandrum", "Kozhikode", "Malappuram",
        "Kollam", "Alappuzha", "Palakkad", "Kannur"
    ],
    "electrical": [
        "Kochi", "Ernakulam", "Trivandrum", "Chalakudy", "Kozhikode", "Kannur",
        "Kasargod", "Kollam", "Palakkad", "Kottayam"
    ],
    "hvac": [
        "Kochi", "Ernakulam", "Trivandrum", "Munnar", "Kondotty", "Kozhikode",
        "Kannur", "Kasargod", "Aluva", "Kalpetta"
    ],
    "fire_safety": [
        "Kochi", "Ernakulam", "Thrissur", "Trivandrum", "Kozhikode", "Kannur",
        "Kasargod", "Palakkad", "Kollam", "Pathanamthitta"
    ],
    "mechanical": [
        "Chalakudy", "Thrissur", "Kochi", "Munnar", "Kasargod", "Palakkad",
        "Kozhikode", "Perinthalmanna", "Thodupuzha", "Adoor"
    ],
}

ALL_ZONES = list(SERVICE_ZONES.keys())

CERTIFICATIONS_BY_DOMAIN = {
    "plumbing": [
        "Plumbing Trade License",
        "HDPE Pipe Jointing",
        "Commercial Sanitary Systems",
        "Sewage Line Safety",
    ],
    "electrical": [
        "Electrical Wireman License",
        "LT Panel Maintenance",
        "Industrial Electrical Safety",
        "Lockout Tagout (LOTO)",
    ],
    "hvac": [
        "HVAC Preventive Maintenance",
        "Refrigerant Handling",
        "Chiller Operations",
        "VRF Systems Service",
    ],
    "fire_safety": [
        "Fire Alarm Systems",
        "Sprinkler Network Maintenance",
        "Emergency Evacuation Protocol",
        "Extinguisher Compliance Inspection",
    ],
    "mechanical": [
        "Mechanical Systems Maintenance",
        "Elevator Safety Basics",
        "Building Fabric Maintenance",
        "Access Control Devices",
    ],
}

SHIFT_TEMPLATES = [
    # Day operations
    ("07:00", "16:00", ["Mon", "Tue", "Wed", "Thu", "Fri"]),
    ("08:00", "17:00", ["Mon", "Tue", "Wed", "Thu", "Fri"]),
    ("09:00", "18:00", ["Mon", "Tue", "Wed", "Thu", "Fri"]),

    # Rotational and extended support
    ("10:00", "19:00", ["Tue", "Wed", "Thu", "Fri", "Sat"]),
    ("12:00", "21:00", ["Mon", "Tue", "Wed", "Thu", "Fri"]),
    ("14:00", "23:00", ["Mon", "Tue", "Wed", "Thu", "Fri"]),

    # Weekend support
    ("06:00", "15:00", ["Wed", "Thu", "Fri", "Sat", "Sun"]),
    ("11:00", "20:00", ["Thu", "Fri", "Sat", "Sun", "Mon"]),

    # Night/emergency coverage
    ("20:00", "05:00", ["Mon", "Tue", "Wed", "Thu", "Fri"]),
    ("22:00", "07:00", ["Tue", "Wed", "Thu", "Fri", "Sat"]),
]

FIRST_NAMES = [
    "Arun", "Akhil", "Nithin", "Sreejith", "Vishnu", "Anand", "Rahul", "Rohith", "Ajith", "Naveen",
    "Jithin", "Nikhil", "Aswin", "Deepak", "Praveen", "Sanjay", "Bibin", "Shyam", "Faisal", "Niyas",
    "Riyas", "Shanif", "Jaison", "Jerin", "Mathew", "Joseph", "Sijo", "Aneesh", "Manu", "Rakesh",
    "Aravind", "Adarsh", "Afsal", "Alan", "Anoop", "Basil", "Bijoy", "Danish", "Dileep", "Ebin",
    "Eldho", "Farhan", "Gokul", "Harikrishnan", "Irfan", "Jibin", "Joyal", "Kiran", "Lijin", "Midhun",
    "Mithun", "Nandakishore", "Naufal", "Nivin", "Noufal", "Pranav", "Rijin", "Sahal", "Sarath", "Shibil",
    "Suhail", "Sujith", "Tarun", "Vinod", "Vipin", "Yaseen", "Yoosuf", "Zubair", "Abhilash", "Sreenath",
]

LAST_NAMES = [
    "Nair", "Menon", "Pillai", "Varghese", "Thomas", "Joseph", "Mathew", "Kumar", "Babu", "Das",
    "Krishnan", "Raj", "Ali", "Rahman", "Hameed", "George", "Paul", "Sebastian", "Vijayan", "Suresh",
    "Ravi", "Narayanan", "Haridas", "Sasidharan", "Sunil", "Davis", "Antony", "Cherian", "Kurian", "Koshy",
    "Khan", "Musthafa", "Shaji", "Rajan", "Lal", "Prasad", "Moideen", "Ashraf", "Ibrahim", "Sajeev",
    "Vincent", "Benny", "Roy", "Philip", "Salim", "Hussain", "Haroon", "Kabeer", "Ameer", "Rafeeq",
]

MIDDLE_PARTS = [
    "K", "M", "P", "R", "S", "T", "V", "A", "J", "N", "L", "F"
]


def _domain_plan(total: int) -> list:
    """Create deterministic domain distribution plan with exact counts."""
    plan = []
    for lower_domain, _, ratio in DOMAIN_DISTRIBUTION:
        plan.extend([lower_domain] * int(total * ratio))

    while len(plan) < total:
        plan.append(DOMAIN_DISTRIBUTION[len(plan) % len(DOMAIN_DISTRIBUTION)][0])

    return plan[:total]


def _pick_experience(rng: random.Random) -> str:
    return rng.choices(
        population=EXPERIENCE_LEVELS,
        weights=[0.24, 0.46, 0.20, 0.10],
        k=1,
    )[0]


def _max_jobs_for_experience(level: str, rng: random.Random) -> int:
    if level == "junior technician":
        return rng.randint(3, 5)
    if level == "technician":
        return rng.randint(5, 7)
    if level == "senior technician":
        return rng.randint(6, 9)
    return rng.randint(7, 10)


def _state_for_workload(rng: random.Random) -> str:
    return rng.choices(
        population=["available", "on_job", "offline"],
        weights=[0.66, 0.24, 0.10],
        k=1,
    )[0]


def _domain_faults(lower_domain: str) -> list:
    upper_domain = next(up for low, up, _ in DOMAIN_DISTRIBUTION if low == lower_domain)
    faults = FAULT_TAXONOMY[upper_domain]["faults"]
    return [fault for fault in faults if not fault.startswith("OTHER_")]


def _certified_skills(lower_domain: str, level: str, rng: random.Random) -> list:
    faults = _domain_faults(lower_domain)

    if level == "junior technician":
        size = rng.randint(3, 5)
    elif level == "technician":
        size = rng.randint(4, 6)
    elif level == "senior technician":
        size = rng.randint(6, 8)
    else:
        size = rng.randint(7, 10)

    size = min(size, len(faults))
    return sorted(rng.sample(faults, size))


def _certifications(lower_domain: str, level: str, rng: random.Random) -> list:
    items = CERTIFICATIONS_BY_DOMAIN[lower_domain]
    if level in CRITICAL_ELIGIBLE_LEVELS:
        size = min(len(items), 3)
    else:
        size = 2
    return sorted(rng.sample(items, size))


def _pick_zone(lower_domain: str, rng: random.Random) -> str:
    preferred = ZONE_WEIGHTS_BY_DOMAIN[lower_domain]
    # Keep strong domain locality while still distributing technicians across all configured Kerala zones.
    weighted_pool = preferred + preferred + ALL_ZONES
    return rng.choice(weighted_pool)


def _random_point_within_radius(center_lat: float, center_lon: float, rng: random.Random) -> tuple:
    """Return point around center at random distance in [5, 10] km."""
    earth_radius_km = 6371.0
    distance_km = rng.uniform(5.0, 10.0)
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


def _unique_name(used_names: set, rng: random.Random, index: int) -> str:
    for _ in range(10):
        first = rng.choice(FIRST_NAMES)
        last = rng.choice(LAST_NAMES)
        candidate = f"{first} {last}"
        if candidate not in used_names:
            used_names.add(candidate)
            return candidate

        candidate = f"{first} {rng.choice(MIDDLE_PARTS)} {last}"
        if candidate not in used_names:
            used_names.add(candidate)
            return candidate

    # Deterministic fallback, still human-readable and guaranteed unique.
    candidate = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)} {index:03d}"
    used_names.add(candidate)
    return candidate


def _to_json(value) -> str:
    return json.dumps(value, ensure_ascii=True)


def _ensure_technicians_schema(conn) -> None:
    """Evolve technicians table with dispatch-relevant columns while preserving existing structure."""
    conn.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS technicians(
                id SERIAL PRIMARY KEY,
                name TEXT,
                skills JSONB,
                latitude FLOAT,
                longitude FLOAT,
                available BOOLEAN,
                workload INT
            )
            """
        )
    )

    ddl = [
        "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS technician_code TEXT",
        "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS primary_domain TEXT",
        "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS certified_skills JSONB",
        "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS certifications JSONB",
        "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS experience_level TEXT",
        "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS critical_fault_eligible BOOLEAN",
        "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS location_zone TEXT",
        "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS shift_start TEXT",
        "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS shift_end TEXT",
        "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS working_days JSONB",
        "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS max_jobs_per_day INT",
        "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS current_jobs INT",
        "ALTER TABLE technicians ADD COLUMN IF NOT EXISTS availability_state TEXT",
    ]

    for statement in ddl:
        conn.execute(text(statement))


def _build_technician_record(index: int, lower_domain: str, rng: random.Random, used_names: set) -> dict:
    level = _pick_experience(rng)
    zone = _pick_zone(lower_domain, rng)
    lat_center, lon_center = SERVICE_ZONES[zone]
    latitude, longitude = _random_point_within_radius(lat_center, lon_center, rng)
    shift_start, shift_end, working_days = rng.choice(SHIFT_TEMPLATES)

    max_jobs = _max_jobs_for_experience(level, rng)
    state = _state_for_workload(rng)

    if state == "offline":
        current_jobs = 0
    elif state == "on_job":
        current_jobs = rng.randint(1, max_jobs)
    else:
        current_jobs = rng.randint(0, max(0, max_jobs - 1))

    name = _unique_name(used_names, rng, index)
    technician_code = f"TCH-{index:04d}"
    skills = _certified_skills(lower_domain, level, rng)
    certs = _certifications(lower_domain, level, rng)

    return {
        "technician_code": technician_code,
        "name": name,
        "primary_domain": lower_domain,
        "skills": _to_json(skills),
        "certified_skills": _to_json(skills),
        "certifications": _to_json(certs),
        "experience_level": level,
        "critical_fault_eligible": level in CRITICAL_ELIGIBLE_LEVELS,
        "latitude": latitude,
        "longitude": longitude,
        "location_zone": zone,
        "shift_start": shift_start,
        "shift_end": shift_end,
        "working_days": _to_json(working_days),
        "max_jobs_per_day": max_jobs,
        "current_jobs": current_jobs,
        "availability_state": state,
        "available": state == "available",
        "workload": current_jobs,
    }


def _insert_records(conn, records: list, replace_existing: bool) -> None:
    if replace_existing:
        conn.execute(text("TRUNCATE TABLE technicians RESTART IDENTITY"))

    insert_stmt = text(
        """
        INSERT INTO technicians (
            technician_code,
            name,
            primary_domain,
            skills,
            certified_skills,
            certifications,
            experience_level,
            critical_fault_eligible,
            latitude,
            longitude,
            location_zone,
            shift_start,
            shift_end,
            working_days,
            max_jobs_per_day,
            current_jobs,
            availability_state,
            available,
            workload
        ) VALUES (
            :technician_code,
            :name,
            :primary_domain,
            CAST(:skills AS JSONB),
            CAST(:certified_skills AS JSONB),
            CAST(:certifications AS JSONB),
            :experience_level,
            :critical_fault_eligible,
            :latitude,
            :longitude,
            :location_zone,
            :shift_start,
            :shift_end,
            CAST(:working_days AS JSONB),
            :max_jobs_per_day,
            :current_jobs,
            :availability_state,
            :available,
            :workload
        )
        """
    )
    conn.execute(insert_stmt, records)


def generate_technicians(count: int = DEFAULT_TECHNICIAN_COUNT, seed: int = DEFAULT_SEED, replace_existing: bool = True) -> None:
    """
    Generate production-style technicians aligned to AI diagnosis domains.

    - Deterministic with seed
    - Exact domain distribution
    - Kerala zone-aware locations within 5-10 km radius
    - Shift, workload, certifications, and availability fields
    """
    rng = random.Random(seed)
    domain_plan = _domain_plan(count)
    rng.shuffle(domain_plan)

    used_names = set()
    records = []

    for idx, lower_domain in enumerate(domain_plan, start=1):
        records.append(_build_technician_record(idx, lower_domain, rng, used_names))

    if len({r["technician_code"] for r in records}) != len(records):
        raise ValueError("Duplicate technician_code generated")

    if len({r["name"] for r in records}) != len(records):
        raise ValueError("Duplicate technician name generated")

    with engine.connect() as conn:
        _ensure_technicians_schema(conn)
        _insert_records(conn, records, replace_existing=replace_existing)
        conn.commit()

    print(
        f"Generated {len(records)} technicians (seed={seed}, replace_existing={replace_existing})"
    )


def _parse_args():
    parser = argparse.ArgumentParser(description="Generate production-ready technician dataset")
    parser.add_argument("--count", type=int, default=DEFAULT_TECHNICIAN_COUNT, help="Number of technicians to generate")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED, help="Deterministic seed")
    parser.add_argument(
        "--append",
        action="store_true",
        help="Append to existing rows (default behavior is replace/truncate)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    generate_technicians(count=args.count, seed=args.seed, replace_existing=not args.append)