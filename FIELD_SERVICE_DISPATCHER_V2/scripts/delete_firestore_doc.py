from google.cloud import firestore
import os

TARGET_ID = '88'
COLLECTION = 'service_requests'

print(f'Connecting to Firestore (project from service-account.json or env)')
# Ensure GOOGLE_APPLICATION_CREDENTIALS is set to local service-account.json if present
svc = os.path.join(os.path.dirname(__file__), '..', 'service-account.json')
if os.path.exists(svc):
    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = svc

client = firestore.Client()

doc_ref = client.collection(COLLECTION).document(TARGET_ID)
snap = doc_ref.get()
if not snap.exists:
    print(f'Document {TARGET_ID} not found in collection {COLLECTION}')
    raise SystemExit(1)

data = snap.to_dict() or {}
print('Document data preview:')
for k in ['status','review_notes','is_test_data','created_at','created_by']:
    print(f'  {k}: {data.get(k)}')

# Safety checks
note = str(data.get('review_notes','') or '').lower()
status = str(data.get('status','') or '').lower()
if 'e2e' not in note and not data.get('is_test_data', False):
    print('Refusing to delete: document does not look like test data (no E2E marker and is_test_data not true)')
    raise SystemExit(1)

print(f'DELETING ID: {TARGET_ID}')
print('REASON: confirmed E2E test data')

doc_ref.delete()
print('Deleted.')

# Verify
snap2 = doc_ref.get()
if snap2.exists:
    print('ERROR: document still exists after delete')
    raise SystemExit(1)

# Final check: run a query for matching records in last 30 minutes via admin API is done elsewhere; here just confirm deletion.
print('VERIFY: document not present')
print('Done')
