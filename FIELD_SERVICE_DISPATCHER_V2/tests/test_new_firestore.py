import os
from google.cloud import firestore

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "service-account.json"

db = firestore.Client(
    database="field-service-dispatcher"
)

print("Connected Successfully")

for collection in db.collections():
    print(collection.id)