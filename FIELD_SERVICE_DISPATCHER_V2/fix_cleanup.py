#!/usr/bin/env python3
"""Fix the cleanup script initialization"""

import re

with open('scripts/cleanup_e2e_firestore.py', 'r') as f:
    lines = f.readlines()

# Find the duplicated section and remove it
output_lines = []
skip_until_except = False
in_duplicate = False

for i, line in enumerate(lines):
    # Skip the duplicate exception handler lines
    if i > 0 and 'except ValueError:' in line and in_duplicate:
        skip_until_except = False
        continue
    
    if skip_until_except and line.strip().startswith('except Exception'):
        skip_until_except = False
        output_lines.append(line)
        continue
    
    if skip_until_except:
        continue
    
    # Detect duplicate section (second "except ValueError:")
    if 'except ValueError:' in line and i > 0:
        if lines[i-1].strip().startswith('return firestore.client(database_id='):
            # Skip the duplicate
            in_duplicate = True
            skip_until_except = True
            # Skip this line and next line (the comment)
            continue
    
    output_lines.append(line)

with open('scripts/cleanup_e2e_firestore.py', 'w') as f:
    f.writelines(output_lines)

print('✓ Fixed initialize_firestore function')
