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

    var railSound = createRailSound(shell, garments.length);
    var active = -1;

    function activate(index, options) {
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
        if (!(options && options.silent)) railSound.play(index);
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
      /* Some touch browsers delay hover synthesis until after a tap. Set
         the active garment on pointerdown so the visual response starts
         with the finger, without waiting for scroll snapping or click. */
      el.addEventListener("pointerdown", function (event) {
        if (event.pointerType !== "mouse") activate(i);
      }, { passive: true });
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
          activate(i);
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
        activate(Math.min(4, garments.length - 1), { silent: true });
        window.setTimeout(function () { if (active === Math.min(4, garments.length - 1)) activate(-1); }, 1400);
      }, 1500);
    });

    /* ---------- lift the rail into the storefront ---------- */
    placeRail(shell);
  }

  /* Sound is opt-in and synthesized locally: a short, low-passed noise
     envelope gives a soft fabric swish without fetching or autoplaying
     an audio file. Context resume is retried from real pointer/keyboard
     gestures so browsers with autoplay protection can unlock it safely. */
  function createRailSound(shell, itemCount) {
    var button = shell.querySelector(".aa-sound-toggle");
    if (!button) return { play: function () {} };

    var label = button.querySelector(".aa-sound-toggle-label");
    var AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    var enabled = false;
    var context = null;
    var noiseBuffer = null;
    var queuedIndex = null;
    var voices = [];
    var lastPlayedAt = -Infinity;

    function setUnavailable() {
      button.disabled = true;
      button.classList.remove("is-on");
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", "Rail sound is not available in this browser");
      button.title = "Rail sound is not available in this browser";
      if (label) label.textContent = "Sound unavailable";
    }

    function syncButton() {
      var text = enabled ? "Sound on" : "Sound off";
      var description = enabled ? "Turn rail sound off" : "Turn rail sound on";
      button.classList.toggle("is-on", enabled);
      button.setAttribute("aria-pressed", enabled ? "true" : "false");
      button.setAttribute("aria-label", description);
      button.title = description;
      if (label) label.textContent = text;
    }

    if (!AudioContextConstructor) {
      setUnavailable();
      return { play: function () {} };
    }

    try {
      enabled = window.localStorage.getItem("aa-rail-sound-v1") === "on";
    } catch (error) {
      enabled = false;
    }
    syncButton();

    function getContext() {
      if (context) return context;
      try {
        context = new AudioContextConstructor();
      } catch (error) {
        setUnavailable();
        enabled = false;
        return null;
      }
      return context;
    }

    function savePreference() {
      try {
        window.localStorage.setItem("aa-rail-sound-v1", enabled ? "on" : "off");
      } catch (error) {
        /* Sound still works for this page even when storage is unavailable. */
      }
    }

    function getNoiseBuffer(audio) {
      if (noiseBuffer) return noiseBuffer;
      var frameCount = Math.ceil(audio.sampleRate * 0.28);
      noiseBuffer = audio.createBuffer(1, frameCount, audio.sampleRate);
      var samples = noiseBuffer.getChannelData(0);
      for (var i = 0; i < samples.length; i += 1) {
        samples[i] = Math.random() * 2 - 1;
      }
      return noiseBuffer;
    }

    function removeVoice(source) {
      for (var i = voices.length - 1; i >= 0; i -= 1) {
        if (voices[i].source === source) voices.splice(i, 1);
      }
    }

    function stopVoices() {
      queuedIndex = null;
      if (!context) return;
      var now = context.currentTime;
      voices.slice().forEach(function (voice) {
        try {
          voice.gain.gain.cancelScheduledValues(now);
          voice.gain.gain.setTargetAtTime(0.0001, now, 0.006);
          voice.source.stop(now + 0.03);
        } catch (error) {
          /* A voice may already have finished between events. */
        }
      });
    }

    function playNow(index) {
      if (!enabled || !context || context.state !== "running") return;
      var now = context.currentTime;
      if (now - lastPlayedAt < 0.075) return;
      lastPlayedAt = now;

      var duration = 0.24;
      var source = context.createBufferSource();
      var filter = context.createBiquadFilter();
      var envelope = context.createGain();
      var panner = context.createStereoPanner ? context.createStereoPanner() : null;

      source.buffer = getNoiseBuffer(context);
      filter.type = "lowpass";
      filter.Q.setValueAtTime(0.45, now);
      filter.frequency.setValueAtTime(480, now);
      filter.frequency.exponentialRampToValueAtTime(1900, now + 0.075);
      filter.frequency.exponentialRampToValueAtTime(620, now + duration);
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(0.045, now + 0.025);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      source.connect(filter);
      filter.connect(envelope);
      if (panner) {
        var pan = itemCount > 1 ? (index / (itemCount - 1)) * 1.1 - 0.55 : 0;
        panner.pan.setValueAtTime(pan, now);
        envelope.connect(panner);
        panner.connect(context.destination);
      } else {
        envelope.connect(context.destination);
      }

      var voice = { source: source, gain: envelope };
      voices.push(voice);
      source.onended = function () {
        removeVoice(source);
        [source, filter, envelope, panner].forEach(function (node) {
          if (node && typeof node.disconnect === "function") node.disconnect();
        });
      };
      source.start(now);
      source.stop(now + duration + 0.01);
    }

    function flushQueued() {
      if (!enabled || queuedIndex === null || !context || context.state !== "running") return;
      var index = queuedIndex;
      queuedIndex = null;
      playNow(index);
    }

    function resumeContext() {
      if (!enabled) return;
      var audio = getContext();
      if (!audio || audio.state === "closed") return;
      if (audio.state === "running") {
        flushQueued();
        return;
      }
      try {
        var resumed = audio.resume();
        if (resumed && typeof resumed.then === "function") {
          resumed.then(flushQueued).catch(function () {});
        }
      } catch (error) {
        /* The next user gesture will retry the browser's audio unlock. */
      }
    }

    function play(index) {
      if (!enabled) return;
      var audio = getContext();
      if (!audio) return;
      if (audio.state !== "running") {
        queuedIndex = index;
        resumeContext();
        return;
      }
      playNow(index);
    }

    function unlockFromGesture() {
      if (enabled) resumeContext();
    }

    button.addEventListener("click", function () {
      enabled = !enabled;
      syncButton();
      savePreference();
      if (enabled) resumeContext();
      else stopVoices();
    });
    document.addEventListener("pointerdown", unlockFromGesture, true);
    document.addEventListener("keydown", unlockFromGesture, true);
    window.addEventListener("pagehide", stopVoices);

    return { play: play };
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
