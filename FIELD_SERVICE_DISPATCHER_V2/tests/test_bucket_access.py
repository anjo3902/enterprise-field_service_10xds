from google.cloud import storage

client = storage.Client.from_service_account_json(
    "migration/firestore-backup/service-account.json"
)

bucket_name = "field-service-dispatcher"

try:
    bucket = client.bucket(bucket_name)

    print("Bucket object created")

    blobs = list(client.list_blobs(bucket_name, max_results=5))

    print(f"Found {len(blobs)} blobs")

    for blob in blobs:
        print(blob.name)

except Exception as e:
    print("ERROR")
    print(e)