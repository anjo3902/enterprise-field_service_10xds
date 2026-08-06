import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + "/.."))

from database.postgres_client import engine
from sqlalchemy import text

with engine.connect() as conn:
    row = conn.execute(text("SELECT id FROM users LIMIT 1")).mappings().first()
    print('POSTGRES ID:', type(row['id']), repr(row['id']))
