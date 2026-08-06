from __future__ import annotations

import re
from collections import defaultdict

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

MIN_EXPERIENCE_PER_DISTRICT = {
    "junior technician": 2,
    "technician": 3,
    "senior technician": 3,
    "field engineer": 2,
}

MIN_DOMAIN_PER_DISTRICT = 5
PHONE_PATTERN = re.compile(r"^\+91[6-9][0-9]{9}$")


def _map_zone_to_district(zone: str | None) -> str | None:
    z = (zone or "").strip().lower()
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


def main() -> None:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT
                    id,
                    location_zone,
                    primary_domain,
                    certified_skills,
                    experience_level,
                    critical_fault_eligible,
                    phone_number
                FROM technicians
                ORDER BY id
                """
            )
        ).mappings().all()

    district_domain_count = {
        d: {domain.lower(): 0 for domain in FAULT_TAXONOMY.keys()} for d in DISTRICT_ORDER
    }
    district_domain_faults = {
        d: {domain.lower(): set() for domain in FAULT_TAXONOMY.keys()} for d in DISTRICT_ORDER
    }
    district_experience = {
        d: defaultdict(int) for d in DISTRICT_ORDER
    }

    total_phone_invalid = 0
    seen_phones = set()
    duplicate_phones = set()

    for row in rows:
        district = _map_zone_to_district(row.get("location_zone"))
        domain = (row.get("primary_domain") or "").strip().lower()
        exp = (row.get("experience_level") or "").strip().lower()
        skills = [str(s).lower() for s in (row.get("certified_skills") or [])]

        phone = (row.get("phone_number") or "").strip()
        if not PHONE_PATTERN.fullmatch(phone):
            total_phone_invalid += 1
        else:
            if phone in seen_phones:
                duplicate_phones.add(phone)
            seen_phones.add(phone)

        if not district or district not in district_domain_count:
            continue
        if domain not in district_domain_count[district]:
            continue

        district_domain_count[district][domain] += 1
        district_domain_faults[district][domain].update(skills)
        district_experience[district][exp] += 1

    failures: list[str] = []

    for district in DISTRICT_ORDER:
        for domain_upper in FAULT_TAXONOMY.keys():
            domain = domain_upper.lower()
            count = district_domain_count[district][domain]
            if count < MIN_DOMAIN_PER_DISTRICT:
                failures.append(
                    f"{district}: domain {domain} has {count}, expected >= {MIN_DOMAIN_PER_DISTRICT}"
                )

            expected_faults = {f.lower() for f in FAULT_TAXONOMY[domain_upper]["faults"]}
            missing_faults = sorted(expected_faults - district_domain_faults[district][domain])
            if missing_faults:
                failures.append(
                    f"{district}: domain {domain} missing faults: {', '.join(missing_faults[:10])}"
                    + (" ..." if len(missing_faults) > 10 else "")
                )

        exp_counts = district_experience[district]
        for level, minimum in MIN_EXPERIENCE_PER_DISTRICT.items():
            value = exp_counts.get(level, 0)
            if value < minimum:
                failures.append(
                    f"{district}: experience {level} has {value}, expected >= {minimum}"
                )

    if total_phone_invalid > 0:
        failures.append(f"Invalid/missing phone format rows: {total_phone_invalid}")
    if duplicate_phones:
        failures.append(f"Duplicate phone numbers found: {len(duplicate_phones)}")

    print("=== Coverage Validation Report ===")
    print(f"Total technicians: {len(rows)}")

    print("\nTechnicians per district (mapped by location aliases):")
    for district in DISTRICT_ORDER:
        total = sum(district_domain_count[district].values())
        print(f"  {district}: {total}")

    print("\nTechnicians per domain (statewide):")
    statewide_domain = defaultdict(int)
    for district in DISTRICT_ORDER:
        for domain, cnt in district_domain_count[district].items():
            statewide_domain[domain] += cnt
    for domain in sorted(statewide_domain.keys()):
        print(f"  {domain}: {statewide_domain[domain]}")

    print("\nDistrict/domain matrix:")
    for district in DISTRICT_ORDER:
        line = [f"{domain}:{district_domain_count[district][domain]}" for domain in sorted(district_domain_count[district].keys())]
        print(f"  {district} -> " + ", ".join(line))

    if failures:
        print("\nVALIDATION_STATUS: FAILED")
        print("Issues:")
        for item in failures:
            print(f"  - {item}")
    else:
        print("\nVALIDATION_STATUS: PASSED")


if __name__ == "__main__":
    main()
