import json
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

with open(
    "migration/firestore-backup/users.json",
    "r",
    encoding="utf-8"
) as f:
    users = json.load(f)

print(f"Found {len(users)} users")

for user in users:
    doc_id = str(user["id"])

    db.collection("users").document(doc_id).set(user)

    print(f"Imported user {doc_id}")

print("Users import completed")