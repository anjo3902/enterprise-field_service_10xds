"""
database/__init__.py
====================
Database routing layer.

Set USE_FIRESTORE = True  →  all DB calls routed to Firestore (field-service-dispatcher).
Set USE_FIRESTORE = False →  all DB calls routed to PostgreSQL (legacy).

PostgreSQL stays FULLY intact as a fallback; no business logic is changed.

Usage (in any module that wants the routed client):
    from database import db_client
    technicians = db_client.get_technicians()

Or import the flag directly:
    from database import USE_FIRESTORE
"""

import os

# ---------------------------------------------------------------------------
# Force Firestore-only mode at runtime. This module will always route DB calls
# to the Firestore backend. PostgreSQL code remains in the repository as a
# reference but is intentionally not used at runtime.
# ---------------------------------------------------------------------------
USE_FIRESTORE: bool = True

# Import the Firestore-backed db_client directly. Do not attempt to fall back
# to PostgreSQL — this keeps runtime behaviour deterministic for testing.
from database import firestore_client as db_client  # type: ignore[assignment]

__all__ = ["USE_FIRESTORE", "db_client"]
