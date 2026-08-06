import requests, json, sys

BASE = "http://127.0.0.1:8000"

ACCOUNTS = [
    {"role": "customer",   "email": "customer@test.com",  "password": "Test@1234"},
    {"role": "technician", "email": "tech@test.com",       "password": "Test@1234"},
    {"role": "admin",      "email": "admin@test.com",      "password": "Test@1234"},
]

for acct in ACCOUNTS:
    r = requests.post(f"{BASE}/auth/login", json={"email": acct["email"], "password": acct["password"]})
    print(f"{acct['role']:12s}  {acct['email']:30s}  ->  {r.status_code}  {r.text[:120]}")
