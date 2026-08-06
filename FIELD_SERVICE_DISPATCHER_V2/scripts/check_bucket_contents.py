from google.cloud import storage

client = storage.Client.from_service_account_json(
    "service-account.json"
)

print("Project:", client.project)
print("Email:", client._credentials.service_account_email)