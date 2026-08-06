import os
import sys

# Setup mock imports just enough to test DB
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + "/.."))

from database.postgres_client import engine
from sqlalchemy import text

with engine.connect() as conn:
    row = conn.execute(text("SELECT email, password_salt, password_hash FROM users LIMIT 1")).mappings().first()
    email = row['email']
    salt = row['password_salt']
    phash = row['password_hash']
    
    print('POSTGRES EMAIL:', email)
    print('POSTGRES SALT:', type(salt), repr(salt))
    print('POSTGRES HASH:', type(phash), repr(phash))
