from __future__ import annotations

import json
import random
import re
from collections import defaultdict

from sqlalchemy import text

from ai_engine.fault_taxonomy import FAULT_TAXONOMY
from database.postgres_client import engine
from validate_technician_coverage import DISTRICT_ALIASES, DISTRICT_ORDER

SEVERITY_TO_LEVEL = {
    "low": "junior technician",
    "medium": "technician",
    "high": "senior technician",
    "critical": "field engineer",
}

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


def map_zone_to_district(zone: str | None) -> str | None:
    z = (zone or "").strip().lower()
    if not z:
        return None
    best = None
    for district, aliases in DISTRICT_ALIASES.items():
        for alias in aliases:
            a = alias.strip().lower()
            if a and a in z:
                cand = (len(a), district)
                if best is None or cand[0] > best[0]:
                    best = cand
    return best[1] if best else None


def _next_code_start() -> int:
    with engine.connect() as conn:
        codes = conn.execute(text("SELECT technician_code FROM technicians WHERE technician_code IS NOT NULL")).scalars().all()
    max_num = 0
    for code in codes:
        m = re.search(r"(\d+)$", str(code))
        if m:
            max_num = max(max_num, int(m.group(1)))
    return max_num + 1


def _next_phone_start() -> tuple[int, set[str]]:
    with engine.connect() as conn:
        vals = conn.execute(text("SELECT phone_number FROM technicians WHERE phone_number IS NOT NULL")).scalars().all()
    used = set()
    max_num = 6000000000
    for v in vals:
        p = str(v).strip()
        if re.fullmatch(r"\+91[6-9][0-9]{9}", p):
            used.add(p)
            max_num = max(max_num, int(p[3:]))
    return max_num + 1, used


def _next_phone(used: set[str], cursor: int) -> tuple[str, int]:
    n = cursor
    while True:
        p = f"+91{n:010d}"
        n += 1
        if p[3] not in {"6", "7", "8", "9"}:
            continue
        if p not in used:
            used.add(p)
            return p, n


def _name(rng: random.Random, used: set[str]) -> str:
    for _ in range(3000):
        cand = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
        if cand not in used:
            used.add(cand)
            return cand
    x = f"Technician {len(used)+1}"
    used.add(x)
    return x


def _shift(level: str) -> tuple[str, str]:
    if level == "field engineer":
        return "08:00", "20:00"
    if level == "senior technician":
        return "08:00", "17:00"
    if level == "technician":
        return "09:00", "18:00"
    return "10:00", "18:00"


def _jitter(lat: float, lon: float, rng: random.Random) -> tuple[float, float]:
    return round(lat + rng.uniform(-0.05, 0.05), 6), round(lon + rng.uniform(-0.05, 0.05), 6)


def main() -> None:
    rng = random.Random(20260322)

    with engine.connect() as conn:
        rows = conn.execute(text('''
            SELECT name, location_zone, primary_domain, certified_skills, availability_state,
                   current_jobs, max_jobs_per_day, experience_level, critical_fault_eligible
            FROM technicians
        ''')).mappings().all()

    used_names = {str(r['name']).strip() for r in rows if r.get('name')}

    coverage = defaultdict(set)
    for r in rows:
        district = map_zone_to_district(r['location_zone'])
        domain = (r['primary_domain'] or '').strip().lower()
        if not district or not domain:
            continue
        if (r['availability_state'] or '').strip().lower() != 'available':
            continue
        if (r['current_jobs'] or 0) >= (r['max_jobs_per_day'] or 0):
            continue
        level = (r['experience_level'] or '').strip().lower()
        skills = [str(s).strip().lower() for s in (r['certified_skills'] or [])]

        for sev, expected in SEVERITY_TO_LEVEL.items():
            if level != expected:
                continue
            if sev == 'critical' and not bool(r['critical_fault_eligible']):
                continue
            coverage[(district, domain, sev)].update(skills)

    missing = {}
    for district in DISTRICT_ORDER:
        for domain_up, cfg in FAULT_TAXONOMY.items():
            domain = domain_up.lower()
            faults = [f.lower() for f in cfg['faults']]
            for sev in ['low', 'medium', 'high', 'critical']:
                covered = coverage.get((district, domain, sev), set())
                miss = [f for f in faults if f not in covered]
                if miss:
                    missing[(district, domain, sev)] = miss

    if not missing:
        print('No remaining strict gaps.')
        return

    code = _next_code_start()
    phone_cursor, used_phones = _next_phone_start()

    inserts = []
    for (district, domain, sev), miss in sorted(missing.items()):
        lvl = SEVERITY_TO_LEVEL[sev]
        place = DISTRICT_PLACE[district]
        nm = _name(rng, used_names)
        phone, phone_cursor = _next_phone(used_phones, phone_cursor)
        ss, se = _shift(lvl)
        lat, lon = _jitter(place['lat'], place['lon'], rng)

        inserts.append({
            'name': nm,
            'skills': json.dumps(sorted(set(miss))),
            'latitude': lat,
            'longitude': lon,
            'available': True,
            'workload': 0,
            'technician_code': f'TCH-{code:04d}',
            'primary_domain': domain,
            'certified_skills': json.dumps(sorted(set(miss))),
            'certifications': json.dumps(DOMAIN_CERTIFICATIONS[domain]),
            'experience_level': lvl,
            'critical_fault_eligible': sev == 'critical',
            'location_zone': place['zone'],
            'shift_start': ss,
            'shift_end': se,
            'working_days': json.dumps(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']),
            'max_jobs_per_day': MAX_JOBS_BY_LEVEL[lvl],
            'current_jobs': 0,
            'availability_state': 'available',
            'phone_number': phone,
        })
        code += 1

    with engine.connect() as conn:
        conn.execute(text('''
            INSERT INTO technicians (
                name, skills, latitude, longitude, available, workload, technician_code,
                primary_domain, certified_skills, certifications, experience_level,
                critical_fault_eligible, location_zone, shift_start, shift_end, working_days,
                max_jobs_per_day, current_jobs, availability_state, phone_number
            ) VALUES (
                :name, CAST(:skills AS JSONB), :latitude, :longitude, :available, :workload, :technician_code,
                :primary_domain, CAST(:certified_skills AS JSONB), CAST(:certifications AS JSONB), :experience_level,
                :critical_fault_eligible, :location_zone, :shift_start, :shift_end, CAST(:working_days AS JSONB),
                :max_jobs_per_day, :current_jobs, :availability_state, :phone_number
            )
        '''), inserts)
        conn.commit()

    print(f'Inserted targeted technicians: {len(inserts)}')


if __name__ == '__main__':
    main()
