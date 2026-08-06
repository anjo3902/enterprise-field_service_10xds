import os
import asyncio
from pydantic import BaseModel

os.environ['USE_FIRESTORE'] = 'true'
from api_server import auth_login, app

class LoginRequest(BaseModel):
    email: str
    password: str

async def run_debug_simulation():
    print("Running debug simulation...")
    try:
        req = LoginRequest(email="admin@example.com", password="admin_password") # Or any password
        res = await auth_login(req)
        print("SUCCESS:", res)
    except Exception as e:
        print("EXCEPTION:", repr(e))

if __name__ == "__main__":
    asyncio.run(run_debug_simulation())
