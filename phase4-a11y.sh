#!/bin/bash

python3 << 'PYTHON_EOF'
import os
import re

# ============================================================
# FIX 1: Add aria-label to mobile-toggle button (8 files)
# ============================================================
print("=" * 60)
print("FIX 1: aria-label on mobile-toggle button")
print("=" * 60)

NAV_FILES = [
    "about.html", "blog.html", "case-studies.html", "contact.html",
    "index.html", "podcast.html", "services.html",
    "blog/your-crm-isnt-broken.html"
]

old_button = '<button class="mobile-toggle" onclick="toggleMobileNav()"><span></span><span></span><span></span></button>'
new_button = '<button class="mobile-toggle" onclick="toggleMobileNav()" aria-label="Open navigation menu" aria-expanded="false"><span></span><span></span><span></span></button>'

count = 0
for fpath in NAV_FILES:
    if not os.path.exists(fpath):
        print(f"SKIP: {fpath} (not found)")
        continue
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'aria-label="Open navigation menu"' in content:
        print(f"SKIP: {fpath} (already has aria-label)")
        continue
    
    if old_button not in content:
        print(f"WARN: {fpath} (button markup didn't match exactly)")
        continue
    
    new_content = content.replace(old_button, new_button)
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"OK:   {fpath}")
    count += 1

print(f"\n{count} files updated\n")

# ============================================================
# FIX 2: Wrap main content in <main> landmark (8 files)
# Open <main> right after </nav>, close </main> right before <footer>
# ============================================================
print("=" * 60)
print("FIX 2: Add <main> landmark")
print("=" * 60)

count = 0
for fpath in NAV_FILES:
    if not os.path.exists(fpath):
        continue
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Idempotent check
    if '<main' in content:
        print(f"SKIP: {fpath} (<main> already present)")
        continue
    
    # Look for </nav> followed by content followed by <footer
    # We need both anchors to exist
    if '</nav>' not in content or '<footer' not in content:
        print(f"WARN: {fpath} (missing </nav> or <footer> anchor)")
        continue
    
    # Insert <main id="main-content"> after first </nav>
    # Insert </main> before first <footer
    new_content = content.replace('</nav>', '</nav>\n<main id="main-content">', 1)
    new_content = new_content.replace('<footer', '</main>\n<footer', 1)
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"OK:   {fpath}")
    count += 1

print(f"\n{count} files updated\n")

print("=" * 60)
print("PHASE 4 COMPLETE")
print("=" * 60)
PYTHON_EOF
