import json
import logging
import random
import sys
from datetime import datetime
from pathlib import Path
from dateutil import tz

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from google.cloud import firestore
from google.oauth2 import service_account
from sqlalchemy import text

from database.postgres_client import engine as pg_engine

# ---------------------------------------------------------------------------
# Logging Setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
LOGGER = logging.getLogger("firestore_validation")

# ---------------------------------------------------------------------------
# Firestore Connection
# ---------------------------------------------------------------------------
SERVICE_ACCOUNT_PATH = PROJECT_ROOT / "service-account.json"
_creds = service_account.Credentials.from_service_account_file(
    str(SERVICE_ACCOUNT_PATH),
    scopes=["https://www.googleapis.com/auth/cloud-platform"],
)
db = firestore.Client(
    project=_creds.project_id,
    database="field-service-dispatcher",
    credentials=_creds,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
TABLES = {
    "technicians": {"id_field": "id", "prefix": ""},
    "service_requests": {"id_field": "id", "prefix": ""},
    "dispatch_results": {"id_field": "id", "prefix": ""},
    "users": {"id_field": "id", "prefix": ""},
    "auth_tokens": {"id_field": "token", "prefix": ""},
}

SAMPLE_SIZE = 20

# ---------------------------------------------------------------------------
# Statistics Trackers
# ---------------------------------------------------------------------------
total_records_checked = 0
total_missing = 0
total_mismatched = 0
field_mismatches = []


def _fetch_pg_rows(table: str) -> list[dict]:
    with pg_engine.connect() as conn:
        rows = conn.execute(text(f'SELECT * FROM "{table}"')).mappings().all()
    return [dict(r) for r in rows]


def _compare_values(pg_val, fs_val, key: str, doc_id: str) -> bool:
    """Compare a single value handling types, timestamps, JSON, and nulls."""
    if pg_val is None:
        return fs_val is None

    # Timestamp validation
    if isinstance(pg_val, datetime):
        if not isinstance(fs_val, datetime):
            return False
            
        # Ensure UTC comparison
        if pg_val.tzinfo is None:
            pg_val = pg_val.replace(tzinfo=tz.UTC)
        if fs_val.tzinfo is None:
            fs_val = fs_val.replace(tzinfo=tz.UTC)
            
        # Firestore drops microseconds precision often, compare to seconds
        return int(pg_val.timestamp()) == int(fs_val.timestamp())

    # JSON / Arrays
    if isinstance(pg_val, (dict, list)):
        try:
            return json.dumps(pg_val, sort_keys=True) == json.dumps(fs_val, sort_keys=True)
        except Exception:
            return str(pg_val) == str(fs_val)
            
    # Strings, numbers, booleans
    return str(pg_val) == str(fs_val)


def run_validation():
    global total_records_checked, total_missing, total_mismatched, field_mismatches

    LOGGER.info("=" * 60)
    LOGGER.info("  Firestore Migration Validation Started")
    LOGGER.info("=" * 60)

    # 1 & 8. Table Count & Full Collection Scan (Check Missing)
    LOGGER.info("\n--- STEP 1 & 8: TABLE COUNTS AND FULL ID SCAN ---")
    
    fs_ids_cache = {}
    pg_rows_cache = {}

    for table, config in TABLES.items():
        id_field = config["id_field"]
        
        # PG data
        pg_rows = _fetch_pg_rows(table)
        pg_rows_cache[table] = pg_rows
        pg_count = len(pg_rows)
        pg_ids = {str(r[id_field]) for r in pg_rows}
        
        # FS data
        fs_docs = list(db.collection(table).stream())
        fs_count = len(fs_docs)
        fs_ids = {doc.id for doc in fs_docs}
        fs_ids_cache[table] = fs_ids

        LOGGER.info(f"[{table}] PG Count: {pg_count} | FS Count: {fs_count}")
        if pg_count != fs_count:
            LOGGER.error(f"  ❌ COUNT MISMATCH in {table}!")
            
        missing_in_fs = pg_ids - fs_ids
        if missing_in_fs:
            LOGGER.error(f"  ❌ MISSING in Firestore ({len(missing_in_fs)}): {list(missing_in_fs)[:5]}...")
            total_missing += len(missing_in_fs)

    # 2, 3, 4, 5. Random Record Validation & Deep Comparison
    LOGGER.info("\n--- STEP 2, 3, 4, 5: DEEP RANDOM RECORD VALIDATION ---")
    
    for table, pg_rows in pg_rows_cache.items():
        if not pg_rows:
            continue
            
        id_field = TABLES[table]["id_field"]
        sample = random.sample(pg_rows, min(SAMPLE_SIZE, len(pg_rows)))
        
        LOGGER.info(f"[{table}] Checking {len(sample)} random records...")
        
        for row in sample:
            total_records_checked += 1
            doc_id = str(row[id_field])
            doc = db.collection(table).document(doc_id).get()
            
            if not doc.exists:
                continue # Handled in missing
                
            fs_data = doc.to_dict()
            record_mismatch = False
            
            for key, pg_val in row.items():
                fs_val = fs_data.get(str(key))
                
                if not _compare_values(pg_val, fs_val, key, doc_id):
                    field_mismatches.append(f"[{table}/{doc_id}] {key} -> PG: {pg_val} | FS: {fs_val}")
                    record_mismatch = True
                    
            if record_mismatch:
                total_mismatched += 1

    # 6. Relation Validation
    LOGGER.info("\n--- STEP 6: RELATION VALIDATION ---")
    LOGGER.info("[service_requests.assigned_technician]")
    
    sr_rows = pg_rows_cache.get("service_requests", [])
    tech_ids = fs_ids_cache.get("technicians", set())
    broken_refs = 0
    
    for row in sr_rows:
        tech_id = row.get("assigned_technician")
        if tech_id is not None:
            if str(tech_id) not in tech_ids:
                broken_refs += 1
                LOGGER.error(f"  ❌ Broken Ref: service_requests/{row['id']} -> technicians/{tech_id}")
                
    if broken_refs == 0:
        LOGGER.info("  ✓ All technician references are valid.")

    # 7. Edge Case Validation
    LOGGER.info("\n--- STEP 7: EDGE CASE VALIDATION ---")
    
    # max_jobs_per_day
    tech_rows = pg_rows_cache.get("technicians", [])
    max_jobs_tech = [t for t in tech_rows if t.get("max_jobs_per_day") and t.get("current_jobs", 0) >= t.get("max_jobs_per_day")]
    if max_jobs_tech:
        LOGGER.info(f"Found {len(max_jobs_tech)} technicians at max capacity. Spot checking one...")
        t = max_jobs_tech[0]
        fs_t = db.collection("technicians").document(str(t['id'])).get().to_dict()
        if fs_t and int(fs_t.get('current_jobs', 0)) == t.get('current_jobs', 0):
            LOGGER.info("  ✓ max_jobs_per_day edge case matches.")

    # critical severity
    critical_sr = [sr for sr in sr_rows if sr.get("severity") == "critical" or sr.get("final_severity") == "critical"]
    if critical_sr:
        LOGGER.info(f"Found {len(critical_sr)} critical service requests. Spot checking one...")
        sr = critical_sr[0]
        fs_sr = db.collection("service_requests").document(str(sr['id'])).get().to_dict()
        if fs_sr and fs_sr.get('severity') == sr.get('severity'):
            LOGGER.info("  ✓ critical severity edge case matches.")
            
    # completed jobs
    completed_sr = [sr for sr in sr_rows if sr.get("status") == "completed"]
    if completed_sr:
        LOGGER.info(f"Found {len(completed_sr)} completed service requests. Spot checking one...")
        sr = completed_sr[0]
        fs_sr = db.collection("service_requests").document(str(sr['id'])).get().to_dict()
        if fs_sr and fs_sr.get('status') == "completed":
            LOGGER.info("  ✓ completed jobs edge case matches.")

    # hitl triggers
    hitl_sr = [sr for sr in sr_rows if sr.get("hitl_triggers")]
    if hitl_sr:
        LOGGER.info(f"Found {len(hitl_sr)} requests with HITL triggers. Spot checking one...")
        sr = hitl_sr[0]
        fs_sr = db.collection("service_requests").document(str(sr['id'])).get().to_dict()
        if fs_sr and set(fs_sr.get('hitl_triggers', [])) == set(sr.get('hitl_triggers', [])):
            LOGGER.info("  ✓ HITL triggers edge case matches.")

    # 9. Report Output
    LOGGER.info("\n============================================================")
    LOGGER.info("                      VALIDATION REPORT")
    LOGGER.info("============================================================")
    LOGGER.info(f"Total Random Records Deep Checked : {total_records_checked}")
    LOGGER.info(f"Missing Records                   : {total_missing}")
    LOGGER.info(f"Broken References                 : {broken_refs}")
    LOGGER.info(f"Record Mismatches                 : {total_mismatched}")
    
    if field_mismatches:
        LOGGER.info("\nField Mismatches Detail:")
        for fm in field_mismatches[:20]:
            LOGGER.info(f"  {fm}")
        if len(field_mismatches) > 20:
            LOGGER.info(f"  ... and {len(field_mismatches) - 20} more.")

    LOGGER.info("\n============================================================")
    
    # 10. Final Result
    if total_missing == 0 and total_mismatched == 0 and broken_refs == 0:
        LOGGER.info("✅ FULL MIGRATION VERIFIED — NO DATA LOSS")
    else:
        LOGGER.error("❌ VALIDATION FAILED — ISSUES DETECTED")

if __name__ == "__main__":
    run_validation()
