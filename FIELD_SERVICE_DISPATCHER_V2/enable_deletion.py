#!/usr/bin/env python3
"""Enable deletion in cleanup script"""

# Read the cleanup script
with open('scripts/cleanup_e2e_firestore.py', 'r') as f:
    content = f.read()

# Enable deletion
content = content.replace('DRY_RUN = True', 'DRY_RUN = False')
content = content.replace('CONFIRM_DELETE = ""', 'CONFIRM_DELETE = "YES_DELETE_E2E_DATA"')

# Write back
with open('scripts/cleanup_e2e_firestore.py', 'w') as f:
    f.write(content)

print('✓ Deletion enabled in cleanup script')
print('  DRY_RUN = False')
print('  CONFIRM_DELETE = YES_DELETE_E2E_DATA')
print('\n✓ Ready to execute deletion')
