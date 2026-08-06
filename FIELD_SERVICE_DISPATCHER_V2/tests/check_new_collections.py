# tests/check_new_collections.py

import os
from google.cloud import firestore

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "service-account.json"

db = firestore.Client(
    database="field-service-dispatcher"
)

print("Collections:")

for collection in db.collections():
    print("-", collection.id)