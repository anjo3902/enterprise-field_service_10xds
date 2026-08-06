from database.postgres_client import engine
from sqlalchemy import text
with engine.connect() as conn:
    row = conn.execute(text("SELECT email FROM users WHERE email='admin@example.com'")).mappings().first()
    print('ADMIN IN PG:', row)
