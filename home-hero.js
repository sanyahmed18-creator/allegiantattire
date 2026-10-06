/* ============================================================
   Allegiant Attire — "On the rail" homepage behaviour

   Mirrors the reference interaction model:
     • pointer devices: hovering/focusing a garment makes it the active
       one — it turns from edge-on to face you, the rail accordions
       open around it, and the caption swaps to that piece
     • touch: the rail scrolls horizontally and whatever sits nearest
       the middle becomes active
     • click/Enter: opens the garment dialog (turntable + details)
     • menu + about dialogs, marquee, reduced-motion fallbacks

   Lives outside #root, so React hydration cannot wipe it.
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

    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
        var g = garments[index].dataset;
        setCaption(
          (g.index ? g.index + " \u2014 " : "") +
          (g.name || "") +
          (g.spec ? " \u00b7 " + g.spec : "")
        );
        if (hintWrap) hintWrap.classList.add("is-detail");
      }
    }

    if (finePointer) {
      var stage = shell.querySelector(".aa-garments");

      /* exactly the reference model: enter a garment to make it the
         active one, leave the rail to let them all hang back */
      garments.forEach(function (el, i) {
        el.addEventListener("mouseenter", function () { activate(i); });
        el.addEventListener("focus", function () { activate(i); });
        el.addEventListener("blur", function () { activate(-1); });
      });

      if (stage) stage.addEventListener("mouseleave", function () { activate(-1); });
    }

    /* ---------- touch: the centred garment is the active one ---------- */
    if (!finePointer && scroller) {
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
      window.addEventListener("resize", centreScan);
      window.setTimeout(centreScan, 80);
    }

    /* ---------- the rail starts centred when it is wider than the screen ---------- */
    if (scroller) {
      var centreRail = function () {
        var over = scroller.scrollWidth - scroller.clientWidth;
        if (over > 0 && scroller.scrollLeft === 0) scroller.scrollLeft = over / 2;
      };
      centreRail();
      window.setTimeout(centreRail, 60);
      window.addEventListener("load", centreRail);
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

    /* ---------- menu + about dialogs, close buttons, backdrop clicks ---------- */
    document.querySelectorAll("[data-aa-open]").forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        var target = document.getElementById(trigger.getAttribute("data-aa-open"));
        openDialog(target);
      });
    });

    document.querySelectorAll(".aa-dialog").forEach(function (d) {
      d.querySelectorAll("[data-aa-close]").forEach(function (b) {
        b.addEventListener("click", function () { d.close(); });
      });
      d.addEventListener("click", function (e) {
        if (e.target === d) d.close();      // click on the backdrop area
      });
    });

    /* ---------- marquee: the track is two identical halves ---------- */
    var track = shell.querySelector(".aa-marquee-track");
    if (track && !reduced) {
      var group = track.querySelector(".aa-marquee-group");
      if (group) {
        var guard = 0;
        while (track.scrollWidth < window.innerWidth * 2 && guard < 6) {
          track.appendChild(group.cloneNode(true));
          track.appendChild(group.cloneNode(true));
          guard++;
        }
      }
    }

    /* ---------- smooth scroll into the storefront ---------- */
    shell.addEventListener("click", function (e) {
      var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!link) return;
      var target = document.getElementById(link.getAttribute("href").slice(1));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
