from __future__ import annotations

import json
import math
import random
import re
from dataclasses import dataclass
from typing import Any

from sqlalchemy import text

from ai_engine.fault_taxonomy import FAULT_TAXONOMY
from database.postgres_client import engine


DISTRICT_ORDER = [
    "trivandrum",
    "kollam",
    "pathanamthitta",
    "alappuzha",
    "kottayam",
    "idukki",
    "ernakulam",
    "thrissur",
    "palakkad",
    "malappuram",
    "kozhikode",
    "wayanad",
    "kannur",
    "kasaragod",
]

# Use famous places (not district names) for new location_zone values.
DISTRICT_PLACE = {
    "trivandrum": {"zone": "Kovalam", "lat": 8.4000, "lon": 76.9784},
    "kollam": {"zone": "Ashtamudi", "lat": 8.8932, "lon": 76.6141},
    "pathanamthitta": {"zone": "Adoor", "lat": 9.1667, "lon": 76.7333},
    "alappuzha": {"zone": "Cherthala", "lat": 9.6833, "lon": 76.3333},
    "kottayam": {"zone": "Kumarakom", "lat": 9.6174, "lon": 76.4300},
    "idukki": {"zone": "Thekkady", "lat": 9.6031, "lon": 77.1610},
    "ernakulam": {"zone": "Fort Kochi", "lat": 9.9667, "lon": 76.2425},
    "thrissur": {"zone": "Guruvayur", "lat": 10.5943, "lon": 76.0411},
    "palakkad": {"zone": "Ottapalam", "lat": 10.7732, "lon": 76.3770},
    "malappuram": {"zone": "Nilambur", "lat": 11.2766, "lon": 76.2280},
    "kozhikode": {"zone": "Kappad", "lat": 11.3841, "lon": 75.7188},
    "wayanad": {"zone": "Banasura", "lat": 11.6712, "lon": 75.9422},
    "kannur": {"zone": "Payyambalam", "lat": 11.8674, "lon": 75.3651},
    "kasaragod": {"zone": "Bekal", "lat": 12.3957, "lon": 75.0364},
}

DISTRICT_ALIASES = {
    "trivandrum": {"trivandrum", "thiruvananthapuram", "kovalam", "vizhinjam", "neyyattinkara"},
    "kollam": {"kollam", "ashtamudi", "karunagappally", "paravur"},
    "pathanamthitta": {"pathanamthitta", "adoor", "thiruvalla", "ranni"},
    "alappuzha": {"alappuzha", "alleppey", "cherthala", "kayamkulam", "mavelikkara"},
    "kottayam": {"kottayam", "kumarakom", "pala", "changanassery", "ettumanoor"},
    "idukki": {"idukki", "thekkady", "munnar", "thodupuzha", "kattappana"},
    "ernakulam": {"ernakulam", "kochi", "fort kochi", "aluva", "angamaly", "kakkanad"},
    "thrissur": {"thrissur", "guruvayur", "chavakkad", "irinjalakuda", "kodungallur", "chalakudy"},
    "palakkad": {"palakkad", "ottapalam", "mannarkkad", "chittur", "pattambi"},
    "malappuram": {"malappuram", "nilambur", "tirur", "manjeri", "perinthalmanna"},
    "kozhikode": {"kozhikode", "calicut", "kappad", "vadakara", "koyilandy"},
    "wayanad": {"wayanad", "kalpetta", "sulthan bathery", "bathery", "mananthavady", "banasura"},
    "kannur": {"kannur", "payyambalam", "thalassery", "iritty", "payyanur"},
    "kasaragod": {"kasaragod", "kasargod", "bekal", "kanhangad", "nileshwar"},
}

DOMAIN_CERTIFICATIONS = {
    "plumbing": [
        "Commercial Plumbing Systems",
        "Water Supply Safety",
        "Drainage and Sewage Operations",
    ],
    "electrical": [
        "Electrical Safety Compliance",
        "LV Panel Maintenance",
        "Wiring and Circuit Diagnostics",
    ],
    "fire_safety": [
        "Fire Alarm Systems",
        "Sprinkler and Suppression Systems",
        "Emergency Response Protocols",
    ],
    "hvac": [
        "HVAC Preventive Maintenance",
        "Refrigeration Safety",
        "Ventilation Systems Service",
    ],
    "mechanical": [
        "Building Mechanical Systems",
        "Elevator and Access Devices",
        "Structural Safety Basics",
    ],
}

DOMAIN_PRIORITY_FAULTS = {
    "plumbing": ["burst_pipe", "flooding", "sewage_backup", "pipe_leakage"],
    "electrical": ["live_exposed_wire", "electrical_shock_hazard", "water_near_electrical", "exposed_wiring"],
    "fire_safety": ["fire_alarm_fault", "smoke_detector_not_working", "fire_exit_blocked", "fire_suppression_system_failure"],
    "hvac": ["ac_not_working", "boiler_not_heating", "ventilation_failure", "bms_failure"],
    "mechanical": ["elevator_stuck", "structural_damage", "falling_ceiling_tiles", "roof_leak"],
}

EXPERIENCE_LEVELS = [
    "junior technician",
    "technician",
    "senior technician",
    "field engineer",
]

MIN_EXPERIENCE_PER_DISTRICT = {
    "junior technician": 2,
    "technician": 3,
    "senior technician": 3,
    "field engineer": 2,
}

MAX_JOBS_BY_EXPERIENCE = {
    "junior technician": 4,
    "technician": 6,
    "senior technician": 8,
    "field engineer": 10,
}

FIRST_NAMES = [
    "Akhil", "Ajith", "Amal", "Anand", "Arjun", "Basil", "Deepak", "Eldho", "Faisal", "Gokul",
    "Hari", "Irfan", "Jithin", "Kiran", "Lijo", "Midhun", "Nikhil", "Nithin", "Pranav", "Rahul",
    "Ranjith", "Riyas", "Sandeep", "Sarath", "Shanif", "Sijo", "Sreenath", "Suhail", "Vipin", "Yaseen",
]

LAST_NAMES = [
    "Abraham", "Ali", "Antony", "Babu", "Benny", "Cherian", "Das", "George", "Hussain", "Issac",
    "Jose", "Joseph", "Khan", "Kumar", "Lal", "Mathew", "Menon", "Moideen", "Nair", "Paul",
    "Pillai", "Prasad", "Rafeeq", "Ravi", "Roy", "Shaji", "Thomas", "Varghese", "Vincent", "Vijayan",
]

WORKING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]


@dataclass
class TechnicianRow:
    id: int
    location_zone: str | None
    primary_domain: str | None
    certified_skills: list[str]
    experience_level: str | None
    phone_number: str | None


def _normalize_text(value: str | None) -> str:
    return (value or "").strip().lower()


def _map_zone_to_district(zone: str | None) -> str | None:
    z = _normalize_text(zone)
    if not z:
        return None

    best_match: tuple[int, str] | None = None
    for district, aliases in DISTRICT_ALIASES.items():
        for alias in aliases:
            alias_norm = alias.strip().lower()
            if alias_norm and alias_norm in z:
                candidate = (len(alias_norm), district)
                if best_match is None or candidate[0] > best_match[0]:
                    best_match = candidate

    return best_match[1] if best_match else None


def _normalize_phone(raw: str | None) -> str | None:
    value = (raw or "").strip()
    if not value:
        return None

    compact = re.sub(r"[^0-9+]", "", value)
    if compact.startswith("+91"):
        compact = compact[3:]
    elif compact.startswith("91") and len(compact) == 12:
        compact = compact[2:]

    if re.fullmatch(r"[6-9][0-9]{9}", compact):
        return f"+91{compact}"
    return None


def _next_unique_phone(used: set[str], cursor: int) -> tuple[str, int]:
    value = cursor
    while True:
        number = f"+91{value:010d}"
        value += 1
        # First digit after +91 should be 6-9 for mobile numbers.
        if number[3] not in {"6", "7", "8", "9"}:
            continue
        if number not in used:
            used.add(number)
            return number, value


def _partition_faults(faults: list[str], bucket_count: int) -> list[list[str]]:
    buckets = [[] for _ in range(bucket_count)]
    if not faults:
        return buckets

    for idx, fault in enumerate(faults):
        buckets[idx % bucket_count].append(fault)

    # Ensure no empty bucket by borrowing from the largest bucket.
    for i, bucket in enumerate(buckets):
        if bucket:
            continue
        largest = max(range(bucket_count), key=lambda x: len(buckets[x]))
        if buckets[largest]:
            buckets[i].append(buckets[largest].pop())
    return buckets


def _choose_experience(district_exp_counts: dict[str, int]) -> str:
    deficits = {
        level: max(0, MIN_EXPERIENCE_PER_DISTRICT[level] - district_exp_counts.get(level, 0))
        for level in EXPERIENCE_LEVELS
    }
    prioritized = sorted(deficits.items(), key=lambda x: (-x[1], EXPERIENCE_LEVELS.index(x[0])))
    if prioritized[0][1] > 0:
        return prioritized[0][0]

    # If all minimums are satisfied, bias toward technician/senior for practical dispatch.
    fallback_order = ["technician", "senior technician", "field engineer", "junior technician"]
    fallback_order.sort(key=lambda lvl: district_exp_counts.get(lvl, 0))
    return fallback_order[0]


def _build_certifications(domain: str, experience: str) -> list[str]:
    base = list(DOMAIN_CERTIFICATIONS[domain])
    if experience == "senior technician":
        base.append("Advanced Incident Handling")
    if experience == "field engineer":
        base.extend(["Critical Fault Response", "Site Leadership Certification"])
    return base


def _build_shift(experience: str) -> tuple[str, str]:
    if experience == "field engineer":
        return "08:00", "20:00"
    if experience == "senior technician":
        return "08:00", "17:00"
    if experience == "technician":
        return "09:00", "18:00"
    return "10:00", "18:00"


def _build_name(rng: random.Random, used_names: set[str]) -> str:
    for _ in range(2000):
        name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
        if name not in used_names:
            used_names.add(name)
            return name
    idx = len(used_names) + 1
    name = f"Technician {idx}"
    used_names.add(name)
    return name


def _jitter_coordinates(base_lat: float, base_lon: float, rng: random.Random) -> tuple[float, float]:
    # Small jitter keeps technicians local to district place center.
    lat = base_lat + rng.uniform(-0.08, 0.08)
    lon = base_lon + rng.uniform(-0.08, 0.08)
    return round(lat, 6), round(lon, 6)


def _ensure_phone_column() -> None:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS phone_number TEXT"))
        conn.commit()


def _fetch_all_technicians() -> list[TechnicianRow]:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT id, location_zone, primary_domain, certified_skills, experience_level, phone_number
                FROM technicians
                ORDER BY id
                """
            )
        ).mappings().all()

    result: list[TechnicianRow] = []
    for row in rows:
        result.append(
            TechnicianRow(
                id=int(row["id"]),
                location_zone=row.get("location_zone"),
                primary_domain=_normalize_text(row.get("primary_domain")),
                certified_skills=list(row.get("certified_skills") or []),
                experience_level=_normalize_text(row.get("experience_level")),
                phone_number=row.get("phone_number"),
            )
        )
    return result


def _update_phone_numbers(rows: list[TechnicianRow]) -> dict[str, int]:
    used: set[str] = set()
    id_to_phone: dict[int, str] = {}
    updates: list[dict[str, Any]] = []

    # Keep first valid unique existing number for each technician.
    for row in rows:
        normalized = _normalize_phone(row.phone_number)
        if normalized and normalized not in used:
            used.add(normalized)
            id_to_phone[row.id] = normalized

    phone_cursor = 6000000000
    for row in rows:
        existing = id_to_phone.get(row.id)
        if existing is None:
            generated, phone_cursor = _next_unique_phone(used, phone_cursor)
            id_to_phone[row.id] = generated
            updates.append({"id": row.id, "phone_number": generated})
        else:
            # Normalize stored format if needed.
            if row.phone_number != existing:
                updates.append({"id": row.id, "phone_number": existing})

    if updates:
        with engine.connect() as conn:
            conn.execute(
                text("UPDATE technicians SET phone_number = :phone_number WHERE id = :id"),
                updates,
            )
            conn.commit()

    return {
        "updated_existing_phone_rows": len(updates),
        "next_phone_cursor": phone_cursor,
    }


def _next_technician_code_start() -> int:
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT technician_code FROM technicians WHERE technician_code IS NOT NULL")).scalars().all()

    max_num = 0
    for code in rows:
        match = re.search(r"(\d+)$", str(code))
        if match:
            max_num = max(max_num, int(match.group(1)))
    return max_num + 1


def _build_coverage_maps(rows: list[TechnicianRow]) -> tuple[dict[str, dict[str, list[TechnicianRow]]], dict[str, dict[str, int]], set[str]]:
    by_district_domain: dict[str, dict[str, list[TechnicianRow]]] = {
        d: {domain.lower(): [] for domain in FAULT_TAXONOMY.keys()} for d in DISTRICT_ORDER
    }
    district_exp_counts: dict[str, dict[str, int]] = {
        d: {level: 0 for level in EXPERIENCE_LEVELS} for d in DISTRICT_ORDER
    }
    used_names: set[str] = set()

    for row in rows:
        if row.location_zone:
            used_names.add(str(row.location_zone))
        district = _map_zone_to_district(row.location_zone)
        if not district:
            continue

        if row.primary_domain in by_district_domain[district]:
            by_district_domain[district][row.primary_domain].append(row)

        if row.experience_level in district_exp_counts[district]:
            district_exp_counts[district][row.experience_level] += 1

    return by_district_domain, district_exp_counts, used_names


def _build_new_technicians(
    rows: list[TechnicianRow],
    start_code: int,
    phone_cursor: int,
) -> tuple[list[dict[str, Any]], int, int]:
    by_district_domain, district_exp_counts, _ = _build_coverage_maps(rows)

    rng = random.Random(20260321)
    used_person_names = {row.location_zone for row in rows if row.location_zone}

    domain_keys = [d.lower() for d in FAULT_TAXONOMY.keys()]
    insert_rows: list[dict[str, Any]] = []

    code_cursor = start_code
    used_phones = {_normalize_phone(r.phone_number) for r in rows if _normalize_phone(r.phone_number)}

    for district in DISTRICT_ORDER:
        place = DISTRICT_PLACE[district]
        for domain in domain_keys:
            fault_list = [f.lower() for f in FAULT_TAXONOMY[domain.upper()]["faults"]]
            existing = by_district_domain[district][domain]
            existing_faults = set()
            for tech in existing:
                existing_faults.update([str(f).lower() for f in tech.certified_skills])

            missing_faults = [f for f in fault_list if f not in existing_faults]
            deficit_count = max(0, 5 - len(existing))
            required_to_cover_faults = math.ceil(len(missing_faults) / 8) if missing_faults else 0
            new_count = max(deficit_count, required_to_cover_faults)
            if new_count <= 0:
                continue

            fault_buckets = _partition_faults(missing_faults, new_count)
            if not any(fault_buckets):
                # No missing faults but still need headcount, distribute full taxonomy lightly.
                fault_buckets = _partition_faults(fault_list, new_count)

            for i in range(new_count):
                experience = _choose_experience(district_exp_counts[district])
                district_exp_counts[district][experience] += 1

                name = _build_name(rng, used_person_names)
                tech_code = f"TCH-{code_cursor:04d}"
                code_cursor += 1

                phone_number, phone_cursor = _next_unique_phone(used_phones, phone_cursor)

                skill_set = set(fault_buckets[i])
                # Guarantee practical spread by adding a few priority faults for the domain.
                for priority_fault in DOMAIN_PRIORITY_FAULTS[domain][:3]:
                    skill_set.add(priority_fault)

                # Keep skill list finite and deterministic.
                skill_list = sorted(skill_set)[:12]

                # Critical support locally: field engineers carry all priority faults.
                if experience == "field engineer":
                    for pf in DOMAIN_PRIORITY_FAULTS[domain]:
                        if pf not in skill_list:
                            skill_list.append(pf)
                    skill_list = sorted(set(skill_list))

                shift_start, shift_end = _build_shift(experience)
                lat, lon = _jitter_coordinates(place["lat"], place["lon"], rng)

                insert_rows.append(
                    {
                        "name": name,
                        "skills": json.dumps(skill_list),
                        "latitude": lat,
                        "longitude": lon,
                        "available": True,
                        "workload": 0,
                        "technician_code": tech_code,
                        "primary_domain": domain,
                        "certified_skills": json.dumps(skill_list),
                        "certifications": json.dumps(_build_certifications(domain, experience)),
                        "experience_level": experience,
                        "critical_fault_eligible": experience == "field engineer",
                        "location_zone": place["zone"],
                        "shift_start": shift_start,
                        "shift_end": shift_end,
                        "working_days": json.dumps(WORKING_DAYS),
                        "max_jobs_per_day": MAX_JOBS_BY_EXPERIENCE[experience],
                        "current_jobs": 0,
                        "availability_state": "available",
                        "phone_number": phone_number,
                    }
                )

    # If any district still below minimum experience distribution, add cross-domain support techs.
    for district in DISTRICT_ORDER:
        place = DISTRICT_PLACE[district]
        for exp_level, minimum in MIN_EXPERIENCE_PER_DISTRICT.items():
            while district_exp_counts[district][exp_level] < minimum:
                domain = domain_keys[district_exp_counts[district][exp_level] % len(domain_keys)]
                district_exp_counts[district][exp_level] += 1

                name = _build_name(rng, used_person_names)
                tech_code = f"TCH-{code_cursor:04d}"
                code_cursor += 1
                phone_number, phone_cursor = _next_unique_phone(used_phones, phone_cursor)

                fallback_faults = [f.lower() for f in FAULT_TAXONOMY[domain.upper()]["faults"]][:8]
                shift_start, shift_end = _build_shift(exp_level)
                lat, lon = _jitter_coordinates(place["lat"], place["lon"], rng)

                insert_rows.append(
                    {
                        "name": name,
                        "skills": json.dumps(fallback_faults),
                        "latitude": lat,
                        "longitude": lon,
                        "available": True,
                        "workload": 0,
                        "technician_code": tech_code,
                        "primary_domain": domain,
                        "certified_skills": json.dumps(fallback_faults),
                        "certifications": json.dumps(_build_certifications(domain, exp_level)),
                        "experience_level": exp_level,
                        "critical_fault_eligible": exp_level == "field engineer",
                        "location_zone": place["zone"],
                        "shift_start": shift_start,
                        "shift_end": shift_end,
                        "working_days": json.dumps(WORKING_DAYS),
                        "max_jobs_per_day": MAX_JOBS_BY_EXPERIENCE[exp_level],
                        "current_jobs": 0,
                        "availability_state": "available",
                        "phone_number": phone_number,
                    }
                )

    return insert_rows, code_cursor, phone_cursor


def _insert_new_technicians(new_rows: list[dict[str, Any]]) -> int:
    if not new_rows:
        return 0

    query = text(
        """
        INSERT INTO technicians (
            name,
            skills,
            latitude,
            longitude,
            available,
            workload,
            technician_code,
            primary_domain,
            certified_skills,
            certifications,
            experience_level,
            critical_fault_eligible,
            location_zone,
            shift_start,
            shift_end,
            working_days,
            max_jobs_per_day,
            current_jobs,
            availability_state,
            phone_number
        ) VALUES (
            :name,
            CAST(:skills AS JSONB),
            :latitude,
            :longitude,
            :available,
            :workload,
            :technician_code,
            :primary_domain,
            CAST(:certified_skills AS JSONB),
            CAST(:certifications AS JSONB),
            :experience_level,
            :critical_fault_eligible,
            :location_zone,
            :shift_start,
            :shift_end,
            CAST(:working_days AS JSONB),
            :max_jobs_per_day,
            :current_jobs,
            :availability_state,
            :phone_number
        )
        """
    )

    with engine.connect() as conn:
        conn.execute(query, new_rows)
        conn.commit()

    return len(new_rows)


def _print_summary() -> None:
    print("\n=== Technician Dataset Summary ===")
    with engine.connect() as conn:
        total = conn.execute(text("SELECT COUNT(*) FROM technicians")).scalar_one()
        print(f"Total technicians: {total}")

        district_rows = conn.execute(
            text(
                """
                SELECT location_zone, COUNT(*) AS cnt
                FROM technicians
                GROUP BY location_zone
                ORDER BY cnt DESC, location_zone ASC
                """
            )
        ).mappings().all()

        print("\nTechnicians per location zone:")
        for row in district_rows:
            print(f"  {row['location_zone']}: {row['cnt']}")

        domain_rows = conn.execute(
            text(
                """
                SELECT primary_domain, COUNT(*) AS cnt
                FROM technicians
                GROUP BY primary_domain
                ORDER BY primary_domain
                """
            )
        ).mappings().all()

        print("\nCoverage per domain:")
        for row in domain_rows:
            print(f"  {row['primary_domain']}: {row['cnt']}")

        phone_missing = conn.execute(
            text("SELECT COUNT(*) FROM technicians WHERE phone_number IS NULL OR TRIM(phone_number) = ''")
        ).scalar_one()
        print(f"\nMissing phone numbers: {phone_missing}")


def main() -> None:
    _ensure_phone_column()

    existing_rows = _fetch_all_technicians()
    phone_stats = _update_phone_numbers(existing_rows)

    # Refresh rows after phone updates for accurate generation state.
    refreshed_rows = _fetch_all_technicians()

    next_code = _next_technician_code_start()
    new_rows, _, _ = _build_new_technicians(
        refreshed_rows,
        start_code=next_code,
        phone_cursor=phone_stats["next_phone_cursor"],
    )

    inserted = _insert_new_technicians(new_rows)

    print("=== Technician Dataset Extension Completed ===")
    print(f"Updated existing phone rows: {phone_stats['updated_existing_phone_rows']}")
    print(f"Inserted new technicians: {inserted}")

    _print_summary()


if __name__ == "__main__":
    main()
