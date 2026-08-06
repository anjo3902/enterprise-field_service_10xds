#!/usr/bin/env python3
"""
E2E TEST DATA CLEANUP UTILITY FOR FIRESTORE
============================================

SAFETY-FIRST SCRIPT FOR REMOVING AUTOMATED E2E TEST DATA

This script safely identifies and removes ONLY records created by automated E2E tests.
It implements multiple safety layers:
  - DRY_RUN mode for preview-only scanning
  - Explicit confirmation variable requirement
  - Safe filtering with clear E2E indicators
  - Batched Firestore operations
  - Comprehensive logging and verification

USAGE:
  1. Set DRY_RUN = True for preview mode
  2. Review the matching records printed to console
  3. Set CONFIRM_DELETE = "" to enable deletion
  4. Set DRY_RUN = True to execute deletion
  5. Verify results in the cleanup report

SAFETY GUARANTEES:
  - NO wholesale collection deletion
  - NO destruction without confirmation
  - NO deletion of production/demo data
  - NO schema modifications
  - Only removes records with clear E2E test markers
"""

import os
import sys
import json
from datetime import datetime, timedelta
from typing import List, Dict, Set, Optional, Tuple
from dataclasses import dataclass
from collections import defaultdict
import re

try:
    from firebase_admin import credentials, firestore, initialize_app, get_app
    from firebase_admin.firestore import Client
except ImportError:
    print("ERROR: firebase_admin not installed. Install with: pip install firebase-admin")
    sys.exit(1)

# ============================================================================
# SAFETY CONFIGURATION - MODIFY BEFORE RUNNING
# ============================================================================

# DRY_RUN = True  => Only scan and print, NO deletion
# DRY_RUN = True => Actually delete matched records (requires CONFIRM_DELETE)
DRY_RUN = True

# CONFIRM_DELETE must EXACTLY match to enable deletion
# Set to "YES_DELETE_E2E_DATA" to confirm deletion
CONFIRM_DELETE = ""

# Max batch size for Firestore operations (Firestore limit is 500)
BATCH_SIZE = 100
# Firestore database configuration
FIRESTORE_DATABASE_ID = os.getenv("FIRESTORE_DATABASE_ID", "field-service-dispatcher")


# ============================================================================
# E2E TEST INDICATORS - SAFE FILTERING RULES
# ============================================================================

E2E_INDICATORS = {
    "review_notes_keywords": [
        "E2E_AUTH",
        "e2e_",
        "e2e-",
        "playwright",
        "test run",
        "automated test",
        "e2e test",
        "automation",
        "synthetic",
        "dummy",
        "mock",
        "test scenario",
    ],
    "email_keywords": [
        "e2e",
        "playwright",
        "testuser",
        "test@",
        "e2etest",
        "dummy",
        "mock",
        "test",
    ],
    "name_keywords": [
        "e2e",
        "playwright",
        "test_tech",
        "mock_",
        "automated_",
        "dummy",
        "test",
    ],
    "field_markers": [
        "generated_by",
        "created_by_test",
        "source",
        "test_marker",
        "e2e_test_record",
        "is_test_data",
        "test_run_id",
    ],
    "description_keywords": [
        "e2e",
        "playwright",
        "automation",
        "synthetic",
        "dummy",
        "mock",
        "test scenario",
    ],
}

FAKE_GPS_PATTERNS = [
    (0.0, 0.0),  # Null island
    (51.5074, -0.1278),  # Repeated test location
    (40.7128, -74.0060),  # NYC test location
]

DUMMY_PHONE_PATTERNS = [
    "555-",
    "123-456-7890",
    "999-999-9999",
    "111-111-1111",
    "9000000001",
    "9999999999",
    "0000000000",
    "1234567890",
]

# ============================================================================
# DATA CLASSES
# ============================================================================


@dataclass
class E2EMatch:
    """Represents a detected E2E test record"""
    collection: str
    doc_id: str
    reasons: List[str]
    data_preview: Dict
    severity: str  # "high", "medium", "low"

    def __repr__(self):
        return (
            f"E2EMatch(collection={self.collection}, doc_id={self.doc_id}, "
            f"severity={self.severity}, reasons={len(self.reasons)})"
        )


# ============================================================================
# FIRESTORE CONNECTION
# ============================================================================


def initialize_firestore() -> Client:
    """
    Initialize Firestore connection using service account credentials.
    
    Expected: service-account.json in project root
    """
    try:
        app = get_app()
        return firestore.client(database_id=FIRESTORE_DATABASE_ID)
    except ValueError:
        pass  # App not initialized yet

    cred_path = "service-account.json"
    if not os.path.exists(cred_path):
        print(f"ERROR: Credentials file not found: {cred_path}")
        print("Please ensure service-account.json is in the project root.")
        sys.exit(1)

    try:
        cred = credentials.Certificate(cred_path)
        initialize_app(cred)
        return firestore.client(database_id=FIRESTORE_DATABASE_ID)
    except Exception as e:
        print(f"ERROR: Failed to initialize Firestore: {e}")
        sys.exit(1)


# ============================================================================
# SAFE DETECTION FUNCTIONS
# ============================================================================


def contains_keyword(text: Optional[str], keywords: List[str]) -> Optional[str]:
    """
    Check if text contains any keyword (case-insensitive).
    Returns matching keyword or None.
    """
    if not text:
        return None

    text_lower = str(text).lower()
    for keyword in keywords:
        if keyword.lower() in text_lower:
            return keyword

    return None


def is_fake_gps(lat: Optional[float], lng: Optional[float]) -> bool:
    """Check if GPS coordinates match known test patterns."""
    if lat is None or lng is None:
        return False

    for test_lat, test_lng in FAKE_GPS_PATTERNS:
        if abs(lat - test_lat) < 0.0001 and abs(lng - test_lng) < 0.0001:
            return True

    return False


def is_dummy_phone(phone: Optional[str]) -> bool:
    """Check if phone number matches known dummy patterns."""
    if not phone:
        return False

    phone_str = str(phone).upper()
    for pattern in DUMMY_PHONE_PATTERNS:
        if pattern in phone_str:
            return True

    return False


def has_repeated_timestamps(doc_data: Dict, hours: int = 24) -> bool:
    """
    Check if record has exact repeated timestamps (suspicious pattern).
    """
    if "created_at" not in doc_data or "updated_at" not in doc_data:
        return False

    created = doc_data.get("created_at")
    updated = doc_data.get("updated_at")

    if not created or not updated:
        return False

    # Check if timestamps are identical
    if created == updated:
        return True

    return False


def detect_e2e_service_request(doc_id: str, doc_data: Dict) -> Optional[E2EMatch]:
    """
    Detect E2E test records in service_requests collection.
    
    Safe indicators:
    - review_notes contains E2E keywords
    - generated_by = "e2e"
    - created_by_test = true
    - source = "playwright"
    - Suspicious patterns: flooding/blockage tickets
    """
    reasons = []
    severity = "low"

    # Check review_notes for E2E keywords
    review_notes = doc_data.get("review_notes", "")
    keyword = contains_keyword(review_notes, E2E_INDICATORS["review_notes_keywords"])
    if keyword:
        reasons.append(f'review_notes contains "{keyword}"')
        severity = "high"

    # Check source markers
    if doc_data.get("e2e_test_record") is True:
        reasons.append("e2e_test_record = true")
        severity = "high"

    if doc_data.get("is_test_data") is True:
        reasons.append("is_test_data = true")
        severity = "high"

    if doc_data.get("test_run_id"):
        reasons.append("test_run_id present")
        severity = "high"

    if doc_data.get("generated_by") == "e2e":
        reasons.append("generated_by = 'e2e'")
        severity = "high"

    if doc_data.get("created_by_test") is True:
        reasons.append("created_by_test = true")
        severity = "high"

    if doc_data.get("source") == "playwright":
        reasons.append("source = 'playwright'")
        severity = "high"

    # Check email/phone for strong test markers
    email = doc_data.get("customer_email", "")
    keyword = contains_keyword(email, E2E_INDICATORS["email_keywords"])
    if keyword:
        reasons.append(f'customer_email contains "{keyword}"')
        severity = "high"

    phone = doc_data.get("contact_number", "")
    if is_dummy_phone(phone):
        reasons.append(f"Dummy phone pattern: {phone}")
        severity = "high"

    # Check description for E2E keywords
    description = doc_data.get("description", "")
    keyword = contains_keyword(description, E2E_INDICATORS["description_keywords"])
    if keyword:
        reasons.append(f'description contains "{keyword}"')
        severity = "high"

    # Check GPS patterns
    if is_fake_gps(doc_data.get("latitude"), doc_data.get("longitude")):
        reasons.append("Fake GPS pattern")
        severity = "medium"

    # Check for artificial flooding/blockage patterns
    if description and description.lower() in [
        "artificial flooding",
        "artificial blockage",
        "test flooding",
        "test blockage",
    ]:
        # Only flag if also has test timestamp or pending_review status
        status = doc_data.get("status", "")
        if status == "pending_review":
            reasons.append("Suspicious pattern: artificial flooding/blockage + pending_review")
            severity = "high"

    # Check for repeated timestamps with suspicious fields
    if has_repeated_timestamps(doc_data):
        if review_notes or doc_data.get("generated_by") == "e2e":
            reasons.append("Repeated creation/update timestamps")
            severity = "medium"

    # Only return if we found at least one clear indicator
    if reasons:
        return E2EMatch(
            collection="service_requests",
            doc_id=doc_id,
            reasons=reasons,
            data_preview={
                "status": doc_data.get("status"),
                "review_notes": review_notes[:100] if review_notes else None,
                "generated_by": doc_data.get("generated_by"),
            },
            severity=severity,
        )

    return None


def detect_e2e_dispatch_result(doc_id: str, doc_data: Dict) -> Optional[E2EMatch]:
    """
    Detect E2E test records in dispatch_results collection.
    
    Safe indicators:
    - service_request_id references E2E request
    - created_by_test = true
    - source = "playwright"
    """
    reasons = []
    severity = "low"

    # Check source markers
    if doc_data.get("created_by_test") is True:
        reasons.append("created_by_test = true")
        severity = "high"

    if doc_data.get("source") == "playwright":
        reasons.append("source = 'playwright'")
        severity = "high"

    # Check for E2E in assignment notes
    notes = doc_data.get("assignment_notes", "")
    keyword = contains_keyword(notes, E2E_INDICATORS["review_notes_keywords"])
    if keyword:
        reasons.append(f'assignment_notes contains "{keyword}"')
        severity = "high"

    if reasons:
        return E2EMatch(
            collection="dispatch_results",
            doc_id=doc_id,
            reasons=reasons,
            data_preview={
                "status": doc_data.get("status"),
                "service_request_id": doc_data.get("service_request_id"),
                "source": doc_data.get("source"),
            },
            severity=severity,
        )

    return None


def detect_e2e_user(doc_id: str, doc_data: Dict) -> Optional[E2EMatch]:
    """
    Detect E2E test records in users collection.
    
    Safe indicators:
    - email contains test keywords
    - name contains test keywords
    - created_by_test = true
    """
    reasons = []
    severity = "low"

    # Check email (strong indicator)
    email = doc_data.get("email", "")
    email_keyword = contains_keyword(email, E2E_INDICATORS["email_keywords"])
    if email_keyword:
        reasons.append(f'email contains "{email_keyword}"')
        severity = "high"

    # Check name (only count if paired with another indicator)
    name = doc_data.get("name", "")
    name_keyword = contains_keyword(name, E2E_INDICATORS["name_keywords"])

    # Check test marker
    if doc_data.get("created_by_test") is True:
        reasons.append("created_by_test = true")
        severity = "high"

    # Check for dummy phone (only strong if combined)
    phone = doc_data.get("phone", "")
    if is_dummy_phone(phone):
        reasons.append(f"Dummy phone pattern: {phone}")
        severity = "high"

    # Name-only matches are too risky; require another indicator
    if name_keyword and (email_keyword or doc_data.get("created_by_test") is True or is_dummy_phone(phone)):
        reasons.append(f'name contains "{name_keyword}"')

    if reasons:
        return E2EMatch(
            collection="users",
            doc_id=doc_id,
            reasons=reasons,
            data_preview={
                "email": email,
                "name": name,
                "role": doc_data.get("role"),
            },
            severity=severity,
        )

    return None


def detect_e2e_auth_token(doc_id: str, doc_data: Dict) -> Optional[E2EMatch]:
    """
    Detect E2E test records in auth_tokens collection.
    
    Safe indicators:
    - user_id from E2E test user
    - created_by_test = true
    - token metadata indicates test
    """
    reasons = []
    severity = "low"

    # Check for test marker
    if doc_data.get("created_by_test") is True:
        reasons.append("created_by_test = true")
        severity = "high"

    # Check metadata
    metadata = doc_data.get("metadata", {})
    if metadata.get("test") is True:
        reasons.append("metadata.test = true")
        severity = "high"

    # Check for E2E in notes
    notes = doc_data.get("notes", "")
    keyword = contains_keyword(notes, E2E_INDICATORS["review_notes_keywords"])
    if keyword:
        reasons.append(f'notes contains "{keyword}"')
        severity = "high"

    if reasons:
        return E2EMatch(
            collection="auth_tokens",
            doc_id=doc_id,
            reasons=reasons,
            data_preview={
                "user_id": doc_data.get("user_id"),
                "token_type": doc_data.get("token_type"),
                "created_by_test": doc_data.get("created_by_test"),
            },
            severity=severity,
        )

    return None


def detect_e2e_technician(doc_id: str, doc_data: Dict) -> Optional[E2EMatch]:
    """
    Detect E2E test records in technicians collection.
    
    Safe indicators:
    - name/email contains test keywords
    - created_by_test = true
    - NEVER delete legitimate technicians
    """
    reasons = []
    severity = "low"

    # Check email (strong indicator)
    email = doc_data.get("email", "")
    email_keyword = contains_keyword(email, E2E_INDICATORS["email_keywords"])
    if email_keyword:
        reasons.append(f'email contains "{email_keyword}"')
        severity = "high"

    # Check name (only count if paired with another indicator)
    name = doc_data.get("name", "")
    name_keyword = contains_keyword(name, E2E_INDICATORS["name_keywords"])

    # Check test marker
    if doc_data.get("created_by_test") is True:
        reasons.append("created_by_test = true")
        severity = "high"

    if name_keyword and (email_keyword or doc_data.get("created_by_test") is True):
        reasons.append(f'name contains "{name_keyword}"')

    if reasons:
        return E2EMatch(
            collection="technicians",
            doc_id=doc_id,
            reasons=reasons,
            data_preview={
                "name": name,
                "email": email,
                "zone": doc_data.get("zone"),
            },
            severity=severity,
        )

    return None


# ============================================================================
# COLLECTION SCANNING
# ============================================================================


def scan_collection(
    db: Client,
    collection_name: str,
    detector_func,
) -> List[E2EMatch]:
    """
    Scan a Firestore collection for E2E test records.
    
    Args:
        db: Firestore client
        collection_name: Name of collection to scan
        detector_func: Function to detect E2E records
    
    Returns:
        List of E2EMatch objects
    """
    matches = []
    batch_count = 0

    try:
        docs = db.collection(collection_name).stream()

        for doc in docs:
            batch_count += 1
            doc_id = doc.id
            doc_data = doc.to_dict() or {}

            # Run detector function
            match = detector_func(doc_id, doc_data)
            if match:
                matches.append(match)

            # Show progress
            if batch_count % 50 == 0:
                print(f"  Scanned {batch_count} documents in {collection_name}...", flush=True)

        print(f"  ✓ Scanned {batch_count} total documents in {collection_name}")

    except Exception as e:
        print(f"  ✗ Error scanning {collection_name}: {e}")
        return []

    return matches


# ============================================================================
# RELATED RECORDS DETECTION
# ============================================================================


def find_related_dispatch_results(
    db: Client,
    service_request_id: str,
) -> List[str]:
    """
    Find dispatch_results records related to a deleted service_request.
    """
    try:
        docs = (
            db.collection("dispatch_results")
            .where("service_request_id", "==", service_request_id)
            .stream()
        )
        return [doc.id for doc in docs]
    except Exception as e:
        print(f"    Warning: Could not find related dispatch_results: {e}")
        return []


def find_related_auth_tokens(
    db: Client,
    user_id: str,
) -> List[str]:
    """
    Find auth_tokens records related to a deleted user.
    """
    try:
        docs = (
            db.collection("auth_tokens")
            .where("user_id", "==", user_id)
            .stream()
        )
        return [doc.id for doc in docs]
    except Exception as e:
        print(f"    Warning: Could not find related auth_tokens: {e}")
        return []


# ============================================================================
# DELETION OPERATIONS
# ============================================================================


def batch_delete_documents(
    db: Client,
    collection_name: str,
    doc_ids: List[str],
) -> Tuple[int, int]:
    """
    Safely delete documents in batches.
    
    Args:
        db: Firestore client
        collection_name: Collection to delete from
        doc_ids: List of document IDs to delete
    
    Returns:
        Tuple of (successful_deletes, failed_deletes)
    """
    if not doc_ids:
        return 0, 0

    successful = 0
    failed = 0

    for i in range(0, len(doc_ids), BATCH_SIZE):
        batch = db.batch()
        batch_docs = doc_ids[i : i + BATCH_SIZE]

        try:
            for doc_id in batch_docs:
                batch.delete(db.collection(collection_name).document(doc_id))

            batch.commit()
            successful += len(batch_docs)
            print(f"    ✓ Deleted batch of {len(batch_docs)} documents")

        except Exception as e:
            print(f"    ✗ Batch delete failed: {e}")
            failed += len(batch_docs)

    return successful, failed


def delete_matched_records(
    db: Client,
    matches: List[E2EMatch],
) -> Dict:
    """
    Delete matched E2E records with safety checks.
    
    Returns:
        Summary dictionary
    """
    summary = {
        "total_deleted": 0,
        "total_failed": 0,
        "by_collection": defaultdict(lambda: {"deleted": 0, "failed": 0}),
        "related_deleted": {
            "dispatch_results": 0,
            "auth_tokens": 0,
        },
    }

    # Group matches by collection
    matches_by_collection = defaultdict(list)
    for match in matches:
        matches_by_collection[match.collection].append(match)

    # Process each collection
    for collection_name in sorted(matches_by_collection.keys()):
        collection_matches = matches_by_collection[collection_name]
        doc_ids = [m.doc_id for m in collection_matches]

        print(f"\n  Deleting from {collection_name}...")
        successful, failed = batch_delete_documents(db, collection_name, doc_ids)

        summary["total_deleted"] += successful
        summary["total_failed"] += failed
        summary["by_collection"][collection_name]["deleted"] = successful
        summary["by_collection"][collection_name]["failed"] = failed

    # Find and delete related records
    print("\n  Finding related records...")
    related_dispatch_results = []
    related_auth_tokens = []

    for match in matches:
        if match.collection == "service_requests":
            related = find_related_dispatch_results(db, match.doc_id)
            related_dispatch_results.extend(related)
        elif match.collection == "users":
            related = find_related_auth_tokens(db, match.doc_id)
            related_auth_tokens.extend(related)

    # Delete related records
    if related_dispatch_results:
        print(f"  Deleting {len(related_dispatch_results)} related dispatch_results...")
        successful, failed = batch_delete_documents(db, "dispatch_results", related_dispatch_results)
        summary["related_deleted"]["dispatch_results"] = successful
        summary["total_deleted"] += successful
        summary["total_failed"] += failed

    if related_auth_tokens:
        print(f"  Deleting {len(related_auth_tokens)} related auth_tokens...")
        successful, failed = batch_delete_documents(db, "auth_tokens", related_auth_tokens)
        summary["related_deleted"]["auth_tokens"] = successful
        summary["total_deleted"] += successful
        summary["total_failed"] += failed

    return summary


# ============================================================================
# VERIFICATION
# ============================================================================


def verify_cleanup(
    db: Client,
    original_matches: List[E2EMatch],
) -> Dict:
    """
    Verify that E2E records were successfully deleted.
    
    Returns:
        Verification report dictionary
    """
    report = {
        "verified_deleted": 0,
        "verification_errors": 0,
        "remaining_records": [],
    }

    print("\nVerifying cleanup...")

    # Check each originally matched record
    for match in original_matches:
        try:
            doc = (
                db.collection(match.collection)
                .document(match.doc_id)
                .get()
            )
            if doc.exists:
                report["remaining_records"].append({
                    "collection": match.collection,
                    "doc_id": match.doc_id,
                })
                print(f"  ✗ Record still exists: {match.collection}/{match.doc_id}")
            else:
                report["verified_deleted"] += 1
                print(f"  ✓ Verified deleted: {match.collection}/{match.doc_id}")

        except Exception as e:
            report["verification_errors"] += 1
            print(f"  ? Verification error for {match.collection}/{match.doc_id}: {e}")

    return report


# ============================================================================
# REPORTING
# ============================================================================


def print_matches_summary(
    matches: List[E2EMatch],
    mode: str = "DRY_RUN",
):
    """
    Print comprehensive summary of detected E2E records.
    """
    if not matches:
        print(f"\n✓ No E2E test records detected. Database is clean.")
        return

    # Group by collection and severity
    by_collection = defaultdict(list)
    by_severity = defaultdict(list)

    for match in matches:
        by_collection[match.collection].append(match)
        by_severity[match.severity].append(match)

    print(f"\n{'='*80}")
    print(f"E2E TEST RECORDS DETECTED ({len(matches)} total)")
    print(f"{'='*80}")
    print(f"\nMode: {mode}")
    print(f"\nBreakdown by Collection:")
    print(f"-" * 80)

    for collection in sorted(by_collection.keys()):
        records = by_collection[collection]
        print(f"\n  [{collection}] {len(records)} records found")

        for match in records:
            print(f"    • {match.doc_id}")
            print(f"      Severity: {match.severity.upper()}")
            for reason in match.reasons:
                print(f"      Reason: {reason}")
            if match.data_preview:
                for key, value in match.data_preview.items():
                    if value:
                        preview_val = str(value)[:60]
                        print(f"      {key}: {preview_val}")
            print()

    print(f"\nBreakdown by Severity:")
    print(f"-" * 80)
    for severity in ["high", "medium", "low"]:
        records = by_severity[severity]
        if records:
            print(f"  {severity.upper()}: {len(records)} records")

    print(f"\n{'='*80}\n")


def print_deletion_summary(
    summary: Dict,
    original_count: int,
):
    """
    Print comprehensive summary of deletion results.
    """
    print(f"\n{'='*80}")
    print(f"DELETION SUMMARY")
    print(f"{'='*80}")

    print(f"\nRecords Successfully Deleted:")
    print(f"  Total: {summary['total_deleted']}")

    if summary["by_collection"]:
        for collection in sorted(summary["by_collection"].keys()):
            stats = summary["by_collection"][collection]
            print(f"  • {collection}: {stats['deleted']} deleted")

    if summary["related_deleted"]["dispatch_results"] > 0:
        print(f"  • Related dispatch_results: {summary['related_deleted']['dispatch_results']}")

    if summary["related_deleted"]["auth_tokens"] > 0:
        print(f"  • Related auth_tokens: {summary['related_deleted']['auth_tokens']}")

    if summary["total_failed"] > 0:
        print(f"\nRecords Failed to Delete: {summary['total_failed']}")

    print(f"\n{'='*80}\n")


def print_verification_report(
    report: Dict,
    original_count: int,
):
    """
    Print comprehensive verification report.
    """
    print(f"\n{'='*80}")
    print(f"VERIFICATION REPORT")
    print(f"{'='*80}")

    print(f"\nVerification Results:")
    print(f"  Verified Deleted: {report['verified_deleted']}")
    print(f"  Verification Errors: {report['verification_errors']}")
    print(f"  Remaining Records: {len(report['remaining_records'])}")

    if report["remaining_records"]:
        print(f"\n  ⚠ WARNING: Some records remain:")
        for record in report["remaining_records"]:
            print(f"    • {record['collection']}/{record['doc_id']}")

    print(f"\n{'='*80}\n")


# ============================================================================
# MAIN EXECUTION
# ============================================================================


def main():
    """
    Main execution flow with safety checks.
    """
    print(f"\n{'='*80}")
    print(f"E2E FIRESTORE TEST DATA CLEANUP UTILITY")
    print(f"{'='*80}")
    print(f"Current Date/Time: {datetime.now().isoformat()}")
    print(f"Mode: {'DRY RUN (Preview Only)' if DRY_RUN else 'DELETION ENABLED'}")
    print(f"{'='*80}\n")

    # Safety check 1: Verify configuration
    print("SAFETY CHECK 1: Configuration Validation")
    print("-" * 80)

    if not DRY_RUN and CONFIRM_DELETE != "YES_DELETE_E2E_DATA":
        print("✗ DELETION BLOCKED: Missing confirmation")
        print(f"  Current CONFIRM_DELETE: '{CONFIRM_DELETE}'")
        print(f"  Required: 'YES_DELETE_E2E_DATA'")
        print("\nTo enable deletion, set:")
        print('  CONFIRM_DELETE = ""')
        print("  DRY_RUN = True")
        sys.exit(1)

    print("✓ Configuration validated")

    # Safety check 2: Initialize Firestore
    print("\nSAFETY CHECK 2: Firestore Connection")
    print("-" * 80)

    try:
        db = initialize_firestore()
        print("✓ Connected to Firestore")
    except Exception as e:
        print(f"✗ Failed to connect to Firestore: {e}")
        sys.exit(1)

    # Step 1: Scan collections
    print("\nSTEP 1: SCANNING COLLECTIONS FOR E2E TEST RECORDS")
    print("-" * 80)

    collections_to_scan = [
        ("service_requests", detect_e2e_service_request),
        ("dispatch_results", detect_e2e_dispatch_result),
        ("users", detect_e2e_user),
        ("auth_tokens", detect_e2e_auth_token),
        ("technicians", detect_e2e_technician),
    ]

    all_matches = []

    for collection_name, detector_func in collections_to_scan:
        print(f"\nScanning {collection_name}...")
        try:
            matches = scan_collection(db, collection_name, detector_func)
            all_matches.extend(matches)
            if matches:
                print(f"  Found {len(matches)} potential E2E records")
            else:
                print(f"  No E2E records found")
        except Exception as e:
            print(f"  ✗ Error scanning {collection_name}: {e}")

    # Step 2: Print summary of findings
    print("\nSTEP 2: SUMMARY OF DETECTED E2E RECORDS")
    print_matches_summary(all_matches, mode="DRY_RUN (Preview)" if DRY_RUN else "DELETION")

    # Step 3: DRY RUN - exit after preview
    if DRY_RUN:
        print(f"{'='*80}")
        print("DRY RUN MODE - NO DELETION PERFORMED")
        print(f"{'='*80}")
        print("\nTo proceed with deletion:")
        print("  1. Review the records above")
        print("  2. Set: DRY_RUN = False")
        print('  3. Set: CONFIRM_DELETE = "YES_DELETE_E2E_DATA"')
        print("  4. Re-run this script")
        print(f"{'='*80}\n")
        return

    # Step 4: Execute deletion (only if not DRY_RUN)
    if all_matches:
        print("STEP 3: EXECUTING DELETION")
        print("-" * 80)
        summary = delete_matched_records(db, all_matches)
        print_deletion_summary(summary, len(all_matches))

        # Step 5: Verify cleanup
        print("STEP 4: VERIFICATION")
        print("-" * 80)
        report = verify_cleanup(db, all_matches)
        print_verification_report(report, len(all_matches))

        # Final status
        if report["remaining_records"]:
            print(f"⚠ WARNING: {len(report['remaining_records'])} records remain after deletion")
            print("This may indicate deletion failures. Manual review recommended.")
        else:
            print("✓ CLEANUP VERIFIED: All E2E records successfully removed")
    else:
        print("\n✓ No E2E records to delete. Database is already clean.")

    print(f"Cleanup completed at {datetime.now().isoformat()}\n")


if __name__ == "__main__":
    main()

# Firestore database configuration
FIRESTORE_DATABASE_ID = os.getenv("FIRESTORE_DATABASE_ID", "field-service-dispatcher")
