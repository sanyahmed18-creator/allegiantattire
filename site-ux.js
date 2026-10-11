/* Allegiant Attire — navigation, responsive UX and form feedback.
   This is a static site: quote/order/newsletter forms prepare WhatsApp or
   email drafts; visitors must send them to submit a request. */
(function () {
  "use strict";

  var FOOTER_LINKS = {
    "t-shirts": "/custom-t-shirts-dubai/",
    "polo shirts": "/custom-polo-shirts-dubai/",
    "hoodies & sweats": "/custom-hoodies-dubai/",
    "caps": "/custom-caps-dubai/",
    "activewear": "/activewear-manufacturer-uae/",
    "uniforms": "/school-uniforms-uae/",
    "dtf printing": "/dtf-printing-dubai/",
    "screen printing": "/screen-printing-dubai/",
    "sublimation": "/activewear-manufacturer-uae/",
    "embroidery": "/embroidery-services-dubai/",
    "vinyl": "/vinyl-printing-dubai/",
    "labelling": "/private-label-clothing-uae/",
    "about us": "/about-us/",
    "blogs": "/blog/",
    "contact us": "/contact/",
    "order support": "/contact/",
    "privacy": "/privacy/",
    "terms": "/terms/"
  };
  // If an older cached bundle is still served, do not invent a customer account.
  var HIDDEN_FOOTER_LINKS = { "my account": true };
  var HIDDEN_PRIMARY_LINKS = { "men": true, "women": true, "kids": true };
  var QUOTE_FORM_LOC = "src/App.tsx:807:10";
  var ORDER_FORM_LOC = "src/App.tsx:1021:12";
  var NEWSLETTER_FORM_LOC = "src/App.tsx:833:10";
  var CONTACT_EMAIL = "info@allegiantattire.store";
  var CONTACT_PHONE = "+971582045242";
  var MENU_WAS_OPEN = false;
  var observer = null;
  var queued = false;

  function normalizeLabel(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function setCurrentYear() {
    var year = String(new Date().getFullYear());
    var staticYears = document.querySelectorAll("[data-aa-year]");
    for (var i = 0; i < staticYears.length; i++) {
      if (staticYears[i].textContent !== year) staticYears[i].textContent = year;
    }

    var appCopyright = document.querySelector('[data-source-loc="src/App.tsx:877:12"]');
    if (appCopyright) {
      var copy = "© " + year + " ALLEGIANT ATTIRE — ALL RIGHTS RESERVED.";
      if (appCopyright.textContent !== copy) appCopyright.textContent = copy;
    }
  }

  function setHomeLogoLink() {
    var logoLink = document.querySelector('a[data-source-loc="src/App.tsx:154:12"]');
    if (!logoLink) return;
    if (logoLink.getAttribute("href") !== "/") logoLink.setAttribute("href", "/");
    if (logoLink.getAttribute("aria-label") !== "Allegiant Attire home") {
      logoLink.setAttribute("aria-label", "Allegiant Attire home");
    }
  }

  function hideUnsupportedPrimaryLinks() {
    var navs = document.querySelectorAll(
      'nav[data-source-loc="src/App.tsx:161:12"], nav[data-source-loc="src/App.tsx:898:14"]'
    );
    for (var n = 0; n < navs.length; n++) {
      var anchors = navs[n].querySelectorAll("a");
      for (var i = 0; i < anchors.length; i++) {
        // Mobile drawer links include a small numeric index in a child span.
        var label = normalizeLabel(anchors[i].textContent).replace(/[0-9]+/g, "").trim();
        if (!HIDDEN_PRIMARY_LINKS[label]) continue;
        anchors[i].hidden = true;
        anchors[i].classList.add("aa-ux-hidden-nav");
        anchors[i].setAttribute("aria-hidden", "true");
        anchors[i].setAttribute("tabindex", "-1");
      }
    }
  }

  function repairFooterLinks() {
    var groups = document.querySelectorAll('[data-source-loc="src/App.tsx:866:14"]');
    for (var g = 0; g < groups.length; g++) {
      var heading = groups[g].querySelector('[data-source-loc="src/App.tsx:867:16"]');
      var list = groups[g].querySelector("ul");
      if (!list) continue;
      if (heading) list.setAttribute("aria-label", heading.textContent.trim() + " links");
      var items = list.children;
      for (var i = 0; i < items.length; i++) {
        var anchor = items[i].querySelector("a");
        if (!anchor) continue;
        var label = normalizeLabel(anchor.textContent);
        if (Object.prototype.hasOwnProperty.call(FOOTER_LINKS, label)) {
          var href = FOOTER_LINKS[label];
          if (anchor.getAttribute("href") !== href) anchor.setAttribute("href", href);
          anchor.removeAttribute("aria-hidden");
          anchor.removeAttribute("tabindex");
          items[i].hidden = false;
          items[i].classList.remove("aa-ux-hidden-nav");
        } else if (HIDDEN_FOOTER_LINKS[label]) {
          // Keep React's DOM tree intact while hiding links to pages/features
          // that do not exist in this static site.
          items[i].hidden = true;
          items[i].classList.add("aa-ux-hidden-nav");
          anchor.setAttribute("aria-hidden", "true");
          anchor.setAttribute("tabindex", "-1");
        }
      }
    }
  }

  function getMobileMenu() {
    var trigger = document.querySelector('button[data-source-loc="src/App.tsx:187:14"]');
    var nav = document.querySelector('nav[data-source-loc="src/App.tsx:898:14"]');
    return { trigger: trigger, nav: nav, open: !!nav };
  }

  function updateMobileMenu() {
    var menu = getMobileMenu();
    if (menu.trigger) {
      menu.trigger.setAttribute("aria-controls", "aa-mobile-navigation");
      menu.trigger.setAttribute("aria-expanded", menu.open ? "true" : "false");
      menu.trigger.setAttribute("aria-label", menu.open ? "Close navigation menu" : "Open navigation menu");
    }

    if (menu.nav) {
      if (menu.nav.id !== "aa-mobile-navigation") menu.nav.id = "aa-mobile-navigation";
      menu.nav.setAttribute("aria-label", "Mobile site navigation");
      var panel = menu.nav.closest('[data-source-loc="src/App.tsx:893:12"]');
      if (panel) {
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-modal", "true");
        panel.setAttribute("aria-label", "Site navigation");
      }
      var close = panel && panel.querySelector('button[data-source-loc="src/App.tsx:896:16"]');
      if (close) close.setAttribute("aria-label", "Close navigation menu");
    }

    if (document.body) {
      document.body.classList.toggle("aa-mobile-menu-open", menu.open && window.innerWidth < 1024);
    }

    if (menu.open && !MENU_WAS_OPEN && menu.nav) {
      window.requestAnimationFrame(function () {
        var first = menu.nav.querySelector("a[href]:not([hidden])");
        if (first) {
          try { first.focus({ preventScroll: true }); }
          catch (e) { first.focus(); }
        }
      });
    } else if (!menu.open && MENU_WAS_OPEN && menu.trigger) {
      try { menu.trigger.focus({ preventScroll: true }); }
      catch (e) { menu.trigger.focus(); }
    }
    MENU_WAS_OPEN = menu.open;
  }

  function handleMenuKeys(event) {
    var menu = getMobileMenu();
    if (!menu.open || !menu.nav) return;
    if (event.key === "Escape") {
      var panel = menu.nav.closest('[data-source-loc="src/App.tsx:893:12"]');
      var close = panel && panel.querySelector('button[data-source-loc="src/App.tsx:896:16"]');
      if (close) {
        event.preventDefault();
        close.click();
      }
      return;
    }
    if (event.key !== "Tab") return;
    var panelRoot = menu.nav.closest('[data-source-loc="src/App.tsx:893:12"]') || menu.nav;
    var focusable = panelRoot.querySelectorAll('a[href]:not([hidden]), button:not([disabled]):not([hidden]), [tabindex="0"]');
    var visible = [];
    for (var i = 0; i < focusable.length; i++) {
      if (focusable[i].getClientRects().length) visible.push(focusable[i]);
    }
    if (!visible.length) return;
    var first = visible[0];
    var last = visible[visible.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function configureForm(form, kind) {
    if (form.dataset.aaUxPrepared === "1") return;
    form.dataset.aaUxPrepared = "1";
    var fields = form.querySelectorAll("input, select, textarea");
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      var hint = field.getAttribute("placeholder") || "";
      if (!field.hasAttribute("aria-label") && hint) {
        field.setAttribute("aria-label", hint.replace(/\s*\*/g, "").trim());
      }
      if (kind === "quote") {
        if (field.getAttribute("data-source-loc") === "src/App.tsx:808:12") {
          field.name = "name";
          field.autocomplete = "name";
        } else if (field.getAttribute("data-source-loc") === "src/App.tsx:809:12") {
          field.name = "phone";
          field.type = "tel";
          field.inputMode = "tel";
          field.autocomplete = "tel";
        } else if (field.getAttribute("data-source-loc") === "src/App.tsx:810:12") {
          field.name = "company";
          field.autocomplete = "organization";
        } else if (field.getAttribute("data-source-loc") === "src/App.tsx:811:12") {
          field.name = "garment";
          if (!field.hasAttribute("aria-label")) field.setAttribute("aria-label", "Garment type");
        } else if (field.getAttribute("data-source-loc") === "src/App.tsx:814:12") {
          field.name = "quantity";
          field.inputMode = "numeric";
        } else if (field.getAttribute("data-source-loc") === "src/App.tsx:815:12") {
          field.name = "details";
        }
      } else if (kind === "checkout") {
        var orderLoc = field.getAttribute("data-source-loc");
        if (orderLoc === "src/App.tsx:1022:14") {
          field.name = "name";
          field.autocomplete = "name";
        } else if (orderLoc === "src/App.tsx:1023:14") {
          field.name = "phone";
          field.type = "tel";
          field.inputMode = "tel";
          field.autocomplete = "tel";
        } else if (orderLoc === "src/App.tsx:1024:14") {
          field.name = "emirate";
          field.autocomplete = "address-level1";
        } else if (orderLoc === "src/App.tsx:1025:14") {
          field.name = "address";
          field.autocomplete = "street-address";
        } else if (orderLoc === "src/App.tsx:1027:232") {
          field.name = "payment";
          var paymentLabel = field.closest("label");
          field.value = paymentLabel ? paymentLabel.textContent.trim() : "Not selected";
        }
      } else if (kind === "newsletter") {
        field.name = "email";
        field.autocomplete = "email";
        if (!field.hasAttribute("aria-label")) field.setAttribute("aria-label", "Work email address");
      }
    }
  }

  var feedbackBox = null;
  function getFeedbackBox() {
    if (feedbackBox && feedbackBox.isConnected) return feedbackBox;
    feedbackBox = document.getElementById("aa-form-feedback");
    if (feedbackBox) return feedbackBox;
    feedbackBox = document.createElement("div");
    feedbackBox.id = "aa-form-feedback";
    feedbackBox.className = "aa-form-feedback";
    feedbackBox.hidden = true;
    feedbackBox.setAttribute("aria-live", "polite");
    document.body.appendChild(feedbackBox);
    return feedbackBox;
  }

  function showFeedback(form, kind, message, actionHref, actionText) {
    var box = getFeedbackBox();
    while (box.firstChild) box.removeChild(box.firstChild);
    box.className = "aa-form-feedback aa-form-feedback--" + kind;
    box.setAttribute("role", kind === "error" ? "alert" : "status");
    box.setAttribute("aria-live", kind === "error" ? "assertive" : "polite");
    box.setAttribute("data-aa-form-source", form.getAttribute("data-source-loc") || "form");
    box.hidden = false;

    var text = document.createElement("p");
    text.className = "aa-form-feedback__text";
    text.textContent = message;
    box.appendChild(text);

    if (actionHref) {
      var action = document.createElement("a");
      action.className = "aa-form-feedback__action";
      action.href = actionHref;
      action.textContent = actionText;
      if (/^https:\/\//i.test(actionHref)) {
        action.target = "_blank";
        action.rel = "noopener noreferrer";
      }
      box.appendChild(action);
    }

    var close = document.createElement("button");
    close.type = "button";
    close.className = "aa-form-feedback__close";
    close.setAttribute("aria-label", "Dismiss message");
    close.textContent = "×";
    close.addEventListener("click", function () { box.hidden = true; });
    box.appendChild(close);
  }

  function formKind(form) {
    var loc = form && form.getAttribute("data-source-loc");
    if (loc === QUOTE_FORM_LOC) return "quote";
    if (loc === ORDER_FORM_LOC) return "checkout";
    if (loc === NEWSLETTER_FORM_LOC) return "newsletter";
    return "";
  }

  function fieldByLoc(form, loc) {
    return form.querySelector('[data-source-loc="' + loc + '"]');
  }

  function quoteMessage(form) {
    var name = fieldByLoc(form, "src/App.tsx:808:12");
    var phone = fieldByLoc(form, "src/App.tsx:809:12");
    var company = fieldByLoc(form, "src/App.tsx:810:12");
    var garment = fieldByLoc(form, "src/App.tsx:811:12");
    var quantity = fieldByLoc(form, "src/App.tsx:814:12");
    var details = fieldByLoc(form, "src/App.tsx:815:12");
    var lines = [
      "Hello Allegiant Attire, I would like a quote.",
      "Name: " + (name ? name.value.trim() : ""),
      "Phone / WhatsApp: " + (phone ? phone.value.trim() : ""),
      "Company: " + (company && company.value.trim() ? company.value.trim() : "Not provided"),
      "Garment: " + (garment ? garment.value : "Not selected"),
      "Estimated quantity: " + (quantity && quantity.value ? quantity.value + " pcs" : "Not provided"),
      "Details: " + (details ? details.value.trim() : ""),
      "Please confirm the price and lead time."
    ];
    return lines.join("\n");
  }

  function checkoutMessage(form) {
    var name = fieldByLoc(form, "src/App.tsx:1022:14");
    var phone = fieldByLoc(form, "src/App.tsx:1023:14");
    var emirate = fieldByLoc(form, "src/App.tsx:1024:14");
    var address = fieldByLoc(form, "src/App.tsx:1025:14");
    var payment = form.querySelector('input[name="payment"]:checked');
    var summary = form.parentElement && form.parentElement.querySelector('[data-source-loc="src/App.tsx:1017:12"]');
    var orderLines = summary ? (summary.innerText || summary.textContent || "").trim().slice(0, 1000) : "Items currently in the website bag";
    return [
      "Hello Allegiant Attire, please confirm this order request.",
      "Items / estimate:\n" + orderLines,
      "Name: " + (name ? name.value.trim() : ""),
      "Phone / WhatsApp: " + (phone ? phone.value.trim() : ""),
      "Emirate: " + (emirate ? emirate.value.trim() : ""),
      "Delivery address: " + (address ? address.value.trim() : ""),
      "Preferred payment method: " + (payment ? payment.value : "Not selected"),
      "Please confirm stock, final price and delivery. This message is not sent until I press Send in WhatsApp."
    ].join("\n");
  }

  function submitQuote(event, form) {
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    if (!form.reportValidity()) return;
    var invalidFields = form.querySelectorAll("[aria-invalid='true']");
    for (var i = 0; i < invalidFields.length; i++) invalidFields[i].removeAttribute("aria-invalid");
    var url = "https://wa.me/" + CONTACT_PHONE + "?text=" + encodeURIComponent(quoteMessage(form));
    showFeedback(
      form,
      "success",
      "Your quote draft is ready. Open WhatsApp and press Send to submit your request.",
      url,
      "Open WhatsApp draft"
    );
  }

  function submitCheckout(event, form) {
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    if (!form.reportValidity()) return;
    var url = "https://wa.me/" + CONTACT_PHONE + "?text=" + encodeURIComponent(checkoutMessage(form));
    showFeedback(
      form,
      "success",
      "Your order request draft is ready. Nothing has been ordered yet; open WhatsApp and press Send to submit it.",
      url,
      "Open WhatsApp order draft"
    );
  }

  function submitNewsletter(event, form) {
    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    if (!form.reportValidity()) return;
    var email = form.querySelector('input[type="email"]');
    if (!email) return;
    var subject = encodeURIComponent("Wholesale price list request");
    var body = encodeURIComponent("Please send me the Allegiant Attire wholesale price list.\n\nWork email: " + email.value.trim());
    var url = "mailto:" + CONTACT_EMAIL + "?subject=" + subject + "&body=" + body;
    showFeedback(
      form,
      "success",
      "Your price-list request is ready. Send the email draft to complete your subscription.",
      url,
      "Open email draft"
    );
  }

  function handleInvalid(event) {
    var form = event.target && event.target.form;
    var kind = formKind(form);
    if (!kind) return;
    event.target.setAttribute("aria-invalid", "true");
    showFeedback(
      form,
      "error",
      kind === "quote"
        ? "Please complete your name, phone number and order details before continuing."
        : kind === "checkout"
          ? "Please complete your name, phone, emirate and delivery address before continuing."
          : "Please enter a valid work email address before continuing."
    );
  }

  function handleSubmit(event) {
    var form = event.target;
    var kind = formKind(form);
    if (kind === "quote") submitQuote(event, form);
    else if (kind === "checkout") submitCheckout(event, form);
    else if (kind === "newsletter") submitNewsletter(event, form);
  }

  function clearCorrectedField(event) {
    var field = event.target;
    var form = field && field.form;
    if (!formKind(form)) return;
    if (field.checkValidity()) field.removeAttribute("aria-invalid");
    var box = document.getElementById("aa-form-feedback");
    if (box && !box.hidden && box.classList.contains("aa-form-feedback--error") &&
        box.getAttribute("data-aa-form-source") === form.getAttribute("data-source-loc") &&
        !form.querySelector(":invalid")) {
      box.hidden = true;
    }
  }

  function prepareForms() {
    var quote = document.querySelector('form[data-source-loc="' + QUOTE_FORM_LOC + '"]');
    var checkout = document.querySelector('form[data-source-loc="' + ORDER_FORM_LOC + '"]');
    var newsletter = document.querySelector('form[data-source-loc="' + NEWSLETTER_FORM_LOC + '"]');
    if (quote) configureForm(quote, "quote");
    if (checkout) configureForm(checkout, "checkout");
    if (newsletter) configureForm(newsletter, "newsletter");
  }

  function run() {
    setCurrentYear();
    setHomeLogoLink();
    hideUnsupportedPrimaryLinks();
    repairFooterLinks();
    updateMobileMenu();
    prepareForms();
  }

  function scheduleRun() {
    if (queued) return;
    queued = true;
    window.setTimeout(function () {
      queued = false;
      run();
    }, 80);
  }

  document.addEventListener("submit", handleSubmit, true);
  document.addEventListener("invalid", handleInvalid, true);
  document.addEventListener("input", clearCorrectedField, true);
  document.addEventListener("change", clearCorrectedField, true);
  document.addEventListener("keydown", handleMenuKeys, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }

  if (document.body && !document.querySelector('#root[data-aa-static="true"]')) {
    observer = new MutationObserver(scheduleRun);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", updateMobileMenu, { passive: true });
    window.addEventListener("load", run, { once: true });
  }
})();
