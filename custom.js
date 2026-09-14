/* ============================================================
   Allegiant Attire — custom behavior
   1) Each category card shows its OWN image (video replaced).
   2) Latest Collections looks live INSIDE their category cards:
        LOOK 01 (Hoodies)    -> "Hoodies & Sweats" card
        LOOK 02 (Activewear) -> "Activewear" card
        LOOK 03 (Cut & Sew)  -> wide card inside the category index
      The "outside" images in #collections + the #shop Top Selling
      section are hidden via custom.css.
   Idempotent + re-applies after React re-renders (theme toggle).
   ============================================================ */
(function () {
  "use strict";
  try { console.log("%c ALLEGIANT ENGINE v22 — colors + security active ", "background:#000;color:#fff;padding:2px 6px"); } catch (e) {}

  var GRID_LOC = "src/App.tsx:273:8";      // category cards grid
  var SECTION_LOC = "src/App.tsx:271:6";   // category index section
  var CARD_LOC = "src/App.tsx:287:12";     // single category card (button)
  var MEDIA_LOC = "src/App.tsx:288:14";    // card media block
  var NAME_LOC = "src/App.tsx:310:16";     // card name <p>
  var FOOT_LOC = "src/App.tsx:309:14";     // card footer row
  var SVC_ROW_LOC = "src/App.tsx:317:8";   // + services links row

  // Distinct image per category name (shown on the card itself)
  var CARD_IMG = {
    "T-Shirts": "/images/p-tee.jpg",
    "Polo T-Shirts": "/images/p-polo.jpg",
    "Hoodies & Sweats": "/images/p-hoodie.jpg",
    "Vests & Tanks": "/images/p-vest.jpg",
    "Activewear": "/images/p-active.jpg",
    "Caps": "/images/p-cap.jpg",
    "Uniforms": "/images/p-uniform.jpg",
    "Services": "/images/s-dtf.jpg"
  };

  var LOOKS = {
    "Hoodies & Sweats": { img: "/images/p-hoodie.jpg", look: "LOOK 01", k: "HOODIES & SWEATS", t: "Heavy fleece season" },
    "Activewear": { img: "/images/p-active.jpg", look: "LOOK 02", k: "ACTIVEWEAR", t: "Team & gym systems" }
  };
  var CUTSEW = { img: "/images/s-factory.jpg", look: "LOOK 03", k: "CUT & SEW", t: "From tech pack to bulk", d: "Sampling in 5–7 days, bulk in 2–3 weeks." };

  function sel(loc) { return '[data-source-loc="' + loc + '"]'; }

  function cardName(btn) {
    var p = btn.querySelector("p" + sel(NAME_LOC));
    return p ? p.textContent.trim() : "";
  }

  // Category section becomes the #categories anchor target
  function ensureSectionId() {
    var section = document.querySelector("section" + sel(SECTION_LOC));
    if (section && section.id !== "categories") section.id = "categories";
  }

  // Replace each card's video with its own named image
  function swapCardMedia() {
    var grid = document.querySelector(sel(GRID_LOC));
    if (!grid) return;
    var cards = grid.querySelectorAll("button" + sel(CARD_LOC));
    for (var i = 0; i < cards.length; i++) {
      var btn = cards[i];
      var src = CARD_IMG[cardName(btn)];
      if (!src) continue;
      var media = btn.querySelector(sel(MEDIA_LOC));
      if (!media) continue;
      var video = media.querySelector("video");
      if (!video) continue; // already swapped (or no video)
      var img = document.createElement("img");
      img.src = src;
      img.alt = cardName(btn);
      img.loading = "lazy";
      img.className = "mono-img h-full w-full object-cover";
      video.replaceWith(img);
    }
  }

  function injectLooks() {
    var grid = document.querySelector(sel(GRID_LOC));
    if (!grid) return;

    var cards = grid.querySelectorAll("button" + sel(CARD_LOC));
    for (var i = 0; i < cards.length; i++) {
      var btn = cards[i];
      var L = LOOKS[cardName(btn)];
      if (!L) continue;
      if (btn.querySelector(".aa-look")) continue;

      var fig = document.createElement("div");
      fig.className = "aa-look";
      var img = document.createElement("img");
      img.src = L.img;
      img.alt = L.t;
      img.loading = "lazy";
      var tag = document.createElement("span");
      tag.className = "aa-look-tag";
      tag.textContent = L.look + " · " + L.k;
      fig.appendChild(img);
      fig.appendChild(tag);

      var foot = btn.querySelector(sel(FOOT_LOC));
      if (foot) btn.insertBefore(fig, foot);
      else btn.appendChild(fig);
    }
  }

  function injectCutSew() {
    var section = document.querySelector("section" + sel(SECTION_LOC));
    if (!section || section.querySelector(".aa-cutsew")) return;

    var a = document.createElement("a");
    a.href = "#categories";
    a.className = "aa-cutsew";

    var media = document.createElement("div");
    media.className = "aa-cutsew-media";
    var img = document.createElement("img");
    img.src = CUTSEW.img;
    img.alt = CUTSEW.t;
    img.loading = "lazy";
    var tag = document.createElement("span");
    tag.className = "aa-cutsew-tag";
    tag.textContent = CUTSEW.look + " · " + CUTSEW.k;
    media.appendChild(img);
    media.appendChild(tag);

    var body = document.createElement("div");
    body.className = "aa-cutsew-body";
    var kick = document.createElement("span");
    kick.className = "aa-cutsew-kicker";
    kick.textContent = "FROM THE COLLECTION — NOW INSIDE CATEGORIES";
    var title = document.createElement("span");
    title.className = "aa-cutsew-title";
    title.textContent = CUTSEW.t;
    var desc = document.createElement("span");
    desc.className = "aa-cutsew-desc";
    desc.textContent = CUTSEW.d;
    var cta = document.createElement("span");
    cta.className = "aa-cutsew-cta";
    cta.textContent = "BROWSE CATEGORIES →";
    body.appendChild(kick);
    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(cta);

    a.appendChild(media);
    a.appendChild(body);

    var svcRow = section.querySelector(sel(SVC_ROW_LOC));
    if (svcRow) section.insertBefore(a, svcRow);
    else section.appendChild(a);
  }

  // ---- New generated photos: item name -> photo file ----
  // Matches the app's own mapping: file # = (itemNo % poolSize) + 1
  var POOLS = {
    "Classic Crew Tee": { p: "tee", n: 5 },
    "Pique Polo Shirt": { p: "polo", n: 5 },
    "Fleece Hoodie": { p: "hoodie", n: 5 },
    "Gym Vest Tank": { p: "vest", n: 5 },
    "Activewear Set": { p: "active", n: 10 },
    "Embroidered Cap": { p: "cap", n: 5 }
  };
  var OLD_IMGS = ["p-tee.jpg", "p-polo.jpg", "p-hoodie.jpg", "p-zip.jpg", "p-vest.jpg", "p-active.jpg", "p-cap.jpg"];

  function photoFor(name) {
    if (!name) return null;
    var m = String(name).match(/^(.*\S)\s+(\d{1,2})$/);
    if (!m) return null;
    var pool = POOLS[m[1]];
    if (!pool) return null;
    var num = parseInt(m[2], 10);
    return "/images/" + pool.p + "-" + ((num % pool.n) + 1) + ".jpg";
  }
  function isOldImg(src) {
    if (!src) return false;
    for (var i = 0; i < OLD_IMGS.length; i++) if (src.indexOf(OLD_IMGS[i]) !== -1) return true;
    return false;
  }

  // The app caches its product catalog in localStorage on first visit,
  // so returning visitors keep seeing the old repeated photos.
  // Rewrite stale photo paths in the saved catalog (keeps admin edits).
  function migrateCatalog() {
    var changed = false;
    try {
      if (!window.localStorage) return false;
      var raw = localStorage.getItem("aa-catalog-v1");
      if (!raw) return false;
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return false;
      for (var i = 0; i < arr.length; i++) {
        var it = arr[i];
        if (!it || !it.name || !isOldImg(it.img)) continue;
        var f = photoFor(it.name);
        if (f && it.img !== f) { it.img = f; changed = true; }
      }
      if (changed) localStorage.setItem("aa-catalog-v1", JSON.stringify(arr));
    } catch (e) { return false; }
    return changed;
  }

  // Swap any stale rendered product photos (also covers cached app code).
  // Only touches imgs whose alt is a known product name + old photo path,
  // so category cards, hero, collections and admin customs are untouched.
  function fixProductImages() {
    var imgs = document.getElementsByTagName("img");
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var cur = img.getAttribute("src") || "";
      if (!isOldImg(cur)) continue;
      var f = photoFor(img.getAttribute("alt"));
      if (f && cur !== f) img.setAttribute("src", f);
    }
  }

  // New categories ship with the factory catalog. If the visitor's saved
  // catalog predates them, drop it once so factory defaults (with the
  // new categories) load instead.
  var REQUIRED_CATS = ["School Uniforms", "Office Uniforms", "Construction Uniforms"];
  function ensureCatalogGeneration() {
    try {
      if (!window.localStorage) return;
      if (localStorage.getItem("aa-catfix-v1")) return;
      var raw = localStorage.getItem("aa-catalog-v1");
      if (!raw) return;
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      var have = {};
      for (var i = 0; i < arr.length; i++) if (arr[i] && arr[i].cat) have[arr[i].cat] = true;
      for (var k = 0; k < REQUIRED_CATS.length; k++) {
        if (!have[REQUIRED_CATS[k]]) {
          localStorage.removeItem("aa-catalog-v1");
          localStorage.setItem("aa-catfix-v1", "1");
          window.location.reload();
          return;
        }
      }
    } catch (e) {}
  }

  // ---- Design Lab: prominent design-size slider (drives the native ART % control) ----
  var NATIVE_SIZE_LOC = "src/components/studio.tsx:149:18";
  var UPLOAD_ROW_LOC = "src/components/studio.tsx:86:12";
  function setNativeRange(el, v) {
    try {
      var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(el, String(v));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (e) {
      try { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); } catch (e2) {}
    }
  }
  function injectSizeSlider() {
    var anchor = document.querySelector(sel(UPLOAD_ROW_LOC));
    if (!anchor || !anchor.parentNode) return;
    if (anchor.parentNode.querySelector(".aa-size")) return;
    var native = document.querySelector('input[type="range"]' + sel(NATIVE_SIZE_LOC));
    var box = document.createElement("div");
    box.className = "aa-size";
    var label = document.createElement("div");
    label.className = "aa-size-label";
    var startVal = native ? native.value : 55;
    label.textContent = "DESIGN SIZE — " + startVal + "%";
    var slider = document.createElement("input");
    slider.type = "range"; slider.min = "25"; slider.max = "90"; slider.value = startVal;
    slider.className = "aa-size-range";
    slider.setAttribute("aria-label", "Design size percent");
    slider.addEventListener("input", function () {
      label.textContent = "DESIGN SIZE — " + slider.value + "%";
      var n = document.querySelector('input[type="range"]' + sel(NATIVE_SIZE_LOC));
      if (n) setNativeRange(n, slider.value);
    });
    if (native && !native.__aaSync) {
      native.__aaSync = true;
      native.addEventListener("input", function () {
        slider.value = native.value;
        label.textContent = "DESIGN SIZE — " + native.value + "%";
      });
    }
    box.appendChild(label);
    box.appendChild(slider);
    anchor.parentNode.insertBefore(box, anchor);
  }

  // ---- Cart: direct WhatsApp order instead of checkout ----
  var WA_NUMBER = "971582045242";
  function buildWaOrder() {
    var lines = ["Hello Allegiant Attire! I want to order:"];
    var items = document.querySelectorAll('[data-source-loc="src/App.tsx:930:18"]');
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var nameEl = it.querySelector('[data-source-loc="src/App.tsx:933:22"]');
      var specEl = it.querySelector('[data-source-loc="src/App.tsx:934:22"]');
      var qtyEl = it.querySelector('[data-source-loc="src/App.tsx:938:26"]');
      var lineEl = it.querySelector('[data-source-loc="src/App.tsx:941:24"]');
      var name = nameEl ? nameEl.textContent.trim().replace(/\s+/g, " ") : "";
      if (!name) continue;
      var spec = specEl ? specEl.textContent.trim() : "";
      var qty = qtyEl ? qtyEl.textContent.trim() : "";
      var line = lineEl ? lineEl.textContent.trim().replace(/\s+/g, " ") : "";
      lines.push("• " + name + (spec ? " — " + spec : "") + (qty ? " (x" + qty + ")" : "") + (line ? " — " + line : ""));
    }
    var sub = document.querySelector('[data-source-loc="src/App.tsx:950:95"]');
    if (sub) lines.push("Subtotal: " + sub.textContent.trim().replace(/\s+/g, " "));
    lines.push("Name: ");
    lines.push("Delivery location: ");
    return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
  }
  function injectWhatsAppCheckout() {
    var grid = document.querySelector(sel("src/App.tsx:952:18"));
    if (!grid || grid.querySelector(".aa-wa-checkout")) return;
    var a = document.createElement("a");
    a.className = "aa-wa-checkout";
    a.textContent = "WHATSAPP ORDER →";
    a.href = "#";
    a.addEventListener("click", function (ev) {
      ev.preventDefault();
      window.open(buildWaOrder(), "_blank");
    });
    grid.appendChild(a);
    var note = document.querySelector(sel("src/App.tsx:951:18"));
    if (note && note.textContent.indexOf("DELIVERY CALC AT CHECKOUT") !== -1) {
      note.textContent = "VAT INCL · DELIVERY CONFIRMED ON WHATSAPP";
    }
  }

  // ---- Design Lab: garment-only recolor via pre-rendered mockups ----
  // The native preview multiplies the WHOLE photo over the swatch color
  // (background turns red too). Instead we swap the preview img to a
  // pre-rendered tint where only the garment is recolored, and neutralize
  // the multiply/opacity classes. White reuses the original flat-lay.
  var MOCKUP_LOC = "src/components/studio.tsx:67:12";
  var MOCKUP_IMG_LOC = "src/components/studio.tsx:68:14";
  var MOCKUP_COLORS = { "0a0a0a": 1, "e63946": 1, "1d3557": 1, "2a9d8f": 1, "e9c46a": 1, "f4a261": 1, "6d6875": 1 };
  var WHITE_SRC = {
    "tee": "/images/tee-1.jpg", "polo": "/images/polo-1.jpg", "hoodie": "/images/hoodie-6.jpg",
    "vest": "/images/vest-2.jpg", "active": "/images/active-6.jpg", "cap": "/images/cap-6.jpg"
  };
  function mockupHex(str) {
    if (!str) return "";
    var m = String(str).match(/#([0-9a-fA-F]{6})/);
    if (m) return m[1].toLowerCase();
    m = String(str).match(/#([0-9a-fA-F]{3})\b/);
    if (m) return (m[1][0] + m[1][0] + m[1][1] + m[1][1] + m[1][2] + m[1][2]).toLowerCase();
    m = String(str).match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) {
      var h = function (n) { n = Math.max(0, Math.min(255, parseInt(n, 10))); return (n < 16 ? "0" : "") + n.toString(16); };
      return (h(m[1]) + h(m[2]) + h(m[3])).toLowerCase();
    }
    return "";
  }
  function mockupGarment(src) {
    if (!src) return "";
    var m = String(src).match(/(tee|polo|hoodie|vest|active|cap)(-\d+|-[0-9a-fA-F]{6})?\.jpg/i);
    return m ? m[1].toLowerCase() : "";
  }
  function applyMockupTint() {
    var box = document.querySelector(sel(MOCKUP_LOC));
    if (!box) return;
    var img = box.querySelector("img" + sel(MOCKUP_IMG_LOC)) || document.querySelector("img" + sel(MOCKUP_IMG_LOC));
    if (!img) return;
    // Kill the native whole-photo multiply so the gray backdrop survives
    try { img.style.mixBlendMode = "normal"; img.style.opacity = "1"; } catch (e) {}
    var hex = mockupHex(box.style.background || box.getAttribute("style"));
    var g = mockupGarment(img.getAttribute("src"));
    if (!g) return;
    var cur = img.getAttribute("src") || "";
    var back = studioView() === "back";
    var isTint = cur.indexOf("/images/mockup") !== -1;
    if (hex === "ffffff" || !hex) {
      var wht = back ? BACK_SRC[g] : WHITE_SRC[g];
      var known = isTint || cur.indexOf("/images/back/") === 0 ||
        !!cur.match(/^\/images\/(tee|polo|hoodie|vest|active|cap)-\d+\.jpg/);
      if (wht && cur !== wht && known) img.setAttribute("src", wht);
      return;
    }
    if (MOCKUP_COLORS[hex]) {
      var want = "/images/" + (back ? "mockup-back/" : "mockup/") + g + "-" + hex + ".jpg";
      if (cur !== want) img.setAttribute("src", want);
      return;
    }
    // Unknown/empty color: never leave a stale tint behind
    if (isTint) img.setAttribute("src", back ? BACK_SRC[g] : WHITE_SRC[g]);
  }
  // Swatch clicks only flip style/src attributes (no childList change),
  // so the studio needs its own attributes observer.
  function observeStudio() {
    var st = document.getElementById("studio");
    if (!st || !window.MutationObserver || st.__aaTintObs) return;
    st.__aaTintObs = true;
    var obs = new MutationObserver(schedule);
    obs.observe(st, { attributes: true, subtree: true, attributeFilter: ["style", "src", "class"] });
  }

  // ---- Design Lab: front/back views + draggable multi-design layers ----
  // Custom layers live per garment+view, survive color/garment swaps, and
  // persist in localStorage. The native upload/text box is tagged with the
  // view it was created on and becomes draggable too.
  var NATIVE_BOX_LOC = "src/components/studio.tsx:70:16";
  var BACK_SRC = {
    "tee": "/images/back/tee.jpg", "polo": "/images/back/polo.jpg", "hoodie": "/images/back/hoodie.jpg",
    "vest": "/images/back/vest.jpg", "active": "/images/back/active.jpg", "cap": "/images/back/cap.jpg"
  };
  var MAX_LAYERS = 8;
  var studioStore = { view: "front", layers: {}, native: { view: "front", x: 50, y: 50 } };
  try {
    var _sv = window.localStorage ? localStorage.getItem("aa-studio-v2") : null;
    if (_sv) { var _p = JSON.parse(_sv); if (_p && typeof _p === "object") studioStore = _p; }
  } catch (e) {}
  if (studioStore.view !== "back") studioStore.view = "front";
  if (!studioStore.layers || typeof studioStore.layers !== "object") studioStore.layers = {};
  if (!studioStore.native || typeof studioStore.native !== "object") studioStore.native = { view: "front", x: 50, y: 50 };
  if (!studioStore.sizes || typeof studioStore.sizes !== "object") studioStore.sizes = {};
  function saveStudio() {
    try { if (window.localStorage) localStorage.setItem("aa-studio-v2", JSON.stringify(studioStore)); } catch (e) {}
  }
  function studioView() { return studioStore.view === "back" ? "back" : "front"; }
  function studioGarment() {
    var img = document.querySelector("img" + sel(MOCKUP_IMG_LOC));
    return mockupGarment(img ? img.getAttribute("src") : "");
  }
  function layerKey() { return (studioGarment() || "tee") + ":" + studioView(); }
  function studioLayers() {
    var k = layerKey();
    if (!studioStore.layers[k]) studioStore.layers[k] = [];
    return studioStore.layers[k];
  }
  function findLayer(id) {
    var arr = studioLayers();
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }
  function previewBox() { return document.querySelector(sel(MOCKUP_LOC)); }
  function nativeBox() { return document.querySelector(sel(NATIVE_BOX_LOC)); }

  function injectViewToggle() {
    var box = previewBox();
    if (!box || !box.parentNode || box.parentNode.querySelector(".aa-view")) { paintViewToggle(); return; }
    var bar = document.createElement("div");
    bar.className = "aa-view";
    var f = document.createElement("button");
    f.type = "button"; f.textContent = "FRONT"; f.className = "aa-view-btn";
    f.setAttribute("data-view", "front");
    var b = document.createElement("button");
    b.type = "button"; b.textContent = "BACK"; b.className = "aa-view-btn";
    b.setAttribute("data-view", "back");
    f.addEventListener("click", function () { setStudioView("front"); });
    b.addEventListener("click", function () { setStudioView("back"); });
    bar.appendChild(f); bar.appendChild(b);
    box.parentNode.insertBefore(bar, box);
    paintViewToggle();
  }
  function paintViewToggle() {
    var btns = document.querySelectorAll(".aa-view-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].className = "aa-view-btn" + (btns[i].getAttribute("data-view") === studioView() ? " on" : "");
    }
  }
  function setStudioView(v) {
    studioStore.view = (v === "back") ? "back" : "front";
    saveStudio(); paintViewToggle();
    applyMockupTint(); renderStudioLayers(); syncNativeDesign();
  }

  // ---- Design Lab: garment size picker (remembered per garment) ----
  var SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
  function studioSizes() {
    if (!studioStore.sizes || typeof studioStore.sizes !== "object") studioStore.sizes = {};
    return studioStore.sizes;
  }
  function studioSize() {
    var s = studioSizes()[studioGarment() || "tee"];
    return SIZES.indexOf(s) !== -1 ? s : "L";
  }
  function setStudioSize(v) {
    studioSizes()[studioGarment() || "tee"] = v;
    saveStudio(); paintSizePicker(); paintSizeChip();
  }
  function injectSizePicker() {
    var box = previewBox();
    if (!box || !box.parentNode) return;
    var row = box.parentNode.querySelector(".aa-sizerow");
    if (!row) {
      row = document.createElement("div");
      row.className = "aa-sizerow";
      var lab = document.createElement("span");
      lab.className = "aa-sizerow-label";
      lab.textContent = "SIZE";
      row.appendChild(lab);
      for (var i = 0; i < SIZES.length; i++) {
        (function (v) {
          var b = document.createElement("button");
          b.type = "button";
          b.textContent = v;
          b.className = "aa-size-btn";
          b.setAttribute("data-size", v);
          b.addEventListener("click", function () { setStudioSize(v); });
          row.appendChild(b);
        })(SIZES[i]);
      }
      var viewBar = box.parentNode.querySelector(".aa-view");
      if (viewBar && viewBar.nextSibling) box.parentNode.insertBefore(row, viewBar.nextSibling);
      else box.parentNode.insertBefore(row, box);
    }
  }
  function paintSizePicker() {
    var cur = studioSize();
    var btns = document.querySelectorAll(".aa-size-btn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].className = "aa-size-btn" + (btns[i].getAttribute("data-size") === cur ? " on" : "");
    }
  }
  function paintSizeChip() {
    var box = previewBox();
    if (!box) return;
    var chip = box.querySelector(".aa-sizechip");
    if (!chip) {
      chip = document.createElement("div");
      chip.className = "aa-sizechip";
      box.appendChild(chip);
    }
    var t = "SIZE — " + studioSize();
    if (chip.textContent !== t) chip.textContent = t;
  }

  var selectedLayerId = null;
  function layerHost() {
    var box = previewBox();
    if (!box) return null;
    var host = box.querySelector(".aa-layers");
    if (!host) {
      host = document.createElement("div");
      host.className = "aa-layers";
      box.appendChild(host);
      host.addEventListener("pointerdown", function (ev) {
        if (ev.target === host) selectLayer(null);
      });
    }
    return host;
  }
  function selectLayer(id) {
    selectedLayerId = id;
    renderStudioLayers();
  }
  function renderStudioLayers() {
    var host = layerHost();
    if (!host) return;
    var arr = studioLayers();
    var have = {};
    for (var i = 0; i < arr.length; i++) have[arr[i].id] = true;
    var kids = host.querySelectorAll(".aa-layer");
    for (var k = kids.length - 1; k >= 0; k--) {
      if (!have[kids[k].getAttribute("data-lid")]) kids[k].parentNode.removeChild(kids[k]);
    }
    for (var j = 0; j < arr.length; j++) paintLayer(host, arr[j]);
  }
  function paintLayer(host, L) {
    var el = host.querySelector('.aa-layer[data-lid="' + L.id + '"]');
    if (!el) {
      el = document.createElement("div");
      el.className = "aa-layer";
      el.setAttribute("data-lid", L.id);
      if (L.kind === "text") {
        var sp = document.createElement("span");
        sp.className = "aa-layer-text";
        sp.textContent = L.text || "";
        el.appendChild(sp);
        el.addEventListener("dblclick", function (ev) { ev.stopPropagation(); editTextLayer(L.id); });
      } else {
        var im = document.createElement("img");
        im.src = L.src;
        im.alt = "Design";
        im.draggable = false;
        el.appendChild(im);
      }
      attachDrag(el, L.id, false);
      host.appendChild(el);
    } else if (L.kind === "text") {
      var tx = el.querySelector(".aa-layer-text");
      if (!tx) {
        tx = document.createElement("span");
        tx.className = "aa-layer-text";
        el.appendChild(tx);
      }
      if (tx.textContent !== (L.text || "")) tx.textContent = L.text || "";
      tx.style.fontSize = Math.max(10, Math.round((L.w || 30) * 0.55)) + "px";
    }
    el.style.left = L.x + "%";
    el.style.top = L.y + "%";
    el.style.width = L.w + "%";
    if (L.id === selectedLayerId) {
      el.className = "aa-layer selected";
      paintToolbar(el, L);
    } else {
      el.className = "aa-layer";
      var tb = el.querySelector(".aa-ltoolbar");
      if (tb) el.removeChild(tb);
    }
  }
  function paintToolbar(el, L) {
    var tb = el.querySelector(".aa-ltoolbar");
    if (!tb) {
      tb = document.createElement("div");
      tb.className = "aa-ltoolbar";
      var mk = function (t, cls, fn) {
        var btn = document.createElement("button");
        btn.type = "button"; btn.textContent = t;
        if (cls) btn.className = cls;
        btn.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); ev.preventDefault(); });
        btn.addEventListener("click", function (ev) { ev.stopPropagation(); fn(); });
        tb.appendChild(btn);
        return btn;
      };
      mk("−", "", function () { sizeLayer(L, -5); });
      mk(Math.round(L.w || 30) + "%", "aa-lsize", function () {});
      mk("+", "", function () { sizeLayer(L, 5); });
      mk("✕", "", function () { removeLayer(L.id); });
      el.appendChild(tb);
    } else {
      var s = tb.querySelector(".aa-lsize");
      if (s) s.textContent = Math.round(L.w || 30) + "%";
    }
  }
  function sizeLayer(L, d) {
    L.w = Math.max(8, Math.min(90, (L.w || 30) + d));
    saveStudio(); renderStudioLayers();
  }
  function removeLayer(id) {
    var arr = studioLayers();
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) arr.splice(i, 1);
    if (selectedLayerId === id) selectedLayerId = null;
    saveStudio(); renderStudioLayers();
  }
  function editTextLayer(id) {
    var cur = findLayer(id);
    var host = layerHost();
    if (!cur || !host) return;
    var el = host.querySelector('.aa-layer[data-lid="' + id + '"]');
    if (!el || el.querySelector(".aa-ledit")) return;
    selectLayer(id);
    var inp = document.createElement("input");
    inp.value = cur.text || "";
    inp.className = "aa-ledit";
    var done = false;
    var commit = function (save) {
      if (done) return;
      done = true;
      if (save) cur.text = inp.value;
      saveStudio(); renderStudioLayers();
    };
    inp.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    inp.addEventListener("keydown", function (e) {
      e.stopPropagation();
      if (e.key === "Enter") commit(true);
      else if (e.key === "Escape") commit(false);
    });
    inp.addEventListener("blur", function () { commit(true); });
    el.innerHTML = "";
    el.appendChild(inp);
    try { inp.focus(); inp.select(); } catch (e) {}
  }

  // Pointer drag: positions in % of the preview box (crop-safe)
  function attachDrag(el, id, isNative) {
    el.addEventListener("pointerdown", function (ev) {
      if (ev.button !== undefined && ev.button !== 0) return;
      ev.stopPropagation();
      try { ev.preventDefault(); } catch (e) {}
      var box = previewBox();
      if (!box) return;
      var rect = null;
      try { rect = box.getBoundingClientRect(); } catch (e) { return; }
      if (!rect || !rect.width || !rect.height) return;
      var sx = ev.clientX, sy = ev.clientY, moved = false;
      var cur = isNative ? studioStore.native : findLayer(id);
      var ox = cur ? cur.x : 50, oy = cur ? cur.y : 50;
      try { if (el.setPointerCapture && ev.pointerId !== undefined) el.setPointerCapture(ev.pointerId); } catch (e) {}
      var move = function (e2) {
        if (!moved && Math.abs(e2.clientX - sx) + Math.abs(e2.clientY - sy) < 4) return;
        moved = true;
        var nx = Math.max(2, Math.min(98, ox + (e2.clientX - sx) / rect.width * 100));
        var ny = Math.max(2, Math.min(98, oy + (e2.clientY - sy) / rect.height * 100));
        if (isNative) {
          studioStore.native.x = nx; studioStore.native.y = ny;
          positionNative();
        } else {
          var L = findLayer(id);
          if (L) { L.x = nx; L.y = ny; el.style.left = nx + "%"; el.style.top = ny + "%"; }
        }
      };
      var up = function () {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
        if (!moved) {
          if (isNative) selectLayer(null); else selectLayer(id);
        } else saveStudio();
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    });
  }

  function injectAddRow() {
    var anchor = document.querySelector(sel(UPLOAD_ROW_LOC));
    if (!anchor || !anchor.parentNode || anchor.parentNode.querySelector(".aa-addrow")) return;
    var row = document.createElement("div");
    row.className = "aa-addrow";
    var bd = document.createElement("button");
    bd.type = "button"; bd.className = "aa-addbtn"; bd.textContent = "+ ADD DESIGN";
    var bt = document.createElement("button");
    bt.type = "button"; bt.className = "aa-addbtn"; bt.textContent = "+ ADD TEXT";
    var fi = document.createElement("input");
    fi.type = "file"; fi.accept = "image/*"; fi.style.display = "none";
    bd.addEventListener("click", function () { fi.click(); });
    fi.addEventListener("change", function () {
      if (fi.files && fi.files[0]) ingestFile(fi.files[0]);
      try { fi.value = ""; } catch (e) {}
    });
    bt.addEventListener("click", function () { addTextLayer(); });
    row.appendChild(bd); row.appendChild(bt); row.appendChild(fi);
    anchor.parentNode.insertBefore(row, anchor);
  }
  function addImgLayer(src) {
    var arr = studioLayers();
    if (!src || arr.length >= MAX_LAYERS) return null;
    var L = { id: "l" + Date.now().toString(36) + Math.floor(Math.random() * 9999), kind: "img", src: src, x: 50, y: 50, w: 30 };
    arr.push(L); saveStudio(); renderStudioLayers();
    selectLayer(L.id);
    return L.id;
  }
  function addTextLayer() {
    var arr = studioLayers();
    if (arr.length >= MAX_LAYERS) return null;
    var L = { id: "l" + Date.now().toString(36) + Math.floor(Math.random() * 9999), kind: "text", text: "YOUR TEXT", x: 50, y: 62, w: 44 };
    arr.push(L); saveStudio(); renderStudioLayers();
    selectLayer(L.id);
    return L.id;
  }
  function ingestFile(f) {
    try {
      if (!window.URL || !window.URL.createObjectURL) throw 0;
      var url = URL.createObjectURL(f);
      var im = new Image();
      im.onload = function () {
        try {
          var max = 800, sc = Math.min(1, max / Math.max(im.width || 1, im.height || 1));
          var cw = Math.max(1, Math.round((im.width || 100) * sc));
          var ch = Math.max(1, Math.round((im.height || 100) * sc));
          var cv = document.createElement("canvas");
          cv.width = cw; cv.height = ch;
          var cx = cv.getContext("2d");
          cx.drawImage(im, 0, 0, cw, ch);
          // Keep PNG transparency: JPEG has no alpha channel (transparency
          // would bake to black), so store transparent art as PNG instead.
          var hasAlpha = false;
          try {
            var px = cx.getImageData(0, 0, cw, ch).data;
            for (var ai = 3; ai < px.length; ai += 16) { if (px[ai] < 250) { hasAlpha = true; break; } }
          } catch (e3) {}
          addImgLayer(hasAlpha ? cv.toDataURL("image/png") : cv.toDataURL("image/jpeg", 0.85));
        } catch (e) { fallbackRead(f); }
        try { URL.revokeObjectURL(url); } catch (e2) {}
      };
      im.onerror = function () { fallbackRead(f); };
      im.src = url;
    } catch (e) { fallbackRead(f); }
  }
  function fallbackRead(f) {
    try {
      var r = new FileReader();
      r.onload = function () { addImgLayer(String(r.result)); };
      r.readAsDataURL(f);
    } catch (e) {}
  }

  // Native upload/text box: tag with its view, hide on the other view, drag it
  var nativeSig = null;
  function syncNativeDesign() {
    var nb = nativeBox();
    if (!nb) return;
    var hasImg = !!nb.querySelector('img[alt="Uploaded artwork"]');
    var sig = (hasImg ? "1" : "0") + "|" + (nb.textContent || "");
    if (nativeSig !== null && sig !== nativeSig) {
      studioStore.native.view = studioView();
      saveStudio();
    }
    nativeSig = sig;
    try {
      nb.style.pointerEvents = "auto";
      nb.style.touchAction = "none";
      var nimgs = nb.querySelectorAll("img");
      for (var i = 0; i < nimgs.length; i++) nimgs[i].draggable = false;
    } catch (e) {}
    if (!nb.__aaDrag) { nb.__aaDrag = true; attachDrag(nb, null, true); }
    var show = studioStore.native.view === studioView();
    nb.style.display = show ? "" : "none";
    if (show) positionNative();
  }
  function positionNative() {
    var nb = nativeBox();
    if (!nb) return;
    nb.style.position = "absolute";
    nb.style.left = studioStore.native.x + "%";
    nb.style.top = studioStore.native.y + "%";
    nb.style.transform = "translate(-50%,-50%)";
    nb.style.margin = "0";
  }

  // Studio WhatsApp order: append garment size + extra-design counts
  function studioExtrasLine() {
    var g = studioGarment() || "tee";
    var lines = ["• Garment size: " + studioSize()];
    var f = (studioStore.layers[g + ":front"] || []).length;
    var b = (studioStore.layers[g + ":back"] || []).length;
    if (f || b) {
      var parts = [];
      if (f) parts.push(f + " on front");
      if (b) parts.push(b + " on back");
      lines.push("• Added designs: " + parts.join(" + ") + " (positions as previewed)");
    }
    return lines.join("\n");
  }
  function interceptStudioWa() {
    var st = document.getElementById("studio");
    if (!st || st.__aaWa) return;
    st.__aaWa = true;
    st.addEventListener("click", function (ev) {
      var t = ev.target;
      var a = t && t.closest ? t.closest('a[href*="wa.me"]') : null;
      if (!a || !st.contains(a)) return;
      var extra = studioExtrasLine();
      if (!extra) return;
      ev.preventDefault();
      var href = a.getAttribute("href") || "";
      var m = href.match(/([?&]text=)(.*)$/);
      var msg = m ? decodeURIComponent(m[2]) : "";
      var lines = msg.split("\n").filter(function (ln) { return ln.indexOf("• Added designs:") !== 0; });
      lines.push(extra);
      window.open(m ? href.slice(0, m.index) + m[1] + encodeURIComponent(lines.join("\n")) : href, "_blank");
    });
  }

  try {
    window.__aaStudio = {
      view: studioView, setView: setStudioView, garment: studioGarment,
      addImg: addImgLayer, addText: addTextLayer, remove: removeLayer, layers: studioLayers,
      retint: applyMockupTint, render: renderStudioLayers, sync: syncNativeDesign, store: studioStore
    };
  } catch (e) {}

  // ---- Instant Estimate: admin-editable prices ----
  // Bundle reads print fees from window.AA_EST (factory fallback). This
  // panel appears inside #quote only while an admin is logged in (LOGOUT
  // button present). Garment prices live in the catalog and are edited
  // through the admin item editor, so they are not duplicated here.
  var EST_QTY_LOC = "src/App.tsx:647:16";
  var EST_FACTORY = {
    he: { "DTF Printing": 14, "Screen Printing": 7, "Sublimation": 12, "Embroidery": 11, "Vinyl": 8 },
    nl: { "A5 — Left Chest": 0.55, "A4 — Front Only": 1, "A3 — Front + Back": 1.8 },
    labels: 3, rush: 6
  };
  function estPrices() {
    var o = {};
    try { o = JSON.parse(localStorage.getItem("aa-est-prices-v1") || "{}") || {}; } catch (e) {}
    if (window.AA_EST && typeof window.AA_EST === "object") {
      for (var k in window.AA_EST) o[k] = window.AA_EST[k];
    }
    var num = function (v, fb) { v = parseFloat(v); return (isNaN(v) || v < 0) ? fb : v; };
    var he = {}, nl = {}, k2;
    for (k2 in EST_FACTORY.he) he[k2] = num(o.he && o.he[k2], EST_FACTORY.he[k2]);
    for (k2 in EST_FACTORY.nl) nl[k2] = num(o.nl && o.nl[k2], EST_FACTORY.nl[k2]);
    return { he: he, nl: nl, labels: num(o.labels, 3), rush: num(o.rush, 6) };
  }
  function isAdminMode() {
    return !!document.querySelector('button[data-source-loc="src/components/admin.tsx:172:14"]');
  }
  function injectEstEditor() {
    var old = document.querySelector(".aa-est");
    if (!isAdminMode()) {
      if (old && old.parentNode) old.parentNode.removeChild(old);
      return;
    }
    if (old) return; // keep in-progress edits
    var quote = document.getElementById("quote");
    if (!quote) return;
    var cur = estPrices();
    var panel = document.createElement("div");
    panel.className = "aa-est";
    var t = document.createElement("p");
    t.className = "aa-est-title";
    t.textContent = "ADMIN — ESTIMATE PRICES · GARMENT PRICES ARE EDITED VIA MANAGE ITEMS";
    panel.appendChild(t);
    var grid = document.createElement("div");
    grid.className = "aa-est-grid";
    panel.appendChild(grid);
    var defs = [
      ["he|DTF Printing", "DTF — AED/PC", cur.he["DTF Printing"], "1"],
      ["he|Screen Printing", "SCREEN — AED/PC", cur.he["Screen Printing"], "1"],
      ["he|Sublimation", "SUBLIMATION — AED/PC", cur.he["Sublimation"], "1"],
      ["he|Embroidery", "EMBROIDERY — AED/PC", cur.he["Embroidery"], "1"],
      ["he|Vinyl", "VINYL — AED/PC", cur.he["Vinyl"], "1"],
      ["nl|A5 — Left Chest", "A5 CHEST — ×MULT", cur.nl["A5 — Left Chest"], "0.05"],
      ["nl|A4 — Front Only", "A4 FRONT — ×MULT", cur.nl["A4 — Front Only"], "0.05"],
      ["nl|A3 — Front + Back", "A3 F+B — ×MULT", cur.nl["A3 — Front + Back"], "0.05"],
      ["labels", "LABELS — AED/PC", cur.labels, "1"],
      ["rush", "RUSH 48H — AED/PC", cur.rush, "1"]
    ];
    var inputs = [];
    for (var i = 0; i < defs.length; i++) {
      var lab = document.createElement("label");
      lab.className = "aa-est-field";
      var sp = document.createElement("span");
      sp.textContent = defs[i][1];
      var inp = document.createElement("input");
      inp.type = "number"; inp.min = "0"; inp.step = defs[i][3];
      inp.value = defs[i][2];
      inp.setAttribute("data-k", defs[i][0]);
      lab.appendChild(sp); lab.appendChild(inp);
      grid.appendChild(lab);
      inputs.push(inp);
    }
    var btns = document.createElement("div");
    btns.className = "aa-est-btns";
    var sv = document.createElement("button");
    sv.type = "button"; sv.className = "aa-est-save"; sv.textContent = "SAVE PRICES";
    var rs = document.createElement("button");
    rs.type = "button"; rs.className = "aa-est-reset"; rs.textContent = "RESET";
    sv.addEventListener("click", function () {
      var o = { he: {}, nl: {} }, ok = true, v, k;
      for (var j = 0; j < inputs.length; j++) {
        inputs[j].className = "";
        v = parseFloat(inputs[j].value);
        k = inputs[j].getAttribute("data-k");
        if (isNaN(v) || v < 0) { inputs[j].className = "bad"; ok = false; continue; }
        if (k === "labels") o.labels = v;
        else if (k === "rush") o.rush = v;
        else if (k.indexOf("he|") === 0) o.he[k.slice(3)] = v;
        else o.nl[k.slice(3)] = v;
      }
      if (!ok) return;
      try { localStorage.setItem("aa-est-prices-v1", JSON.stringify(o)); } catch (e) {}
      window.AA_EST = o;
      sv.textContent = "SAVED ✓";
      setTimeout(function () { sv.textContent = "SAVE PRICES"; }, 1500);
      nudgeEstimator();
    });
    rs.addEventListener("click", function () {
      try { localStorage.removeItem("aa-est-prices-v1"); } catch (e) {}
      window.AA_EST = {};
      if (panel.parentNode) panel.parentNode.removeChild(panel);
      injectEstEditor();
      nudgeEstimator();
    });
    btns.appendChild(sv); btns.appendChild(rs);
    panel.appendChild(btns);
    var gridTop = quote.querySelector(sel("src/App.tsx:619:8"));
    if (gridTop) quote.insertBefore(panel, gridTop);
    else quote.appendChild(panel);
  }
  // Reloading would log the admin out (session is React state only), so
  // force a re-render by nudging the quantity slider forth and back.
  function nudgeEstimator() {
    var q = document.querySelector('input[type="range"]' + sel(EST_QTY_LOC));
    if (!q) return;
    var v = parseInt(q.value, 10);
    if (isNaN(v)) v = 100;
    var d = (v + 4 <= 2000) ? 4 : -4;
    setNativeRange(q, v + d);
    setTimeout(function () {
      var q2 = document.querySelector('input[type="range"]' + sel(EST_QTY_LOC));
      if (q2) setNativeRange(q2, v);
    }, 150);
  }

  // ---- Admin panel: change password + social media links ----
  var PANEL_HEAD_LOC = "src/components/admin.tsx:163:8"; // CATALOG MANAGER header
  var DEFAULT_PW = "C00lhunter@0528"; // factory password (bundle fallback)
  function currentAdminPw() {
    var v = null;
    try { v = localStorage.getItem("aa-admin-pw-v1"); } catch (e) {}
    if (!v) return DEFAULT_PW;
    try { return decodeURIComponent(escape(atob(v))) || DEFAULT_PW; }
    catch (e) { try { return atob(v) || DEFAULT_PW; } catch (e2) { return DEFAULT_PW; } }
  }
  function storeAdminPw(pw) {
    try { localStorage.setItem("aa-admin-pw-v1", btoa(unescape(encodeURIComponent(pw)))); } catch (e) {}
  }
  function clearStoredPw() {
    try { localStorage.removeItem("aa-admin-pw-v1"); } catch (e) {}
  }
  var SOCIAL_DEFS = [
    { k: "IG", name: "INSTAGRAM", ph: "https://instagram.com/yourusername" },
    { k: "FB", name: "FACEBOOK", ph: "https://facebook.com/yourpage" },
    { k: "TT", name: "TIKTOK", ph: "https://tiktok.com/@yourusername" },
    { k: "X",  name: "X (TWITTER)", ph: "https://x.com/yourusername" },
    { k: "YT", name: "YOUTUBE", ph: "https://youtube.com/@yourchannel" },
    { k: "WA", name: "WHATSAPP (SOCIAL LINK)", ph: "https://wa.me/97XXXXXXXXX" }
  ];
  function socialLinks() {
    try {
      var o = JSON.parse(localStorage.getItem("aa-socials-v1") || "{}");
      return (o && typeof o === "object") ? o : {};
    } catch (e) { return {}; }
  }
  // Rewrite the footer social anchors (key chips IG/FB/TT/X/YT/WA) to saved URLs
  function applySocialLinks() {
    var saved = socialLinks();
    var anchors = document.querySelectorAll('a[data-source-loc="src/App.tsx:855:16"]');
    for (var i = 0; i < anchors.length; i++) {
      var kEl = anchors[i].querySelector('span[data-source-loc="src/App.tsx:856:62"]');
      var k = kEl ? kEl.textContent.trim() : "";
      var v = saved[k];
      if (v && anchors[i].getAttribute("href") !== v) anchors[i].setAttribute("href", v);
    }
  }
  function setMsg(el, text, ok) {
    el.textContent = text;
    el.className = "aa-set-msg " + (ok ? "ok" : "err");
  }
  function injectAdminSettings() {
    var head = document.querySelector('div[data-source-loc="' + PANEL_HEAD_LOC + '"]');
    if (!head || head.querySelector(".aa-set")) return;

    var sec = document.createElement("div");
    sec.className = "aa-set";
    var title = document.createElement("p");
    title.className = "aa-set-title";
    title.textContent = "STORE SETTINGS — PASSWORD & SOCIAL LINKS · ENGINE v22";
    sec.appendChild(title);

    var grid = document.createElement("div");
    grid.className = "aa-set-grid";
    sec.appendChild(grid);

    // Card 1: change admin password
    var pw = document.createElement("div");
    pw.className = "aa-set-card";
    var pwT = document.createElement("p");
    pwT.className = "aa-set-sub";
    pwT.textContent = "CHANGE ADMIN PASSWORD";
    pw.appendChild(pwT);
    function pwField(label) {
      var lab = document.createElement("label");
      lab.className = "aa-set-field";
      var sp = document.createElement("span");
      sp.textContent = label;
      var inp = document.createElement("input");
      inp.type = "password";
      inp.placeholder = "••••••••";
      inp.autocomplete = "new-password";
      lab.appendChild(sp); lab.appendChild(inp);
      pw.appendChild(lab);
      return inp;
    }
    var cur = pwField("CURRENT PASSWORD");
    var nw = pwField("NEW PASSWORD (MIN 6 CHARACTERS)");
    var cf = pwField("CONFIRM NEW PASSWORD");
    var pwBtns = document.createElement("div");
    pwBtns.className = "aa-set-btns";
    var pwSave = document.createElement("button");
    pwSave.type = "button"; pwSave.className = "aa-set-save"; pwSave.textContent = "SAVE NEW PASSWORD";
    var pwReset = document.createElement("button");
    pwReset.type = "button"; pwReset.className = "aa-set-alt"; pwReset.textContent = "RESET TO FACTORY";
    var pwMsg = document.createElement("p");
    pwMsg.className = "aa-set-msg";
    pwSave.addEventListener("click", function () {
      if (cur.value !== currentAdminPw()) { setMsg(pwMsg, "CURRENT PASSWORD IS INCORRECT."); return; }
      if ((nw.value || "").length < 6) { setMsg(pwMsg, "NEW PASSWORD MUST BE AT LEAST 6 CHARACTERS."); return; }
      if (nw.value !== cf.value) { setMsg(pwMsg, "NEW PASSWORDS DO NOT MATCH."); return; }
      storeAdminPw(nw.value);
      cur.value = ""; nw.value = ""; cf.value = "";
      setMsg(pwMsg, "PASSWORD UPDATED ✓ USE IT NEXT LOGIN.", true);
    });
    pwReset.addEventListener("click", function () {
      clearStoredPw();
      cur.value = ""; nw.value = ""; cf.value = "";
      setMsg(pwMsg, "RESET TO FACTORY PASSWORD ✓", true);
    });
    pwBtns.appendChild(pwSave); pwBtns.appendChild(pwReset);
    pw.appendChild(pwBtns); pw.appendChild(pwMsg);
    grid.appendChild(pw);

    // Card 2: social media links
    var soc = document.createElement("div");
    soc.className = "aa-set-card";
    var socT = document.createElement("p");
    socT.className = "aa-set-sub";
    socT.textContent = "SOCIAL MEDIA LINKS (SITE FOOTER)";
    soc.appendChild(socT);
    var saved = socialLinks();
    var inputs = {};
    for (var i = 0; i < SOCIAL_DEFS.length; i++) {
      var d = SOCIAL_DEFS[i];
      var lab = document.createElement("label");
      lab.className = "aa-set-field";
      var sp = document.createElement("span");
      sp.textContent = d.name;
      var inp = document.createElement("input");
      inp.type = "text";
      inp.placeholder = d.ph;
      inp.value = saved[d.k] || "";
      lab.appendChild(sp); lab.appendChild(inp);
      soc.appendChild(lab);
      inputs[d.k] = inp;
    }
    var socMsg = document.createElement("p");
    socMsg.className = "aa-set-msg";
    var socBtns = document.createElement("div");
    socBtns.className = "aa-set-btns";
    var socSave = document.createElement("button");
    socSave.type = "button"; socSave.className = "aa-set-save"; socSave.textContent = "SAVE LINKS";
    var socClear = document.createElement("button");
    socClear.type = "button"; socClear.className = "aa-set-alt"; socClear.textContent = "CLEAR SAVED";
    socSave.addEventListener("click", function () {
      var o = {}, any = false, bad = false, k, v;
      for (k in inputs) {
        inputs[k].className = "";
        v = (inputs[k].value || "").trim();
        if (!v) continue;
        if (!/^https?:\/\//i.test(v)) { inputs[k].className = "bad"; bad = true; continue; }
        o[k] = v; any = true;
      }
      if (bad) { setMsg(socMsg, "LINKS MUST START WITH HTTP:// OR HTTPS://"); return; }
      if (!any) { setMsg(socMsg, "NOTHING TO SAVE — FILL AT LEAST ONE LINK."); return; }
      try { localStorage.setItem("aa-socials-v1", JSON.stringify(o)); } catch (e) {}
      applySocialLinks();
      setMsg(socMsg, "SOCIAL LINKS SAVED ✓ LIVE ON THE FOOTER NOW.", true);
    });
    socClear.addEventListener("click", function () {
      try { localStorage.removeItem("aa-socials-v1"); } catch (e) {}
      for (var k2 in inputs) inputs[k2].value = "";
      setMsg(socMsg, "SAVED LINKS CLEARED — FACTORY LINKS RESTORED.", true);
    });
    socBtns.appendChild(socSave); socBtns.appendChild(socClear);
    soc.appendChild(socBtns); soc.appendChild(socMsg);
    grid.appendChild(soc);

    head.appendChild(sec);
  }

  // ---- Admin panel: ADD PRODUCT (category-wise, image upload, full details) ----
  // Writes items into aa-catalog-v1 using the exact native schema, so the
  // storefront renders them like any other product.
  var ADDP_CNT_LOC = "src/components/admin.tsx:166:14";   // "N ITEMS LIVE" counter
  var ADDP_LIST_LOC = "src/components/admin.tsx:179:10";  // items list container
  var BASE_CATS = ["T-Shirts", "Polo T-Shirts", "Hoodies & Sweats", "Vests & Tanks", "Activewear", "Caps", "School Uniforms", "Office Uniforms", "Construction Uniforms", "Uniforms", "Services"];
  function catalogItems() {
    try {
      var a = JSON.parse(localStorage.getItem("aa-catalog-v1") || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function saveCatalogItems(arr) {
    try { localStorage.setItem("aa-catalog-v1", JSON.stringify(arr)); } catch (e) {}
  }
  function catalogCats() {
    var seen = [], items = catalogItems(), i, c;
    for (i = 0; i < items.length; i++) {
      c = items[i] && items[i].cat;
      if (c && seen.indexOf(c) === -1) seen.push(c);
    }
    for (i = 0; i < BASE_CATS.length; i++) if (seen.indexOf(BASE_CATS[i]) === -1) seen.push(BASE_CATS[i]);
    return seen;
  }
  function addpId() { return "custom-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e3); }
  function updateItemsLive(n) {
    var p = document.querySelector('p[data-source-loc="' + ADDP_CNT_LOC + '"]');
    if (p) p.textContent = "SIGNED IN AS OWNER · " + n + " ITEMS LIVE";
  }
  function shrinkImage(file, cb) {
    try {
      if (!window.URL || !window.URL.createObjectURL) throw 0;
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () {
        try {
          var max = 700, sc = Math.min(1, max / Math.max(im.width || 1, im.height || 1));
          var cw = Math.max(1, Math.round((im.width || 100) * sc));
          var ch = Math.max(1, Math.round((im.height || 100) * sc));
          var cv = document.createElement("canvas");
          cv.width = cw; cv.height = ch;
          cv.getContext("2d").drawImage(im, 0, 0, cw, ch);
          cb(cv.toDataURL("image/jpeg", 0.85));
        } catch (e) { fallbackRead(file, cb); }
        try { URL.revokeObjectURL(url); } catch (e2) {}
      };
      im.onerror = function () { fallbackRead(file, cb); };
      im.src = url;
    } catch (e) { fallbackRead(file, cb); }
  }
  function fallbackRead(file, cb) {
    try {
      var r = new FileReader();
      r.onload = function () { cb(String(r.result)); };
      r.readAsDataURL(file);
    } catch (e) {}
  }
  function prependProductRow(item) {
    var list = document.querySelector('div[data-source-loc="' + ADDP_LIST_LOC + '"]');
    if (!list || list.querySelector('[data-aa-cid="' + item.id + '"]')) return;
    // Skip if a native row for this item already exists (React re-render)
    var nativeEdit = list.querySelector('button[aria-label="Edit ' + item.name.replace(/"/g, "&quot;") + '"]');
    if (nativeEdit) return;
    var row = document.createElement("div");
    row.className = "border-2 border-black flex items-center gap-3 p-2.5";
    row.setAttribute("data-aa-cid", item.id);
    var im = document.createElement("img");
    im.src = item.img; im.alt = item.name;
    im.className = "mono-img h-14 w-14 object-cover border border-black shrink-0";
    var mid = document.createElement("div");
    mid.className = "flex-1 min-w-0";
    var nm = document.createElement("p");
    nm.className = "font-black text-sm truncate";
    nm.textContent = item.name;
    var meta = document.createElement("p");
    meta.className = "font-mono text-[10px] text-neutral-500";
    meta.textContent = item.cat.toUpperCase() + " · AED " + item.price + " · MOQ " + item.moq;
    mid.appendChild(nm); mid.appendChild(meta);
    var del = document.createElement("button");
    del.type = "button";
    del.className = "p-2.5 border-2 border-black hover:bg-black hover:text-white font-mono text-[10px]";
    del.setAttribute("aria-label", "Remove " + item.name);
    del.textContent = "✕";
    del.addEventListener("click", function () {
      var arr = catalogItems(), i;
      for (i = 0; i < arr.length; i++) if (arr[i] && arr[i].id === item.id) { arr.splice(i, 1); break; }
      saveCatalogItems(arr);
      if (row.parentNode) row.parentNode.removeChild(row);
      updateItemsLive(arr.length);
    });
    row.appendChild(im); row.appendChild(mid); row.appendChild(del);
    list.insertBefore(row, list.firstChild);
  }
  function injectProductAdder() {
    var head = document.querySelector('div[data-source-loc="' + PANEL_HEAD_LOC + '"]');
    if (!head || head.querySelector(".aa-addp")) return;
    var list = document.querySelector('div[data-source-loc="' + ADDP_LIST_LOC + '"]');
    if (!list) return; // item editor open, or panel not fully rendered yet

    var sec = document.createElement("div");
    sec.className = "aa-addp";
    var title = document.createElement("p");
    title.className = "aa-set-title";
    title.textContent = "ADD NEW PRODUCT — PRICE · DETAILS · CATEGORY";
    sec.appendChild(title);

    var grid = document.createElement("div");
    grid.className = "aa-set-grid";
    sec.appendChild(grid);

    var card = document.createElement("div");
    card.className = "aa-set-card";
    card.style.gridColumn = "1 / -1";
    grid.appendChild(card);

    function field(labelText, input) {
      var lab = document.createElement("label");
      lab.className = "aa-set-field";
      var sp = document.createElement("span");
      sp.textContent = labelText;
      lab.appendChild(sp); lab.appendChild(input);
      card.appendChild(lab);
      return input;
    }
    function mkInput(type, placeholder, value) {
      var inp = document.createElement("input");
      inp.type = type;
      if (placeholder) inp.placeholder = placeholder;
      if (value !== undefined) inp.value = value;
      return inp;
    }

    var nameI = field("PRODUCT NAME *", mkInput("text", "e.g. Classic Crew Tee"));
    var catSel = document.createElement("select");
    var cats = catalogCats();
    for (var ci = 0; ci < cats.length; ci++) {
      var opt = document.createElement("option");
      opt.value = cats[ci]; opt.textContent = cats[ci];
      catSel.appendChild(opt);
    }
    var optNew = document.createElement("option");
    optNew.value = "+new"; optNew.textContent = "＋ NEW CATEGORY…";
    catSel.appendChild(optNew);
    field("CATEGORY *", catSel);
    var newCatWrap = document.createElement("div");
    newCatWrap.style.display = "none";
    var newCatI = mkInput("text", "NEW CATEGORY NAME (E.G. SCRUB UNIFORMS)");
    newCatWrap.appendChild(newCatI);
    card.appendChild(newCatWrap);
    catSel.addEventListener("change", function () {
      newCatWrap.style.display = catSel.value === "+new" ? "" : "none";
    });

    var priceI = field("PRICE (AED) *", mkInput("number", "30", "30"));
    priceI.min = "1"; priceI.step = "0.01";
    var oldPriceI = field("OLD PRICE (AED — OPTIONAL, SHOWS DISCOUNT)", mkInput("number", "45"));
    oldPriceI.min = "1"; oldPriceI.step = "0.01";
    var moqI = field("MIN ORDER QTY (MOQ) *", mkInput("number", "12", "12"));
    moqI.min = "1"; moqI.step = "1";
    var blurbI = field("DETAILS / DESCRIPTION", mkInput("text", "Fabric, GSM, use case…", "Custom-made to your artwork and size curve."));
    var fabricsI = field("FABRICS (COMMA SEPARATED)", mkInput("text", "Cotton, Poly…", "Cotton"));
    var sizesI = field("SIZES (COMMA SEPARATED)", mkInput("text", "S, M, L, XL", "S, M, L, XL"));
    var colorsI = field("AVAILABLE COLORS (COMMA SEPARATED)", mkInput("text", "Black, White, Navy…", "Black, White, Navy, Grey"));
    var badgeI = field("BADGE (OPTIONAL — E.G. NEW / BEST SELLER)", mkInput("text", "NEW"));
    var ratingI = field("RATING (1–5)", mkInput("number", "4.8", "4.8"));
    ratingI.min = "1"; ratingI.max = "5"; ratingI.step = "0.1";

    // Image: upload from device or paste a path/URL, with live preview
    var imgLab = document.createElement("label");
    imgLab.className = "aa-set-field";
    var imgSp = document.createElement("span");
    imgSp.textContent = "PRODUCT IMAGE — UPLOAD FROM DEVICE";
    var fileI = document.createElement("input");
    fileI.type = "file"; fileI.accept = "image/*";
    imgLab.appendChild(imgSp); imgLab.appendChild(fileI);
    card.appendChild(imgLab);
    var imgI = field("…OR IMAGE PATH / URL", mkInput("text", "/images/tee-1.jpg or https://…"));
    var prev = document.createElement("img");
    prev.alt = "Preview";
    prev.style.cssText = "width:64px;height:64px;object-fit:cover;border:1px solid #000;margin:4px 0 8px;display:none;";
    card.appendChild(prev);
    function setPreview(src) {
      if (src) { prev.src = src; prev.style.display = ""; }
      else prev.style.display = "none";
    }
    fileI.addEventListener("change", function () {
      if (fileI.files && fileI.files[0]) {
        shrinkImage(fileI.files[0], function (dataUrl) { imgI.value = dataUrl; setPreview(dataUrl); });
      }
      try { fileI.value = ""; } catch (e) {}
    });
    imgI.addEventListener("change", function () { setPreview(imgI.value.trim()); });

    var saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "aa-set-save";
    saveBtn.style.cssText = "width:100%;margin-top:4px;padding:12px 0;";
    saveBtn.textContent = "+ ADD PRODUCT TO CATALOG";
    var msg = document.createElement("p");
    msg.className = "aa-set-msg";
    sec.appendChild(saveBtn);
    sec.appendChild(msg);

    saveBtn.addEventListener("click", function () {
      var name = (nameI.value || "").trim();
      var cat = catSel.value === "+new" ? (newCatI.value || "").trim() : catSel.value;
      var price = parseFloat(priceI.value);
      var moq = parseInt(moqI.value, 10);
      var img = safeImageSrc(imgI.value);
      var rating = parseFloat(ratingI.value);
      if (!name) { setMsg(msg, "PRODUCT NAME IS REQUIRED."); return; }
      if (!cat) { setMsg(msg, "CATEGORY IS REQUIRED — PICK ONE OR TYPE A NEW NAME."); return; }
      if (isNaN(price) || price < 1) { setMsg(msg, "PRICE MUST BE AT LEAST AED 1."); return; }
      if (isNaN(moq) || moq < 1) { setMsg(msg, "MOQ MUST BE AT LEAST 1."); return; }
      if (!img) { setMsg(msg, "ADD AN IMAGE — UPLOAD ONE OR PASTE A VALID PATH/URL (https://…)."); return; }
      if (isNaN(rating) || rating < 1) rating = 4.8;
      if (rating > 5) rating = 5;
      var fabrics = fabricsI.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      if (!fabrics.length) fabrics = ["Cotton"];
      var sizes = sizesI.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      if (!sizes.length) sizes = ["M"];
      var colors = colorsI.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      var item = {
        id: addpId(),
        name: name,
        cat: cat,
        price: Math.max(1, Math.round(price * 100) / 100),
        rating: rating,
        reviews: 0,
        img: img,
        blurb: (blurbI.value || "").trim() || "Custom-made to your artwork and size curve.",
        fabrics: fabrics,
        sizes: sizes,
        moq: moq
      };
      var op = parseFloat(oldPriceI.value);
      if (!isNaN(op) && op > 0) item.oldPrice = op;
      var badge = (badgeI.value || "").trim();
      if (badge) item.badge = badge.toUpperCase();
      if (colors.length) item.colors = colors;

      var arr = catalogItems();
      arr.push(item);
      saveCatalogItems(arr);
      updateItemsLive(arr.length);
      prependProductRow(item);

      nameI.value = ""; priceI.value = "30"; oldPriceI.value = ""; badgeI.value = "";
      blurbI.value = "Custom-made to your artwork and size curve.";
      colorsI.value = "Black, White, Navy, Grey";
      imgI.value = ""; setPreview("");
      setMsg(msg, "SAVED ✓ \"" + name.toUpperCase() + "\" IS LIVE. ADD ANOTHER, OR RELOAD THE PANEL BEFORE USING EDIT ON OTHER ITEMS.", true);
    });

    head.appendChild(sec);
  }

  // ---- Product color options (all items, admin-manageable) ----
  // Storefront: COLOR chips inside the product modal (like FABRIC/SIZE).
  // Chosen color rides into the cart line + WhatsApp order. Known garment
  // photos even preview the tint via the pre-rendered mockups.
  // Admin: colors field in ADD PRODUCT + injected into the native EDIT form;
  // edits persist through native saves via a catalog-write hook.
  var MODAL_IMG_LOC = "src/App.tsx:967:12";
  var FABRIC_CHIPS_LOC = "src/App.tsx:979:16";
  var SIZE_CHIPS_LOC = "src/App.tsx:983:16";
  var ADDBAG_BTN_LOC = "src/App.tsx:995:16";
  var CART_ITEM_LOC = "src/App.tsx:930:18";
  var CART_NAME_LOC = "src/App.tsx:933:22";
  var CART_SPEC_LOC = "src/App.tsx:934:22";
  var EDIT_FORM_LOC = "src/components/admin.tsx:247:4";
  var EDIT_BTNROW_LOC = "src/components/admin.tsx:271:10";
  var ADDITEM_BTN_LOC = "src/components/admin.tsx:170:14";

  var DEFAULT_COLORS = ["Black", "White", "Navy", "Grey"];
  // Names we can PREVIEW exactly via images/mockup/{garment}-{hex}.jpg
  var COLOR_HEX = {
    "BLACK": "0a0a0a", "NAVY": "1d3557", "RED": "e63946", "TEAL": "2a9d8f",
    "YELLOW": "e9c46a", "ORANGE": "f4a261", "GREY": "6d6875", "GRAY": "6d6875",
    "WHITE": "ffffff"
  };
  function colorHex(name) {
    if (!name) return "";
    var n = String(name).trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(n)) return n.replace("#", "").toLowerCase();
    return COLOR_HEX[n.toUpperCase()] || "";
  }
  function itemByName(name) {
    if (!name) return null;
    var arr = catalogItems(), i;
    for (i = 0; i < arr.length; i++) if (arr[i] && arr[i].name === name) return arr[i];
    return null;
  }
  function colorOverrides() {
    try {
      var m = JSON.parse(localStorage.getItem("aa-item-colors-v1") || "{}");
      return (m && typeof m === "object") ? m : {};
    } catch (e) { return {}; }
  }
  function saveColorOverride(key, arr) {
    try {
      var m = colorOverrides();
      m[key] = Array.isArray(arr) ? arr : [];
      localStorage.setItem("aa-item-colors-v1", JSON.stringify(m));
    } catch (e) {}
  }
  function colorsForItem(it) {
    if (it && Array.isArray(it.colors) && it.colors.length) return it.colors;
    if (it && it.id) {
      var ov = colorOverrides()[it.id];
      if (Array.isArray(ov) && ov.length) return ov;
    }
    return DEFAULT_COLORS;
  }
  // One-time migration: give every existing catalog item explicit colors so
  // the COLOR row always has the item's own set (and admins can edit it).
  function ensureItemColors() {
    try {
      var arr = catalogItems();
      if (!arr.length) return false;
      var changed = false;
      for (var i = 0; i < arr.length; i++) {
        var it = arr[i];
        if (it && !Array.isArray(it.colors)) {
          it.colors = DEFAULT_COLORS.slice();
          changed = true;
        }
      }
      if (changed) saveCatalogItems(arr);
      return changed;
    } catch (e) { return false; }
  }

  // --- native-save hook: React rebuilds items without our colors field on
  // every admin edit, so re-apply saved color overrides on catalog writes.
  try {
    var __aaOrigSet = window.Storage && Storage.prototype.setItem;
    if (__aaOrigSet && !Storage.prototype.__aaColorHook) {
      Storage.prototype.__aaColorHook = true;
      Storage.prototype.setItem = function (k, v) {
        if (k === "aa-catalog-v1" && typeof v === "string") {
          try {
            var arr = JSON.parse(v);
            if (Array.isArray(arr)) {
              var mapC = colorOverrides(), changed = false, i, it, ov, wasNew;
              for (i = 0; i < arr.length; i++) {
                it = arr[i];
                if (!it || !it.id) continue;
                if (Array.isArray(it.colors) && it.colors.length) continue;
                ov = (mapC[it.id] !== undefined) ? mapC[it.id] : undefined;
                wasNew = false;
                if (ov === undefined && String(it.id).indexOf("custom-") === 0 && mapC["new"] !== undefined) {
                  ov = mapC["new"]; wasNew = true;
                }
                if (ov === undefined) continue;
                if (Array.isArray(ov) && ov.length) it.colors = ov;
                else delete it.colors;
                changed = true;
                if (wasNew) {
                  mapC[it.id] = ov;
                  delete mapC["new"];
                  try { __aaOrigSet.call(this, "aa-item-colors-v1", JSON.stringify(mapC)); } catch (e2) {}
                }
              }
              if (changed) v = JSON.stringify(arr);
            }
          } catch (e) {}
        }
        return __aaOrigSet.call(this, k, v);
      };
    }
  } catch (e) {}

  // --- storefront: product modal color picker ---
  var modalColor = { item: "", color: null, origImg: "" };
  function openModalImg() {
    var img = document.querySelector('img[data-source-loc="' + MODAL_IMG_LOC + '"]');
    if (img) return img;
    // Fallback (works even if the app's internal markers change):
    // the modal photo is an absolutely-positioned mono-img whose alt
    // matches a catalog item name (unlike cart thumbs / category cards).
    var imgs = document.querySelectorAll('img.mono-img.absolute.inset-0[alt]');
    for (var i = 0; i < imgs.length; i++) {
      if (itemByName(imgs[i].getAttribute("alt"))) return imgs[i];
    }
    return null;
  }
  function modalSizeBlock() {
    var chips = document.querySelector('div[data-source-loc="' + SIZE_CHIPS_LOC + '"]');
    if (chips && chips.parentNode) return chips.parentNode;
    // Text-based fallback: the <p> labeled SIZE whose block has chips
    var ps = document.querySelectorAll("p");
    for (var i = 0; i < ps.length; i++) {
      if ((ps[i].textContent || "").trim() === "SIZE") {
        var blk = ps[i].parentNode;
        if (blk && blk.querySelector("button")) return blk;
      }
    }
    return null;
  }
  function chipText(containerLoc) {
    var c = document.querySelector('div[data-source-loc="' + containerLoc + '"]');
    if (!c) return "";
    var on = c.querySelector("button.bg-black");
    return on ? (on.textContent || "").trim() : "";
  }
  function currentModalColor() {
    if (modalColor.color) {
      var cs = document.querySelectorAll(".aa-color-chip");
      for (var j = 0; j < cs.length; j++) {
        if (cs[j].getAttribute("data-color") === modalColor.color) return modalColor.color;
      }
    }
    var chips = document.querySelectorAll(".aa-color-chip"), first = "";
    for (var i = 0; i < chips.length; i++) {
      if (!first) first = chips[i].getAttribute("data-color");
      if (chips[i].className.indexOf(" on") !== -1) return chips[i].getAttribute("data-color");
    }
    return first;
  }
  function paintColorPicker() {
    var cur = currentModalColor();
    var chips = document.querySelectorAll(".aa-color-chip");
    for (var i = 0; i < chips.length; i++) {
      chips[i].className = "aa-color-chip" + (chips[i].getAttribute("data-color") === cur ? " on" : "");
    }
  }
  function applyModalTint() {
    var img = openModalImg();
    if (!img) return;
    var cur = img.getAttribute("src") || "";
    var g = mockupGarment(cur);
    var hex = colorHex(currentModalColor());
    if (!g || !hex || hex === "ffffff") {
      if (modalColor.origImg && cur !== modalColor.origImg) img.setAttribute("src", modalColor.origImg);
      return;
    }
    var want = "/images/mockup/" + g + "-" + hex + ".jpg";
    if (cur !== want) img.setAttribute("src", want);
  }
  function injectColorPicker() {
    var sizeBlock = modalSizeBlock();
    if (!sizeBlock || !sizeBlock.parentNode) return;
    var img = openModalImg();
    if (!img) return;
    var name = img.getAttribute("alt") || "";
    if (!name) return;
    var sec = sizeBlock.parentNode.querySelector(".aa-colors");
    if (sec && modalColor.item === name) { paintColorPicker(); return; }
    var it = itemByName(name);
    var curSrc = img.getAttribute("src") || "";
    // Remember the item's real photo (never a tinted mockup) for restore
    modalColor.item = name; modalColor.color = null;
    modalColor.origImg = (it && it.img && !/\/images\/mockup/.test(curSrc)) ? curSrc : ((it && it.img) || curSrc);
    if (sec && sec.parentNode) sec.parentNode.removeChild(sec);
    var colors = colorsForItem(it);
    sec = document.createElement("div");
    sec.className = "aa-colors";
    var lab = document.createElement("p");
    lab.className = "font-mono text-[10px] tracking-[0.2em]";
    lab.textContent = "COLOR";
    var row = document.createElement("div");
    row.className = "aa-color-row";
    for (var i = 0; i < colors.length; i++) {
      (function (c) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "aa-color-chip";
        b.setAttribute("data-color", c);
        var dot = document.createElement("span");
        dot.className = "aa-color-dot";
        var hx = colorHex(c);
        dot.style.background = hx ? "#" + hx : c;
        var t = document.createElement("span");
        t.textContent = c;
        b.appendChild(dot); b.appendChild(t);
        b.addEventListener("click", function () {
          modalColor.color = c;
          paintColorPicker();
          applyModalTint();
        });
        row.appendChild(b);
      })(colors[i]);
    }
    sec.appendChild(lab);
    sec.appendChild(row);
    sizeBlock.parentNode.insertBefore(sec, sizeBlock);
    paintColorPicker();
  }

  // Add-to-bag: remember chosen color so the cart line can carry it
  var cartColorMap = {};
  function installBagCapture() {
    if (document.__aaBagCapture) return;
    document.__aaBagCapture = true;
    document.addEventListener("click", function (ev) {
      try {
        var btn = ev.target && ev.target.closest ? ev.target.closest('button[data-source-loc="' + ADDBAG_BTN_LOC + '"]') : null;
        if (!btn) {
          var tb = ev.target && ev.target.closest ? ev.target.closest("button") : null;
          if (tb && (tb.textContent || "").trim().indexOf("ADD TO BAG") === 0) btn = tb;
        }
        if (!btn) return;
        var img = openModalImg();
        if (!img) return;
        var name = img.getAttribute("alt") || "";
        var size = chipText(SIZE_CHIPS_LOC);
        var fab = (chipText(FABRIC_CHIPS_LOC) || "").toUpperCase();
        var col = currentModalColor();
        if (name && size && col) cartColorMap[name + "|" + size + "|" + fab] = col;
      } catch (e) {}
    }, true);
  }
  // Cart lines re-render without the color, re-apply whenever DOM changes
  function fixCartColors() {
    var lines = document.querySelectorAll('div[data-source-loc="' + CART_ITEM_LOC + '"]');
    for (var i = 0; i < lines.length; i++) {
      var nameEl = lines[i].querySelector('p[data-source-loc="' + CART_NAME_LOC + '"]');
      var specEl = lines[i].querySelector('p[data-source-loc="' + CART_SPEC_LOC + '"]');
      if (!nameEl || !specEl) continue;
      var name = (nameEl.textContent || "").trim();
      var parts = (specEl.textContent || "").split("·");
      if (parts.length < 2) continue;
      var size = (parts[0] || "").trim();
      var fab = (parts[1] || "").trim();
      var col = cartColorMap[name + "|" + size + "|" + fab];
      if (!col) continue;
      var want = size + " · " + fab + " · " + String(col).toUpperCase();
      if ((specEl.textContent || "").trim() !== want) specEl.textContent = want;
    }
  }

  // --- admin: colors field inside the native EDIT form ---
  var editTarget = null; // {id, name} or {id:"new"}
  function installEditCapture() {
    if (document.__aaEditCapture) return;
    document.__aaEditCapture = true;
    document.addEventListener("click", function (ev) {
      try {
        var t = ev.target && ev.target.closest ? ev.target.closest('button[aria-label^="Edit "]') : null;
        if (t) {
          var nm = (t.getAttribute("aria-label") || "").replace(/^Edit\s+/, "");
          var it = itemByName(nm);
          editTarget = { id: (it && it.id) ? it.id : "x:" + nm, name: nm };
          return;
        }
        var ni = ev.target && ev.target.closest ? ev.target.closest('button[data-source-loc="' + ADDITEM_BTN_LOC + '"]') : null;
        if (ni) editTarget = { id: "new", name: "" };
      } catch (e) {}
    }, true);
  }
  function injectEditColors() {
    var form = document.querySelector('form[data-source-loc="' + EDIT_FORM_LOC + '"]');
    if (!form) return;
    // Robustness: if the click-capture missed (e.g. reload edge), infer the
    // target from the form's own ITEM NAME field.
    if (!editTarget) {
      var nameInp = form.querySelector('input[placeholder="e.g. Classic Crew Tee"]');
      var nv = nameInp ? (nameInp.value || "").trim() : "";
      if (nv) {
        var fIt = itemByName(nv);
        editTarget = { id: (fIt && fIt.id) ? fIt.id : "x:" + nv, name: nv };
      } else {
        editTarget = { id: "new", name: "" };
      }
    }
    var key = editTarget ? editTarget.id : "";
    var box = form.querySelector(".aa-editcolors");
    if (box) {
      if (box.__aaTarget !== key) {
        box.__aaTarget = key;
        var ex = colorOverrides();
        var val = DEFAULT_COLORS.join(", ");
        if (editTarget && editTarget.id !== "new") {
          var it = itemByName(editTarget.name);
          if (it && Array.isArray(it.colors) && it.colors.length) val = it.colors.join(", ");
          else if (editTarget.id && ex[editTarget.id] !== undefined) val = ex[editTarget.id].join(", ");
        }
        box.querySelector("input").value = val;
      }
      return;
    }
    var ov = colorOverrides();
    var value = DEFAULT_COLORS.join(", ");
    if (editTarget && editTarget.id !== "new") {
      var it2 = itemByName(editTarget.name);
      if (it2 && Array.isArray(it2.colors) && it2.colors.length) value = it2.colors.join(", ");
      else if (editTarget.id && ov[editTarget.id] !== undefined) value = ov[editTarget.id].join(", ");
    }
    var wrap = document.createElement("label");
    wrap.className = "aa-set-field aa-editcolors";
    wrap.__aaTarget = key;
    var sp = document.createElement("span");
    sp.textContent = "AVAILABLE COLORS (COMMA SEPARATED — EMPTY = DEFAULT SET)";
    var inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = "Black, White, Navy…";
    inp.value = value;
    inp.autocomplete = "off";
    inp.addEventListener("input", function () {
      saveColorOverride(editTarget ? editTarget.id : "new", inp.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean));
    });
    wrap.appendChild(sp);
    wrap.appendChild(inp);
    // Insert as the FIRST element of the form grid — always visible at the
    // top of the edit form, independent of any other row's markup.
    try { form.insertBefore(wrap, form.firstChild); }
    catch (e) { form.appendChild(wrap); }
  }

  // ================= SECURITY HARDENING =================
  // 1) Admin login rate limiting: max 5 attempts / 10 min. During lockout
  //    the submit event is swallowed (capture phase) so React never checks
  //    the password, defeating brute-force attempts on the panel.
  var LOGIN_FORM_LOC = "src/components/admin.tsx:129:8";
  function throttleState() {
    try {
      var s = JSON.parse(localStorage.getItem("aa-login-throttle") || '{"n":0,"t":0}');
      return (s && typeof s === "object" && typeof s.n === "number") ? s : { n: 0, t: 0 };
    } catch (e) { return { n: 0, t: 0 }; }
  }
  function saveThrottle(s) {
    try { localStorage.setItem("aa-login-throttle", JSON.stringify(s)); } catch (e) {}
  }
  function installLoginThrottle() {
    var form = document.querySelector('form[data-source-loc="' + LOGIN_FORM_LOC + '"]');
    if (!form || form.__aaThrottle) return;
    form.__aaThrottle = true;
    // success detection: when the panel opens, LOGOUT button exists -> reset
    var msg = document.createElement("p");
    msg.className = "aa-sec-msg";
    form.appendChild(msg);
    form.addEventListener("submit", function (ev) {
      var s = throttleState();
      var now = Date.now();
      if (s.n > 0 && now - s.t > 10 * 60 * 1000) { s = { n: 0, t: 0 }; saveThrottle(s); }
      if (s.n >= 5) {
        var wait = Math.ceil((10 * 60 * 1000 - (now - s.t)) / 60000);
        ev.preventDefault();
        ev.stopImmediatePropagation();
        msg.textContent = "LOCKED — TOO MANY ATTEMPTS. WAIT " + wait + " MIN.";
        msg.className = "aa-sec-msg err";
        return;
      }
      s.n += 1; s.t = now; saveThrottle(s);
      msg.textContent = "ATTEMPT " + s.n + " OF 5";
      msg.className = "aa-sec-msg";
    }, true);
    // reset the counter whenever an admin session is active
    setInterval(function () {
      if (isAdminMode() && throttleState().n > 0) saveThrottle({ n: 0, t: 0 });
      var st = throttleState();
      if (st.n > 0 && Date.now() - st.t > 10 * 60 * 1000) saveThrottle({ n: 0, t: 0 });
    }, 5000);
  }
  // 2) Only safe image sources may be saved on new products
  function safeImageSrc(src) {
    var v = (src || "").trim();
    if (!v) return "";
    if (/^data:image\//i.test(v)) return v;
    if (/^https?:\/\//i.test(v)) return v;
    if (/^\/[a-z0-9\-_\/.]+\.(jpg|jpeg|png|webp|gif|avif)$/i.test(v)) return v;
    return ""; // rejects javascript:, svg data URIs, anything odd
  }
  // 3) Neutralize unsafe links anywhere custom code touches them
  function safeLink(u) {
    var v = (u || "").trim();
    return /^https?:\/\//i.test(v) ? v : "";
  }

  // ---- Design Lab: no placeholder text until the user adds something ----
  // The native preview shows big "YOUR TEXT" by default. Hide it (and empty
  // the native text field through React) until real content exists.
  var NATIVE_TEXT_LOC = "src/components/studio.tsx:131:16";
  var NATIVE_PLACEHOLDER_LOC = "src/components/studio.tsx:74:20";
  function hidePlaceholderText() {
    var els = document.querySelectorAll("p" + sel(NATIVE_PLACEHOLDER_LOC));
    for (var i = 0; i < els.length; i++) {
      var t = (els[i].textContent || "").trim();
      els[i].style.display = (t === "" || t === "YOUR TEXT") ? "none" : "";
    }
  }
  function clearNativeTextDefault() {
    var inp = document.querySelector("input" + sel(NATIVE_TEXT_LOC));
    if (!inp || inp.value !== "YOUR TEXT") return;
    setNativeRange(inp, "");
  }
  document.addEventListener("input", function (ev) {
    try {
      if (ev.target && ev.target.closest && ev.target.closest("#studio")) schedule();
    } catch (e) {}
  });

  // Kill the login-hint paragraph even if a stale cached bundle renders it
  function scrubPasswordHint() {
    var ps = document.querySelectorAll("p");
    for (var i = 0; i < ps.length; i++) {
      var t = ps[i].textContent || "";
      if (t.indexOf("INITIAL PASSWORD") !== -1 && t.indexOf("CHANGE IT") !== -1) {
        var p = ps[i].parentNode;
        if (p) p.removeChild(ps[i]);
      }
    }
  }

  var migrated = false;
  // One failing feature must never block the others
  function safeCall(fn) { try { fn(); } catch (e) {} }
  function run() {
    try {
      if (!migrated) {
        migrated = true;
        safeCall(ensureCatalogGeneration);
        var changed = false;
        try { changed = migrateCatalog(); } catch (e) {}
        safeCall(ensureItemColors);
        // One silent reload so the app re-renders from the fixed catalog
        try {
          if (changed && window.localStorage && !localStorage.getItem("aa-imgfix-v1")) {
            localStorage.setItem("aa-imgfix-v1", "1");
            window.location.reload();
            return;
          }
        } catch (e) {}
      }
      safeCall(ensureSectionId);
      safeCall(swapCardMedia);
      safeCall(injectLooks);
      safeCall(injectCutSew);
      safeCall(fixProductImages);
      safeCall(injectSizeSlider);
      safeCall(injectWhatsAppCheckout);
      safeCall(applyMockupTint);
      safeCall(observeStudio);
      safeCall(injectViewToggle);
      safeCall(injectSizePicker);
      safeCall(paintSizePicker);
      safeCall(paintSizeChip);
      safeCall(injectAddRow);
      safeCall(renderStudioLayers);
      safeCall(syncNativeDesign);
      safeCall(interceptStudioWa);
      safeCall(injectEstEditor);
      safeCall(injectColorPicker);
      safeCall(fixCartColors);
      safeCall(installBagCapture);
      safeCall(injectEditColors);
      safeCall(installEditCapture);
      safeCall(injectAdminSettings);
      safeCall(injectProductAdder);
      safeCall(applySocialLinks);
      safeCall(scrubPasswordHint);
      safeCall(installLoginThrottle);
      safeCall(hidePlaceholderText);
      safeCall(clearNativeTextDefault);
    } catch (e) { /* never break the page */ }
  }

  var timer = null;
  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, 250);
  }

  function observe() {
    var root = document.getElementById("root");
    if (!root || !window.MutationObserver) return;
    var obs = new MutationObserver(schedule);
    obs.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { run(); observe(); });
  } else {
    run();
    observe();
  }
  window.addEventListener("load", run);
  setTimeout(run, 800);
  setTimeout(run, 2000);
  setTimeout(run, 4000);
})();

/* ============================================================
 * v23 — Lazy video playback (SEO/perf fix)
 * Videos no longer autoplay on load (bundle patch: autoPlay:!1).
 * This plays a video only while it is near/inside the viewport and
 * pauses it when it leaves — initial page load downloads posters
 * (preload="metadata") instead of ~12 MB of MP4.
 * ============================================================ */
(function () {
  if (window.__AA_LAZY_VIDEO_V23__) return;
  window.__AA_LAZY_VIDEO_V23__ = true;

  function boot() {
    if (!("IntersectionObserver" in window)) return;
    var seen = new WeakSet();
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var v = entries[i].target;
        if (entries[i].isIntersecting) {
          var pr = v.play();
          if (pr && pr.catch) pr.catch(function () {});
        } else if (!v.paused) {
          v.pause();
        }
      }
    }, { rootMargin: "120px", threshold: 0.15 });

    function watch(v) {
      if (seen.has(v)) return;
      seen.add(v);
      v.setAttribute("preload", "metadata");
      io.observe(v);
    }
    function scan(root) {
      if (!root) return;
      if (root.tagName === "VIDEO") { watch(root); return; }
      var list = root.querySelectorAll ? root.querySelectorAll("video") : [];
      for (var i = 0; i < list.length; i++) watch(list[i]);
    }

    scan(document);
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var add = muts[i].addedNodes;
        for (var j = 0; j < add.length; j++) {
          if (add[j] && add[j].nodeType === 1) scan(add[j]);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
