from pathlib import Path
import sys

# Allow running this file directly: python dispatch_engine/technician_loader.py
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database import db_client


class TechnicianLoader:
    """
    Loads technicians from Firestore and filters based on availability and domain.
    """

    def load_available_technicians(self) -> list[dict]:
        return db_client.get_available_technicians()

    def load_by_domain(self, primary_domain: str) -> list[dict]:
        return db_client.get_available_technicians(primary_domain)

    def load_all_technicians(self) -> list[dict]:
        return db_client.get_technicians()