# tests/verify_bucket.py

from google.cloud import storage

client = storage.Client.from_service_account_json(
    "migration/firestore-backup/service-account.json"
)

count = 0

for blob in client.list_blobs("field-service-dispatcher"):
    count += 1

print("Files in bucket:", count)