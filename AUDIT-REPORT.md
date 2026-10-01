# SEO & Website Audit — allegiantattire.store

**Audited:** 14 September 2026 · **Auditor:** Arena.ai Agent Mode
**Method:** live crawl of the production site, raw HTML/JS/CSS inspection, headless-Chromium render with a Googlebot user agent, per-asset byte measurement, URL probes. Every number below was measured, not estimated. Commands are listed in §9 so you can re-run them yourself.

---

## 1. The short version

Your website is well built as a *brochure*. It is currently close to invisible as a *search asset*, and the reason is structural, not cosmetic.

**Google has exactly one page from you to rank — the homepage — and that homepage is a 997-byte empty shell.** Everything a buyer would search for ("custom t-shirts Dubai", "DTF printing Dubai", "school uniforms UAE") lives inside JavaScript on a single URL. There is nothing for those searches to land on.

Three findings explain roughly 80% of your problem:

| # | Finding | Measured |
|---|---|---|
| 1 | **One indexable URL.** Every other path 404s. | `/t-shirts` → 404 · `/dtf-printing/` → 404 · `/about` → 404 · `/blog` → 404 · `/contact` → 404 · `/products` → 404 |
| 2 | **The page ships 27.67 MB to a visitor.** | 44 requests · 14.65 MB of it is autoplay video · 12.85 MB is images · 4,852 DOM nodes |
| 3 | **No crawl infrastructure at all.** | `sitemap.xml` → 404 · no canonical · 0 Open Graph tags · 0 JSON-LD · no favicon.ico · no analytics |

Fix #1 and you have 16 rankable pages instead of 1. Fix #2 and you go from a 27 MB page to roughly 2 MB. Fix #3 and Google can actually find, understand and present what you built.

**One caveat I could not check:** indexing status. `site:allegiantattire.store` returned nothing in the search tools available to me, but that is weak evidence — those tools do not support the `site:` operator properly. **Go to [Google Search Console](https://search.google.com/search-console) and check Pages → Indexing.** That is the only authoritative answer, and you need GSC regardless (see §7).

---

## 2. Why you can't rank — the root cause

Your site is a client-rendered React app served from GitHub Pages behind Cloudflare. Here is the *entire* HTML Google receives:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/logo.png?v=3" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Allegiant Attire — Custom clothing manufacturing in Dubai, UAE. ..." />
    <title>Allegiant Attire | Custom Clothing Mfg Dubai</title>
    <script type="module" crossorigin src="/assets/index-CAFUB5Vv.js?v=9"></script>
    ...
  </head>
  <body>
    <div id="root"></div>     <!-- ← the whole business lives here, after JavaScript runs -->
  </body>
</html>
```

997 bytes. No `<h1>`. No product text. No address. No links Google can follow.

Googlebot *can* render JavaScript, so your homepage content does get seen eventually — I confirmed this by rendering the page with a Googlebot user agent: the rendered DOM contains 1 h1, 9 h2s, 108 h3s and 2,336 words. **But rendering does not fix the real problems:**

- **There is still only one URL.** Google can rank a page for roughly one primary topic. Your homepage is trying to rank for t-shirts, polos, hoodies, activewear, caps, three uniform categories, six print methods and private label. It will rank for none of them well. That is not a Google problem, it is an information-architecture problem.
- **Internal links go nowhere.** 54 of your 70 links are `#anchors` (`#categories`, `#services`, `#quote`, `#blog`, `#reviews`…). Hash links do not create pages, do not pass authority, and cannot appear in search results.
- **Rendered pages are deprioritised.** Google indexes HTML first and renders the JavaScript queue second, with a delay. A page whose content only exists post-render gets discovered later and crawled less often.

**This is the single highest-leverage thing in this report.** Everything else is optimisation; this is capability.

---

## 3. The full findings, with evidence

### 🔴 Critical

| Finding | Evidence | Impact |
|---|---|---|
| **Only 1 indexable URL** | 9 URL probes returned 404 (`/t-shirts`, `/t-shirts/`, `/dtf-printing/`, `/about`, `/contact`, `/products`, `/categories`, `/blog`, `/blog/...`) | No page exists to rank for any commercial keyword |
| **27.67 MB page weight** | Measured in Chromium: 44 requests, 27.67 MB transferred. Breakdown: video 14.65 MB, images 12.85 MB, JS 161 KB, CSS 13 KB | Fails Core Web Vitals on mobile; Google's page-experience signal; huge mobile data cost for your UAE customers |
| **8 autoplay MP4s download on load** | `services.mp4` 2,758 KB · `embroidery.mp4` 2,147 KB · `caps.mp4` 1,794 KB · `polos.mp4` 1,292 KB · `activewear.mp4` 1,026 KB · `hoodies.mp4` 851 KB · `tshirts.mp4` 620 KB · `vests.mp4` 498 KB = **12 MB of video** for **2 visible `<video>` elements** | 6 videos download that aren't even displayed |
| **No sitemap.xml** | `https://allegiantattire.store/sitemap.xml` → HTTP 404 (GitHub Pages 404 body) | Google has no map of the site |
| **No canonical tag** | 0 `rel=canonical` in the document | `/` and `/index.html` both return 200 with identical content (verified) — duplicate content |
| **http:// does not redirect to https://** | `http://allegiantattire.store/` → **HTTP 200**, not 301. (`https://www.` → 301 to apex, which *is* correct.) | Two versions of every page indexed; splits your ranking signals |
| **No structured data** | 0 `application/ld+json` blocks | No address, phone, hours, services or FAQ eligible for rich results |
| **No Open Graph / Twitter cards** | 0 `og:*` tags, 0 `twitter:*` tags | WhatsApp/LinkedIn/Facebook shares — your main sales channel — render as a blank grey box |
| **No analytics** | No `gtag`, no `G-XXXXXX`, no GTM, no `google-site-verification` anywhere in HTML, JS or bundle | You cannot see a single visitor, let alone which keywords bring enquiries |

### 🟠 High

| Finding | Evidence | Impact |
|---|---|---|---|
| **Oversized images** | `s-factory.jpg` 1,990,230 B · `s-dtf.jpg` 1,929,165 B · `p-active.jpg` 1,854,245 B · `hero-apparel.jpg` 1,776,401 B (the LCP element) · 11 images over 1.2 MB each. 69 referenced media files total **23 MB** | The hero alone is 1.7 MB on a mobile connection |
| **124 images, 0 with width/height** | `imgs_no_width_attr: 124` of 124 | Layout shift as images load → CLS failure |
| **Unsubstantiated review claims** | Homepage displays **"4.9★"** and **"1,900+ REVIEWS"**. No review platform is linked anywhere on the site. | Google treats fabricated review signals seriously. Either link to a real, verifiable review source or remove the numbers |
| **Blog has no URLs** | Section reads "04 FEATURED · UPDATED MAR 2026" with 4 articles. "READ ARTICLE" is a `<button>` with an `onclick` handler and **no href** — `read_article_href: []`. `/blog` → 404. | 4 pieces of content that can never appear in search. Content marketing with zero SEO return |
| **Placeholder social links are live** | Footer links to `https://instagram.com/`, `https://facebook.com/`, `https://tiktok.com/`, `https://x.com/`, `https://youtube.com/` — bare homepages. `custom.js` still contains `"https://instagram.com/yourusername"` | Sends visitors to Instagram's homepage. Kills trust and forfeits brand-profile authority |
| **Location conflict** | `<title>` says **Dubai**. Header says **"AJMAN — UAE"**. Footer address is **"New Industrial Area 2, Ajman, UAE"**. Body copy says "our Dubai facility". | Inconsistent NAP (Name-Address-Phone) is the #1 local-ranking killer. Decide: you *serve* Dubai, you are *located* in Ajman. Say exactly that, consistently |
| **Short cache lifetime** | Images and JS: `cache-control: max-age=14400` (4 h). HTML: `max-age=600` (10 min) | Returning visitors re-download 23 MB. Should be 1 year on hashed assets |
| **6 broken image references** | `/images/back/{tee,polo,hoodie,vest,cap,active}.jpg` → all 404. *Note:* I checked the rendered DOM and no visible element currently uses them, so this is dead code rather than a visible break | Minor, but fix it — a future edit will surface them |

### 🟡 Medium

| Finding | Evidence |
|---|---|
| **No `favicon.ico`** | `/favicon.ico` → 404. You use a 163 KB `logo.png` as the icon |
| **163 KB PNG used as favicon & apple-touch-icon** | Should be a 32×32 PNG (~2 KB) and a 180×180 icon |
| **No 404 page** | `/404.html` → 404. Visitors hitting a bad URL get GitHub's default error page |
| **robots.txt blocks AI crawlers** | Cloudflare's managed robots.txt `Disallow`s `GPTBot`, `ClaudeBot`, `CCBot`, `Google-Extended`, `Amazonbot`, `Applebot-Extended`, `meta-externalagent`. Googlebot is allowed |
| **No Arabic content / no hreflang** | UAE search has substantial Arabic volume ("طباعة تيشيرتات دبي", "مصنع ملابس"). Zero Arabic pages |
| **No `webmanifest` / no `theme-color`** | `/manifest.webmanifest` → 404 |
| **4,852 DOM nodes** | Google flags >1,500 as heavy; slows rendering on mid-range Android |
| **`custom.css` targets hashed debug attributes** | Selectors like `[data-source-loc="src/App.tsx:341:16"]` and `#shop { display: none !important; }` — you built a full "Top Selling Products" section and then hid it with CSS. That content is still downloaded and still crawled |

---

## 4. The fix, in priority order

### Priority 1 — Build real pages (biggest win by far)

Create crawlable URLs for what people search. Minimum viable set: **15 pages**. I have written these for you — see §6.

```
/custom-t-shirts-dubai/            /dtf-printing-dubai/
/custom-polo-shirts-dubai/         /screen-printing-dubai/
/custom-hoodies-dubai/             /embroidery-services-dubai/
/custom-caps-dubai/                /sublimation-printing-uae/
/activewear-manufacturer-uae/      /private-label-clothing-uae/
/school-uniforms-uae/              /office-corporate-uniforms-dubai/
/construction-safety-uniforms-uae/ /about-us/  /contact/
/blog/choosing-a-bulk-t-shirt-printer-in-the-uae/
```

Each needs: a unique title ≤60 characters, a unique description ≤155 characters, one `<h1>`, 400+ words of genuinely useful copy, a real image, an FAQ block, and internal links to 3–4 sibling pages. **Do not duplicate the homepage copy across them** — Google will collapse near-identical pages.

Then link them from a real HTML footer/nav (not `#anchors`), and point your homepage's category cards at these URLs instead of `#categories`.

### Priority 2 — Cut the page from 27 MB to ~2 MB

1. **Stop autoloading 8 videos.** Set `preload="none"` on every `<video>` and only assign `src` when the card scrolls into view (`IntersectionObserver`). Or move them to YouTube/Mux and embed only on the two cards that matter. **Saving: ~12 MB.**
2. **Re-encode images.** I ran your own hero, factory and product photos through the script in `fix-pack/`:

   | File | Before | After (WebP) |
   |---|---|---|
   | hero-apparel | 1,776,401 B | 102,296 B |
   | s-factory | 1,990,230 B | 143,740 B |
   | tee-2 | 79,132 B | 14,590 B |
   | **total** | **3.67 MB** | **0.25 MB — 93.2% smaller** |

   Your largest images are ~5,200 px wide. Nothing on a phone needs more than 1,600 px.
3. **Add `width` and `height` to every `<img>`.** Kills layout shift.
4. **`loading="lazy"` + `decoding="async"`** on everything below the fold (you already have this on 112 images — good), and `fetchpriority="high"` on the hero only.
5. **Set `cache-control: max-age=31536000, immutable`** on `/assets/*` and `/images/*` via a Cloudflare Cache Rule.

### Priority 3 — Crawl infrastructure

1. Add `sitemap.xml` → template in `fix-pack/seo-files/sitemap.xml`
2. Add `<link rel="canonical">` to every page
3. Add the head snippet (canonical + OG + Twitter + JSON-LD + preload) → `fix-pack/seo-files/head-snippet.html`
4. **Turn on "Always Use HTTPS" in Cloudflare** (SSL/TLS → Edge Certificates). Right now `http://` serves your site with a 200.
5. Add a `404.html` with links to your main pages
6. Add a real `favicon.ico` + 180×180 apple-touch-icon
7. Replace Cloudflare's managed robots.txt with the one in `fix-pack/seo-files/robots.txt` (it un-blocks the AI crawlers)

### Priority 4 — Trust and correctness

- **Resolve the Ajman/Dubai conflict.** Recommended: title and meta say "Dubai & Ajman"; the address block, schema and Google Business Profile say the real Ajman address; body copy says "we serve Dubai, Sharjah, Ajman and Abu Dhabi from our Ajman factory". One truth, stated consistently everywhere.
- **Fix or remove "4.9★ / 1,900+ reviews".** If they are real Google reviews, link to the Google profile and use only markup for reviews that actually exist there. If they are not, take the numbers down — an unverifiable review claim is worse than no claim.
- **Replace the placeholder social links** with your real profiles (or remove them). Update `SOCIAL_DEFS` in `custom.js` (lines ~994–1000).
- **Delete the 6 broken `/images/back/*.jpg` references.**
- **Add GA4.** Free, 10 minutes, and without it you are flying blind.
- **Consider dropping the personal Gmail** (`sanyahmed18@gmail.com`) for `sales@allegiantattire.store`. A manufacturer asking for 50,000-piece orders from a Gmail address loses enterprise trust.

---

## 5. Off-page: this matters more than the code

For a manufacturer selling to UAE businesses, technical SEO alone will not fill your pipeline. Local visibility does.

1. **Google Business Profile — do this first.** Claim "Allegiant Attire" at New Industrial Area 2, Ajman, category *Clothing manufacturer* / *Wholesale* / *Custom t-shirt printer*. Add 20+ real photos of the factory floor, the DTF line and the embroidery heads. This is what makes you appear on Google Maps and in the local pack for "clothing manufacturer near me". **You cannot outrank a competitor with no GBP.**
2. **Get reviews there.** Ask every delivered client for one Google review. Reviews on GBP are the dominant local ranking factor.
3. **Get listed consistently** on UAE B2B directories: Yellow Pages UAE, Dubizzle business, TradeKey, Kompass UAE, Amazon.ae Business, plus Dubai/Sharjah chamber of commerce listings. Same NAP everywhere.
4. **Local citations + one strong link** from a UAE business publication or a trade association beats 50 generic directory links.
5. **Publish the guides.** You already have 4 blog posts written. Give them URLs and keep publishing — "how to choose a bulk t-shirt printer in the UAE", "DTF vs screen printing cost per piece", "school uniform tender checklist UAE". These are the searches a procurement officer makes *before* they call anyone.

---

## 6. The fix-pack (built and tested)

Everything is in `fix-pack/`. Drop it into your repo.

```
fix-pack/
├── README.md                        ← start here
├── seo-files/
│   ├── head-snippet.html            ← paste into index.html <head>
│   ├── robots.txt                   ← replaces Cloudflare's managed robots.txt
│   ├── sitemap.xml                  ← 16 URLs, matches the generated pages
│   └── pages.json                   ← all 15 pages: titles, copy, FAQs, pricing tables
└── scripts/
    ├── prerender-seo-pages.mjs      ← pages.json → real static HTML in dist/
    ├── seo-validate.mjs             ← build gate: fails on missing h1, long titles, bad JSON-LD…
    └── optimize-images.py           ← 93% image weight reduction (tested on your files)
```

**How it works.** `prerender-seo-pages.mjs` reads `pages.json` and writes a real HTML file per page into your build output, styled by your existing CSS, with correct title, meta, canonical, Open Graph, breadcrumbs and JSON-LD per page. It deliberately does **not** ship the React bundle on those pages, so nothing overwrites the static content and they load instantly.

```bash
# in package.json
"scripts": {
  "build":     "vite build",
  "postbuild": "node scripts/prerender-seo-pages.mjs",
  "seo":       "node scripts/seo-validate.mjs"
}

npm run build && npm run seo     # then deploy dist/ to GitHub Pages as usual
```

**What I verified.** I ran the prerenderer against a copy of your real `index.html`, then ran the validator and rendered the output in Chromium:

- 15 pages + sitemap.xml (16 URLs) + 404.html + robots.txt generated
- Rendered `/dtf-printing-dubai/` in a browser: correct `<h1>` "Same-Day DTF Printing in Dubai", 5 `<h2>`s, 4 FAQ `<details>`, valid JSON-LD graph `[BreadcrumbList, Service, FAQPage]`, image with alt + width, CSS linked from your build, **zero JS scripts** → no console errors, no SPA conflict
- Validator result on the generated pages: **0 errors** (only "expand to 400+ words" warnings — see below)
- Validator result on your **current** homepage: `no <h1>`, `missing canonical`, `missing og:image`, `missing og:title`, `missing twitter:card`, `sitemap.xml: missing` → exit code 1

**Two honest caveats:**

1. **The copy in `pages.json` is a first draft, written from your own site content.** The pricing table on the t-shirt page is illustrative — put your real tiered pricing in. Do not publish placeholder numbers.
2. **Generated pages run 186–236 words.** That is enough to rank for long-tail queries but not to compete for head terms. My validator warns on every one of them for a reason. Get each to 400–600 words with real specifics: fabrics you stock, actual clients, real lead times, photos of your own work.

---

## 7. Google Search Console — do this today

You have no `google-site-verification` meta tag, which suggests GSC may not be set up. Without it you are guessing.

1. Verify `https://allegiantattire.store/` at [search.google.com/search-console](https://search.google.com/search-console)
2. Submit `https://allegiantattire.store/sitemap.xml`
3. Open **Pages → Indexing** and read the reasons. This tells you the truth about indexing that I could not verify for you.
4. Also add **Bing Webmaster Tools** (it imports from GSC in one click) — Bing's data is often cleaner for diagnosing crawl problems.
5. Turn on **GA4** at the same time.

---

## 8. 30-day plan

| Week | Do this | Expected result |
|---|---|---|
| **1** | Claim Google Business Profile + 20 factory photos. Turn on "Always Use HTTPS". Add `head-snippet.html`, `sitemap.xml`, `robots.txt`, `404.html`, GA4 + GSC. Fix the social links. | Google can finally find and understand the site. Local pack eligibility starts |
| **2** | Run `optimize-images.py`, set `preload="none"` on the videos, add width/height to images, set Cloudflare cache rules. | ~27 MB → ~2 MB. Core Web Vitals move from red to green |
| **3** | Run `prerender-seo-pages.mjs`. Put real pricing and 400+ words into `pages.json` first. Submit the sitemap. | 16 indexable pages instead of 1 |
| **4** | Give the 4 existing blog posts real URLs. Publish 2 more. Replace or remove the review claims. Resolve Ajman/Dubai consistently. Ask 10 delivered clients for Google reviews. | Content assets start compounding; trust signals become defensible |

**Realistic expectation:** a site with no sitemap, no GSC and one URL is not going to rank for "custom clothing manufacturer Dubai" in a month — that is a head term held by established competitors with years of links. What you *can* win quickly is the long tail: "DTF printing same day Dubai", "school uniforms manufacturer Ajman", "embroidered polo shirts bulk UAE", "private label clothing UAE small MOQ". Those are the searches with real buying intent and weak competition, and the 15 pages above are built to catch them.

---

## 9. Reproduce this audit

```bash
# what Google actually receives
curl -s https://allegiantattire.store/ | wc -c                    # 997
curl -s -o /dev/null -w "%{http_code}\n" https://allegiantattire.store/sitemap.xml   # 404
curl -s -o /dev/null -w "%{http_code}\n" http://allegiantattire.store/               # 200 (should be 301)
curl -s https://allegiantattire.store/robots.txt                  # Cloudflare managed, AI bots blocked

# render it as Googlebot and measure
python3 fix-pack/scripts/…   # see the audit scripts; key output:
#   44 requests · 27.67 MB · video 14.65 MB · images 12.85 MB
#   4,852 DOM nodes · 124 imgs, 0 with width · 0 JSON-LD · 0 og: tags
#   54 of 70 internal links are #anchors
```

---

*Numbers in this report were measured against the live site on 14 September 2026. Asset sizes and cache headers will change as you fix things — re-run the checks after each change rather than trusting this snapshot.*
