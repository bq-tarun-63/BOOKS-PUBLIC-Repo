#!/usr/bin/env python3
import os
import re
from pathlib import Path

# Directory containing API routes
api_dir = Path("/Users/betaque/Desktop/books-T/books-PUBLIC-SERVER/apps/web/app/api")

# Find all route.ts files except the public one
route_files = [f for f in api_dir.rglob("route.ts") if "/api/public/" not in str(f)]

print(f"Found {len(route_files)} route files to process\n")

modified_files = []
errors = []

for route_file in route_files:
    try:
        with open(route_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Pattern 1: Remove import for getAuthenticatedUser and isAuthError
        content = re.sub(
            r'import\s*\{[^}]*getAuthenticatedUser[^}]*\}\s*from\s*["\']@/lib/utils/auth["\'];?\s*\n',
            '',
            content,
            flags=re.MULTILINE
        )
        
        # Pattern 2: Remove the auth check block (lines 10-14 pattern)
        # const auth = await getAuthenticatedUser(...);
        # if (isAuthError(auth)) { return ...; }
        content = re.sub(
            r'\s*const\s+auth\s*=\s*await\s+getAuthenticatedUser\([^)]*\);?\s*\n\s*if\s*\(\s*isAuthError\s*\(\s*auth\s*\)\s*\)\s*\{\s*\n\s*return\s+NextResponse\.json\([^)]*\)\s*;\s*\n\s*\}\s*\n?',
            '',
            content,
            flags=re.MULTILINE | re.DOTALL
        )
        
        # Pattern 3: Remove destructuring of auth (const { user, workspaceId } = auth;)
        content = re.sub(
            r'\s*const\s*\{[^}]*\}\s*=\s*auth;?\s*\n',
            '',
            content,
            flags=re.MULTILINE
        )
        
        # Pattern 4: Remove any remaining standalone auth variable declarations
        content = re.sub(
            r'\s*const\s+auth\s*=\s*await\s+getAuthenticatedUser[^;]+;\s*\n',
            '',
            content,
            flags=re.MULTILINE
        )
        
        # Check if file was modified
        if content != original_content:
            # Write back
            with open(route_file, 'w', encoding='utf-8') as f:
                f.write(content)
            
            rel_path = route_file.relative_to(api_dir)
            modified_files.append(str(rel_path))
            print(f"✓ Modified: {rel_path}")
            
            # Check if there are still references to 'user' or 'workspaceId' that might break
            if re.search(r'\buser\.(id|email|name|organizationDomain)\b', content):
                print(f"  ⚠️  Warning: Still contains 'user' references - may need manual fix")
            if re.search(r'\bworkspaceId\b', content) and 'workspaceId' in original_content:
                print(f"  ⚠️  Warning: Still contains 'workspaceId' references - may need manual fix")
        
    except Exception as e:
        errors.append((route_file.relative_to(api_dir), str(e)))
        print(f"✗ Error: {route_file.relative_to(api_dir)} - {e}")

print(f"\n{'='*60}")
print(f"✅ Successfully modified {len(modified_files)} files")
if errors:
    print(f"❌ Errors in {len(errors)} files")
print(f"{'='*60}")

