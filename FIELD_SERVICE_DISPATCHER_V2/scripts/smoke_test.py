import time
import requests
import json
from pathlib import Path

BASE = "http://127.0.0.1:8000"

email = f"smoke{int(time.time())}@example.com"
pwd = "StrongPass1"

print("SIGNUP ->", email)
resp = requests.post(f"{BASE}/auth/signup", json={
    "name": "Smoke Tester",
    "email": email,
    "password": pwd,
    "phone": "9123456789",
})
print("SIGNUP STATUS:", resp.status_code)
print(resp.text)

print("LOGIN ->", email)
resp = requests.post(f"{BASE}/auth/login", json={"email": email, "password": pwd})
print("LOGIN STATUS:", resp.status_code)
print(resp.text)
if resp.status_code != 200:
    raise SystemExit("Login failed")

data = resp.json()
token = data.get("token")
user = data.get("user")
print("TOKEN:", token)
print("USER:", user)
user_id = user.get("id")

# Insert a test service request directly via the Firestore client
print("Creating test service_request in Firestore for user id=", user_id)
try:
    from database import firestore_client as fc
    from datetime import datetime

    doc = {
        "customer_user_id": user_id,
        "customer_id": user_id,
        "customer_name": user.get("name"),
        "customer_email": user.get("email"),
        "contact_number": user.get("phone"),
        "location_text": "12.971600, 77.594600",
        "location_zone": None,
        "description": "Smoke-test request",
        "fault_type": "other",
        "severity": "medium",
        "diagnosis_confidence": 0.99,
        "latitude": 12.9716,
        "longitude": 77.5946,
        "status": "pending",
        "created_at": datetime.utcnow(),
    }
    req_id = fc.create_service_request(doc)
    print("Created request id:", req_id)
except Exception as e:
    print("Failed to create via firestore_client:", e)
    raise

# Call customer my-requests
print("Calling GET /customer/my-requests")
headers = {"Authorization": f"Bearer {token}"}
resp = requests.get(f"{BASE}/customer/my-requests", headers=headers)
print("MY-REQUESTS STATUS:", resp.status_code)
print(resp.text)

# Call detail
print("Calling GET /customer/my-requests/", req_id)
resp = requests.get(f"{BASE}/customer/my-requests/{req_id}", headers=headers)
print("DETAIL STATUS:", resp.status_code)
print(resp.text)
