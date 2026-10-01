#!/usr/bin/env node
/*
 * Allegiant Attire — SEO page prerenderer
 * ------------------------------------------------------------------
 * WHY THIS EXISTS
 *   Your site is a client-rendered SPA. The served HTML is 997 bytes:
 *   <div id="root"></div> and nothing else. Every URL other than "/"
 *   404s. So Google has exactly ONE page to rank for the entire
 *   business, and there is nothing that can rank for
 *   "custom t-shirts dubai", "dtf printing dubai", "school uniforms uae".
 *
 *   This script turns pages.json into real static HTML pages that ship
 *   inside your existing build, styled by your existing CSS, with real
 *   <title>, meta description, canonical, Open Graph, breadcrumbs and
 *   JSON-LD per page.
 *
 * USAGE (from repo root)
 *   npm run build
 *   node scripts/prerender-seo-pages.mjs --dist dist --pages scripts/pages.json
 *   # then deploy dist/ as you normally do (GitHub Pages)
 *
 *   Add  "postbuild": "node scripts/prerender-seo-pages.mjs"  to
 *   package.json so it never gets forgotten.
 *
 * WHAT IT PRODUCES
 *   dist/<slug>/index.html        — the page
 *   dist/sitemap.xml              — regenerated from the same data
 *
 * NOTES
 *   * It copies the <link>/<script> tags from your freshly built
 *     index.html, so hashed asset names never go stale.
 *   * It ships a 3-line guard that stops the SPA from blanking the
 *     prerendered HTML. Delete the guard if you later make the app
 *     render these routes itself.
 *   * No npm dependencies. Node 18+.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const distDir = resolve(arg("dist", "dist"));
const pagesPath = resolve(arg("pages", join(here, "pages.json")));
const data = JSON.parse(readFileSync(pagesPath, "utf8"));
const biz = data.business;

const templatePath = join(distDir, "index.html");
if (!existsSync(templatePath)) {
  console.error(`✗ ${templatePath} not found — run "npm run build" first.`);
  process.exit(1);
}
const template = readFileSync(templatePath, "utf8");

/* ---- pull the CSS out of the freshly built index.html ----
 * We deliberately ship ONLY the stylesheets on prerendered pages, not the
 * React bundle. Reasons:
 *   1. The bundle mounts and replaces #root, which would blank the static content.
 *   2. 480 KB of JS + ~27 MB of media is exactly what is hurting you today.
 *   3. A static page with no JS is the fastest thing you can serve.
 * Pass --hydrate if you would rather load the SPA on these pages anyway.
 */
const HYDRATE = process.argv.includes("--hydrate");
const allTags = [...template.matchAll(/<link[^>]+rel="stylesheet"[^>]*>|<script[^>]+(?:type="module"|src="[^"]+")[^>]*><\/script>/g)].map((m) => m[0]);
const assetTags = HYDRATE ? allTags : allTags.filter((t) => t.startsWith("<link"));
if (!assetTags.length) console.warn("! no stylesheet tags found in the built index.html");

/* ---------------------------------------------------------------- */
/* helpers                                                           */
/* ---------------------------------------------------------------- */
const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const absUrl = (slug) => `${biz.url.replace(/\/$/, "")}/${slug.replace(/^\/+|\/+$/g, "")}/`;

const GUARD = `<script>
/* prerender guard: the page below is real HTML — do not let the SPA wipe it. */
window.__AA_PRERENDERED__ = true;
(function () {
  var r = document.getElementById("root");
  if (!r) return;
  new MutationObserver(function () {
    if (!r.hasAttribute("data-aa-static") && !r.firstElementChild) {
      document.body.classList.add("aa-boost");
    }
  }).observe(r, { childList: true });
})();
</script>`;

function pageBody(p) {
  const crumbs = p.slug.startsWith("blog/")
    ? [["Home", "/"], ["Guides", "/blog/"], [p.h1, null]]
    : [["Home", "/"], [p.h1, null]];

  const bullets = (p.bullets || [])
    .map((b) => `<li>${esc(b)}</li>`)
    .join("");

  const table = p.table
    ? `<figure class="aa-pricetable">
      <figcaption>${esc(p.table.caption)}</figcaption>
      <table>
        <thead><tr>${p.table.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
        <tbody>${p.table.rows.map((r) => `<tr>${r.map((c, i) => `<${i === 0 ? "th" : "td"}${i === 0 ? ' scope="row"' : ""}>${esc(c)}</${i === 0 ? "th" : "td"}>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </figure>`
    : "";

  const sections = (p.sections || [])
    .map((s) => `<section><h2>${esc(s.h2)}</h2><p>${esc(s.p)}</p></section>`)
    .join("");

  const faq = (p.faq || [])
    .map(
      (f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`
    )
    .join("");

  const nav = `<nav class="aa-pagenav" aria-label="Breadcrumb"><ol>${crumbs
    .map(([label, href]) =>
      href ? `<li><a href="${href}">${esc(label)}</a></li>` : `<li aria-current="page">${esc(label)}</li>`
    )
    .join("")}</ol></nav>`;

  return `<div class="aa-page">
  ${nav}
  <header class="aa-pagehead">
    <h1>${esc(p.h1)}</h1>
    <p class="aa-lede">${esc(p.lede)}</p>
    <p class="aa-cta">
      <a class="aa-btn" href="https://wa.me/971582045242" rel="nofollow">WhatsApp ${esc(biz.phoneDisplay)}</a>
      <a class="aa-btn aa-btn-2" href="/#quote">Build a quote</a>
    </p>
  </header>
  ${p.heroImage ? `<img src="${esc(p.heroImage)}" alt="${esc(p.heroAlt)}" width="1200" height="800" loading="eager" decoding="async" fetchpriority="high" />` : ""}
  <p>${esc(p.intro)}</p>
  ${bullets ? `<ul class="aa-bullets">${bullets}</ul>` : ""}
  ${table}
  ${sections}
  ${faq ? `<section class="aa-faq"><h2>Frequently asked questions</h2>${faq}</section>` : ""}
  <footer class="aa-pagefoot">
    <h2>Talk to the factory</h2>
    <p>${esc(biz.streetAddress)}, ${esc(biz.locality)}, UAE · ${esc(biz.hours)}</p>
    <p><a href="tel:${esc(biz.phone)}">${esc(biz.phoneDisplay)}</a> · <a href="mailto:${esc(biz.email)}">${esc(biz.email)}</a></p>
    <p><a href="/">Back to Allegiant Attire</a></p>
  </footer>
</div>`;
}

function jsonLd(p) {
  const url = absUrl(p.slug);
  const isBlog = p.slug.startsWith("blog/");
  const node = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: (p.slug.startsWith("blog/")
          ? [["Home", "/"], ["Guides", "/blog/"], [p.h1, url]]
          : [["Home", "/"], [p.h1, url]]
        ).map(([name, link], i) => ({
          "@type": "ListItem",
          position: i + 1,
          name,
          item: `${biz.url.replace(/\/$/, "")}${link === "/" ? "/" : link === url ? url : link}`,
        })),
      },
      isBlog
        ? {
            "@type": "Article",
            "@id": `${url}#article`,
            headline: p.title,
            description: p.description,
            image: `${biz.url.replace(/\/$/, "")}${p.heroImage}`,
            author: { "@type": "Organization", name: biz.name, url: biz.url },
            publisher: { "@type": "Organization", name: biz.name, logo: { "@type": "ImageObject", url: `${biz.url}logo.png` } },
            inLanguage: "en-AE",
            mainEntityOfPage: url,
          }
        : {
            "@type": "Service",
            "@id": `${url}#service`,
            serviceType: p.h1,
            name: p.h1,
            description: p.description,
            url,
            image: `${biz.url.replace(/\/$/, "")}${p.heroImage}`,
            provider: { "@id": `${biz.url}#business` },
            areaServed: biz.serviceCities.map((c) => ({ "@type": "City", name: c })),
            offers: { "@type": "Offer", priceCurrency: "AED", availability: "https://schema.org/InStock" },
          },
    ],
  };
  if (p.faq && p.faq.length) {
    node["@graph"].push({
      "@type": "FAQPage",
      mainEntity: p.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  return JSON.stringify(node, null, 2);
}

function buildPage(p) {
  const url = absUrl(p.slug);
  const head = `  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(p.title)}</title>
  <meta name="description" content="${esc(p.description)}" />
  <link rel="canonical" href="${url}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="theme-color" content="#0b0b0c" />
  <meta property="og:type" content="${p.slug.startsWith("blog/") ? "article" : "website"}" />
  <meta property="og:site_name" content="${esc(biz.name)}" />
  <meta property="og:locale" content="en_AE" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${esc(p.title)}" />
  <meta property="og:description" content="${esc(p.description)}" />
  <meta property="og:image" content="${biz.url.replace(/\/$/, "")}${esc(p.heroImage)}" />
  <meta property="og:image:alt" content="${esc(p.heroAlt || p.h1)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(p.title)}" />
  <meta name="twitter:description" content="${esc(p.description)}" />
  <meta name="twitter:image" content="${biz.url.replace(/\/$/, "")}${esc(p.heroImage)}" />
  <link rel="icon" type="image/png" href="/icons/icon-32.png" />
  <link rel="apple-touch-icon" href="/icons/icon-180.png" />
  <link rel="alternate" type="application/rss+xml" title="${esc(biz.name)} guides" href="/blog/rss.xml" />
  <script type="application/ld+json">
${jsonLd(p)}
  </script>
${assetTags.map((t) => "  " + t).join("\n")}
${HYDRATE ? "  " + GUARD : ""}`;

  return `<!doctype html>
<html lang="en-AE">
<head>
${head}
</head>
<body>
<div id="root" data-aa-static="true">${pageBody(p)}</div>
<noscript>This page works without JavaScript. Call ${esc(biz.phoneDisplay)} for a bulk quote.</noscript>
</body>
</html>
`;
}

/* ---------------- write the pages ---------------- */
let written = 0;
const sitemapUrls = [{ loc: biz.url, priority: "1.0", changefreq: "weekly" }];

for (const p of data.pages) {
  const outDir = join(distDir, p.slug.replace(/^\/+|\/+$/g, ""));
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, "index.html");
  writeFileSync(outFile, buildPage(p), "utf8");
  sitemapUrls.push({ loc: absUrl(p.slug), priority: p.slug === "contact" ? "0.7" : "0.8", changefreq: "monthly" });
  written++;
  console.log(`  ✓ ${p.slug}/index.html  (${p.title.length} char title)`);
}

/* ---------------- sitemap ---------------- */
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;
writeFileSync(join(distDir, "sitemap.xml"), sitemap, "utf8");
console.log(`  ✓ sitemap.xml (${sitemapUrls.length} URLs)`);

/* ---------------- 404 ---------------- */
if (!existsSync(join(distDir, "404.html"))) {
  writeFileSync(
    join(distDir, "404.html"),
    `<!doctype html>
<html lang="en-AE">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex, follow" />
<title>Page not found | Allegiant Attire — Custom Clothing Manufacturer UAE</title>
<meta name="description" content="That page does not exist. Browse custom t-shirts, polos, hoodies, caps, uniforms, DTF printing and embroidery made in Ajman, UAE." />
<link rel="canonical" href="https://allegiantattire.store/404.html" />
${assetTags.map((t) => t).join("\n")}
</head>
<body>
<div id="root" data-aa-static="true">
  <main style="max-width:640px;margin:80px auto;padding:0 20px;font-family:system-ui,sans-serif;color:#eee;background:#0b0b0c">
    <h1 style="font-size:2rem">404 — page not found</h1>
    <p>That page does not exist. Here is where the useful things live:</p>
    <ul>
      <li><a href="/custom-t-shirts-dubai/">Custom t-shirts in Dubai</a></li>
      <li><a href="/dtf-printing-dubai/">Same-day DTF printing</a></li>
      <li><a href="/school-uniforms-uae/">School uniforms UAE</a></li>
      <li><a href="/private-label-clothing-uae/">Private label clothing</a></li>
      <li><a href="/contact/">Request a callback</a></li>
    </ul>
    <p><a href="/">← Back to Allegiant Attire</a> · <a href="tel:+971582045242">+971 58 204 5242</a></p>
  </main>
</div>
</body>
</html>
`,
    "utf8"
  );
  console.log("  ✓ 404.html");
}

/* ---------------- robots.txt (copy through if the project has one) ---------------- */
for (const candidate of ["public/robots.txt", join(here, "robots.txt")]) {
  if (existsSync(candidate)) {
    copyFileSync(candidate, join(distDir, "robots.txt"));
    console.log(`  ✓ robots.txt (copied from ${candidate})`);
    break;
  }
}

console.log(`\nDone. ${written} pages prerendered into ${distDir}/`);
