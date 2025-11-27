#!/usr/bin/env python3
import os
import re
from pathlib import Path

# Find all route.ts files
web_app_dir = Path("/Users/betaque/Desktop/books-T/books-PUBLIC-SERVER/apps/web/app")
route_files = list(web_app_dir.rglob("**/route.ts"))

# Skip the public API route
route_files = [f for f in route_files if "/api/public/" not in str(f)]

print(f"Found {len(route_files)} route files to process")

patterns_to_remove = [
    # Pattern 1: Import statements for auth
    r'import\s+\{\s*getAuthenticatedUser\s*,?\s*isAuthError\s*\}\s+from\s+["\']@/lib/utils/auth["\'];?\s*\n',
    r'import\s+\{\s*isAuthError\s*,?\s*getAuthenticatedUser\s*\}\s+from\s+["\']@/lib/utils/auth["\'];?\s*\n',
    r'import\s+\{\s*getAuthenticatedUser\s*\}\s+from\s+["\']@/lib/utils/auth["\'];?\s*\n',
    r'import\s+\{\s*isAuthError\s*\}\s+from\s+["\']@/lib/utils/auth["\'];?\s*\n',
    
    # Pattern 2: Auth check block
    r'\s*const\s+auth\s*=\s*await\s+getAuthenticatedUser\([^)]*\);\s*\n\s*if\s*\(\s*isAuthError\s*\(\s*auth\s*\)\s*\)\s*\{[^}]*\}\s*\n',
    
    # Pattern 3: Destructure user/session
    r'\s*const\s+\{\s*user\s*(?:,\s*session\s*)?\}\s*=\s*auth;\s*\n',
    r'\s*const\s+\{\s*session\s*,\s*user\s*\}\s*=\s*auth;\s*\n',
    
    # Pattern 4: workspaceId extraction
    r'\s*const\s+workspaceId\s*=\s*auth\.workspaceId\s*\|\|\s*null;\s*\n',
]

modified_count = 0

for route_file in route_files:
    try:
        with open(route_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply all patterns
        for pattern in patterns_to_remove:
            content = re.sub(pattern, '', content, flags=re.MULTILINE)
        
        # Remove any lingering references to user variable that would break
        # Replace user.id with a placeholder or remove permission checks
        if 'user.' in content or 'user,' in content:
            # We'll handle these case by case - for now just note them
            print(f"⚠️  {route_file.relative_to(web_app_dir)} still has 'user' references")
        
        if content != original_content:
            with open(route_file, 'w', encoding='utf-8') as f:
                f.write(content)
            modified_count += 1
            print(f"✓ Modified: {route_file.relative_to(web_app_dir)}")
    
    except Exception as e:
        print(f"✗ Error processing {route_file}: {e}")

print(f"\n✅ Modified {modified_count} files")

