from google.cloud import storage

client = storage.Client.from_service_account_json(
    "migration/old-service-account.json"
)

bucket = client.bucket("anjo-storage")

print("Bucket:", bucket.name)

blobs = client.list_blobs(
    bucket,
    prefix="uploads/"
)

count = 0

for blob in blobs:
    print(blob.name)
    count += 1

    if count >= 20:
        break

print("Count:", count)