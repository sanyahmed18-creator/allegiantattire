/* ============================================================
   Allegiant Attire — "On the rail" behaviour

   Mirrors the reference interaction model:
     • pointer devices: hovering/focusing a garment makes it the active
       one — it turns from edge-on to face you, the rail accordions
       open around it, and the caption swaps to that piece
     • touch: the rail scrolls horizontally and whatever sits nearest
       the middle becomes active
     • click/Enter: opens the garment dialog (turntable + details)
     • finally, the band is moved inside the storefront hero

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
    var sound = createRailSound();

    function activate(index, silent) {
      if (index === active) return;
      active = index;
      if (index !== -1 && !silent) sound.play(index);

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
      var lastLeft = -1;
      var centreScan = function (silent) {
        var box = scroller.getBoundingClientRect();
        var centre = box.left + box.width / 2;
        var best = 0, bestDist = Infinity;
        garments.forEach(function (el, i) {
          var r = el.getBoundingClientRect();
          var d = Math.abs(r.left + r.width / 2 - centre);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        activate(best, silent === true);
        ticking = false;
      };
      var queueScan = function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(centreScan);
      };
      scroller.addEventListener("scroll", function () {
        // a scroll of a pixel or two cannot change which garment is
        // centred, so skip the ten getBoundingClientRect calls
        if (Math.abs(scroller.scrollLeft - lastLeft) < 3) return;
        lastLeft = scroller.scrollLeft;
        queueScan();
      }, { passive: true });

      // follow the finger rather than waiting for the scroll to settle
      scroller.addEventListener("touchmove", queueScan, { passive: true });

      /* touching a garment turns it at once — without this the rail
         only ever answered the scroll, so a tap felt like it had been
         ignored right up until the dialog appeared */
      garments.forEach(function (el, i) {
        el.addEventListener("touchstart", function () { activate(i); }, { passive: true });
        el.addEventListener("pointerdown", function () { activate(i); });
      });
      window.addEventListener("resize", function () {
        if (scroller.scrollWidth > scroller.clientWidth + 4) centreScan();
      });
      // only pick a garment for the reader when the rail really does
      // scroll (narrow screens); on a full-width rail, leave it at rest
      window.setTimeout(function () {
        if (scroller.scrollWidth > scroller.clientWidth + 4) centreScan(true);
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

    /* ---------- the sound toggle ---------- */
    var soundBtn = shell.querySelector("[data-aa-sound]");
    if (soundBtn && sound.supported) {
      var paintSound = function () {
        var on = sound.enabled();
        soundBtn.classList.toggle("is-off", !on);
        soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
        soundBtn.querySelector(".aa-sound-text").textContent = on ? "Rail sound on" : "Rail sound off";
      };
      soundBtn.hidden = false;
      paintSound();
      soundBtn.addEventListener("click", function () { sound.toggle(); paintSound(); });
    }

    /* ---------- hold the motion until the band is on screen ---------- */
    revealOnScroll(shell, function () {
      if (active !== -1) return;
      /* one unprompted turn after the garments have dropped in, so the
         "hover to turn" invitation is demonstrated rather than stated */
      window.setTimeout(function () {
        if (active !== -1) return;
        activate(Math.min(4, garments.length - 1), true);
        window.setTimeout(function () { if (active === Math.min(4, garments.length - 1)) activate(-1); }, 1400);
      }, 1500);
    });

    /* ---------- lift the rail into the storefront ---------- */
    placeRail(shell);
  }

  /* ------------------------------------------------------------------
     The rail makes a sound: the swoop of a garment being pushed along
     it. Synthesised with the Web Audio API rather than played from a
     file, because a swoosh of cloth is really one thing — a band of
     air noise that rises as the garment accelerates and falls away as
     it settles. So it is a pink-ish noise bed through a bandpass that
     arcs up and back down, shaped by a soft swell with no attack
     click. Rate, filter arc and length are randomised per hover, and
     the sound is panned to wherever the garment sits on the rail, so
     sweeping it never sounds like the same clip ten times.
     ------------------------------------------------------------------ */
  function createRailSound() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    var off = { play: function () {}, toggle: function () { return false; }, enabled: function () { return false; }, supported: false };
    if (!Ctx) return off;

    var muted = false;
    try { muted = window.localStorage.getItem("aa-rail-sound") === "off"; } catch (e) {}

    var ctx = null, noise = null, master = null, last = 0, pending = 0;

    function build() {
      if (ctx) return;
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(ctx.destination);
      // pink-ish noise: cloth is broadband but weighted to the low mids,
      // and plain white noise swooshes sound like radio static
      var len = Math.floor(ctx.sampleRate * 1.2);
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = noise.getChannelData(0);
      var lp = 0;
      for (var i = 0; i < len; i++) {
        var white = Math.random() * 2 - 1;
        lp = lp * 0.94 + white * 0.06;
        var v = lp * 3.4 + white * 0.22;
        data[i] = v > 1 ? 1 : v < -1 ? -1 : v;
      }
    }

    // browsers hold audio until the page has been interacted with
    ["pointerdown", "keydown", "touchstart"].forEach(function (evt) {
      document.addEventListener(evt, function unlock() {
        build();
        if (ctx.state === "suspended") ctx.resume();
      }, { once: true, passive: true });
    });

    function play(slot, level) {
      if (muted) return;
      var now = Date.now();
      if (now - last < 70) {
        /* the pointer is sweeping the rail. Don't machine-gun one
           sound per garment, but do make sure whatever it settles on
           is still heard, a little softer. */
        window.clearTimeout(pending);
        pending = window.setTimeout(function () { play(slot, 0.5); }, 80 - (now - last));
        return;
      }
      window.clearTimeout(pending);
      var crowded = now - last < 230;           // a quick one is a lighter touch
      last = now;

      build();
      if (ctx.state !== "running") {
        /* Browsers hold audio until the reader has interacted with the
           page, and ctx.resume() only takes effect asynchronously — so
           testing the state right after calling resume() always saw
           "suspended" and silently dropped the swoosh. That is why the
           rail stayed mute until the sound toggle had been flipped off
           and on again: the click that unlocked the audio was itself
           swallowed. Chain this swoosh onto the resume instead — the
           very first tap, click or keypress that unlocks the audio is
           also the first one you hear, and from then on hovering the
           rail just works. Without a gesture the promise never resolves
           and the rail stays silent, which is exactly the autoplay
           policy. */
        if (ctx.resume) {
          ctx.resume().then(function () {
            if (!muted && ctx && ctx.state === "running") play(slot, level);
          }, function () {});
        }
        return;                               // no gesture yet, stay silent
      }

      var t = ctx.currentTime;
      var gain = (crowded ? 0.5 : 1) * (level == null ? 1 : level);
      var slots = 10;
      var place = (((slot || 0) % slots) / (slots - 1)) * 2 - 1;      // -1 left .. +1 right
      var dur = 0.3 + Math.random() * 0.12;
      var peakAt = t + dur * 0.42;                                    // the swell, not the start

      var src = ctx.createBufferSource();
      src.buffer = noise;
      src.playbackRate.value = 0.92 + Math.random() * 0.22;
      src.loop = true;

      /* the arc: air opening up as the garment is pushed, then
         closing again as it slows */
      var band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.Q.value = 0.85;
      var low = 380 + Math.random() * 90;
      var high = (1500 + Math.random() * 420) * (1 - place * 0.06);
      band.frequency.setValueAtTime(low, t);
      band.frequency.exponentialRampToValueAtTime(high, peakAt);
      band.frequency.exponentialRampToValueAtTime(low * 1.5, t + dur);

      // keep the rumble and the hiss out of it
      var hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 190;
      var lpf = ctx.createBiquadFilter();
      lpf.type = "lowpass";
      lpf.frequency.value = 3600;

      /* a swell rather than a hit — linear in, exponential out, so
         there is no click at either end */
      var env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.26 * gain, peakAt);
      env.gain.linearRampToValueAtTime(0.085 * gain, peakAt + (dur - peakAt) * 0.45);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      var tail = env;
      if (ctx.createStereoPanner) {
        var pan = ctx.createStereoPanner();
        pan.pan.value = place * 0.55;        // it swooshes where the garment hangs
        env.connect(pan);
        tail = pan;
      }

      src.connect(band); band.connect(hp); hp.connect(lpf); lpf.connect(env);
      tail.connect(master);
      src.start(t, Math.random() * 0.6);
      src.stop(t + dur + 0.05);
    }

    return {
      play: play,
      enabled: function () { return !muted; },
      toggle: function () {
        muted = !muted;
        try { window.localStorage.setItem("aa-rail-sound", muted ? "off" : "on"); } catch (e) {}
        if (!muted) { last = 0; play(2, 1); }
        return !muted;
      },
      supported: true
    };
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
     crawler sees) but it belongs inside the storefront hero, in the
     gap between the headline and the paragraph under it. React paints
     that hero after us, so watch for it, then move the band into place
     and reveal it. Moving a node keeps its listeners, so the rail is
     live either way. */
  function placeRail(shell) {
    var HEADLINE = '#root [data-source-loc="src/App.tsx:217:14"]';   // the big hero headline
    var LEDE = '#root [data-source-loc="src/App.tsx:222:14"]';       // "Blank & custom apparel ..."
    var MARQUEE = '#root [data-source-loc="src/components/ui.tsx:27:4"]';
    var anchor = null;

    function seat() {
      var headline = document.querySelector(HEADLINE);
      if (headline && headline.parentNode) {
        if (headline.nextElementSibling !== shell) {
          headline.parentNode.insertBefore(shell, headline.nextSibling);
        }
        anchor = headline;
        shell.hidden = false;
        return true;
      }
      // the headline is the one we want; these only catch a rebuilt hero
      var after = document.querySelector(LEDE) || document.querySelector(MARQUEE);
      if (after && after.parentNode) {
        after.parentNode.insertBefore(shell, after);
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
       check a few times that the rail is still under the headline */
    function keepSeated() {
      var checks = 0;
      var timer = window.setInterval(function () {
        if (++checks > 10) return window.clearInterval(timer);
        if (anchor && anchor.parentNode && anchor.nextElementSibling !== shell) {
          anchor.parentNode.insertBefore(shell, anchor.nextSibling);
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
