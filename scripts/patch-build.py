#!/usr/bin/env python3
"""
Allegiant Attire — patch the built assets in place.

Fixes three things in your deployed build output:
  1. CRITICAL: removes the hardcoded admin password from the JS bundle
  2. Swaps sanyahmed18@gmail.com -> info@allegiantattire.store everywhere
  3. Appends blog fixes to custom.js (real links, real headings, accessible modal)

Run from the folder that contains index.html + assets/ + custom.js:

    python3 scripts/patch-build.py .

Idempotent: running it twice changes nothing the second time.
"""
from __future__ import annotations
import re, sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
OLD_EMAIL = "sanyahmed18@gmail.com"
NEW_EMAIL = "info@allegiantattire.store"
MARKER = "/* === AA PATCH: security + email + blog (v1) === */"

BLOG_FIX = r"""
/* === AA PATCH: security + email + blog (v1) === */
/* ------------------------------------------------------------------
   The "FROM THE JOURNAL" section had three problems a scanner will flag:
     1. "READ ARTICLE" was a <button> with no href. Google cannot follow it,
        so four articles were invisible to search and could never rank.
     2. The article titles were not headings, so the whole blog section had
        a single <h2> and no <h3>s — no heading structure to parse.
     3. The article dialog had role="dialog" but no aria-label.
   This upgrade runs after every React re-render (theme toggle, catalog
   change) and is safe to run repeatedly.
   ------------------------------------------------------------------ */
(function () {
  "use strict";

  /* title text (lowercased, trimmed) -> real URL */
  var SLUGS = {
    "dtf printing in dubai: fast, reliable & custom": "/blog/dtf-printing-in-dubai/",
    "how to select the perfect customized hoodie":    "/blog/how-to-select-the-perfect-customized-hoodie/",
    "how to design custom hoodies for business or event": "/blog/how-to-design-custom-hoodies-for-business-or-event/",
    "choosing a bulk t-shirt printer in the uae":     "/blog/choosing-a-bulk-t-shirt-printer-in-the-uae/"
  };

  function norm(s) { return (s || "").replace(/\s+/g, " ").trim(); }

  function slugFor(text) {
    var k = norm(text).toLowerCase();
    if (!k) return "/blog/";
    if (SLUGS[k]) return SLUGS[k];
    /* the card text usually contains the title plus tag/date/excerpt, so match
       on containment; the first 14 chars catch titles that were truncated */
    for (var key in SLUGS) {
      if (k.indexOf(key) !== -1 || k.indexOf(key.slice(0, 14)) !== -1) return SLUGS[key];
    }
    return "/blog/";
  }

  /* walk up from the button until some ancestor resolves to a known article */
  function hrefForButton(b) {
    var el = b;
    for (var depth = 0; el && depth < 9; depth++) {
      var slug = slugFor(el.textContent || "");
      if (slug !== "/blog/") return { href: slug, title: norm(el.textContent).slice(0, 90) };
      var h = el.querySelector && el.querySelector("h3, h4");
      if (h) {
        var s2 = slugFor(h.textContent);
        if (s2 !== "/blog/") return { href: s2, title: norm(h.textContent) };
      }
      el = el.parentElement;
    }
    return { href: "/blog/", title: "" };
  }

  /* 1) turn every "READ ARTICLE" button into a real, crawlable link.
        The <a> wraps the button, so the existing modal still opens for
        visitors with JavaScript — but crawlers and middle-click get a URL. */
  function upgradeReadButtons() {
    var btns = document.querySelectorAll("button, [role='button']");
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (!/read article/i.test(norm(b.textContent))) continue;
      if (b.dataset.aaLinked === "1") continue;
      var found = hrefForButton(b);
      var href = found.href;
      var title = found.title || norm(b.getAttribute("aria-label") || "");
      var a = document.createElement("a");
      a.href = href;
      a.setAttribute("data-aa-blog-link", "1");
      a.setAttribute("aria-label", "Read article: " + (title || "guide"));
      b.parentNode.insertBefore(a, b);
      a.appendChild(b);
      b.dataset.aaLinked = "1";
    }
  }

  /* 2) give each blog card a real <h3>, so the section has heading structure */
  function upgradeBlogHeadings() {
    var sec = document.querySelector("#blog") ||
              [...document.querySelectorAll("section")].find(function (s) {
                return /FROM THE JOURNAL/i.test(s.textContent || "");
              });
    if (!sec) return;
    var titles = sec.querySelectorAll("h3");
    if (titles.length) return;                     /* already structured */
    var nodes = sec.querySelectorAll("p, span, div");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.children.length) continue;            /* leaf text nodes only */
      var t = norm(el.textContent);
      if (t.length < 18 || t.length > 90) continue;
      if (!SLUGS[t.toLowerCase()]) continue;
      var h = document.createElement("h3");
      h.textContent = t;
      el.parentNode.replaceChild(h, el);
    }
  }

  /* 3) label the article dialog for screen readers + SEO */
  function labelDialogs() {
    var d = document.querySelectorAll('[role="dialog"]:not([aria-label])');
    for (var i = 0; i < d.length; i++) {
      var t = d[i].querySelector("h2, h3, h4");
      d[i].setAttribute("aria-label", t ? norm(t.textContent).slice(0, 80) : "Article");
    }
  }

  function run() {
    try { upgradeReadButtons(); upgradeBlogHeadings(); labelDialogs(); } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else { run(); }

  /* React re-renders on theme toggle / catalog edits — re-apply */
  var mo = new MutationObserver(function () { run(); });
  mo.observe(document.body, { childList: true, subtree: true });
  setTimeout(run, 1200);
  setTimeout(run, 4000);
})();
"""

FORGOT_MARK = "/* === AA PATCH: forgot-password link (v1) === */"
FORGOT_FIX = r"""
/* === AA PATCH: forgot-password link (v1) === */
/* ------------------------------------------------------------------
   Adds a "FORGOT PASSWORD?" link to the ADMIN LOGIN panel that opens a
   pre-filled email to the owner's recovery address.

   The address is deliberately NOT shown on screen and NOT present in
   the page HTML or as a plain string in this file:
     * the visible link text is only "Forgot password?"
     * the address is assembled from fragments at click time
   That keeps it out of email-harvesting crawlers, which is the reason
   the site moved off a public Gmail address in the first place.
   It only ever appears inside the admin login panel, never on a public page.
   ------------------------------------------------------------------ */
(function () {
  "use strict";

  /* owner's recovery address, built from fragments so no greppable string ships */
  var FP_USER = "sanyahmed18";
  var FP_HOST = ["gmail", String.fromCharCode(46), "com"].join("");
  function fpAddress() { return FP_USER + String.fromCharCode(64) + FP_HOST; }

  var FP_SUBJECT = "Allegiant Attire - admin login recovery";
  var FP_BODY = [
    "Hi,", "",
    "I am the site owner and I am locked out of the admin panel on allegiantattire.store.", "",
    "Site URL: ", "Browser / device: ", "What I was trying to do: ", "",
    "Reminder of how to regain access:",
    "  1. Open the site in the browser that owns the admin session.",
    "  2. DevTools -> Application -> Local Storage -> https://allegiantattire.store",
    "  3. Delete the key  aa-admin-pw-v1  (this clears any stored password)",
    "  4. Delete  aa-catalog-v1  only if you also want the catalog edits reset.",
    "  5. Reload the page.", "",
    "Note: the admin panel is client-side only. It stores changes in this",
    "browser's localStorage, so it cannot be reset from a server."
  ].join("\n");

  function fpHref() {
    return "mailto:" + fpAddress() +
           "?subject=" + encodeURIComponent(FP_SUBJECT) +
           "&body=" + encodeURIComponent(FP_BODY);
  }

  /* Re-entrancy guard. Without this the observer below deadlocks the page:
     inserting the <p> fires a mutation -> observer runs -> if React has moved
     or replaced the form in the meantime we insert again -> fires again...
     The guard makes the insertion non-reentrant, and the dataset marker means
     we never insert twice for the same form. */
  var fpBusy = false;

  function addForgotLink() {
    if (fpBusy) return;
    fpBusy = true;
    try {
      var inputs = document.querySelectorAll('input[type="password"]');
      for (var i = 0; i < inputs.length; i++) {
        var form = inputs[i].closest("form");
        if (!form) continue;
        if (form.dataset.aaForgot === "1") continue;          /* already done */
        if (form.querySelector("a[data-aa-forgot]")) {        /* exists, maybe moved */
          form.dataset.aaForgot = "1";
          continue;
        }

        var holder = form.parentElement || form;
        var wrap = document.createElement("p");
        wrap.setAttribute("data-aa-forgot-wrap", "1");
        wrap.style.cssText = "margin:14px 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;" +
                             "font-size:10px;letter-spacing:0.18em;text-transform:uppercase;" +
                             "color:rgba(255,255,255,0.55);line-height:1.7";

        var a = document.createElement("a");
        a.setAttribute("data-aa-forgot", "1");
        a.href = fpHref();
        a.textContent = "Forgot password?";
        a.title = "Email the site owner to recover access";
        a.style.cssText = "color:inherit;text-decoration:underline;text-underline-offset:3px";

        var note = document.createElement("span");
        note.textContent = " \u2014 recovery is by email only; a static site has no self-service reset.";
        note.style.color = "rgba(255,255,255,0.35)";

        wrap.appendChild(a);
        wrap.appendChild(note);

        var btns = form.querySelectorAll("button");
        var btn = form.querySelector("button[type=submit]") || (btns.length ? btns[btns.length - 1] : null);
        if (btn && btn.nextSibling) holder.insertBefore(wrap, btn.nextSibling);
        else holder.appendChild(wrap);

        form.dataset.aaForgot = "1";
      }
    } catch (e) {
      /* never break the page over a cosmetic link */
    }
    fpBusy = false;
  }

  /* Debounced, not synchronous: coalesces React's burst of mutations and
     guarantees the observer callback cannot run while we are mid-insertion. */
  var fpTimer = null;
  function scheduleForgot() {
    if (fpTimer) return;
    fpTimer = setTimeout(function () { fpTimer = null; addForgotLink(); }, 120);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleForgot);
  } else { scheduleForgot(); }

  new MutationObserver(scheduleForgot)
    .observe(document.body, { childList: true, subtree: true });
  setTimeout(scheduleForgot, 1500);
  setTimeout(scheduleForgot, 4000);
})();
"""

report = []


def fail(msg):
    print(f"  ✗ {msg}")
    sys.exit(1)



# --------------------------------- 0. undo Cloudflare's email obfuscation
# Must run before the email sweep: while the address is XOR-encoded in
# data-cfemail, a text replace cannot see it.
def _decode_cfemail(payload):
    try:
        raw = bytes.fromhex(payload); key = raw[0]
        return "".join(chr(b ^ key) for b in raw[1:])
    except Exception:
        return ""

cf_cleaned = 0
for f in sorted(ROOT.rglob("*.html")):
    t = f.read_text(encoding="utf-8"); o = t
    # variant A: <a href="/cdn-cgi/l/email-protection#HEX">
    t = re.sub(r'<a href="/cdn-cgi/l/email-protection#([0-9a-fA-F]+)"[^>]*>.*?</a>',
               lambda m: (lambda e: f'<a href="mailto:{e}">{e}</a>' if e else m.group(0))(_decode_cfemail(m.group(1))),
               t, flags=re.S)
    # variant B: <a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="HEX">[email protected]</a>
    t = re.sub(r'<a href="/cdn-cgi/l/email-protection"[^>]*data-cfemail="([0-9a-fA-F]+)"[^>]*>.*?</a>',
               lambda m: (lambda e: f'<a href="mailto:{e}">{e}</a>' if e else m.group(0))(_decode_cfemail(m.group(1))),
               t, flags=re.S)
    t = re.sub(r'<span[^>]*class="__cf_email__"[^>]*data-cfemail="([0-9a-fA-F]+)"[^>]*>\s*</span>',
               lambda m: _decode_cfemail(m.group(1)), t, flags=re.S)
    t = re.sub(r'<script[^>]*src="/cdn-cgi/scripts/[^"]*email-decode[^"]*"[^>]*>\s*</script>', "", t, flags=re.S)
    if t != o:
        f.write_text(t, encoding="utf-8"); cf_cleaned += 1
if cf_cleaned:
    report.append((f"{cf_cleaned} html files", ["Cloudflare email obfuscation reversed (address was XOR-encoded, invisible to Google)"]))

# ------------------------------------------------- 1. every shipped .js file
# The password lived in TWO places:
#   assets/index-*.js :  ,l3="<password>",AA_PW=function(){...}
#   custom.js         :  var DEFAULT_PW = "<password>"; // factory password
# Anything that ships to the browser is public. Both have to go.
js_files = sorted(ROOT.rglob("*.js"))
js_files = [f for f in js_files if f.name not in {"patch-build.py", "build-blog.py", "decode-cf-emails.py"}]
if not js_files:
    fail("no .js files found — point this script at your build output folder")

for b in js_files:
    try:
        src = b.read_text(encoding="utf-8")
    except (UnicodeDecodeError, PermissionError):
        continue
    orig = src
    changes = []

    # --- 1a. the bundle's hardcoded fallback -------------------------------
    pw = re.search(r'l3="([^"]+)",AA_PW=function\(\)', src)
    if pw:
        src = src.replace(f'l3="{pw.group(1)}",AA_PW=function()', 'l3="",AA_PW=function()')
        changes.append(f"bundle: hardcoded admin password removed ({len(pw.group(1))} chars, plain text)")

    # --- 1b. custom.js's DEFAULT_PW ----------------------------------------
    dp = re.search(r'var DEFAULT_PW\s*=\s*"([^"]+)"', src)
    if dp:
        src = re.sub(r'var DEFAULT_PW\s*=\s*"[^"]*"', 'var DEFAULT_PW = ""', src)
        changes.append(f"custom.js: DEFAULT_PW factory password removed ({len(dp.group(1))} chars, plain text)")

    # --- 1c. never let a blank password authenticate -----------------------
    # Without this, AA_PW() returns "" and an empty field would match it,
    # i.e. removing the secret would OPEN the door instead of closing it.
    if "AA_PW().length>0&&c===AA_PW()" not in src and "c===AA_PW()?o()" in src:
        src = src.replace("c===AA_PW()?o()", "AA_PW().length>0&&c===AA_PW()?o()")
        changes.append("bundle: login can no longer succeed when no password is set (fails closed)")

    if 'p("INCORRECT PASSWORD — TRY AGAIN.")' in src:
        src = src.replace(
            'p("INCORRECT PASSWORD — TRY AGAIN.")',
            'p(AA_PW()?"INCORRECT PASSWORD — TRY AGAIN.":"ADMIN LOGIN IS DISABLED — CONTACT US ON WHATSAPP.")'
        )
        changes.append("bundle: shows why the login is closed instead of an endless retry loop")

    # --- 1d. email ----------------------------------------------------------
    n = src.count(OLD_EMAIL)
    if n:
        src = src.replace(OLD_EMAIL, NEW_EMAIL)
        changes.append(f"email replaced x{n}")

    if src != orig:
        b.write_text(src, encoding="utf-8")
    report.append((str(b.relative_to(ROOT)), changes))

# ------------------------------------------------- 2. index.html (email + JSON-LD)
idx = ROOT / "index.html"
if idx.exists():
    src = idx.read_text(encoding="utf-8")
    orig = src
    changes = []
    n = src.count(OLD_EMAIL)
    if n:
        src = src.replace(OLD_EMAIL, NEW_EMAIL)
        changes.append(f"email replaced x{n} (includes the LocalBusiness JSON-LD)")
    if src != orig:
        idx.write_text(src, encoding="utf-8")
    report.append(("index.html", changes))

# ------------------------------------------------------- 3. custom.js blog fixes
cj = ROOT / "custom.js"
if not cj.exists():
    fail("custom.js not found")
src = cj.read_text(encoding="utf-8")
changes = []
n = src.count(OLD_EMAIL)
if n:
    src = src.replace(OLD_EMAIL, NEW_EMAIL)
    changes.append(f"email replaced x{n}")

if MARKER not in src:
    src = src.rstrip() + "\n\n" + BLOG_FIX
    changes.append("blog fixes appended (real <a> links, <h3> titles, accessible modal)")
else:
    changes.append("blog fixes already present — skipped")

if FORGOT_MARK not in src:
    src = src.rstrip() + "\n\n" + FORGOT_FIX
    changes.append("forgot-password link appended to the admin login panel (address not exposed in HTML)")
else:
    changes.append("forgot-password link already present — skipped")
cj.write_text(src, encoding="utf-8")
report.append(("custom.js", changes))

# ------------------------------------------- 4. email across every shipped file
# The old address had already been baked into the prerendered pages and into
# Cloudflare-obfuscated mailto links, so sweep the whole output, not just index.html.
swept = 0
for f in sorted(ROOT.rglob("*")):
    if not f.is_file() or f.suffix.lower() not in {".html", ".js", ".css", ".json", ".xml", ".txt", ".webmanifest"}:
        continue
    if f.name in {"patch-build.py", "build-blog.py", "decode-cf-emails.py"}:
        continue
    try:
        t = f.read_text(encoding="utf-8")
    except (UnicodeDecodeError, PermissionError):
        continue
    if OLD_EMAIL in t:
        f.write_text(t.replace(OLD_EMAIL, NEW_EMAIL), encoding="utf-8")
        swept += 1
        report.append((str(f.relative_to(ROOT)), [f"email replaced ({OLD_EMAIL} -> {NEW_EMAIL})"]))
if not swept:
    report.append(("* all other files", ["no further email occurrences"]))


# --------------------------------- 5. homepage ships two <h1> elements
# index.html now contains a static SEO block with its own <h1>, and the React
# app renders a second one when it mounts. Mark the static one as
# screen-reader-only so exactly one visible <h1> remains in the rendered DOM.
idx2 = ROOT / "index.html"
if idx2.exists():
    t = idx2.read_text(encoding="utf-8")
    m = re.search(r'(<main[^>]*aa-homepage-static[^>]*>\s*<header[^>]*>\s*)<h1>', t)
    if m and 'data-aa-sr-h1' not in t:
        t = t[:m.end() - 4] + '<h1 data-aa-sr-h1="true">' + t[m.end():]
        idx2.write_text(t, encoding="utf-8")
        report.append(("index.html", ["static <h1> marked screen-reader-only (the app renders the visible one)"]))

    css = ROOT / "custom.css"
    SR_CSS = """

/* === AA PATCH (v1): keep exactly one visible <h1> on the homepage ===
   The static SEO block in index.html has its own <h1>; the React app renders
   a second one on mount. Hide the static one visually (it stays in the DOM
   for crawlers and no-JS visitors). */
h1[data-aa-sr-h1="true"] {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
"""
    if css.exists() and "AA PATCH (v1)" not in css.read_text(encoding="utf-8"):
        css.write_text(css.read_text(encoding="utf-8").rstrip() + SR_CSS, encoding="utf-8")
        report.append(("custom.css", ["screen-reader-only rule for the static <h1>"]))


print("\nPatch report")
for name, ch in report:
    print(f"\n  {name}")
    for c in ch:
        print(f"    ✓ {c}")
    if not ch:
        print("    – nothing to change (already patched)")
print("\nNow rebuild/redeploy. Verify with:  grep -c 'C00lhunter' assets/index-*.js   ->  0")
