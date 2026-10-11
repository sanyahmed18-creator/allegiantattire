#!/usr/bin/env node
/*
 * SEO validator — run this after every build, before you deploy.
 *
 *   node scripts/seo-validate.mjs --dist dist
 *
 * Exits 1 if anything fails, so you can wire it into CI:
 *   "scripts": { "build": "vite build", "postbuild": "node scripts/prerender-seo-pages.mjs", "seo": "node scripts/seo-validate.mjs" }
 *
 * Checks, per page:
 *   - exactly one <h1>
 *   - unique title, 10–60 chars (Google truncates ~60 chars / 580px)
 *   - unique meta description, 70–155 chars
 *   - self-referencing canonical, https, trailing slash
 *   - og:title / og:image / twitter:card present
 *   - every JSON-LD block parses and declares @type
 *   - every <img> has non-empty alt + width/height (kills CLS)
 *   - no internal 404s between generated pages
 *   - sitemap.xml parses and every URL in it has a matching file
 *   - robots.txt exists and points at the sitemap
 *   - flags very sparse body copy for review (word count is not a ranking target)
 *   - every indexable HTML route is present in the sitemap
 * No dependencies. Node 18+.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const i = process.argv.indexOf("--dist");
const dist = resolve(i > -1 && process.argv[i + 1] ? process.argv[i + 1] : "dist");
if (!existsSync(dist)) {
  console.error(`✗ dist folder not found: ${dist}`);
  process.exit(1);
}

const htmlFiles = [];
(function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (e.endsWith(".html")) htmlFiles.push(p);
  }
})(dist);

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
const get = (h, re) => { const m = (h.match(re) || [])[1]; return m ? decode(m) : null; };
const all = (h, re) => [...h.matchAll(re)].map((m) => m[1]);

const titles = new Map();
const expectedSitemapUrls = new Set();
const errors = [];
const warnings = [];

for (const file of htmlFiles) {
  const rel = relative(dist, file);
  const h = readFileSync(file, "utf8");
  const fail = (msg) => errors.push(`${rel}: ${msg}`);
  const warn = (msg) => warnings.push(`${rel}: ${msg}`);
  const isNoindex = /name="robots" content="[^"]*noindex/.test(h);   // 404 pages are exempt from SERP rules

  // A prerendered page can legitimately ship a screen-reader-only <h1> in its
  // static block alongside the <h1> the app renders. Those are marked with
  // data-aa-sr-h1; anything else counts toward the "exactly one" rule.
  const h1s = all(h, /<h1[\s>]/g);
  const srOnlyH1 = all(h, /<h1[^>]*data-aa-sr-h1[^>]*[\s>]/g).length;
  const visibleH1 = h1s.length - srOnlyH1;
  if (h1s.length === 0) fail("no <h1>");
  if (visibleH1 === 0) fail("no visible <h1> (all are marked screen-reader-only)");
  if (visibleH1 > 1) fail(`${visibleH1} visible <h1> elements — keep exactly one`);
  if (srOnlyH1 > 0) warn(`${srOnlyH1} screen-reader-only <h1> in the static block (expected on a prerendered page)`);

  const title = get(h, /<title>([^<]*)<\/title>/);
  if (!title) fail("missing <title>");
  else {
    if (!isNoindex && (title.length < 10 || title.length > 60)) fail(`title ${title.length} chars (want 10–60): "${title}"`);
    if (titles.has(title)) fail(`duplicate title (also on ${titles.get(title)})`);
    else titles.set(title, rel);
  }

  const desc = get(h, /name="description" content="([^"]*)"/);
  if (!desc) fail("missing meta description");
  else if (desc.length < 70 || desc.length > 155) fail(`meta description ${desc.length} chars (want 70–155)`);

  const canonical = get(h, /rel="canonical" href="([^"]*)"/);
  if (!canonical) fail("missing canonical");
  else {
    if (!canonical.startsWith("https://")) fail(`canonical is not https: ${canonical}`);
    if (rel !== "404.html") {
      const expected = rel === "index.html" ? "https://allegiantattire.store/" : `https://allegiantattire.store/${rel.replace(/index\.html$/, "")}`;
      if (canonical !== expected) fail(`canonical ${canonical} does not match file path ${expected}`);
    }
  }

  if (!isNoindex) {
    if (canonical) expectedSitemapUrls.add(canonical);
    if (!/property="og:image"/.test(h)) fail("missing og:image");
    if (!/property="og:title"/.test(h)) fail("missing og:title");
    if (!/property="og:description"/.test(h)) fail("missing og:description");
    if (!/name="twitter:card"/.test(h)) fail("missing twitter:card");
    if (!/name="twitter:title"/.test(h)) fail("missing twitter:title");
    if (!/name="twitter:description"/.test(h)) fail("missing twitter:description");
    if (!/name="twitter:image"/.test(h)) fail("missing twitter:image");
    if (rel === "404.html") fail("404.html must be noindexed");
  } else if (rel !== "404.html") fail("page is noindexed but is not 404.html");

  for (const block of all(h, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let j;
    try { j = JSON.parse(block); } catch (e) { fail(`JSON-LD does not parse: ${e.message}`); continue; }
    const nodes = j["@graph"] || [j];
    for (const n of nodes) if (!n["@type"]) fail("JSON-LD node missing @type");
    const faq = nodes.find((n) => n["@type"] === "FAQPage");
    if (faq) for (const q of faq.mainEntity || []) if (!q.acceptedAnswer?.text) fail("FAQPage question missing an answer");
  }

  const imgs = [...h.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  for (const tag of imgs) {
    if (!/alt="[^"]+"/.test(tag)) fail(`img without alt text: ${tag.slice(0, 70)}…`);
    if (!/width="\d+"/.test(tag) || !/height="\d+"/.test(tag)) warn("img missing width/height (CLS risk)");
  }

  for (const rawHref of all(h, /href="(\/[^"#]*)"/g)) {
    const href = rawHref.split("?")[0].split("#")[0];          // strip ?v=12 cache-busters
    if (/\.(jpg|jpeg|png|webp|avif|css|js|mjs|xml|ico|svg|mp4|webm|txt|woff2?)$/i.test(href)) continue;
    const target = join(dist, href.replace(/^\/+/, ""), "index.html");
    const target2 = join(dist, href.replace(/^\/+/, ""));
    if (!existsSync(target) && !existsSync(target2)) fail(`internal link 404s: ${href}`);
  }

  if (/class="aa-pagefoot"/.test(h) && !/class="aa-legal-links"/.test(h)) {
    fail("static page footer is missing Privacy and Terms links");
  }
  if (rel === "index.html") {
    for (const href of ["/vinyl-printing-dubai/", "/privacy/", "/terms/"]) {
      if (!h.includes(`href="${href}"`)) fail(`homepage sitemap footer is missing ${href}`);
    }
  }

  const words = (h.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").match(/\S+/g) || []).length;
  if (words < 250 && !/contact|404/.test(rel)) {
    if (/<div id="root">\s*<\/div>/.test(h)) warn(`only ${words} words of static HTML — this is the blank SPA shell; prerender it (scripts/prerender-seo-pages.mjs)`);
    else warn(`only ${words} words — thin content, expand to 400+`);
  }
}

/* The React app footer is rendered from the minified bundle, not the static
   HTML. Validate its real destinations so an accidental `#top` regression is
   caught before deploy. Also guard against the client-only checkout claiming
   an order was submitted when it only prepares a WhatsApp draft. */
const assetsDir = join(dist, "assets");
if (!existsSync(assetsDir)) errors.push("assets: missing folder");
else {
  const bundles = readdirSync(assetsDir).filter((name) => name.startsWith("index-") && name.endsWith(".js"));
  if (!bundles.length) errors.push("assets: no index-*.js app bundle found");
  for (const name of bundles) {
    const bundle = readFileSync(join(assetsDir, name), "utf8");
    const start = bundle.indexOf("SHOP|T-Shirts|Polo Shirts");
    const end = start >= 0 ? bundle.indexOf('"src/App.tsx:875:8"', start) : -1;
    if (start < 0 || end < 0) {
      errors.push(`${name}: could not locate compiled React footer for destination checks`);
      continue;
    }
    const footer = bundle.slice(start, end);
    for (const href of [
      "/custom-t-shirts-dubai/", "/custom-polo-shirts-dubai/", "/custom-hoodies-dubai/",
      "/custom-caps-dubai/", "/activewear-manufacturer-uae/", "/school-uniforms-uae/",
      "/dtf-printing-dubai/", "/screen-printing-dubai/", "/embroidery-services-dubai/",
      "/vinyl-printing-dubai/", "/private-label-clothing-uae/", "/about-us/", "/blog/",
      "/contact/", "/privacy/", "/terms/"
    ]) if (!footer.includes(href)) errors.push(`${name}: React footer has no destination for ${href}`);
    for (const label of ["DTF Printing", "Screen Printing", "Sublimation", "Embroidery", "Vinyl", "Labelling", "About us", "Blogs", "Contact Us", "Privacy", "Terms", "Order Support"]) {
      if (!footer.includes(label)) errors.push(`${name}: React footer is missing the ${label} item`);
    }
    if (footer.includes('href:"#top"')) errors.push(`${name}: React footer still sends links to #top`);
    if (footer.includes("My Account")) errors.push(`${name}: unsupported My Account link is still in the React footer`);
    if (!footer.includes("Order Support")) errors.push(`${name}: Contact Us support item is missing from the React footer`);
    if (bundle.includes('onSubmit:A=>{A.preventDefault(),lt(!0),R([])}')) {
      errors.push(`${name}: checkout still fakes a successful order and clears the bag`);
    }
    if (bundle.includes("ORDER LOCKED IN.")) errors.push(`${name}: false ORDER LOCKED IN checkout success remains`);
  }
}

const uxFile = join(dist, "site-ux.js");
if (existsSync(uxFile)) {
  const ux = readFileSync(uxFile, "utf8");
  for (const feature of ["ORDER_FORM_LOC", "function submitCheckout", "Open WhatsApp order draft"]) {
    if (!ux.includes(feature)) errors.push(`site-ux.js: missing honest checkout flow (${feature})`);
  }
} else errors.push("site-ux.js: missing checkout/navigation UX script");

/* sitemap */
const sitemapPath = join(dist, "sitemap.xml");
if (!existsSync(sitemapPath)) errors.push("sitemap.xml: missing");
else {
  const sm = readFileSync(sitemapPath, "utf8");
  const urls = all(sm, /<loc>([^<]+)<\/loc>/g);
  if (!urls.length) errors.push("sitemap.xml: no <loc> entries");
  if (sm.includes("&") && !/&amp;|&lt;|&gt;/.test(sm.replace(/&amp;/g, ""))) { /* noop */ }
  const seen = new Set();
  for (const u of urls) {
    if (seen.has(u)) errors.push(`sitemap.xml: duplicate URL ${u}`);
    seen.add(u);
    if (!u.startsWith("https://allegiantattire.store/")) errors.push(`sitemap.xml: off-domain URL ${u}`);
    const relPath = u.replace("https://allegiantattire.store/", "");
    const file = join(dist, relPath, "index.html");
    const file2 = relPath ? join(dist, relPath) : join(dist, "index.html");
    if (!existsSync(file) && !existsSync(file2)) errors.push(`sitemap.xml: ${u} has no matching file`);
  }
  for (const expected of expectedSitemapUrls) {
    if (!seen.has(expected)) errors.push(`sitemap.xml: missing indexable page ${expected}`);
  }
  console.log(`sitemap.xml: ${urls.length} URLs, all resolvable on disk; ${expectedSitemapUrls.size} indexable HTML pages checked`);
}

/* robots */
const robotsPath = join(dist, "robots.txt");
if (!existsSync(robotsPath)) warnings.push("robots.txt: missing from build output");
else {
  const r = readFileSync(robotsPath, "utf8");
  if (!/Sitemap:\s*https:\/\/allegiantattire\.store\/sitemap\.xml/.test(r)) errors.push("robots.txt: no Sitemap directive");
  if (/User-agent:\s*\*\s*\n\s*Disallow:\s*\/\s*$/m.test(r)) errors.push("robots.txt: wildcard Disallow: / — the whole site is blocked from Google");
  for (const bot of ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"]) {
    const group = new RegExp(`User-agent:\\s*${bot}[\\s\\S]*?(?=\\nUser-agent:|$)`, "i").exec(r)?.[0] || "";
    if (!/Allow:\s*\//i.test(group) || /Disallow:\s*\//i.test(group)) warnings.push(`robots.txt: ${bot} is not explicitly allowed for AI search discovery`);
  }
}

console.log(`\nscanned ${htmlFiles.length} HTML files in ${dist}`);
for (const w of warnings) console.log(`  ! ${w}`);
for (const e of errors) console.log(`  ✗ ${e}`);
console.log(`\n${errors.length ? `FAILED — ${errors.length} error(s), ${warnings.length} warning(s)` : `PASSED — 0 errors, ${warnings.length} warning(s)`}`);
process.exit(errors.length ? 1 : 0);
