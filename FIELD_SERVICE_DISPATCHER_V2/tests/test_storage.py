# tests/test_storage.py

from google.cloud import storage

client = storage.Client.from_service_account_json(
    "migration/firestore-backup/service-account.json"
)

print("Project:", client.project)

for bucket in client.list_buckets():
    print("Bucket:", bucket.name)