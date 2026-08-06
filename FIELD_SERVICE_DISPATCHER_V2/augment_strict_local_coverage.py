from __future__ import annotations

import json
import random
import re
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
    "trivandrum": {"trivandrum", "thiruvananthapuram", "kovalam", "vizhinjam", "neyyattinkara", "attingal", "mangalapuram"},
    "kollam": {"kollam", "ashtamudi", "karunagappally", "paravur"},
    "pathanamthitta": {"pathanamthitta", "adoor", "thiruvalla", "ranni"},
    "alappuzha": {"alappuzha", "alleppey", "cherthala", "kayamkulam", "mavelikkara"},
    "kottayam": {"kottayam", "kumarakom", "pala", "changanassery", "ettumanoor"},
    "idukki": {"idukki", "thekkady", "munnar", "thodupuzha", "kattappana"},
    "ernakulam": {"ernakulam", "kochi", "fort kochi", "aluva", "angamaly", "kakkanad"},
    "thrissur": {"thrissur", "guruvayur", "chavakkad", "irinjalakuda", "kodungallur", "chalakudy"},
    "palakkad": {"palakkad", "ottapalam", "mannarkkad", "chittur", "pattambi"},
    "malappuram": {"malappuram", "nilambur", "tirur", "manjeri", "perinthalmanna", "kondotty"},
    "kozhikode": {"kozhikode", "calicut", "kappad", "vadakara", "koyilandy"},
    "wayanad": {"wayanad", "kalpetta", "sulthan bathery", "bathery", "mananthavady", "banasura"},
    "kannur": {"kannur", "payyambalam", "thalassery", "iritty", "payyanur"},
    "kasaragod": {"kasaragod", "kasargod", "bekal", "kanhangad", "nileshwar"},
}

LEVEL_BY_SEVERITY = {
    "low": "junior technician",
    "medium": "technician",
    "high": "senior technician",
    "critical": "field engineer",
}

MAX_JOBS_BY_LEVEL = {
    "junior technician": 4,
    "technician": 6,
    "senior technician": 8,
    "field engineer": 10,
}

DOMAIN_CERTIFICATIONS = {
    "plumbing": ["Commercial Plumbing Systems", "Water Supply Safety", "Drainage and Sewage Operations"],
    "electrical": ["Electrical Safety Compliance", "LV Panel Maintenance", "Wiring and Circuit Diagnostics"],
    "fire_safety": ["Fire Alarm Systems", "Sprinkler and Suppression Systems", "Emergency Response Protocols"],
    "hvac": ["HVAC Preventive Maintenance", "Refrigeration Safety", "Ventilation Systems Service"],
    "mechanical": ["Building Mechanical Systems", "Elevator and Access Devices", "Structural Safety Basics"],
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


def _next_technician_code_start() -> int:
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT technician_code FROM technicians WHERE technician_code IS NOT NULL")).scalars().all()

    max_num = 0
    for code in rows:
        match = re.search(r"(\d+)$", str(code))
        if match:
            max_num = max(max_num, int(match.group(1)))
    return max_num + 1


def _next_phone_cursor_and_used() -> tuple[int, set[str]]:
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT phone_number FROM technicians WHERE phone_number IS NOT NULL")).scalars().all()

    used: set[str] = set()
    max_num = 6000000000
    for phone in rows:
        p = str(phone).strip()
        if re.fullmatch(r"\+91[6-9][0-9]{9}", p):
            used.add(p)
            max_num = max(max_num, int(p[3:]))

    return max_num + 1, used


def _next_unique_phone(used: set[str], cursor: int) -> tuple[str, int]:
    value = cursor
    while True:
        num = f"+91{value:010d}"
        value += 1
        if num[3] not in {"6", "7", "8", "9"}:
            continue
        if num not in used:
            used.add(num)
            return num, value


def _build_name(rng: random.Random, used_names: set[str]) -> str:
    for _ in range(5000):
        name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
        if name not in used_names:
            used_names.add(name)
            return name
    fallback = f"Technician {len(used_names) + 1}"
    used_names.add(fallback)
    return fallback


def _build_shift(level: str) -> tuple[str, str]:
    if level == "field engineer":
        return "08:00", "20:00"
    if level == "senior technician":
        return "08:00", "17:00"
    if level == "technician":
        return "09:00", "18:00"
    return "10:00", "18:00"


def _jitter(base_lat: float, base_lon: float, rng: random.Random) -> tuple[float, float]:
    return round(base_lat + rng.uniform(-0.06, 0.06), 6), round(base_lon + rng.uniform(-0.06, 0.06), 6)


def _load_technicians() -> list[dict[str, Any]]:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT
                    id,
                    name,
                    location_zone,
                    primary_domain,
                    certified_skills,
                    experience_level,
                    availability_state,
                    current_jobs,
                    max_jobs_per_day,
                    critical_fault_eligible
                FROM technicians
                ORDER BY id
                """
            )
        ).mappings().all()

    out: list[dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        item["district"] = _map_zone_to_district(item.get("location_zone"))
        item["domain"] = (item.get("primary_domain") or "").strip().lower()
        item["level"] = (item.get("experience_level") or "").strip().lower()
        item["skills"] = [str(s).strip().lower() for s in (item.get("certified_skills") or [])]
        item["availability_state"] = (item.get("availability_state") or "").strip().lower()
        out.append(item)
    return out


def _is_eligible_local_for_severity(tech: dict[str, Any], district: str, domain: str, severity: str) -> bool:
    expected_level = LEVEL_BY_SEVERITY[severity]
    if tech.get("district") != district:
        return False
    if tech.get("domain") != domain:
        return False
    if tech.get("level") != expected_level:
        return False
    if tech.get("availability_state") != "available":
        return False
    if int(tech.get("current_jobs") or 0) >= int(tech.get("max_jobs_per_day") or 0):
        return False
    if severity == "critical" and not bool(tech.get("critical_fault_eligible")):
        return False
    return True


def _find_missing_matrix(rows: list[dict[str, Any]]) -> dict[tuple[str, str, str], list[str]]:
    missing: dict[tuple[str, str, str], list[str]] = {}

    for district in DISTRICT_ORDER:
        for domain_upper, cfg in FAULT_TAXONOMY.items():
            domain = domain_upper.lower()
            faults = [f.lower() for f in cfg.get("faults", [])]
            for severity in ("low", "medium", "high", "critical"):
                local_candidates = [
                    t for t in rows if _is_eligible_local_for_severity(t, district, domain, severity)
                ]
                covered_faults = set()
                for tech in local_candidates:
                    covered_faults.update(tech.get("skills") or [])

                missing_faults = [f for f in faults if f not in covered_faults]
                if missing_faults:
                    missing[(district, domain, severity)] = missing_faults

    return missing


def _insert_rows(data: list[dict[str, Any]]) -> int:
    if not data:
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
        conn.execute(query, data)
        conn.commit()

    return len(data)


def main() -> None:
    rng = random.Random(20260321)
    existing = _load_technicians()
    used_names = {str(r.get("name") or "").strip() for r in existing if r.get("name")}

    missing = _find_missing_matrix(existing)
    print(f"missing district-domain-severity buckets: {len(missing)}")

    if not missing:
        print("No augmentation needed.")
        return

    next_code = _next_technician_code_start()
    phone_cursor, used_phones = _next_phone_cursor_and_used()

    new_rows: list[dict[str, Any]] = []

    for (district, domain, severity), missing_faults in sorted(missing.items()):
        level = LEVEL_BY_SEVERITY[severity]
        place = DISTRICT_PLACE[district]

        name = _build_name(rng, used_names)
        tech_code = f"TCH-{next_code:04d}"
        next_code += 1

        phone, phone_cursor = _next_unique_phone(used_phones, phone_cursor)
        shift_start, shift_end = _build_shift(level)
        lat, lon = _jitter(place["lat"], place["lon"], rng)

        # Make inserted technician cover all currently missing faults for this strict bucket.
        skill_list = sorted(set(missing_faults))

        certs = list(DOMAIN_CERTIFICATIONS[domain])
        if level == "field engineer":
            certs.append("Critical Fault Response")

        new_rows.append(
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
                "certifications": json.dumps(certs),
                "experience_level": level,
                "critical_fault_eligible": severity == "critical",
                "location_zone": place["zone"],
                "shift_start": shift_start,
                "shift_end": shift_end,
                "working_days": json.dumps(WORKING_DAYS),
                "max_jobs_per_day": MAX_JOBS_BY_LEVEL[level],
                "current_jobs": 0,
                "availability_state": "available",
                "phone_number": phone,
            }
        )

    inserted = _insert_rows(new_rows)
    print(f"Inserted technicians: {inserted}")


if __name__ == "__main__":
    main()
