# Allegiant Attire — static site and SEO deployment

**Repository review:** 6 October 2026. The repository root contains the checked-in website: the homepage, static service/about/contact/blog routes, assets, `robots.txt`, `sitemap.xml`, and the custom domain file. It also contains maintenance scripts and audit notes; those are build-time tools, not page assets.

## What changed

- **More crawlable page content.** The homepage now has useful HTML before the React app loads, a single intended visible heading after hydration, descriptive service links, a canonical URL, social-sharing metadata, and LocalBusiness/Organization details. The service pages and blog pages are static HTML with their own canonical URLs and internal links.
- **Blog discovery.** `scripts/build-blog.py` generates the blog index and four article pages from `scripts/posts.json`, maintains their article metadata and the sitemap, and can be rerun safely.
- **Crawl controls.** `robots.txt` allows selected AI search/retrieval bots and separates those from several model-data/training controls. Those are separate owner policy choices; review them before publishing. A robots rule does not override a CDN/WAF block.
- **Trust cleanup.** The shipped app bundle no longer renders formula-generated product ratings, review counts, or testimonial/social-proof sections. Unsupported company-volume, quality, staff/machine, catalog-size and re-order claims were removed or replaced. Reintroduce ratings only when they are genuine, attributable and kept in sync with the visible source.
- **Client-side admin fallback.** Bundled default passwords and the optional browser-only login fallback now fail closed. The site has no trusted server-side CMS/authentication unless you separately configure one; `localStorage` edits affect only that browser. Do not treat the public admin UI as access control.
- **Host headers.** `.htaccess` contains a restrictive baseline policy that permits the site’s Google tag, Cloudflare Insights, and Google Fonts. It only applies on a compatible Apache host that allows these directives. If the site is served by GitHub Pages or another static host, configure equivalent headers/redirects at that host or Cloudflare instead.

## Homepage — "On the rail"

The homepage opens with a full-viewport garment rail, recreated from the reference build the owner supplied (layout, sizing, easings, keyframes and breakpoints all mirror it; copy, products and links are Allegiant Attire's).

- `home-hero.css` / `home-hero.js` — styles and behaviour. Every selector is prefixed `.aa-` and scoped to `.aa-home-shell`, so nothing collides with the React bundle, `custom.css` or `custom.js`.
- Markup lives in `index.html` **outside** `#root`, so React hydration can never wipe it. `<div id="aa-storefront"></div>` is the scroll target for the hero's *Shop* / *Explore* links.
- How it behaves: garments hang edge-on (`rotateY(-69deg)`) and turn to face you when active (`rotateY(0)`, 0.8s `cubic-bezier(.2,.8,.2,1)`), while the rail accordions open around them (`flex-grow:3.05`). Pointer devices activate on hover/focus; touch devices scroll-snap the rail and activate whatever sits nearest the middle. Clicking opens the garment dialog (turntable, prev/next, product link, WhatsApp quote). Menu and About dialogs use native `<dialog>`.
- `images/rail/*.webp` — garments shot on a chroma-key background and keyed to transparency, so they can turn in 3D without a photo box around them. Canvas is a shared 648 × 911 (the reference build’s 640 × 900 proportion) with the hanger hook at the top edge, which is what keeps every garment hanging on the same line at the same scale. Six garments have a matching `-back.webp`, which is what turns on the Front/Back turntable inside the garment dialog.

To change a garment: add the keyed `.webp` to `images/rail/`, then edit the `ITEMS` list used to build the rail markup in `index.html` (keep `alt`, `width` and `height` — the SEO validator requires them).

## Deploying — pull requests publish the site

`.github/workflows/pages.yml` publishes this repository to GitHub Pages:

- **Every pull request to `main`** runs the checks — asset patches, blog/sitemap regeneration, JavaScript syntax checks and the SEO validator — and publishes nothing, so a change is verified before it can go live.
- **Merging a pull request into `main`** (or pushing to `main` directly, or running the workflow by hand) deploys the site automatically. Whatever lands on `main` is live at <https://allegiantattire.store/> as soon as the workflow finishes — no manual upload step.

The workflow stages the deployable document root (HTML routes, assets, images, videos, icons, `custom.css`/`custom.js`, `home-hero.*`, `robots.txt`, `sitemap.xml`, `CNAME`); helper scripts and audit documents are not published. GitHub Pages must be set to deploy from **GitHub Actions** (repository Settings → Pages → Build and deployment → Source) for this workflow to publish.

## Run the deployment checks

From the repository root:

```bash
./apply-all.sh .
node --check assets/index-CAFUB5Vv.js
node --check custom.js
```

`apply-all.sh` patches the current shipped bundle, regenerates the blog and sitemap, syntax-checks `custom.js` and the bundle, and runs the SEO validator. The current expected validator result is **0 errors, 1 warning**: the static homepage contains an intentionally screen-reader-only `<h1>` alongside the app’s rendered heading. The script validates local files; it does not publish them or test Search Console, CDN headers, redirects, WAF rules, or indexing.

Review the resulting diff before deploying. The deployable site files are the root HTML/routes and their assets. Do not publish `.git`; the `scripts/` directory and Markdown/text audit documents are not needed at runtime. Use the host’s existing publish workflow and confirm its document root rather than assuming `.htaccess` or GitHub Pages behavior.

## Before you publish: confirm business facts

The content and structured data carry operational details that cannot be verified from code. Have the business owner confirm the exact address and map coordinates, telephone and inbox, opening hours, founding year, service areas, payment/pricing claims, product availability, minimum order quantities, fabric weights, production methods, sample/bulk/same-day lead times, delivery promises, and wash-test figures. Incorrect facts in visible copy or JSON-LD reduce trust; do not add ratings or testimonials without a real source.

## After deployment: outside this repository

1. **Canonical redirects and headers:** verify HTTP → HTTPS and `www` → the chosen canonical host; check CSP, caching and Cloudflare WAF rules on the real response. The local `.htaccess` is not evidence that production sends these headers.
2. **Google Search Console:** verify the domain/property, submit `https://allegiantattire.store/sitemap.xml`, inspect key URLs and review indexing/crawl reports. This repository cannot confirm Google has crawled or indexed any URL.
3. **Google Business Profile:** confirm the existing profile, real-world address/service area, categories, hours, contact details and factory photos. Request only genuine customer reviews; do not create or mark up invented reviews.
4. **AI crawler policy:** decide whether public content may be used by model-data/training crawlers. Keep search/retrieval access separate from that choice, and check CDN/WAF access as well as `robots.txt`.

SEO changes can improve crawlability, clarity and eligibility for relevant results; **they cannot guarantee rankings, traffic, citations or rich results**. See [AUDIT-REPORT.md](AUDIT-REPORT.md) for the inspection notes, validation scope and official crawler/Google references.
