#!/usr/bin/env python3
"""Lightweight Firestore connection tester.

Attempts to connect using `service-account.json` and the database id
`field-service-dispatcher`. Prints debug info and lists top-level collections.
"""
from __future__ import annotations

import json
import os
import traceback
from google.oauth2 import service_account
from google.cloud import firestore


def main():
    creds_path = os.path.join(os.getcwd(), "service-account.json")
    if not os.path.exists(creds_path):
        print("service-account.json not found in working directory:", creds_path)
        return

    with open(creds_path, "r", encoding="utf-8") as f:
        info = json.load(f)
    project_id = info.get("project_id")

    print("Project ID from key:", project_id)

    creds = service_account.Credentials.from_service_account_file(creds_path)

    # Primary target database (as communicated):
    target_db = "field-service-dispatcher"
    print("Attempting Firestore client -> project=", project_id, " database=", target_db)

    try:
        client = firestore.Client(project=project_id, credentials=creds, database=target_db)
        print("Client project:", client.project)
        print("Database used:", target_db)
        cols = list(client.collections())
        print("Collections count:", len(cols))
        if cols:
            print("Some collections:", [c.id for c in cols[:10]])
        print("\nFirestore connection successful")
    except Exception as exc:
        print("\nConnection failed:", exc)
        traceback.print_exc()


if __name__ == "__main__":
    main()
