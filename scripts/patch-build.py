#!/usr/bin/env python3
"""
Allegiant Attire — patch the built assets in place.

Applies deployment-safe patches to the checked-in static output:
  1. Removes browser-bundled admin fallbacks and fails closed without a server verifier
  2. Removes generated product ratings and unverified homepage social-proof claims
  3. Appends the blog-link accessibility patch when it is not already present

Run from the folder that contains index.html + assets/ + custom.js:

    python3 scripts/patch-build.py .

Idempotent: running it twice changes nothing the second time.
"""
from __future__ import annotations
import re, sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
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

   This is a static site and the admin editor is not server-authenticated.
   The link is only present inside the local admin panel; it uses the public
   business inbox rather than a personal recovery address.
   ------------------------------------------------------------------ */
(function () {
  "use strict";

  /* Public support address; the admin panel itself is intentionally disabled. */
  var FP_TO = "info@allegiantattire.store";
  function fpAddress() { return FP_TO; }

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



# The HTML in this repository already uses the public business inbox. Any
# Cloudflare email obfuscation, redirects, or WAF behavior is configured at
# the host/CDN and must be checked there rather than simulated in this patcher.

# ------------------------------------------------- 1. every shipped .js file
# Any value or branch that ships to the browser is public. Remove embedded
# defaults and fail closed unless an external, trusted verifier is configured.
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
    # The UI stores its edits in localStorage only; it is not a server-side CMS
    # or authentication system. Never ship a usable default password.
    pw = re.search(r'l3="([^"]*)",AA_PW=function\(\)', src)
    if pw and pw.group(1):
        src = src.replace(f'l3="{pw.group(1)}",AA_PW=function()', 'l3="",AA_PW=function()', 1)
        changes.append(f"bundle: hardcoded admin password removed ({len(pw.group(1))} chars, plain text)")

    legacy_login = "(AA_PW().length>0&&c===AA_PW())||c===l3?o()"
    if legacy_login in src:
        src = src.replace(legacy_login, "AA_PW().length>0&&c===AA_PW()?o()", 1)
        changes.append("bundle: removed empty-password fallback; admin login fails closed")

    # Remove formula-generated star ratings / review counts, the unverified
    # testimonial block, and public product rating rows until verified source
    # reviews can be connected. These values were generated by index math.
    bundle_patches = [
        ("rating:4.5+l*7%6/10,reviews:20+l*37%200", "rating:0,reviews:0", "generated product rating/count values removed"),
        ("VIEW ALL 240+ SKUS ", "VIEW ALL PRODUCTS ", "unverified catalog-size claim removed"),
        ("One of the largest wholesale suppliers of blank & custom clothing in the UAE.", "Wholesale supplier of blank and custom clothing in the UAE.", "unverified market-leadership superlative removed"),
        ('r.jsx("option",{value:"rating","data-source-loc":"src/App.tsx:490:12",children:"TOP RATED"})', "", "rating sort option removed with unsupported review data"),
        ('[["9+","YEARS MFG"],["2.4M","PCS DELIVERED"],["1-2 DAY","UAE DELIVERY"]]', '[["2016","ESTABLISHED"],["MOQ 1","DTF PRINTING"],["1-2 DAY","UAE DELIVERY"]]', "unverified delivered-volume metric replaced with verifiable offer"),
        ('[["2.4M+","Garments delivered"],["100%","In-house production"],["48H","Fastest bulk run"],["99.2%","QC pass rate"]]', '[["2016","ESTABLISHED"],["IN-HOUSE","PRODUCTION"],["1-2 DAY","UAE DELIVERY"],["MOQ 1","DTF PRINTING"]]', "unverified company-volume and quality metrics removed"),
        ('[["4.9","GOOGLE RATING"],["1.9K","REVIEWS"],["98%","RE-ORDER"],["24H","RESPONSE"]]', '[["IN-HOUSE","MANUFACTURING"],["6","DECORATION METHODS"],["MOQ 1","DTF PRINTING"],["AJMAN","FACTORY LOCATION"]]', "unverified rating, review and re-order claims removed"),
        ('r.jsx("section",{className:V("border-y-2",rt,ia),"data-source-loc":"src/App.tsx:689:6",children:', '!1&&r.jsx("section",{className:V("border-y-2",rt,ia),"data-source-loc":"src/App.tsx:689:6",children:', "unverified client logo/testimonial section removed"),
        ('QC PASS 99.2%', 'QC CHECKS', "unverified quality percentage removed"),
        ('[["15+","MACHINES"],["60+","STAFF"],["24H","RUSH MODE"]]', '[["CUT + SEW","IN-HOUSE"],["6","FINISH METHODS"],["MOQ 1","DTF PRINTING"]]', "unverified machine/staff/rush metrics replaced with service facts"),
        ("r.jsxs(\"div\",{className:\"mt-1.5 flex items-center gap-2\",\"data-source-loc\":\"src/App.tsx:520:16\",children:[", "!1&&r.jsxs(\"div\",{className:\"mt-1.5 flex items-center gap-2\",\"data-source-loc\":\"src/App.tsx:520:16\",children:[", "unverified product-card stars hidden"),
        ("r.jsxs(\"div\",{className:\"mt-2 flex items-center gap-2\",\"data-source-loc\":\"src/App.tsx:974:14\",children:[", "!1&&r.jsxs(\"div\",{className:\"mt-2 flex items-center gap-2\",\"data-source-loc\":\"src/App.tsx:974:14\",children:[", "unverified product-detail stars hidden"),
        ("r.jsxs(\"section\",{id:\"reviews\"", "!1&&r.jsxs(\"section\",{id:\"reviews\"", "unverified review/testimonial section removed"),
        (",{label:\"Reviews\",href:\"#reviews\"}", "", "orphan Reviews navigation item removed"),
    ]
    for old_patch, new_patch, label in bundle_patches:
        if old_patch not in src:
            continue
        # Several patches add a short-circuit before a JSX expression. Check
        # the complete replacement first so repeated runs stay idempotent.
        if new_patch and new_patch in src:
            continue
        src = src.replace(old_patch, new_patch, 1)
        changes.append(f"bundle: {label}")

    # Normalize duplicate guards left by earlier patcher versions. Keep one
    # false child per hidden UI block; React ignores it without rendering the
    # unsupported section or star row.
    hidden_jsx_targets = [
        'r.jsxs("div",{className:"mt-1.5 flex items-center gap-2","data-source-loc":"src/App.tsx:520:16"',
        'r.jsxs("div",{className:"mt-2 flex items-center gap-2","data-source-loc":"src/App.tsx:974:14"',
        'r.jsx("section",{className:V("border-y-2",rt,ia),"data-source-loc":"src/App.tsx:689:6",children:',
        'r.jsxs("section",{id:"reviews"',
    ]
    normalized = False
    for target in hidden_jsx_targets:
        src, n = re.subn(r'(?:!1&&){2,}(?=' + re.escape(target) + r')', "!1&&", src, count=1)
        normalized = normalized or bool(n)
    if normalized:
        changes.append("bundle: duplicate hidden-section guards normalized")

    # --- 1b. custom.js's DEFAULT_PW ----------------------------------------
    dp = re.search(r'var DEFAULT_PW\s*=\s*"([^"]+)"', src)
    if dp:
        src = re.sub(r'var DEFAULT_PW\s*=\s*"[^"]*"', 'var DEFAULT_PW = ""', src)
        changes.append(f"custom.js: DEFAULT_PW factory password removed ({len(dp.group(1))} chars, plain text)")

    # --- 1b1. disable client-side shared-login fallbacks -----------------
    # The legacy sync shim once accepted a factory password or browser-local
    # value when its optional worker was absent. A static bundle cannot verify
    # either securely, so this path must fail closed.
    factory = re.search(r'var FACTORY\s*=\s*"([^"]*)";', src)
    if factory:
        src = re.sub(r'var FACTORY\s*=\s*"[^"]*";\s*', '', src, count=1)
    old_shared_helpers = '''  function storedLocalPw() {
    var v = null;
    try { v = localStorage.getItem("aa-admin-pw-v1"); } catch (e) {}
    if (!v) return null;
    try { return decodeURIComponent(escape(atob(v))) || atob(v); }
    catch (e) { try { return atob(v); } catch (e2) { return null; } }
  }
  function localCheck(pw) {
    var st = storedLocalPw();
    if (st && pw === st) return true;
    return pw === FACTORY;
  }'''
    safe_shared_helpers = '''  function storedLocalPw() {
    var v = null;
    try { v = localStorage.getItem("aa-admin-pw-v1"); } catch (e) {}
    if (!v) return null;
    try { return decodeURIComponent(escape(atob(v))) || atob(v); }
    catch (e) { try { return atob(v); } catch (e2) { return null; } }
  }
  function localCheck(pw) {
    return false; // Public static files have no trusted password verifier.
  }'''
    for helper_block in (old_shared_helpers, safe_shared_helpers):
        if helper_block in src:
            src = src.replace(helper_block, "", 1)
            changes.append("custom.js: removed unused browser-local password verifier")
            break
    old_no_worker = '''      setTimeout(function () { localCheck(pw) ? ok() : fail("INCORRECT PASSWORD — TRY AGAIN."); }, 250);'''
    new_no_worker = '''      setTimeout(function () { fail("ADMIN LOGIN IS DISABLED — SERVER AUTHENTICATION IS NOT CONFIGURED."); }, 0);'''
    if old_no_worker in src:
        src = src.replace(old_no_worker, new_no_worker, 1)
        changes.append("custom.js: no-worker login reports that authentication is disabled")
    old_worker_fail = '''        .catch(function () { localCheck(pw) ? ok() : fail("INCORRECT PASSWORD — TRY AGAIN."); });'''
    new_worker_fail = '''        .catch(function () { fail("AUTHENTICATION SERVICE UNAVAILABLE — TRY AGAIN LATER."); });'''
    if old_worker_fail in src:
        src = src.replace(old_worker_fail, new_worker_fail, 1)
        changes.append("custom.js: worker errors no longer fall back to local password checks")
    old_local_change = '''      } else {
        if (cur.value !== (storedLocalPw() || FACTORY)) { setMsg("CURRENT PASSWORD IS INCORRECT."); return; }
        try { localStorage.setItem("aa-admin-pw-v1", btoa(unescape(encodeURIComponent(nw.value)))); } catch (e) {}
        setMsg("PASSWORD UPDATED — THIS BROWSER ONLY (sync server not configured).", true);
        cur.value = ""; nw.value = ""; cf.value = "";
      }'''
    new_local_change = '''      } else {
        setMsg("ADMIN LOGIN IS DISABLED — SERVER AUTHENTICATION IS NOT CONFIGURED.");
        cur.value = ""; nw.value = ""; cf.value = "";
      }'''
    if old_local_change in src:
        src = src.replace(old_local_change, new_local_change, 1)
        changes.append("custom.js: browser-local password changes disabled")

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

    if src != orig:
        b.write_text(src, encoding="utf-8")
    report.append((str(b.relative_to(ROOT)), changes))

# ------------------------------------------------------- 3. custom.js blog fixes
cj = ROOT / "custom.js"
if not cj.exists():
    fail("custom.js not found")
src = cj.read_text(encoding="utf-8")
changes = []

if MARKER not in src:
    src = src.rstrip() + "\n\n" + BLOG_FIX
    changes.append("blog fixes appended (real <a> links, <h3> titles, accessible modal)")
else:
    changes.append("blog fixes already present — skipped")

if FORGOT_MARK not in src:
    src = src.rstrip() + "\n\n" + FORGOT_FIX
    changes.append("forgot-password link appended to the admin login panel")
else:
    changes.append("forgot-password link already present — skipped")
cj.write_text(src, encoding="utf-8")
report.append(("custom.js", changes))

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
print("\nReview the diff, validate JavaScript syntax, and confirm the generated rating/review UI stays suppressed before deployment.")
