import os
from google.cloud import storage

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "new-service-account.json"

client = storage.Client()

bucket = client.bucket("field-service-dispatcher")

print("Bucket:", bucket.name)

count = 0

for blob in bucket.list_blobs(max_results=10):
    print(blob.name)
    count += 1

print("Objects Found:", count)