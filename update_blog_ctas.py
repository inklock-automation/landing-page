#!/usr/bin/env python3
"""
Replace the old "Book Your Free Audit" CTA block at the end of every blog post
with a newsletter-first CTA + a reach-out secondary link.

Run this from INSIDE ~/landing-page so it can find blog/*.html.

    cd ~/landing-page
    python3 update_blog_ctas.py

The script reports every file it changed, every file it skipped, and why.
Safe to re-run; idempotent because the new CTA still uses class="cta-block"
but the inner structure has no .cta-btn anchor, so the pattern only matches
the OLD shape.
"""

import re
from pathlib import Path

# --- The new CTA block ---------------------------------------------------
# All styling is inline so this works without touching styles.css.
# Submit handler is inline too so the form is self-contained per post.
NEW_CTA = '''<div class="cta-block" style="text-align:center;padding:36px 28px;background:rgba(147,51,234,.04);border:1px solid rgba(147,51,234,.14);border-radius:14px;margin:32px 0">
<p style="color:#9333ea;font-family:Sora,sans-serif;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 14px">The Inside Track</p>
<h2 style="font-family:Sora,sans-serif;font-size:clamp(24px,3.2vw,32px);font-weight:800;line-height:1.15;letter-spacing:-.5px;color:#14111c;margin:0 0 12px">One note a month.<br>Worth the inbox space.</h2>
<p style="font-size:16px;line-height:1.65;color:#6b6580;max-width:520px;margin:0 auto 22px">Real builds, real numbers, what's actually working right now. The same stuff we'd send a friend.</p>
<form onsubmit="return submitBlogNewsletter(event,this)" style="display:flex;gap:10px;max-width:440px;margin:0 auto;flex-wrap:wrap;justify-content:center">
<input type="email" name="email" required placeholder="your@email.com" aria-label="Email address" style="flex:1;min-width:220px;padding:13px 18px;border:1px solid rgba(147,51,234,.25);border-radius:8px;font-family:Plus Jakarta Sans,sans-serif;font-size:15px;background:#fff;color:#14111c;outline:none">
<button type="submit" style="padding:13px 24px;background:linear-gradient(135deg,#9333ea,#c026d3);color:#fff;border:0;border-radius:8px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:15px;cursor:pointer;white-space:nowrap">Lock me in &rarr;</button>
</form>
<p style="margin:14px 0 0;font-size:12px;color:#9aa0ad;font-family:Plus Jakarta Sans,sans-serif">One email a month. Unsubscribe anytime. No spam, ever.</p>
<p style="margin:22px 0 0;padding-top:18px;border-top:1px solid rgba(147,51,234,.10);font-size:14px;color:#6b6580">Got a question about this post? <a href="/contact" style="color:#9333ea;font-weight:600;text-decoration:none">Reach out &rarr;</a></p>
<script>function submitBlogNewsletter(e,f){e.preventDefault();var b=f.querySelector('button'),o=b.textContent,em=f.querySelector('input[name=email]').value;b.disabled=true;b.textContent='Locking you in...';fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:em,type:'newsletter',source:'Blog Post CTA'})}).then(function(r){if(r.ok){f.outerHTML='<div style="text-align:center;padding:18px;background:rgba(147,51,234,.06);border:1px solid rgba(147,51,234,.15);border-radius:12px;font-weight:500;font-size:15px;color:#9333ea;max-width:440px;margin:0 auto">You\\'re in. First note hits next month.</div>';if(typeof fbq!=='undefined')fbq('track','Lead',{content_name:'Blog Newsletter Signup'})}else{throw new Error('failed')}}).catch(function(){b.disabled=false;b.textContent=o;alert('Something went wrong. Email us at hello@inklockautomation.com and we will add you manually.')});return false}</script>
</div>'''

# Match the entire OLD <div class="cta-block">...</div> block.
# Non-greedy + DOTALL handles both single-line and multi-line variants.
# We anchor the END on </div> right after a .cta-btn anchor so we don't
# accidentally swallow anything after the CTA.
PATTERN = re.compile(
    r'<div class="cta-block">.*?class="cta-btn">.*?</a>\s*</div>',
    re.DOTALL,
)

# Also catch the new CTA so re-runs are no-ops (prevents double-stamping
# if someone runs the script twice).
ALREADY_DONE_MARKER = 'submitBlogNewsletter'


def main() -> int:
    blog_dir = Path('blog')
    if not blog_dir.is_dir():
        print('Error: blog/ directory not found. Run from inside ~/landing-page.')
        return 1

    changed: list[tuple[str, int]] = []
    skipped_already_done: list[str] = []
    skipped_no_block: list[str] = []
    skipped_no_match: list[str] = []

    for path in sorted(blog_dir.glob('*.html')):
        if path.name == 'index.html':
            # blog index doesn't have a post-end CTA
            continue
        text = path.read_text(encoding='utf-8')

        if ALREADY_DONE_MARKER in text:
            skipped_already_done.append(path.name)
            continue
        if 'class="cta-block"' not in text:
            skipped_no_block.append(path.name)
            continue

        new_text, count = PATTERN.subn(NEW_CTA, text)
        if count == 0:
            skipped_no_match.append(path.name)
            continue

        path.write_text(new_text, encoding='utf-8')
        changed.append((path.name, count))

    print(f'\nChanged {len(changed)} file(s):')
    for name, count in changed:
        print(f'  + {name}  ({count} block)')
    if skipped_already_done:
        print(f'\nSkipped {len(skipped_already_done)} (already updated):')
        for name in skipped_already_done:
            print(f'  - {name}')
    if skipped_no_block:
        print(f'\nSkipped {len(skipped_no_block)} (no cta-block found):')
        for name in skipped_no_block:
            print(f'  ? {name}')
    if skipped_no_match:
        print(f'\nWARN: {len(skipped_no_match)} file(s) have a cta-block but the')
        print('      regex did not match. Likely a custom structure. Inspect manually:')
        for name in skipped_no_match:
            print(f'  ! {name}')

    print('')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
