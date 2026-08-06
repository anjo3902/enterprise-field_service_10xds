#!/usr/bin/env python3
"""
Cleanup script for E2E test data.

CRITERIA:
  Delete service request records where:
  - review_notes contains specific E2E markers (E2E_PREVISIT, E2E_ADMIN, E2E_CUSTOMER, E2E_REPORT, E2E_AUTH)
  - AND status = 'cancelled' OR not assigned to a real technician
  - AND created in the last 2 hours (allows for test suite delays)

USAGE:
  python scripts/cleanup_e2e_safe.py [--delete]
  
  Without --delete: prints what WOULD be deleted (dry-run mode)
  With --delete: actually deletes the records
"""

import os
import sys
import json
from datetime import datetime, timedelta

# Ensure we can import the database clients
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import firestore_client


def get_firestore_db():
    """Initialize Firestore client."""
    try:
        return firestore_client._get_db()
    except Exception as e:
        print(f"ERROR: Failed to initialize Firestore client: {e}")
        sys.exit(1)


def should_delete_record(record: dict) -> bool:
    """
    Determine if a record should be deleted based on E2E cleanup criteria.
    
    Criteria:
      1. review_notes contains one of: E2E_PREVISIT, E2E_ADMIN, E2E_CUSTOMER, E2E_REPORT, E2E_AUTH
      2. AND (status = 'cancelled' OR assigned_technician_id is empty/null)
      3. AND created within last 2 hours
    """
    # Check review_notes for E2E markers
    review_notes = str(record.get('review_notes') or '').upper()
    e2e_markers = ['E2E_PREVISIT', 'E2E_ADMIN', 'E2E_CUSTOMER', 'E2E_REPORT', 'E2E_AUTH']
    has_e2e_marker = any(marker in review_notes for marker in e2e_markers)
    
    if not has_e2e_marker:
        return False
    
    # Check status or technician assignment
    status = str(record.get('status') or '').lower()
    assigned_tech = record.get('assigned_technician_id')
    
    is_cancelled = status == 'cancelled'
    is_unassigned = not assigned_tech or str(assigned_tech).strip() == ''
    
    if not (is_cancelled or is_unassigned):
        return False
    
    # Check creation time
    created_at_str = record.get('created_at')
    if not created_at_str:
        return False
    
    try:
        # Parse ISO timestamp
        if isinstance(created_at_str, str):
            created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
        else:
            created_at = created_at_str
        
        cutoff_time = datetime.now(created_at.tzinfo) - timedelta(hours=2)
        
        if created_at < cutoff_time:
            return False
    except Exception as e:
        print(f"WARNING: Failed to parse created_at '{created_at_str}': {e}")
        return False
    
    return True


def cleanup_e2e_data(dry_run: bool = True) -> dict:
    """
    Find and optionally delete E2E test records.
    
    Returns:
      {
        'found': int,
        'deleted': int,
        'records': [...]
      }
    """
    db = get_firestore_db()
    
    try:
        # Query service requests with pagination
        results = {
            'found': 0,
            'deleted': 0,
            'records': [],
            'errors': []
        }
        
        print(f"\n{'='*70}")
        print(f"E2E CLEANUP {'DRY-RUN' if dry_run else 'EXECUTION'}")
        print(f"{'='*70}\n")
        
        page_num = 1
        last_id = None
        deleted_count = 0
        found_ids = []
        
        while True:
            print(f"Fetching page {page_num} (last_id={last_id})...")
            
            # Fetch paginated service requests
            path = f'/admin/service-requests?limit=100' + (f'&last_id={last_id}' if last_id else '')
            
            # Since we don't have direct API access here, we'll query Firestore directly
            query = db.collection('service_requests')
            
            # Add filters for recent records with E2E markers
            if last_id:
                # Firestore pagination: use document reference
                last_doc = db.collection('service_requests').document(str(last_id)).get()
                if last_doc.exists:
                    query = query.start_after(last_doc)
            
            docs = query.limit(100).stream()
            
            page_records = []
            for doc in docs:
                record = {'id': doc.id, **doc.to_dict()}
                page_records.append(record)
            
            if not page_records:
                break
            
            print(f"  Found {len(page_records)} records on page {page_num}")
            
            for record in page_records:
                if should_delete_record(record):
                    found_ids.append(record['id'])
                    results['found'] += 1
                    
                    review_notes = record.get('review_notes', 'N/A')
                    status = record.get('status', 'N/A')
                    created_at = record.get('created_at', 'N/A')
                    
                    record_info = {
                        'id': record['id'],
                        'review_notes': review_notes,
                        'status': status,
                        'created_at': created_at
                    }
                    results['records'].append(record_info)
                    
                    if not dry_run:
                        try:
                            db.collection('service_requests').document(record['id']).delete()
                            deleted_count += 1
                            print(f"  DELETED: {record['id']} (notes={review_notes}, status={status})")
                        except Exception as e:
                            err_msg = f"Failed to delete {record['id']}: {e}"
                            results['errors'].append(err_msg)
                            print(f"  ERROR: {err_msg}")
                    else:
                        print(f"  [DRY-RUN] Would delete: {record['id']} (notes={review_notes}, status={status})")
            
            # Check for more pages
            if len(page_records) < 100:
                break
            
            last_id = page_records[-1]['id']
            page_num += 1
        
        results['deleted'] = deleted_count
        
        # Summary
        print(f"\n{'='*70}")
        print(f"CLEANUP SUMMARY")
        print(f"{'='*70}")
        print(f"Found:   {results['found']} E2E records")
        print(f"Deleted: {results['deleted']} records")
        print(f"Errors:  {len(results['errors'])} errors")
        
        if results['records']:
            print(f"\nRecords processed:")
            for rec in results['records']:
                print(f"  - {rec['id']}: {rec['review_notes']} (status={rec['status']})")
        
        if results['errors']:
            print(f"\nErrors encountered:")
            for err in results['errors']:
                print(f"  - {err}")
        
        print(f"\n{'='*70}\n")
        
        return results
    
    except Exception as e:
        print(f"ERROR: Cleanup failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def main():
    """Main entry point."""
    dry_run = '--delete' not in sys.argv
    
    if dry_run:
        print("\nNOTE: Running in DRY-RUN mode. Add --delete flag to actually delete records.\n")
    else:
        print("\nWARNING: Running in DELETE mode. Records WILL be permanently deleted!\n")
        confirm = input("Type 'yes' to confirm deletion: ").strip().lower()
        if confirm != 'yes':
            print("Cancelling cleanup.")
            sys.exit(0)
    
    results = cleanup_e2e_data(dry_run=dry_run)
    
    # Exit with error code if there were errors or records found but not deleted
    if results['errors'] or (dry_run and results['found'] > 0):
        sys.exit(1)


if __name__ == '__main__':
    main()
