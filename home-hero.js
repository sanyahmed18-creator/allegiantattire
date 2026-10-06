/* ============================================================
   Allegiant Attire — "On the rail" homepage hero behaviour
   - desktop: neighbours step aside while a garment is hovered
   - touch:   the garment nearest the middle of the rail stays lit
   - both:    gentle pointer parallax + smooth scroll into the shop
   The hero lives outside #root, so a React re-render never wipes it.
   ============================================================ */
(function () {
  "use strict";

  function init() {
    var hero = document.querySelector(".aa-rail-hero");
    if (!hero || hero.dataset.aaRailReady === "1") return;
    hero.dataset.aaRailReady = "1";

    var track = hero.querySelector(".aa-rail-track");
    if (!track) return;

    var items = Array.prototype.slice.call(track.querySelectorAll(".aa-rail-item"));
    if (!items.length) return;

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    /* ---------- desktop: lift one, step the neighbours aside ---------- */
    function clearState() {
      items.forEach(function (el) {
        el.classList.remove("is-hot", "is-prev", "is-next");
      });
    }

    function focusItem(i) {
      clearState();
      if (items[i]) items[i].classList.add("is-hot");
      if (items[i - 1]) items[i - 1].classList.add("is-prev");
      if (items[i + 1]) items[i + 1].classList.add("is-next");
    }

    if (finePointer) {
      items.forEach(function (el, i) {
        el.addEventListener("pointerenter", function () { focusItem(i); });
        el.addEventListener("focusin", function () { focusItem(i); });
      });
      track.addEventListener("pointerleave", clearState);
      track.addEventListener("focusout", function (e) {
        if (!track.contains(e.relatedTarget)) clearState();
      });
    }

    /* ---------- pointer parallax across the rail ---------- */
    if (finePointer && !reduced) {
      var raf = 0;
      var targetX = 0;
      var currentX = 0;

      hero.addEventListener("pointermove", function (e) {
        targetX = ((e.clientX / window.innerWidth) - 0.5) * -18;
        if (!raf) raf = window.requestAnimationFrame(step);
      });

      hero.addEventListener("pointerleave", function () {
        targetX = 0;
        if (!raf) raf = window.requestAnimationFrame(step);
      });

      var step = function () {
        currentX += (targetX - currentX) * 0.08;
        track.style.transform = "translate3d(" + currentX.toFixed(2) + "px,0,0)";
        if (Math.abs(targetX - currentX) > 0.1) {
          raf = window.requestAnimationFrame(step);
        } else {
          raf = 0;
        }
      };
    }

    /* ---------- touch: keep the centred garment lit ---------- */
    if (!finePointer) {
      var ticking = false;

      var highlightCentre = function () {
        var box = track.getBoundingClientRect();
        var centre = box.left + box.width / 2;
        var best = 0;
        var bestDist = Infinity;

        items.forEach(function (el, i) {
          var r = el.getBoundingClientRect();
          var d = Math.abs(r.left + r.width / 2 - centre);
          if (d < bestDist) { bestDist = d; best = i; }
        });

        items.forEach(function (el, i) {
          el.classList.toggle("is-hot", i === best);
        });
        ticking = false;
      };

      track.addEventListener("scroll", function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(highlightCentre);
      }, { passive: true });

      window.addEventListener("resize", highlightCentre);
      window.setTimeout(highlightCentre, 60);
    }

    /* ---------- smooth scroll into the storefront ---------- */
    hero.addEventListener("click", function (e) {
      var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!link) return;
      var id = link.getAttribute("href").slice(1);
      var target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start"
      });
    });

    /* ---------- marquee: duplicate the strip until it covers the band ---------- */
    var mq = document.querySelector(".aa-mq");
    if (mq) {
      var first = mq.querySelector(".aa-mq-track");
      if (first) {
        var guard = 0;
        while (mq.scrollWidth < window.innerWidth * 2 && guard < 6) {
          var clone = first.cloneNode(true);
          clone.setAttribute("aria-hidden", "true");
          mq.appendChild(clone);
          guard++;
        }
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
