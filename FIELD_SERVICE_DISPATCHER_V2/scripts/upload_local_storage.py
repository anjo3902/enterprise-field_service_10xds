from google.cloud import storage
import os

client = storage.Client.from_service_account_json(
    "migration/firestore-backup/service-account.json"
)

bucket_name = "field-service-dispatcher"
bucket = client.bucket(bucket_name)

base_folder = "uploads"

uploaded = 0

for root, dirs, files in os.walk(base_folder):

    for file in files:

        local_path = os.path.join(root, file)

        blob_path = local_path.replace("\\", "/")

        blob = bucket.blob(blob_path)

        blob.upload_from_filename(local_path)

        uploaded += 1

        if uploaded % 25 == 0:
            print(f"Uploaded {uploaded} files")

print(f"\nCompleted: {uploaded} files uploaded")