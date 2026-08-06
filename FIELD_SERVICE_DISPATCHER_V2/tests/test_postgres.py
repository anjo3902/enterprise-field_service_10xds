from pathlib import Path
import sys

# Allow running this file directly: python tests/test_postgres.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database.postgres_client import test_connection

if __name__ == "__main__":
    test_connection()