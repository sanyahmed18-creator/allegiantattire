#!/usr/bin/env python3
"""
Allegiant Attire — build the blog as real, crawlable pages.

Why: the "FROM THE JOURNAL" section shows 4 articles, but "READ ARTICLE" is a
<button> with no href. Google cannot follow it, so all 4 articles are invisible
to search. One of them (/blog/choosing-a-bulk-t-shirt-printer-in-the-uae/)
already has a page; the other 3 do not, and there is no /blog/ index.

This writes:
    blog/index.html
    blog/dtf-printing-in-dubai/index.html
    blog/how-to-select-the-perfect-customized-hoodie/index.html
    blog/how-to-design-custom-hoodies-for-business-or-event/index.html
    blog/choosing-a-bulk-t-shirt-printer-in-the-uae/index.html   (rebuilt, expanded)

and adds the new URLs to sitemap.xml.

    python3 scripts/build-blog.py .            # . = your build output folder

Content comes from posts.json (the real copy already in your bundle) plus
supplementary sections written from your own site's specs. Extend them.
"""
from __future__ import annotations
import json, re, sys
from pathlib import Path
from datetime import date

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
BIZ = {
    "name": "Allegiant Attire",
    "url": "https://allegiantattire.store/",
    "phone": "+971582045242",
    "phoneDisplay": "+971 58 204 5242",
    "email": "info@allegiantattire.store",
    "whatsapp": "https://wa.me/971582045242",
    "address": "New Industrial Area 2, Ajman, UAE",
    "hours": "Mon–Sat 9:00–19:00",
}

SLUG = {
    "dtf": "dtf-printing-in-dubai",
    "hoodie": "how-to-select-the-perfect-customized-hoodie",
    "design": "how-to-design-custom-hoodies-for-business-or-event",
    "bulk": "choosing-a-bulk-t-shirt-printer-in-the-uae",
}

# SEO titles / descriptions for each post (<=60 / <=155 chars)
META = {
    "dtf": ("DTF Printing in Dubai — Same-Day, No Minimum",
            "How in-house DTF printing in Dubai beats outsourcing: same-day pressing, full colour, no minimum, 30+ wash cycles. Cost vs screen printing explained."),
    "hoodie": ("How to Choose a Custom Hoodie — GSM, Fit & Fleece Guide",
               "The hoodie spec checklist our merchandisers use: 300 vs 400 GSM, brushed fleece vs loopback, fit blocks, print zones and what to check on a sample."),
    "design": ("How to Design Custom Hoodies for Business or Events",
               "Plan a custom hoodie run for staff or an event: audience, artwork placement, print zones, sizing curves and how to budget 50–5,000 pieces."),
    "bulk": ("Choosing a Bulk T-Shirt Printer in the UAE: 7 Checks",
             "How to vet a bulk t-shirt printer in the UAE: print methods and real costs, fabric weight truths, MOQ traps and the red flags that cost deadlines."),
}

HERO = {
    "dtf": "/images/s-dtf.jpg",
    "hoodie": "/images/p-hoodie.jpg",
    "design": "/images/p-hoodie.jpg",
    "bulk": "/images/p-tee.jpg",
}

# Supplementary sections — written from the specs on your own site. Extend these;
# thin posts (under ~400 words) will not hold a ranking.
EXTRA = {
    "dtf": [
        ("What DTF actually is",
         "Direct-to-film prints your artwork onto a PET film with water-based pigment inks, dusts it with a hot-melt adhesive powder, cures it, then heat-presses the transfer onto the garment. There is no weeding, no screen, and no colour limit — gradients, fine text and photographic detail all come through."),
        ("DTF vs screen printing: the real break-even",
         "Screen printing carries a setup cost per colour per placement. Spread across 500 pieces that setup is nothing; spread across 30 pieces it dominates the unit price. As a working rule: under 100 pieces or more than three colours, DTF wins. Above 100 pieces with one to three spot colours, screen printing wins on both cost and wash durability."),
        ("What to check on a DTF sample",
         "Stretch the print. A properly cured transfer stretches with the fabric and returns without cracking. Check the edges for a hard adhesive halo, which means over-powdering. Then wash it hot — 40°C, inside out — and look again after three cycles."),
        ("Turnaround",
         "Artwork in before noon, pressed the same day in Dubai on stock blanks. Bulk runs move to the same line with a one to two day window across the UAE."),
    ],
    "hoodie": [
        ("Fabric weight is the decision",
         "300 GSM reads as a light layer — good for Gulf winters and gym warm-ups. 400 GSM brushed fleece is a proper winter hoodie with real hand-feel. Above that you are in heavy merch territory. Ask for the certificate, then weigh the sample; a size L at 400 GSM should feel substantially heavier than one at 300."),
        ("Brushed fleece vs loopback",
         "Brushed fleece is fluffy on the inside and warm — the classic hoodie. Loopback French terry has a visible looped back, drapes cleaner and reads more premium on a merch drop. Garment washing softens either one and takes out the shrinkage."),
        ("Fit block",
         "Measure a hoodie you already like: chest, body length, sleeve. A size M varies by around 4 cm between factories, so never order on the label alone. Decide deliberately between a retail fit and an oversized block — they are different patterns, not different sizes."),
        ("Finishing that separates cheap from good",
         "Double-lined hood, metal aglets on the drawcords, ribbed cuffs that recover after stretching, and a kangaroo pocket that sits level. These are the details a buyer notices in the first ten seconds."),
    ],
    "design": [
        ("Start with the audience",
         "Staff hoodies want a subtle left-chest mark they will wear outside work. Event hoodies want a large back print that reads from a distance. The two briefs produce completely different artwork, so decide before you design."),
        ("Design inside the print zones",
         "A chest print lives in roughly a 30 x 35 cm window. Sleeve and hood prints need extra setups and cost more. Keep any embroidered text above 8 pt or the letters will fill in."),
        ("Build the size curve from real headcount",
         "A typical UAE corporate curve runs 5 / 20 / 40 / 25 / 10 across S to 2XL. Order about 3% extra for exchanges. Do not order an even split — you will be left with a box of smalls."),
        ("Budget all five lines, not just the garment",
         "Blank plus print plus label plus bag plus delivery. DTF adds a flat per-print cost; embroidery scales with stitch count. Ask for the quote itemised across all five so you can see where the money actually goes."),
    ],
    "bulk": [
        ("1. Match the print method to the quantity",
         "Under 100 pieces, DTF is cheaper because there is no screen setup. Above 100 pieces with one to four colours, screen printing wins on unit cost and wash durability. Sublimation is only for polyester. A supplier who quotes the same method for a 30-piece and a 3,000-piece run is not thinking about your cost."),
        ("2. Ask for the GSM, then weigh the sample",
         "A quoted 180 GSM tee and a delivered 160 GSM tee feel completely different. Weigh the sample. Ask for the fabric certificate rather than accepting a verbal number."),
        ("3. Confirm what is genuinely in-house",
         "Outsourced print adds a third-party lead time you cannot control. Ask which steps happen on the supplier's own floor: cutting, stitching, printing, pressing, packing. A same-day promise is only real if the press is in the building."),
        ("4. Demand a physical sample",
         "A digital mockup proves nothing about ink adhesion, colour accuracy or hand feel. Sampling should take five to seven days and should be a real garment, printed on the real fabric, at the real size."),
        ("5. Check the portfolio for repeat clients",
         "One-off event work is easy. Look for brands that have re-ordered across multiple seasons — that is the only real evidence of consistency."),
        ("6. Watch the MOQ trap",
         "A low headline price with a 500-piece minimum is not a low price if you need 80 pieces. Ask for a tiered quote at 50, 100, 250 and 500 so you can see the real curve."),
        ("7. Red flags",
         "No physical address or factory visit offered, no wash-test claim, no per-piece breakdown, prices quoted before anyone has seen the artwork, and urgency used as a sales tactic rather than a production capability."),
    ],
}

FAQ = {
    "dtf": [
        ("Is there a minimum order for DTF printing?",
         "No. DTF starts at a single piece, which makes it the cheapest way to sample before a bulk run."),
        ("Can you do same-day DTF in Dubai?",
         "Yes, for artwork received before noon on stock blanks or garments you supply."),
        ("What size transfers can you print?",
         "Up to A3. Larger artwork is split, or moved to sublimation or screen printing."),
        ("How many washes does a DTF print last?",
         "30+ cycles tested when washed inside out at 30–40°C and cured correctly."),
    ],
    "hoodie": [
        ("What GSM should a custom hoodie be?",
         "300 GSM for a light layer, 400 GSM brushed fleece for a winter-weight hoodie. Above that is heavy merch territory."),
        ("What is the minimum order for custom hoodies?",
         "12 pieces when printing on existing blanks; 100 pieces per colour for full cut-and-sew."),
        ("How long does sampling take?",
         "5–7 days for a physical sample; bulk production runs 2–3 weeks."),
    ],
    "design": [
        ("Can you develop the artwork for us?",
         "Yes — send a brief, a logo or a reference and we will prepare print-ready artwork with placement marked."),
        ("What is the smallest hoodie run you will take?",
         "12 pieces on existing blanks. Cut-and-sew starts at 100 pieces per colour."),
    ],
    "bulk": [
        ("What is a fair MOQ for custom t-shirts in the UAE?",
         "10–12 pieces per style on printed blanks is a reasonable minimum from a genuine manufacturer. Much higher usually means the supplier only wants bulk runs."),
        ("How long should sampling take?",
         "5–7 days is standard for a UAE factory with in-house printing. Longer usually means the print is being outsourced."),
    ],
}


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def iso(d):
    m = {"JAN": "01", "FEB": "02", "MAR": "03", "APR": "04", "MAY": "05", "JUN": "06",
         "JUL": "07", "AUG": "08", "SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12"}
    parts = d.replace(",", "").split()
    return f"{parts[2]}-{m.get(parts[0].upper(), '01')}-{int(parts[1]):02d}"


def css_and_head():
    """Reuse the CSS the live homepage links to, so styling matches."""
    idx = ROOT / "index.html"
    tags = []
    if idx.exists():
        h = idx.read_text(encoding="utf-8")
        tags = re.findall(r'<link[^>]+rel="stylesheet"[^>]*>', h)
    if not tags:
        tags = ['<link rel="stylesheet" href="/assets/index-BtfB1ydO.css">',
                '<link rel="stylesheet" href="/custom.css">']
    return "\n  ".join(tags)


def page(post):
    slug = SLUG[post["id"]]
    url = f"{BIZ['url']}blog/{slug}/"
    title, desc = META[post["id"]]
    published = iso(post["date"])
    words = sum(len(p.split()) for p in post["body"]) + sum(len(b.split()) for _, b in EXTRA[post["id"]])

    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": BIZ["url"]},
                {"@type": "ListItem", "position": 2, "name": "Guides", "item": f"{BIZ['url']}blog/"},
                {"@type": "ListItem", "position": 3, "name": post["title"], "item": url},
            ]},
            {"@type": "Article", "@id": f"{url}#article", "headline": post["title"],
             "description": desc, "image": f"{BIZ['url'].rstrip('/')}{HERO[post['id']]}",
             "datePublished": published, "dateModified": published, "inLanguage": "en-AE",
             "mainEntityOfPage": url, "articleSection": post["tag"],
             "wordCount": words,
             "author": {"@type": "Organization", "name": BIZ["name"], "url": BIZ["url"]},
             "publisher": {"@type": "Organization", "name": BIZ["name"],
                           "logo": {"@type": "ImageObject", "url": f"{BIZ['url']}logo.png"}}},
        ],
    }
    faq = FAQ.get(post["id"], [])
    if faq:
        ld["@graph"].append({"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]})

    body_html = "\n".join(f"    <p>{esc(p)}</p>" for p in post["body"])
    extra_html = "\n".join(f'    <section><h2>{esc(h)}</h2><p>{esc(p)}</p></section>' for h, p in EXTRA[post["id"]])
    faq_html = "\n".join(f"    <details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>" for q, a in faq)
    others = [p for p in POSTS if p["id"] != post["id"]]
    related = "\n".join(
        f'    <li><a href="/blog/{SLUG[o["id"]]}/">{esc(o["title"])}</a></li>' for o in others)

    return f"""<!doctype html>
<html lang="en-AE">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(desc)}" />
  <link rel="canonical" href="{url}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="theme-color" content="#0b0b0c" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="{BIZ['name']}" />
  <meta property="og:locale" content="en_AE" />
  <meta property="og:url" content="{url}" />
  <meta property="og:title" content="{esc(title)}" />
  <meta property="og:description" content="{esc(desc)}" />
  <meta property="og:image" content="{BIZ['url'].rstrip('/')}{HERO[post['id']]}" />
  <meta property="article:published_time" content="{published}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{esc(title)}" />
  <meta name="twitter:description" content="{esc(desc)}" />
  <meta name="twitter:image" content="{BIZ['url'].rstrip('/')}{HERO[post['id']]}" />
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png" />
  <link rel="apple-touch-icon" href="/icons/icon-180.png" />
  <script type="application/ld+json">
{json.dumps(ld, indent=2, ensure_ascii=False)}
  </script>
  {css_and_head()}
</head>
<body>
<div id="root" data-aa-static="true">
  <main class="aa-page aa-article">
    <nav class="aa-pagenav" aria-label="Breadcrumb">
      <ol>
        <li><a href="/">Home</a></li>
        <li><a href="/blog/">Guides</a></li>
        <li aria-current="page">{esc(post['title'])}</li>
      </ol>
    </nav>

    <header class="aa-pagehead">
      <p class="aa-meta">{esc(post['tag'])} · <time datetime="{published}">{esc(post['date'])}</time> · {esc(post['read'])} read</p>
      <h1>{esc(post['title'])}</h1>
      <p class="aa-lede">{esc(post['excerpt'])}</p>
      <p class="aa-cta">
        <a class="aa-btn" href="{BIZ['whatsapp']}" rel="nofollow">WhatsApp {esc(BIZ['phoneDisplay'])}</a>
        <a class="aa-btn aa-btn-2" href="/contact/">Request a bulk quote</a>
      </p>
    </header>

    <img src="{HERO[post['id']]}" alt="{esc(post['title'])} — {esc(BIZ['name'])}, Ajman UAE" width="1200" height="800" loading="eager" decoding="async" fetchpriority="high" />

    <article>
{body_html}
{extra_html}
    </article>

    <section class="aa-faq">
      <h2>Frequently asked questions</h2>
{faq_html}
    </section>

    <section class="aa-related">
      <h2>More guides</h2>
      <ul>
{related}
      </ul>
    </section>

    <footer class="aa-pagefoot">
      <h2>Get a price and a lead time</h2>
      <p>{esc(BIZ['address'])} · {esc(BIZ['hours'])}</p>
      <p><a href="tel:{esc(BIZ['phone'])}">{esc(BIZ['phoneDisplay'])}</a> · <a href="mailto:{esc(BIZ['email'])}">{esc(BIZ['email'])}</a></p>
      <p><a href="/blog/">All guides</a> · <a href="/">Back to {esc(BIZ['name'])}</a></p>
    </footer>
  </main>
</div>
</body>
</html>
"""


def index_page():
    cards = "\n".join(f"""    <article class="aa-postcard">
      <p class="aa-meta">{esc(p['tag'])} · <time datetime="{iso(p['date'])}">{esc(p['date'])}</time> · {esc(p['read'])} read</p>
      <h2><a href="/blog/{SLUG[p['id']]}/">{esc(p['title'])}</a></h2>
      <p>{esc(p['excerpt'])}</p>
      <p><a href="/blog/{SLUG[p['id']]}/">Read article →</a></p>
    </article>""" for p in POSTS)
    url = f"{BIZ['url']}blog/"
    ld = {"@context": "https://schema.org", "@type": "CollectionPage", "name": "Guides & Methods",
          "url": url, "isPartOf": {"@id": f"{BIZ['url']}#website"},
          "publisher": {"@id": f"{BIZ['url']}#business"}}
    return f"""<!doctype html>
<html lang="en-AE">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Guides &amp; Methods — Custom Clothing UAE | Allegiant</title>
  <meta name="description" content="Practical guides from our Ajman factory: DTF vs screen printing, hoodie GSM and fit, designing for bulk, and how to vet a bulk t-shirt printer in the UAE." />
  <link rel="canonical" href="{url}" />
  <meta name="robots" content="index, follow" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="{BIZ['name']}" />
  <meta property="og:url" content="{url}" />
  <meta property="og:title" content="Guides &amp; Methods — Custom Clothing UAE" />
  <meta property="og:description" content="Practical garment manufacturing guides: print methods, fabric weights, sizing curves and how to vet a bulk supplier." />
  <meta property="og:image" content="{BIZ['url'].rstrip('/')}/images/og-cover-1200x630.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png" />
  <script type="application/ld+json">
{json.dumps(ld, indent=2, ensure_ascii=False)}
  </script>
  {css_and_head()}
</head>
<body>
<div id="root" data-aa-static="true">
  <main class="aa-page aa-blogindex">
    <nav class="aa-pagenav" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li aria-current="page">Guides</li></ol></nav>
    <header class="aa-pagehead">
      <h1>Guides &amp; Methods</h1>
      <p class="aa-lede">What we have learned running an in-house cut, stitch and print factory in Ajman — written for the people who have to place the order.</p>
    </header>
    <section class="aa-posts">
{cards}
    </section>
    <footer class="aa-pagefoot">
      <h2>Need a price?</h2>
      <p>{esc(BIZ['address'])} · {esc(BIZ['hours'])}</p>
      <p><a href="tel:{esc(BIZ['phone'])}">{esc(BIZ['phoneDisplay'])}</a> · <a href="mailto:{esc(BIZ['email'])}">{esc(BIZ['email'])}</a></p>
      <p><a href="/">Back to {esc(BIZ['name'])}</a></p>
    </footer>
  </main>
</div>
</body>
</html>
"""


posts_path = ROOT / "posts.json"
POSTS = json.loads(posts_path.read_text()) if posts_path.exists() else []
if not POSTS:
    print("posts.json not found or empty — run the extractor first", file=sys.stderr)
    raise SystemExit(1)

blog_dir = ROOT / "blog"
blog_dir.mkdir(parents=True, exist_ok=True)
(blog_dir / "index.html").write_text(index_page(), encoding="utf-8")
print(f"  ✓ blog/index.html")

new_urls = [f"{BIZ['url']}blog/"]
for p in POSTS:
    slug = SLUG[p["id"]]
    d = blog_dir / slug
    d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(page(p), encoding="utf-8")
    u = f"{BIZ['url']}blog/{slug}/"
    if u not in new_urls:
        new_urls.append(u)
    print(f"  ✓ blog/{slug}/index.html")

# ---- add the new URLs to sitemap.xml ----
sm = ROOT / "sitemap.xml"
if sm.exists():
    xml = sm.read_text(encoding="utf-8")
    today = date.today().isoformat()
    added = 0
    for u in new_urls:
        if u in xml:
            continue
        block = (f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{today}</lastmod>\n"
                 f"    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n")
        xml = xml.replace("</urlset>", block + "</urlset>")
        added += 1
    sm.write_text(xml, encoding="utf-8")
    print(f"  ✓ sitemap.xml +{added} URLs (now {xml.count('<loc>')} total)")
else:
    print("  ! sitemap.xml not found in this folder — add the URLs manually:")
    for u in new_urls:
        print(f"      {u}")

print("\nDone. Next: paste the blog links into your homepage footer and re-run the SEO validator.")
