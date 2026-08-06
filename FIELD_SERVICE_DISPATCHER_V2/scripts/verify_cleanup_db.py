#!/usr/bin/env python3
"""
Verify admin/test/cleanup actual effectiveness by querying Firestore directly.
Usage: python scripts/verify_cleanup_db.py [TEST_RUN_ID]
"""
import sys
from pathlib import Path
# Ensure project root is on sys.path so package imports work when run from scripts/
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))
from database.firestore_client import _get_db
from google.cloud import firestore

def find_leftovers(db, test_run_id):
    report = {}
    collections = [
        'service_requests',
        'technicians',
        'dispatch_results',
        'dispatch_audit_logs',
        'auth_tokens',
        'users',
        'e2e_cleanup_backups',
    ]
    for coll in collections:
        try:
            q1 = db.collection(coll).where('test_run_id', '==', test_run_id).stream()
            ids = [d.id for d in q1]
            # Also check is_e2e_test flag where applicable
            if coll in ('service_requests','technicians'):
                q2 = db.collection(coll).where('is_e2e_test', '==', True).stream()
                ids.extend([d.id for d in q2])
            report[coll] = list(dict.fromkeys(ids))
        except Exception as e:
            report[coll] = f'ERROR: {e}'
    return report

if __name__ == '__main__':
    test_run_id = sys.argv[1] if len(sys.argv) > 1 else None
    if not test_run_id:
        print('Usage: verify_cleanup_db.py TEST_RUN_ID')
        sys.exit(2)
    db = _get_db()
    print('Verifying cleanup for test_run_id=', test_run_id)
    rep = find_leftovers(db, test_run_id)
    clean = True
    for coll, items in rep.items():
        if isinstance(items, list) and items:
            print(f'LEFTOVERS in {coll}: {len(items)} -> sample: {items[:10]}')
            clean = False
        elif isinstance(items, str):
            print(f'ERROR scanning {coll}: {items}')
            clean = False
        else:
            print(f'No leftovers in {coll}')
    if clean:
        print('\nCLEANUP VERIFIED: no leftovers found')
        sys.exit(0)
    else:
        print('\nCLEANUP FAILED: leftovers detected')
        sys.exit(1)
