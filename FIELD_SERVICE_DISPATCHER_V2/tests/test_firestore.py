from pathlib import Path
import sys
from google.api_core.exceptions import NotFound

# Allow running this file directly: python tests/test_firestore.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from firestore.firestore_client import FirestoreClient


def test_firestore_connection():
    try:
        client = FirestoreClient()
        technicians = client.get_all_technicians()

        print("Connected to Firestore")
        print("Technicians found:", len(technicians))

        for tech in technicians:
            print(tech)
    except NotFound:
        print("Firestore database was not found for the configured project/database.")
        print("Ask your infra team for these values and put them in backend env settings:")
        print("  FIRESTORE_PROJECT_ID=<their firestore project>")
        print("  FIRESTORE_DATABASE_ID=<database id, e.g. field-service-dispatcher>")
        print("After that, rerun: python tests/test_firestore.py")
    except Exception as exc:
        print(f"Firestore test failed: {exc}")
        raise


if __name__ == "__main__":
    test_firestore_connection()