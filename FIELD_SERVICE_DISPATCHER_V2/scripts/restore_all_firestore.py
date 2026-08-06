import json
import os
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

BACKUP_FOLDER = "migration/firestore-backup"

SKIP_FILES = {
    "service-account.json",
    "users.json"
}

for filename in os.listdir(BACKUP_FOLDER):

    if not filename.endswith(".json"):
        continue

    if filename in SKIP_FILES:
        continue

    filepath = os.path.join(BACKUP_FOLDER, filename)

    collection_name = filename.replace(".json", "")

    print(f"\nImporting {collection_name}...")

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        count = 0

        for item in data:

            if "id" not in item:
                continue

            doc_id = str(item["id"])

            db.collection(collection_name).document(doc_id).set(item)

            count += 1

        print(f"Imported {count} documents")

    except Exception as e:
        print(f"ERROR in {filename}")
        print(e)

print("\nMigration completed successfully")