# SEO & site-readiness audit — Allegiant Attire

**Reviewed:** 6 October 2026 (UTC)
**Scope:** live homepage text snapshot plus the checked-in static-site repository. This is a technical and content-structure review, not a ranking prediction or a verification of business operations.

## Executive summary

The strongest local SEO improvement is not adding “AI markup”; it is making the business, services, location, and useful answers easy to crawl and verify. This repository now provides static, internally linked service and guide pages; consistent page-level metadata; a sitemap; and explicit crawler policy. The homepage also includes server-delivered HTML so its core service copy is not dependent only on React hydration.

The production homepage fetched on the review date still showed the older React storefront and several unsupported social-proof claims, including generated product stars/review counts and large volume, quality, staff, and delivery metrics. The repository changes do **not** deploy themselves. The checked-in bundle now suppresses the generated ratings and testimonial sections and removes or replaces the unsupported summary metrics; that cleanup will become live only after the updated site is published.

**Status:** local files pass the current validator. Before treating the public site as complete, confirm the business facts listed below, select the final model-training crawler policy, deploy the full static site through the real host, and complete the external checks. No ranking, traffic, citation, or rich-result outcome is promised.

## What was observed

### Live homepage snapshot

The fetched live page presented the business as an Ajman/UAE clothing manufacturer and exposed a large React-generated product catalog. It also showed:

- multiple product ratings/review counts and a “top rated” sort, without an evident review source in the fetched content;
- promotional volume, quality, staff, machine and rush-delivery figures that need documentary/owner confirmation;
- long product/category content inside the interactive storefront.

The live crawl files also need attention: the fetched sitemap contains 19 URLs, omits the reachable `/blog/` index, and still includes `priority`/`changefreq`; the repository sitemap now contains 20 URLs and removes those ignored fields. The fetched live `robots.txt` has stale explanatory comments that conflict with its actual directives (for example, its body explicitly allows `GPTBot`, `ClaudeBot` and `CCBot`, while its comments say they are disallowed), and it uses the older `Claude-Web` token rather than current Anthropic crawler names. The repository file separates current search/retrieval agents from selected model-data controls. Because the live text mentions Cloudflare-managed robots, confirm at the edge that the origin file will actually be served; a live text fetch cannot identify which layer generated it.

Those observations describe the content returned by the fetch at review time, not response headers, Google index status, Cloudflare WAF behavior, or the current Google Business Profile. They may change after deployment. The local patch removes the generated star/review UI and testimonial sections instead of asserting that the figures are false; the owner should reconnect genuine review data if it exists. The local crawler policy also changes what the fetched production rules currently allow, so the owner must approve that policy before replacing the live file.

### Repository state

- **20 indexable canonical URLs** are listed in `sitemap.xml`. The local validator checks that each indexable HTML route has a sitemap entry and that each URL resolves to a local file.
- The checked-in site has static homepage, service, about/contact and blog HTML. The homepage has a crawlable initial HTML section, service links, a canonical URL, Open Graph/Twitter metadata, business structured data and visible FAQ content.
- The blog generator builds `/blog/` and four standalone articles from `scripts/posts.json`. Article dates, canonical/social metadata, JSON-LD and sitemap entries are generated together.
- `robots.txt` currently allows selected search and user-fetch agents while disallowing selected model-data/training tokens. The owner has not confirmed this data-use policy; see **Crawler policy** below.
- The app’s generated review/product-rating UI and unsupported company summary metrics are patched out in the local JavaScript bundle. The public client-side admin fallback is fail-closed; this does not create a secure admin system.

## What should improve discoverability and trust

### Google Search

1. **More indexable landing pages.** Static service pages give relevant searches a specific destination (for example DTF printing, embroidery, school uniforms and private-label clothing), rather than making every topic a section of one SPA URL. Descriptive internal links connect the homepage, service pages and guides.
2. **Clearer page identity.** Each indexable HTML page has a unique title/description, canonical, social preview metadata and one intended visible page heading. The homepage’s address, phone, service area and business identity are represented in visible copy and `LocalBusiness`/`Organization` JSON-LD.
3. **A crawl path and sitemap.** `robots.txt` points to the XML sitemap; the sitemap covers the 20 indexable URLs; the blog generator keeps article URLs in sync.
4. **Fewer unsupported trust signals.** Formula-generated ratings and testimonial blocks are not evidence of customer experience. They have been removed from the shipped UI pending a real, attributable source. The new copy should only retain owner-confirmed operational claims.
5. **Useful content, not schema volume.** FAQs remain visible because they answer customer questions. `FAQPage` JSON-LD is retained where it matches visible answers, but Google’s FAQ rich-result feature stopped appearing in Search on 7 May 2026. Do not expect a FAQ enhancement from this markup. Structured data also does not guarantee a rich result.

### AI search and retrieval

- Clear static text, explicit service/location context, internal links and accurate entity/contact details make the content easier for search and retrieval systems to understand and cite.
- The repo explicitly allows selected search crawlers (OpenAI `OAI-SearchBot`, Anthropic `Claude-SearchBot`, Perplexity `PerplexityBot`) and user-requested fetch agents where applicable. These are distinct from some model-training/data-use controls. A CDN firewall or bot-protection rule can still prevent requests even when `robots.txt` allows them.
- **There is no special “AI ranking” tag or guaranteed route into AI answers.** Google says its AI Search features use the same underlying Search controls and do not require special AI markup; search appearance and citations remain system-selected.

## Local changes and validation

`./apply-all.sh .` runs, in order:

1. `scripts/patch-build.py` — fail-closed client-side admin fallbacks; suppresses generated product ratings, testimonial/review sections and unsupported summary claims;
2. `scripts/build-blog.py .` — regenerates the blog index/article pages and sitemap from the maintained post data;
3. `node --check` — checks `custom.js` and the shipped bundle syntax;
4. `scripts/seo-validate.mjs --dist .` — checks page metadata, headings, JSON-LD parsing, local links, robots and sitemap coverage.

Additional checks run on the current working tree:

- `node --check assets/index-CAFUB5Vv.js` — JavaScript syntax;
- `node --check custom.js` — JavaScript syntax;
- `python3 -m py_compile scripts/patch-build.py` — patcher syntax.

Expected local validator result after the final run: **21 HTML files scanned (20 indexable routes plus `404.html`), 0 errors, 1 warning**. The warning is the intended screen-reader-only static homepage heading alongside the app’s rendered heading. The validator confirms local files only; it does not request Google, test response headers, prove a crawler can pass Cloudflare, or confirm indexing.

`apply-all.sh` is executable. `scripts/prerender-seo-pages.mjs` and `scripts/pages.json` are legacy/optional material, not part of `apply-all.sh`; do not run the old prerenderer against the repository root without first reviewing all data and output.

## Owner confirmation required before deployment

The repository contains details that cannot be verified from code. Confirm that the following are current and accurate wherever they appear in visible copy or JSON-LD:

- business name, actual address, map pin/coordinates, phone, public email, opening hours and founding year;
- whether the business is a manufacturer at that location and which services/areas it actually serves;
- prices/range, accepted payment methods, product/SKU catalog, stock and category-specific minimum order quantities;
- fabric weights, machines/techniques/capabilities, wash-test statements and quality-control claims;
- same-day conditions, sample/bulk lead times, delivery coverage and rush availability.

The checked-in copy currently includes specific examples such as Ajman location details, UAE service areas, “same-day” DTF subject to conditions, delivery/production windows, fabric GSM, sample/bulk timing and wash-cycle claims. These are useful only if true and consistently maintained. No generated star ratings, customer-review counts or testimonial claims should be restored without a verifiable source and owner approval.

## External work that code cannot do

### Google Search Console

- Verify the domain property under the actual owner’s account.
- Submit `https://allegiantattire.store/sitemap.xml` after deployment.
- Use URL Inspection and the Pages/Indexing and Performance reports to see crawl/index status and traffic. Local validation is not an indexation test.

### Google Business Profile

- Confirm that the correct existing profile is verified and that name, location/service area, categories, hours, phone and website match the business and the site.
- Add real facility/product photos and request authentic customer reviews without incentives or invented content. This repository cannot create, verify or manage a profile.

### Cloudflare / actual hosting

- Verify live HTTP-to-HTTPS and `www`/apex redirects, caching, CSP/security headers and canonical host on actual responses.
- Review WAF/bot controls against the crawler policy below. `robots.txt` does not override a firewall.
- The checked-in `.htaccess` is Apache-specific. It may be ignored entirely by a GitHub Pages/static-host deployment; configure equivalent policy at the active host/CDN if needed. It now permits the external Google Fonts styles/font files used by the CSS, Google Tag Manager, and Cloudflare Insights when that policy is active.
- Check that Cloudflare email obfuscation or other response rewriting does not corrupt the public business email.

### Crawler policy — owner decision still needed

The current `robots.txt` allows general search crawling and explicitly allows `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, and selected user-fetch agents. It disallows `GPTBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`, `CCBot`, and `Meta-ExternalAgent`. Confirm whether that is the owner’s intended data-use policy before publishing. Search visibility and model-training controls are not interchangeable:

- OpenAI documents `OAI-SearchBot` as its ChatGPT Search crawler and `GPTBot` as the training crawler; `ChatGPT-User` is user-triggered and may not be controlled by `robots.txt`.
- Anthropic documents separate `ClaudeBot`, `Claude-User` and `Claude-SearchBot` agents and says its bots respect `robots.txt`.
- Perplexity separates `PerplexityBot` (search) from `Perplexity-User` (user-triggered fetch). Its docs note that the latter generally ignores `robots.txt`; WAF rules still matter.
- Google documents `Google-Extended` as a product token for certain Gemini/Vertex AI data uses; it does **not** affect inclusion in Google Search or Google Search ranking. Google’s AI Search features use Googlebot/Search controls.

Official references checked for this audit:

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google: common crawlers and Google-Extended](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers)
- [Google: FAQ structured data](https://developers.google.com/search/docs/appearance/structured-data/faqpage)
- [OpenAI: Overview of OpenAI crawlers](https://platform.openai.com/docs/bots)
- [Anthropic: crawler controls](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [Perplexity: crawler controls](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)

## Deployment sequence

1. Review and approve owner-dependent claims and the crawler data-use policy.
2. From the repository root, run `./apply-all.sh .`; inspect `git diff` and confirm the validator result.
3. Deploy the **complete current site document root** through the existing hosting workflow: homepage, route folders, `assets/`, `custom.css`, `custom.js`, `images/`, `videos/`, icons, `robots.txt`, `sitemap.xml` and any host-relevant domain/404 configuration. The helper scripts and audit notes are not needed at runtime. Preserve the provider’s expected `CNAME`/custom-domain setup.
4. Purge CDN cache only if the host needs it, then check the live homepage, representative service pages, all blog routes, `/robots.txt` and `/sitemap.xml`. Confirm generated ratings/testimonials are absent and the public contact data is correct.
5. Complete the Search Console, Business Profile, redirect/header and crawler/WAF checks above.

Technical SEO improves the site’s ability to be crawled, understood and evaluated; it cannot guarantee rankings or appearance in AI answers. Keep accurate, useful, experience-based content and use Search Console/analytics to measure actual results.
