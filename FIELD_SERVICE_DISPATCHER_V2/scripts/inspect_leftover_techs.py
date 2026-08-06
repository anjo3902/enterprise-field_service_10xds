#!/usr/bin/env python3
"""
Inspect leftover technicians that match a test_run_id or is_e2e_test flag and list any non-test jobs preventing deletion.
Usage: python scripts/inspect_leftover_techs.py TEST_RUN_ID
"""
import sys
from pathlib import Path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0, str(PROJECT_ROOT))
from database.firestore_client import _get_db

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: inspect_leftover_techs.py TEST_RUN_ID')
        sys.exit(2)
    test_run_id = sys.argv[1]
    db = _get_db()
    techs = []
    try:
        q1 = db.collection('technicians').where('test_run_id', '==', test_run_id).stream()
        techs.extend([t for t in q1])
    except Exception:
        pass
    try:
        q2 = db.collection('technicians').where('is_e2e_test', '==', True).stream()
        techs.extend([t for t in q2])
    except Exception:
        pass
    seen = {}
    for t in techs:
        tid = t.id
        if tid in seen:
            continue
        seen[tid] = True
        data = t.to_dict() or {}
        print(f'-- TECH {tid} -- name={data.get("name")} test_run_id={data.get("test_run_id")} is_e2e_test={data.get("is_e2e_test")} current_jobs={data.get("current_jobs")}')
        # find assigned non-test jobs
        try:
            jobs = db.collection('service_requests').where('assigned_technician', '==', int(tid)).stream()
            non_test = []
            for j in jobs:
                jd = j.to_dict() or {}
                if not (bool(jd.get('is_e2e_test')) or str(jd.get('test_run_id')) == test_run_id):
                    non_test.append((j.id, jd.get('status')))
            if non_test:
                print('  Non-test assigned jobs preventing deletion:')
                for nid, st in non_test:
                    print(f'    - {nid} status={st}')
            else:
                print('  No non-test assigned jobs found')
        except Exception as e:
            print('  Error checking jobs:', e)
