from pathlib import Path
import sys

from sqlalchemy import text

# Allow running this file directly: python tests/test_technicians.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database.postgres_client import engine

with engine.connect() as conn:

    result = conn.execute(text("SELECT * FROM technicians LIMIT 10"))

    for row in result:
        print(row)