#!/usr/bin/env python
"""Quick test to verify response format includes technicianSource."""

import sys
sys.path.insert(0, '.')

from database.firestore_client import _get_db
from api_server import list_format

db = _get_db()

# Get first service request and format it
for doc in db.collection('service_requests').limit(1).stream():
    response = list_format(doc)
    print("API Response (list_format):")
    print(f"  technician_source: {response.get('technician_source')}")
    print(f"  technicianSource: {response.get('technicianSource')}")
    print(f"  assigned_technician_zone in Firestore: {doc.to_dict().get('assigned_technician_zone')}")
    break
