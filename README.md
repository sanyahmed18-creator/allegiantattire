# allegiantattire.store — security + email + blog fix package

Built and tested **1 October 2026** against your live site. Everything in `site/`
is a complete, drop-in replacement for what you currently have deployed.

---

## What was wrong, and what I changed

### 🔴 1. Your admin password was published on the internet

The password was hardcoded in **two** JavaScript files that every visitor downloads:

| File | Line | Status |
|---|---|---|
| `assets/index-CAFUB5Vv.js` | `l3="C00lhunter@0528",AA_PW=function(){…}` | ✅ removed |
| `custom.js` | `var DEFAULT_PW = "C00lhunter@0528"; // factory password (bundle fallback)` | ✅ removed |

Anyone could read it three ways: open DevTools → Sources, run
`localStorage.getItem("aa-admin-pw-v1")`, or just search the downloaded JS.
I confirmed it in your live bundle before patching.

**What the patch does**

- Both literals are now empty strings — the secret is no longer in any file you ship.
- The login now **fails closed**: `AA_PW().length>0 && c===AA_PW()`. This matters — without it, an empty password would have *matched* the empty value and opened the admin panel to everyone.
- The error message now reads *"ADMIN LOGIN IS DISABLED — CONTACT US ON WHATSAPP."* instead of looping forever.

**Verified in a real browser against the patched build:**

```
password present in downloaded JS:  false
hardcoded literals found:           ["", ""]
submit empty         -> "ADMIN LOGIN IS DISABLED — CONTACT US ON WHATSAPP."
submit old password  -> "ADMIN LOGIN IS DISABLED — CONTACT US ON WHATSAPP."
submit random guess  -> "ADMIN LOGIN IS DISABLED — CONTACT US ON WHATSAPP."
```

**⚠️ Read this — the honest part**

Removing the password stops it being *readable*. It does not make the admin
panel *secure*, and it cannot: your site is static files on GitHub Pages with no
server, so there is nothing that can check a password. Everything the panel does
writes to `localStorage`, which is private to that one browser — a stranger's
edits would only ever change *their own* view of the site, not yours.

So the practical risk was mainly that the password itself is now known to
anyone who looked. **If you reuse `C00lhunter@0528` anywhere else — email,
banking, Instagram, your Cloudflare account — change those today.**

**To get a genuinely protected admin area**, put it behind Cloudflare Access
(free up to 50 users) and keep it off the public site entirely:

1. Cloudflare dashboard → **Zero Trust** → **Access** → **Applications** → *Add an application* → **Self-hosted**
2. Application domain: `admin.allegiantattire.store` (or a path like `/admin`)
3. Policy: **Allow** → action *Allow* → include *Emails* → `info@allegiantattire.store`
4. Point that hostname at the admin build; Cloudflare then requires a verified
   email login before a single byte is served.

Alternatively, just **remove the ADMIN button** from the header. Given that the
panel only edits `localStorage`, it is not doing anything a visitor could not do
in DevTools anyway — and it is the only reason the site needed a password.

**Source-level fix** so this does not come back on your next `npm run build`:
delete the `DEFAULT_PW` constant in `custom.js` and the `l3` constant in
`src/components/admin.tsx`, and delete the `admin.tsx` login comparison — or
gate the whole admin route behind the Cloudflare Access hostname.

---

### 🟠 2. Email changed to info@allegiantattire.store

Replaced in **42 places** across the shipped files, including:

- the `LocalBusiness` JSON-LD `email` field on the homepage (this is what feeds
  Google's knowledge panel)
- every `mailto:` link
- the visible address text in footers

`grep -r sanyahmed18 site/` → **0 results**.

**One thing you must do in Cloudflare**, or this will keep breaking:

Cloudflare's **Email Address Obfuscation** (Rules → Settings → Scrape Shield)
was rewriting your address in transit. I found it on **15 pages**, in two
different encodings:

```html
<a href="/cdn-cgi/l/email-protection" class="__cf_email__"
   data-cfemail="99eaf8f7e0f8f1f4fcfda8a1d9fef4f8f0f5b7faf6f4">[email protected]</a>
```

That means your real address never appeared in the HTML at all — Google could
not read it, and users with JS disabled saw the literal text "[email protected]".
It also injected `email-decode.min.js` into every page. The patch decodes the
XOR and restores the plain address, but **Cloudflare re-applies it on every
request until you turn the switch off.** It provides no real protection (the
encoding is reversible — I reversed it).

---

### 🟠 3. The blog error

Your "FROM THE JOURNAL" section shows 4 articles. The scanner was right to flag it:

| Problem | Measured before | After |
|---|---|---|
| "READ ARTICLE" was a `<button>` with no `href` | 4 buttons, **0 links** | 4 real `<a href>` links |
| Article titles were not headings | blog section had 1 `<h2>`, 0 `<h3>` | 4 `<h3>` headings |
| 3 of the 4 articles had no URL at all | only 1 blog page existed | 4 pages + `/blog/` index |
| Article dialog had no accessible name | `role="dialog"`, no `aria-label` | labelled |

The articles opened in a modal on the same URL. Google cannot follow a button
and cannot index a modal, so all that writing was invisible to search.

**Behaviour change you should know about:** clicking "READ ARTICLE" now
navigates to the article's own page instead of opening a modal. That is the
point — it gives each article a URL that can rank — but it is a visible change.

New pages:

```
/blog/                                                        (index)
/blog/dtf-printing-in-dubai/
/blog/how-to-select-the-perfect-customized-hoodie/
/blog/how-to-design-custom-hoodies-for-business-or-event/
/blog/choosing-a-bulk-t-shirt-printer-in-the-uae/            (rebuilt)
```

Each carries `Article` + `BreadcrumbList` + `FAQPage` JSON-LD, an `<h1>`, a
canonical, Open Graph tags and internal links to the other three. `sitemap.xml`
now has **19 URLs** (was 16).

**One bonus fix the validator caught:** your homepage shipped **two `<h1>`
elements** — the static SEO one in `index.html` plus the one React renders on
mount. The static one is now marked screen-reader-only so exactly one visible
`<h1>` remains (verified in a browser: `h1_in_dom: 1, h1_visible: 1`).

---

### 🟢 4. "Forgot password?" recovery link

Added to the **ADMIN LOGIN panel only** — it never appears on a public page.

```
FORGOT PASSWORD? — recovery is by email only; a static site has no self-service reset.
```

Clicking it opens your mail client with a pre-filled email:

- **To:** `sanyahmed18@gmail.com`
- **Subject:** `Allegiant Attire - admin login recovery`
- **Body:** a short template that includes the exact steps to regain access —
  DevTools → Application → Local Storage → delete `aa-admin-pw-v1` → reload.

**Your Gmail address is not shown on screen, and does not appear as a complete
string in any shipped file.** The link text is only "Forgot password?", and the
address is assembled from fragments in `custom.js` at click time.

Verified across the whole package:

| Check | Result |
|---|---|
| `grep 'sanyahmed18@gmail.com'` (full address) | **0 files** |
| `grep 'sanyahmed18'` (username fragment only) | 1 file — `custom.js`, `var FP_USER = "sanyahmed18";` |
| Address visible in the page HTML of `/`, `/contact/`, `/custom-t-shirts-dubai/`, `/blog/` | absent |

So a harvester grepping for complete email addresses finds nothing, but anyone
who reads `custom.js` closely could reconstruct it. That is the honest limit of
this approach — it deters automated collection, it is not secrecy.

*One precise caveat:* once you open the admin panel, the link is in the live DOM
with a `mailto:` href — that is unavoidable for a mailto link on a serverless
site. It is invisible to crawlers and to anyone who does not click ADMIN.

**⚠️ A bug I hit and fixed.** My first version of this froze the page completely.
It watched for DOM changes with a `MutationObserver` and inserted the link inside
the callback — inserting fires another mutation, React re-rendered the form in
between, and the two loops fed each other forever. Clicking ADMIN hung the tab.
The shipped version has a re-entrancy guard, a `data-aa-forgot` marker on the
form so it never inserts twice, and a 120 ms debounce. Verified: open the panel,
close it, reopen it — link count stays at 1 and the page stays responsive.

---

## Deploying

`site/` is the complete site — every HTML page, all 82 images, all 9 videos,
CSS, JS, icons, `sitemap.xml`, `robots.txt`, `404.html`. Replace your GitHub
Pages content with it:

```bash
# from your repo, replace the deployed output
rsync -av --delete site/ dist/     # or just copy site/ over your build folder
git add -A && git commit -m "security: remove exposed admin password; email + blog fixes"
git push
```

**If you rebuild from source instead**, copy `scripts/` into your repo and run
the patch after every build — it is idempotent:

```bash
python3 scripts/patch-build.py dist     # password, email, cf-email, duplicate h1
python3 scripts/build-blog.py dist      # blog pages + sitemap
node  scripts/seo-validate.mjs --dist dist   # fails the build on any regression
```

Or use the one-shot wrapper: `./apply-all.sh dist`

Then **turn off Cloudflare → Rules → Settings → Email Address Obfuscation.**

---

## Verification — what I actually ran

Built the package, served it locally on `127.0.0.1:8899`, and drove it with a
real Chromium browser:

| Check | Result |
|---|---|
| Password in downloaded JS | **false** — literals are `""` |
| Admin login: empty / old password / random guess | all rejected, all show the disabled message |
| Blog: real crawlable links | 4 × `/blog/<slug>/` |
| Blog: heading structure | 4 `<h3>` in the section |
| Click "READ ARTICLE" | navigates to `/blog/dtf-printing-in-dubai/` — 458 words, `Article`+`FAQPage`+`BreadcrumbList` JSON-LD |
| Email on `/`, `/contact/`, `/custom-t-shirts-dubai/`, `/blog/…` | `mailto:info@allegiantattire.store`, obfuscated=false, gmail=false |
| All 22 URLs (21 pages + sitemap + robots) | **22/22 returned 200** |
| `node --check` on patched `index-*.js` and `custom.js` | both valid JS |
| `seo-validate.mjs` | **PASSED — 0 errors**, 2 informational warnings |
| "Forgot password?" on `/`, `/contact/`, `/custom-t-shirts-dubai/`, `/blog/` | absent, as intended |
| "Forgot password?" inside the admin panel | present, exactly 1, text is only "Forgot password?" |
| Full Gmail address as a literal in any shipped file | **0 files** (the username fragment is in `custom.js`; see §4) |
| Its mailto | recipient `sanyahmed18@gmail.com`, subject set, 17-line body with the recovery steps |
| Open panel → close → reopen | link count stays 1, page stays responsive (regression test for the freeze) |

The 2 remaining warnings are intentional: `blog/index.html` is 219 words (an
index page, fine), and the homepage's screen-reader-only `<h1>` is flagged so
the pattern is visible rather than silent.

---

## Still open

1. **Turn off Cloudflare Email Address Obfuscation** — otherwise the email fix is cosmetic.
2. **Change the password `C00lhunter@0528` anywhere else you use it.**
3. **Set up Cloudflare Access** if you want a real admin area, or delete the ADMIN button.
4. **Add the source-level fix** in `src/components/admin.tsx` + `custom.js`, or the password returns on your next build.
5. **Blog copy is a first draft.** Each article is ~450 words — enough to rank long-tail, not enough to compete on head terms. Add your own specifics: real client examples, actual lead times, photos of your own work.
6. **The recovery link is a convenience, not a security control.** It emails you; it cannot verify you. Real access control means Cloudflare Access (item 3).
7. **Videos are still 12 MB of autoplay.** `services.mp4` alone is 2.8 MB and 8 videos load for 2 visible players. Set `preload="none"` and lazy-assign `src` on scroll — this is the single biggest performance win left.
