"""
Create the three E2E test accounts (customer, technician, admin) in Firestore.
Lists any existing technician codes so we can link the technician account.
Safe to re-run — skips accounts that already exist.
"""
import requests, sys

BASE = "http://127.0.0.1:8000"
PASSWORD = "E2eTest9999"   # uppercase + lowercase + digit, no special chars in name


# ── 1. Find an available technician code ──────────────────────────────────
# We need *some* admin token to call /admin/technicians.
# Try any existing admin login first; if none, we skip technician linking.
tech_code = None
try:
    from database import firestore_client as fc
    techs = fc.get_technicians()
    free_techs = []
    for t in techs:
        code = t.get("technician_code") or ""
        if not code:
            continue
        # Check if already linked
        linked = fc.get_user_by_technician_id(t["id"])
        if not linked:
            free_techs.append((t["id"], code, t.get("name", "")))
    if free_techs:
        tech_code = free_techs[0][1]
        print(f"Found unlinked technician: id={free_techs[0][0]}, code={tech_code}, name={free_techs[0][2]}")
    else:
        print("No unlinked technicians available — technician account will be unlinked")
except Exception as e:
    print(f"Could not query Firestore directly: {e}")

# ── 2. Create accounts ────────────────────────────────────────────────────
accounts = [
    {
        "name": "Etwo Customer",
        "email": "e2e.customer@test.com",
        "password": PASSWORD,
        "phone": "9000000001",
        "role": "customer",
    },
    {
        "name": "Etwo Technician",
        "email": "e2e.tech@test.com",
        "password": PASSWORD,
        "phone": "9000000002",
        "role": "technician",
        **({"technician_code": tech_code} if tech_code else {}),
    },
    {
        "name": "Etwo Admin",
        "email": "e2e.admin@test.com",
        "password": PASSWORD,
        "phone": "9000000003",
        "role": "admin",
    },
]

created = {}
for acct in accounts:
    role = acct["role"]
    email = acct["email"]

    # Try login first — if it works the account already exists
    login_r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": PASSWORD})
    if login_r.status_code == 200:
        token = login_r.json().get("token")
        user  = login_r.json().get("user")
        print(f"[SKIP]  {role:12s}  {email}  already exists (id={user.get('id')})")
        created[role] = {"email": email, "password": PASSWORD, "token": token, "user": user}
        continue

    r = requests.post(f"{BASE}/auth/signup", json=acct)
    if r.status_code in (200, 201):
        print(f"[OK]    {role:12s}  {email}  created")
    elif r.status_code == 409:
        print(f"[SKIP]  {role:12s}  {email}  already registered (different password?)")
    else:
        print(f"[FAIL]  {role:12s}  {email}  -> {r.status_code} {r.text}")
        continue

    # Verify login
    login_r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": PASSWORD})
    if login_r.status_code == 200:
        token = login_r.json().get("token")
        user  = login_r.json().get("user")
        print(f"        login OK  token={token[:20]}...  role={user.get('role')}")
        created[role] = {"email": email, "password": PASSWORD, "token": token, "user": user}
    else:
        print(f"        login FAIL: {login_r.status_code} {login_r.text}")

print("\n── Summary ──────────────────────────────────────────────────────────")
for role, info in created.items():
    print(f"  {role:12s}  email={info['email']}  password={info['password']}")

# ── 3. Print the helpers.js block ─────────────────────────────────────────
if len(created) == 3:
    print("\n── helpers.js TEST_ACCOUNTS block ───────────────────────────────────")
    print("export const TEST_ACCOUNTS = {")
    for role, info in created.items():
        print(f"  {role}: {{ email: '{info['email']}', password: '{info['password']}' }},")
    print("}")
