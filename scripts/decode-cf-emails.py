#!/usr/bin/env python3
"""
Undo Cloudflare's "Email Address Obfuscation" in the built HTML.

WHAT'S WRONG
  With Cloudflare's Email Obfuscation turned on (Scrape Shield), Cloudflare
  rewrites your HTML on the way out and replaces every email address with:
      <a href="/cdn-cgi/l/email-protection#5320323d2a323b3e3637">[protected]</a>
  and injects  <script src="/cdn-cgi/scripts/.../email-decode.min.js">
  into every page.

  Consequences:
    * Your real address never appears in the HTML — Google cannot read it.
    * The address inside your LocalBusiness JSON-LD is hidden too, so the
      schema you built for rich results is partly wasted.
    * If a user has JS off, or the extra script is blocked, the address
      renders as the literal text "[protected]".
    * It adds a render-blocking third-party script to every page.

  The encoding is a simple XOR with the first byte as the key, so it is fully
  reversible — which also tells you it protects nothing.

  PERMANENT FIX: Cloudflare dashboard -> your zone -> Rules -> Settings ->
  turn OFF "Email Address Obfuscation" (Scrape Shield). This script only
  cleans the files you ship; Cloudflare re-obfuscates on every request
  until that switch is off.

  Usage:  python3 scripts/decode-cf-emails.py <build-output-dir>
"""
from __future__ import annotations
import re, sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")


def decode_cfemail(payload: str) -> str:
    """Cloudflare's obfuscation: hex string, first byte is the XOR key."""
    try:
        raw = bytes.fromhex(payload)
        key = raw[0]
        return "".join(chr(b ^ key) for b in raw[1:])
    except Exception:
        return ""


def fix(path: Path) -> list[str]:
    s = path.read_text(encoding="utf-8")
    orig = s
    notes = []

    # 1) <a href="/cdn-cgi/l/email-protection#HEX">anything</a>  ->  real mailto
    def sub_anchor(m):
        email = decode_cfemail(m.group(1))
        if not email:
            return m.group(0)
        return f'<a href="mailto:{email}">{email}</a>'

    s, n = re.subn(r'<a href="/cdn-cgi/l/email-protection#([0-9a-fA-F]+)"[^>]*>.*?</a>',
                   sub_anchor, s, flags=re.S)
    if n:
        notes.append(f"{n} obfuscated mailto link(s) restored")

    # variant B: href without the fragment, address carried in data-cfemail
    s, n = re.subn(r'<a href="/cdn-cgi/l/email-protection"[^>]*data-cfemail="([0-9a-fA-F]+)"[^>]*>.*?</a>',
                   sub_anchor, s, flags=re.S)
    if n:
        notes.append(f"{n} obfuscated mailto link(s) restored (data-cfemail variant)")

    # 2) <span class="__cf_email__" data-cfemail="HEX"></span>  ->  real address
    def sub_span(m):
        email = decode_cfemail(m.group(1))
        return email or ""

    s, n = re.subn(r'<span[^>]*class="__cf_email__"[^>]*data-cfemail="([0-9a-fA-F]+)"[^>]*>\s*</span>',
                   sub_span, s, flags=re.S)
    if n:
        notes.append(f"{n} obfuscated address span(s) restored")

    # 3) drop the injected decoder script — nothing left to decode
    s, n = re.subn(r'<script[^>]*src="/cdn-cgi/scripts/[^"]*email-decode[^"]*"[^>]*>\s*</script>',
                   "", s, flags=re.S)
    if n:
        notes.append(f"{n} email-decode.min.js script tag(s) removed")

    if s != orig:
        path.write_text(s, encoding="utf-8")
    return notes


total = 0
for f in sorted(ROOT.rglob("*.html")):
    notes = fix(f)
    if notes:
        total += 1
        print(f"  ✓ {f.relative_to(ROOT)}")
        for nte in notes:
            print(f"      {nte}")

if not total:
    print("  – no Cloudflare email obfuscation found (already clean, or the switch is off)")

print(f"\n{total} file(s) cleaned.")
print("Now turn OFF Cloudflare -> Rules -> Settings -> Email Address Obfuscation,")
print("or it will re-apply to every request.")
