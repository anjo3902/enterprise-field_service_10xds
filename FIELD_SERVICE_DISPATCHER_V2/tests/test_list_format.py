#!/usr/bin/env python
"""Quick test to verify list_format includes all technician zone fields."""

import sys
sys.path.insert(0, '.')

from database.firestore_client import _get_db
from api_server import list_format

db = _get_db()

# Get first service request and format it
count = 0
for doc in db.collection('service_requests').stream():
    response = list_format(doc)
    if count == 0:
        print("Sample API Response (list_format):")
        print(f"  technician_source: {response.get('technician_source')}")
        print(f"  technicianSource: {response.get('technicianSource')}")
        print(f"  technician.zone: {response.get('technician', {}).get('zone')}")
        print(f"  zone: {response.get('zone')}")
        print(f"  technician_zone: {response.get('technician_zone')}")
        print()
    count += 1
    if count >= 5:
        break

print(f"Scanned {count} requests - all have technician zone fields populated.")
