/* ============================================================
   Allegiant Attire — "On the rail" behaviour

   Mirrors the reference interaction model:
     • pointer devices: hovering/focusing a garment makes it the active
       one — it turns from edge-on to face you, the rail accordions
       open around it, and the caption swaps to that piece
     • touch: the rail scrolls horizontally and whatever sits nearest
       the middle becomes active
     • click/Enter: opens the garment dialog (turntable + details)
     • finally, the band is moved under the storefront hero

   Authored outside #root, so React hydration cannot wipe it.
   ============================================================ */
(function () {
  "use strict";

  function init() {
    var shell = document.querySelector(".aa-home-shell");
    if (!shell || shell.dataset.aaReady === "1") return;
    shell.dataset.aaReady = "1";

    var scroller = shell.querySelector(".aa-rail-scroll");
    var garments = Array.prototype.slice.call(shell.querySelectorAll(".aa-garment"));
    var caption = shell.querySelector(".aa-caption-title");
    var captionDefault = caption ? caption.textContent : "";
    var hintWrap = shell.querySelector(".aa-rail-hints");
    if (!garments.length) return;


    /* ---------- staggered arrival + idle sway, as in the reference ---------- */
    garments.forEach(function (el, i) {
      var swing = el.querySelector(".aa-garment-swing");
      if (!swing) return;
      swing.style.setProperty("--arrival", (i * 65) + "ms");
      swing.style.setProperty("--sway", "-" + (i * 0.6).toFixed(1) + "s");
    });

    /* ---------- caption swapping ---------- */
    function setCaption(text) {
      if (!caption || caption.textContent === text) return;
      caption.textContent = text;
      caption.style.animation = "none";
      void caption.offsetWidth;            // restart aa-caption-in
      caption.style.animation = "";
    }

    var active = -1;

    function activate(index) {
      if (index === active) return;
      active = index;

      garments.forEach(function (el, i) {
        el.classList.toggle("is-active", i === index);
      });

      if (index === -1) {
        setCaption(captionDefault);
        if (hintWrap) hintWrap.classList.remove("is-detail");
      } else {
        setCaption(garments[index].dataset.name || captionDefault);
        if (hintWrap) hintWrap.classList.add("is-detail");
      }
    }

    /* The reference model: enter a garment to make it the active one,
       leave the rail to let them all hang back. These are bound on
       every device — a touchscreen laptop reports pointer:coarse even
       when a mouse is plugged in, and gating on that left the rail
       completely inert for anyone hovering it. */
    var stage = shell.querySelector(".aa-garments");

    garments.forEach(function (el, i) {
      el.addEventListener("mouseenter", function () { activate(i); });
      el.addEventListener("pointerenter", function () { activate(i); });
      el.addEventListener("focus", function () { activate(i); });
      el.addEventListener("blur", function () { activate(-1); });
    });

    if (stage) stage.addEventListener("mouseleave", function () { activate(-1); });

    /* ---------- a scrollable rail activates whatever is centred ---------- */
    if (scroller) {
      var ticking = false;
      var centreScan = function () {
        var box = scroller.getBoundingClientRect();
        var centre = box.left + box.width / 2;
        var best = 0, bestDist = Infinity;
        garments.forEach(function (el, i) {
          var r = el.getBoundingClientRect();
          var d = Math.abs(r.left + r.width / 2 - centre);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        activate(best);
        ticking = false;
      };
      scroller.addEventListener("scroll", function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(centreScan);
      }, { passive: true });
      window.addEventListener("resize", function () {
        if (scroller.scrollWidth > scroller.clientWidth + 4) centreScan();
      });
      // only pick a garment for the reader when the rail really does
      // scroll (narrow screens); on a full-width rail, leave it at rest
      window.setTimeout(function () {
        if (scroller.scrollWidth > scroller.clientWidth + 4) centreScan();
      }, 120);
    }

    /* ---------- garment dialog ---------- */
    var dialog = document.getElementById("aa-garment-dialog");
    var items = garments.map(function (el) {
      return {
        name: el.dataset.name || "",
        index: el.dataset.index || "",
        spec: el.dataset.spec || "",
        copy: el.dataset.copy || "",
        href: el.dataset.href || "/contact/",
        front: el.dataset.front || "",
        back: el.dataset.back || ""
      };
    });
    var current = 0;

    function paint(i) {
      if (!dialog) return;
      current = (i + items.length) % items.length;
      var it = items[current];
      var turntable = dialog.querySelector(".aa-detail-turntable");
      var controls = dialog.querySelector(".aa-view-controls");

      dialog.querySelector(".aa-detail-kind").textContent = it.spec;
      dialog.querySelector(".aa-detail-count").textContent =
        it.index + " / " + String(items.length).padStart(2, "0");
      dialog.querySelector(".aa-detail-title").textContent = it.name;
      dialog.querySelector(".aa-detail-description").textContent = it.copy;
      dialog.querySelector(".aa-detail-front img").src = it.front;
      dialog.querySelector(".aa-detail-front img").alt = it.name + " — front view";
      dialog.querySelector(".aa-detail-page").href = it.href;

      var backImg = dialog.querySelector(".aa-detail-back img");
      turntable.classList.remove("show-back");
      if (it.back) {
        backImg.src = it.back;
        backImg.alt = it.name + " — back view";
        controls.hidden = false;
        controls.querySelectorAll("button").forEach(function (b, bi) {
          b.classList.toggle("selected", bi === 0);
        });
      } else {
        backImg.removeAttribute("src");
        controls.hidden = true;
      }
    }

    function openDialog(el) {
      if (!el || typeof el.showModal !== "function") return false;
      el.showModal();
      return true;
    }

    if (dialog) {
      garments.forEach(function (el, i) {
        el.addEventListener("click", function () {
          paint(i);
          if (!openDialog(dialog)) window.location.href = items[i].href;
        });
      });

      dialog.querySelector(".aa-detail-prev").addEventListener("click", function () { paint(current - 1); });
      dialog.querySelector(".aa-detail-next").addEventListener("click", function () { paint(current + 1); });

      dialog.querySelectorAll(".aa-view-controls button").forEach(function (btn, bi) {
        btn.addEventListener("click", function () {
          dialog.querySelector(".aa-detail-turntable").classList.toggle("show-back", bi === 1);
          dialog.querySelectorAll(".aa-view-controls button").forEach(function (b, j) {
            b.classList.toggle("selected", j === bi);
          });
        });
      });

      dialog.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") paint(current - 1);
        if (e.key === "ArrowRight") paint(current + 1);
      });
    }

    /* ---------- close buttons and backdrop clicks ---------- */
    document.querySelectorAll(".aa-dialog").forEach(function (d) {
      d.querySelectorAll("[data-aa-close]").forEach(function (b) {
        b.addEventListener("click", function () { d.close(); });
      });
      d.addEventListener("click", function (e) {
        if (e.target === d) d.close();      // click on the backdrop area
      });
    });

    /* ---------- hold the motion until the band is on screen ---------- */
    revealOnScroll(shell, function () {
      if (active !== -1) return;
      /* one unprompted turn after the garments have dropped in, so the
         "hover to turn" invitation is demonstrated rather than stated */
      window.setTimeout(function () {
        if (active !== -1) return;
        activate(Math.min(4, garments.length - 1));
        window.setTimeout(function () { if (active === Math.min(4, garments.length - 1)) activate(-1); }, 1400);
      }, 1500);
    });

    /* ---------- lift the rail into the storefront ---------- */
    placeRail(shell);
  }

  /* The drop-in and the idle sway are paused in CSS until .is-in-view
     lands on the shell, so the rail animates in when the reader
     reaches it, not while it is still hidden at the top of the page. */
  function revealOnScroll(shell, done) {
    function go() {
      if (shell.classList.contains("is-in-view")) return;
      shell.classList.add("is-in-view");
      if (done) done();
    }
    if (!("IntersectionObserver" in window)) return go();
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); go(); }
    }, { threshold: 0.25 });
    io.observe(shell);
    // never leave the garments stuck at opacity 0 if the observer
    // somehow never reports the band as visible
    window.setTimeout(function () { io.disconnect(); go(); }, 9000);
  }

  /* The rail is authored in the page source (so it is in the HTML a
     crawler sees) but it belongs further down the page, directly under
     the storefront's hero, just above the running marquee. React paints
     that marquee after us, so watch for it, then move the band into
     place and reveal it.
     Moving a node keeps its listeners, so the rail is live either way. */
  function placeRail(shell) {
    var MARQUEE = '#root [data-source-loc="src/components/ui.tsx:27:4"]';
    var CATEGORIES = '#root [data-source-loc="src/App.tsx:271:6"]';
    var anchor = null;

    function seat() {
      var marquee = document.querySelector(MARQUEE);
      if (marquee && marquee.parentNode) {
        if (shell.nextElementSibling !== marquee) {
          marquee.parentNode.insertBefore(shell, marquee);
        }
        anchor = marquee;
        shell.hidden = false;
        return true;
      }
      var categories = document.querySelector(CATEGORIES);
      if (categories && categories.parentNode) {
        categories.parentNode.insertBefore(shell, categories);
        shell.hidden = false;
        return true;
      }
      return false;
    }

    if (!seat()) {
      var observer = new MutationObserver(function () {
        if (seat()) { observer.disconnect(); keepSeated(); }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // if the storefront never paints, show the rail at the end rather
      // than leave it hidden for good
      window.setTimeout(function () {
        observer.disconnect();
        if (shell.hidden) { document.body.appendChild(shell); shell.hidden = false; }
      }, 8000);
      return;
    }

    keepSeated();

    /* a React re-render can shuffle its own children around ours, so
       check a few times that the rail is still under the marquee */
    function keepSeated() {
      var checks = 0;
      var timer = window.setInterval(function () {
        if (++checks > 10) return window.clearInterval(timer);
        if (anchor && anchor.parentNode && shell.nextElementSibling !== anchor) {
          anchor.parentNode.insertBefore(shell, anchor);
        }
      }, 700);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
