#!/usr/bin/env python3
"""
E2E CLEANUP HELPER UTILITIES
============================

Companion utilities for safe E2E test data cleanup operations.
Provides dry-run validation, collection analysis, and rollback support.

USAGE:

1. Preview E2E records without deletion:
   python scripts/cleanup_e2e_firestore.py

2. Analyze collection sizes:
   python scripts/cleanup_e2e_helper.py --analyze

3. Generate cleanup report:
   python scripts/cleanup_e2e_helper.py --report

4. Create backup before deletion:
   python scripts/cleanup_e2e_helper.py --backup

5. Check deletion status:
   python scripts/cleanup_e2e_helper.py --verify
"""

import os
import sys
import json
import csv
from datetime import datetime
from typing import Dict, List, Optional
from collections import defaultdict

try:
    from firebase_admin import credentials, firestore, initialize_app, get_app
    from firebase_admin.firestore import Client
except ImportError:
    print("ERROR: firebase_admin not installed. Install with: pip install firebase-admin")
    sys.exit(1)


FIRESTORE_DATABASE_ID = os.getenv("FIRESTORE_DATABASE_ID", "field-service-dispatcher")


# ============================================================================
# FIRESTORE CONNECTION
# ============================================================================


def get_firestore_client() -> Optional[Client]:
    """Get or create Firestore client."""
    try:
        app = get_app()
        return firestore.client(database_id=FIRESTORE_DATABASE_ID)
    except ValueError:
        pass

    cred_path = "service-account.json"
    if not os.path.exists(cred_path):
        print(f"ERROR: {cred_path} not found")
        return None

    try:
        cred = credentials.Certificate(cred_path)
        initialize_app(cred)
        return firestore.client(database_id=FIRESTORE_DATABASE_ID)
    except Exception as e:
        print(f"ERROR: Failed to initialize Firestore: {e}")
        return None


# ============================================================================
# COLLECTION ANALYSIS
# ============================================================================


def analyze_collection(
    db: Client,
    collection_name: str,
) -> Dict:
    """
    Analyze a collection for statistics and E2E indicators.
    """
    stats = {
        "total_documents": 0,
        "e2e_indicators": defaultdict(int),
        "sample_documents": [],
        "errors": [],
    }

    try:
        docs = db.collection(collection_name).limit(1000).stream()

        for doc in docs:
            stats["total_documents"] += 1
            doc_data = doc.to_dict() or {}

            # Check for E2E indicators
            if any(
                "e2e" in str(v).lower()
                or "playwright" in str(v).lower()
                or "test" in str(v).lower()
                for v in doc_data.values()
            ):
                stats["e2e_indicators"]["detected"] += 1

            # Collect sample
            if len(stats["sample_documents"]) < 3:
                stats["sample_documents"].append({
                    "id": doc.id,
                    "keys": list(doc_data.keys()),
                    "has_e2e_markers": any(
                        "e2e" in str(v).lower()
                        for v in doc_data.values()
                    ),
                })

    except Exception as e:
        stats["errors"].append(str(e))

    return stats


def print_analysis_report(analysis: Dict[str, Dict]):
    """Print formatted analysis report."""
    print(f"\n{'='*80}")
    print("FIRESTORE COLLECTION ANALYSIS")
    print(f"{'='*80}\n")

    total_docs = sum(a.get("total_documents", 0) for a in analysis.values())
    e2e_detected = sum(
        a.get("e2e_indicators", {}).get("detected", 0)
        for a in analysis.values()
    )

    print(f"Total Documents Scanned: {total_docs}")
    print(f"E2E Indicators Detected: {e2e_detected}\n")

    print("Collection Breakdown:")
    print("-" * 80)

    for collection_name in sorted(analysis.keys()):
        stats = analysis[collection_name]
        doc_count = stats.get("total_documents", 0)
        e2e_count = stats.get("e2e_indicators", {}).get("detected", 0)

        print(f"\n{collection_name}:")
        print(f"  Total Documents: {doc_count}")
        if e2e_count > 0:
            print(f"  ⚠ E2E Indicators: {e2e_count}")
        else:
            print(f"  ✓ No E2E indicators")

        if stats.get("errors"):
            for error in stats["errors"]:
                print(f"  Error: {error}")

    print(f"\n{'='*80}\n")


# ============================================================================
# BACKUP UTILITIES
# ============================================================================


def backup_collection(
    db: Client,
    collection_name: str,
    output_dir: str = "backups",
) -> bool:
    """
    Backup collection data before deletion.
    """
    os.makedirs(output_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(
        output_dir,
        f"{collection_name}_backup_{timestamp}.json"
    )

    documents = []

    try:
        docs = db.collection(collection_name).stream()

        for doc in docs:
            doc_data = doc.to_dict() or {}
            doc_data["__document_id"] = doc.id
            documents.append(doc_data)

        with open(backup_file, "w") as f:
            json.dump(documents, f, indent=2, default=str)

        print(f"✓ Backed up {len(documents)} documents to {backup_file}")
        return True

    except Exception as e:
        print(f"✗ Backup failed for {collection_name}: {e}")
        return False


def backup_all_collections(
    db: Client,
    collections: List[str],
):
    """Backup all specified collections."""
    print(f"\nBacking up collections to 'backups/' directory...")
    print("-" * 80)

    backup_dir = "backups"
    os.makedirs(backup_dir, exist_ok=True)

    for collection in collections:
        backup_collection(db, collection, backup_dir)

    print(f"\n✓ Backup completed. Files saved to {backup_dir}/\n")


# ============================================================================
# VERIFICATION UTILITIES
# ============================================================================


def generate_e2e_indicator_report(
    db: Client,
    collection_name: str,
) -> List[Dict]:
    """
    Generate detailed report of records with E2E indicators.
    """
    records = []

    try:
        docs = db.collection(collection_name).stream()

        for doc in docs:
            doc_data = doc.to_dict() or {}
            indicators = []

            # Check each field
            for key, value in doc_data.items():
                value_str = str(value).lower()

                if "e2e" in value_str:
                    indicators.append(f"{key}=E2E")
                elif "playwright" in value_str:
                    indicators.append(f"{key}=Playwright")
                elif "test" in value_str:
                    indicators.append(f"{key}=Test")

            if indicators:
                records.append({
                    "doc_id": doc.id,
                    "collection": collection_name,
                    "indicators": ", ".join(indicators),
                    "timestamp": doc_data.get("created_at"),
                })

    except Exception as e:
        print(f"Error generating report for {collection_name}: {e}")

    return records


def export_e2e_report_to_csv(
    records: List[Dict],
    output_file: str = "e2e_indicators_report.csv"
):
    """Export E2E indicator report to CSV."""
    if not records:
        print("No E2E records to export")
        return

    try:
        with open(output_file, "w", newline="") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=["collection", "doc_id", "indicators", "timestamp"]
            )
            writer.writeheader()
            writer.writerows(records)

        print(f"✓ Report exported to {output_file}")
    except Exception as e:
        print(f"✗ Export failed: {e}")


# ============================================================================
# CLEANUP STATUS
# ============================================================================


def check_cleanup_status(
    db: Client,
    collections: List[str],
) -> Dict:
    """
    Check status of collections and remaining E2E indicators.
    """
    status = {
        "timestamp": datetime.now().isoformat(),
        "collections": {},
    }

    print("\nChecking cleanup status...")
    print("-" * 80)

    for collection in collections:
        try:
            total_docs = len(list(db.collection(collection).limit(10000).stream()))

            e2e_records = generate_e2e_indicator_report(db, collection)

            status["collections"][collection] = {
                "total_documents": total_docs,
                "e2e_records_found": len(e2e_records),
                "status": "CLEAN" if not e2e_records else "HAS_E2E_DATA",
            }

            if e2e_records:
                print(f"\n⚠ {collection}:")
                print(f"  Total: {total_docs} documents")
                print(f"  E2E Records: {len(e2e_records)}")
                for record in e2e_records[:5]:
                    print(f"    • {record['doc_id']}: {record['indicators']}")
            else:
                print(f"\n✓ {collection}: CLEAN ({total_docs} documents)")

        except Exception as e:
            print(f"\n✗ {collection}: ERROR - {e}")
            status["collections"][collection] = {"error": str(e)}

    print(f"\n{'='*80}\n")
    return status


# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================


def print_help():
    """Print help message."""
    print("""
E2E Cleanup Helper - Command Line Interface

USAGE:
  python scripts/cleanup_e2e_helper.py [COMMAND]

COMMANDS:
  --analyze       Analyze collections for E2E indicators
  --report        Generate comprehensive E2E indicator report
  --backup        Backup all collections before cleanup
  --verify        Check cleanup status after deletion
  --stats         Show collection statistics
  --help          Show this help message

EXAMPLES:
  # Analyze collections
  python scripts/cleanup_e2e_helper.py --analyze

  # Backup data
  python scripts/cleanup_e2e_helper.py --backup

  # Verify after cleanup
  python scripts/cleanup_e2e_helper.py --verify

NOTE:
  For actual deletion, use:
  python scripts/cleanup_e2e_firestore.py
""")


def main():
    """Main CLI handler."""
    db = get_firestore_client()
    if not db:
        sys.exit(1)

    collections = [
        "service_requests",
        "dispatch_results",
        "users",
        "auth_tokens",
        "technicians",
    ]

    command = sys.argv[1] if len(sys.argv) > 1 else "--help"

    if command == "--analyze":
        print("\nAnalyzing collections...")
        analysis = {
            name: analyze_collection(db, name)
            for name in collections
        }
        print_analysis_report(analysis)

    elif command == "--report":
        print("\nGenerating E2E indicator report...")
        all_records = []
        for collection in collections:
            records = generate_e2e_indicator_report(db, collection)
            all_records.extend(records)

        export_e2e_report_to_csv(all_records)
        print(f"Total E2E records found: {len(all_records)}")

    elif command == "--backup":
        backup_all_collections(db, collections)

    elif command == "--verify":
        check_cleanup_status(db, collections)

    elif command == "--stats":
        print("\nCollection Statistics:")
        print("-" * 80)
        analysis = {
            name: analyze_collection(db, name)
            for name in collections
        }
        print_analysis_report(analysis)

    elif command == "--help":
        print_help()

    else:
        print(f"Unknown command: {command}")
        print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
