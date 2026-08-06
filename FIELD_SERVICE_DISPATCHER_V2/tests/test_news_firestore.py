from google.cloud import firestore
from google.oauth2 import service_account

creds = service_account.Credentials.from_service_account_file(
    "migration/firestore-backup/service-account.json"
)

db = firestore.Client(
    project=creds.project_id,
    credentials=creds,
    database="field-service-dispatcher"
)

collections = list(db.collections())

print("Collections:")
for col in collections:
    print("-", col.id)