import os
from google.cloud import firestore

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"service-account.json"

db = firestore.Client(
    project="tenxgs-interns-work",
    database="field-service-dispatcher"
)

print("Project:", db.project)

for collection in db.collections():
    print(collection.id)