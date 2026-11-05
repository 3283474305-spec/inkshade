/* ============================================================
   Liquid glass interactions
   The refraction core is adapted from Mineradio's SVG control glass:
   a per-element displacement map, a real backdrop-filter, plus
   pointer sheen / press / click feedback on the glass controls.
   ============================================================ */
(function () {
  "use strict";

  if (window.__liquidGlassReady) return;
  window.__liquidGlassReady = true;

  const NS = "http://www.w3.org/2000/svg";
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const root = document.documentElement;

  const SURFACES = [
    ".bar",
    ".music-search",
    ".track-drawer",
    ".mini",
    ".login-box",
    ".work-card",
    ".contact-card",
    ".contact-item",
    ".form-card",
    ".gallery-card",
    ".game-card",
    ".game-promo",
    ".mp-card",
  ];

  // SVG backdrop refraction is expensive. Keep it on the five main glass
  // surfaces; cards and secondary panels still get the blur + rim + sheen.
  const FILTERED = new Set([
    ".bar",
    ".music-search",
    ".track-drawer",
    ".mini",
    ".login-box",
  ]);

  const BUTTONS = [
    ".btn",
    ".ctrl",
    ".mini-btn",
    ".mini-close",
    ".nav-cta",
    ".ne-library-refresh",
    ".ne-login",
    ".ne-logout",
    ".ne-viewtoggle button",
    ".music-search button",
    ".login-close",
    ".bar-btn",
    ".copy-btn",
    ".icon-btn",
  ];

  let uid = 0;
  let defs = null;
  const surfaces = [];

  const supportsBackdropUrl = (() => {
    try {
      const probe = document.createElement("div");
      probe.style.backdropFilter = "url(#liquid-glass-probe)";
      return String(probe.style.backdropFilter).includes("url");
    } catch (e) {
      return false;
    }
  })();

  if (supportsBackdropUrl) root.classList.add("lg-svg-ok");

  function ensureDefs() {
    if (defs) return defs;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("id", "liquid-glass-defs");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute(
      "style",
      "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none"
    );
    const defsEl = document.createElementNS(NS, "defs");
    svg.appendChild(defsEl);
    (document.body || document.documentElement).appendChild(svg);
    defs = defsEl;
    return defs;
  }

  function makeMap(width, height, radius, mapId) {
    const w = Math.max(2, Math.round(width));
    const h = Math.max(2, Math.round(height));
    const r = Math.max(0, Math.min(Math.round(radius), Math.min(w, h) / 2));
    const edge = Math.max(5, Math.min(w, h) * 0.12);
    const innerW = Math.max(1, w - edge * 2);
    const innerH = Math.max(1, h - edge * 2);
    const blur = Math.max(4, Math.min(14, edge));
    const red = `lg-red-${mapId}`;
    const blue = `lg-blue-${mapId}`;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">` +
      `<defs>` +
      `<linearGradient id="${red}" x1="100%" y1="0%" x2="0%" y2="0%">` +
      `<stop offset="0%" stop-color="#000" stop-opacity="0"/>` +
      `<stop offset="100%" stop-color="red"/>` +
      `</linearGradient>` +
      `<linearGradient id="${blue}" x1="0%" y1="0%" x2="0%" y2="100%">` +
      `<stop offset="0%" stop-color="#000" stop-opacity="0"/>` +
      `<stop offset="100%" stop-color="blue"/>` +
      `</linearGradient>` +
      `</defs>` +
      `<rect x="0" y="0" width="${w}" height="${h}" fill="black"/>` +
      `<rect x="0" y="0" width="${w}" height="${h}" rx="${r}" fill="url(#${red})"/>` +
      `<rect x="0" y="0" width="${w}" height="${h}" rx="${r}" fill="url(#${blue})" style="mix-blend-mode:difference"/>` +
      `<rect x="${edge.toFixed(2)}" y="${edge.toFixed(2)}" width="${innerW.toFixed(
        2
      )}" height="${innerH.toFixed(2)}" rx="${r}" fill="#808080" style="filter:blur(${blur}px)"/>` +
      `</svg>`;
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  function makeFilter() {
    const id = `lg-filter-${++uid}`;
    const filter = document.createElementNS(NS, "filter");
    filter.setAttribute("id", id);
    filter.setAttribute("color-interpolation-filters", "sRGB");
    filter.setAttribute("x", "-16%");
    filter.setAttribute("y", "-22%");
    filter.setAttribute("width", "132%");
    filter.setAttribute("height", "144%");

    const image = document.createElementNS(NS, "feImage");
    image.setAttribute("x", "0");
    image.setAttribute("y", "0");
    image.setAttribute("width", "100%");
    image.setAttribute("height", "100%");
    image.setAttribute("preserveAspectRatio", "none");
    image.setAttribute("result", "map");

    const displace = document.createElementNS(NS, "feDisplacementMap");
    displace.setAttribute("in", "SourceGraphic");
    displace.setAttribute("in2", "map");
    displace.setAttribute("xChannelSelector", "R");
    displace.setAttribute("yChannelSelector", "B");
    displace.setAttribute("scale", "18");
    displace.setAttribute("result", "refracted");

    const merge = document.createElementNS(NS, "feMerge");
    merge.setAttribute("result", "merged");
    const base = document.createElementNS(NS, "feMergeNode");
    base.setAttribute("in", "SourceGraphic");
    const shifted = document.createElementNS(NS, "feMergeNode");
    shifted.setAttribute("in", "refracted");
    merge.append(base, shifted);

    const blur = document.createElementNS(NS, "feGaussianBlur");
    blur.setAttribute("in", "merged");
    blur.setAttribute("stdDeviation", "0.35");

    filter.append(image, displace, merge, blur);
    ensureDefs().appendChild(filter);
    return { id, image, displace };
  }

  function updateSurface(entry) {
    const { el, filter } = entry;
    if (!el.isConnected) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return;
    const style = getComputedStyle(el);
    const radius = parseFloat(style.borderRadius) || 20;
    const effRadius = Math.min(radius, Math.min(rect.width, rect.height) / 2);
    const key = `${Math.round(rect.width)}x${Math.round(rect.height)}:${Math.round(effRadius)}`;
    if (key === entry.key) return;
    entry.key = key;

    const mapId = `${uid}-${filter.id}`;
    const href = makeMap(rect.width, rect.height, effRadius, mapId);
    filter.image.setAttribute("href", href);
    try {
      filter.image.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
    } catch (e) {
      /* xlink is only for very old browsers */
    }

    const scale = Math.max(7, Math.min(22, Math.min(rect.width, rect.height) * 0.18));
    filter.displace.setAttribute("scale", scale.toFixed(1));

    if (supportsBackdropUrl) {
      const value = `url(#${filter.id}) blur(0.3px) saturate(1.38) brightness(1.07)`;
      el.style.setProperty("backdrop-filter", value);
      el.style.setProperty("-webkit-backdrop-filter", value);
    }
  }

  function scheduleUpdate(entry) {
    if (entry.frame) return;
    entry.frame = requestAnimationFrame(() => {
      entry.frame = 0;
      updateSurface(entry);
    });
  }

  function bindSheen(el) {
    el.addEventListener(
      "pointermove",
      (event) => {
        const rect = el.getBoundingClientRect();
       el.style.setProperty("--lg-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
        el.style.setProperty("--lg-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
      },
      { passive: true }
    );
    el.addEventListener(
      "pointerleave",
      () => {
        el.style.setProperty("--lg-x", "50%");
        el.style.setProperty("--lg-y", "0%");
      },
      { passive: true }
    );
  }

  function enhanceSurface(el, selector) {
    if (!el || el.dataset.lgSurface === "1") return;
    el.dataset.lgSurface = "1";
    el.classList.add("lg-surface");

    if (!el.querySelector(":scope > .lg-rim")) {
      const rim = document.createElement("span");
      rim.className = "lg-rim";
      rim.setAttribute("aria-hidden", "true");
      el.appendChild(rim);
    }

    bindSheen(el);

    if (!supportsBackdropUrl || !FILTERED.has(selector)) return;

    const filter = makeFilter();
    const entry = { el, filter, key: "", frame: 0 };
    surfaces.push(entry);

    const observer = new ResizeObserver(() => scheduleUpdate(entry));
    observer.observe(el);
    entry.observer = observer;
    scheduleUpdate(entry);
  }

  function addRipple(btn, event) {
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "lg-ripple";
    const x = event.clientX ? event.clientX - rect.left : rect.width / 2;
    const y = event.clientY ? event.clientY - rect.top : rect.height / 2;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    btn.appendChild(ripple);

    const size = Math.max(rect.width, rect.height) * 2.4;
    const animation = ripple.animate(
      [
        { width: "12px", height: "12px", marginLeft: "-6px", marginTop: "-6px", opacity: 0.5 },
        {
          width: `${size}px`,
          height: `${size}px`,
          marginLeft: `${-size / 2}px`,
          marginTop: `${-size / 2}px`,
          opacity: 0,
        },
      ],
      { duration: 620, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
    );
    animation.onfinish = () => ripple.remove();
    animation.oncancel = () => ripple.remove();
  }

  function pulse(btn, isPlay) {
    const color = isPlay ? "rgba(232, 112, 42, 0.32)" : "rgba(255, 255, 255, 0.22)";
    btn.animate(
      [
        { boxShadow: `0 0 0 0 ${color}` },
        { boxShadow: `0 0 0 ${isPlay ? 18 : 10}px rgba(232, 112, 42, 0)` },
      ],
      { duration: isPlay ? 560 : 420, easing: "ease-out" }
    );
  }

  function enhanceButton(el) {
    if (!el || el.dataset.lgButton === "1") return;
    el.dataset.lgButton = "1";
    el.classList.add("lg-button");
    bindSheen(el);

    el.addEventListener("click", (event) => {
      if (reduced || el.disabled) return;
      const isPlay = el.classList.contains("play") || el.getAttribute("aria-label") === "鎾斁";
      addRipple(el, event);
      pulse(el, isPlay);
    });
  }

  function boot() {
    SURFACES.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => enhanceSurface(el, selector));
    });
    BUTTONS.forEach((selector) => {
      document.querySelectorAll(selector).forEach(enhanceButton);
    });

    // Search focus gets the Mineradio-style lift and accent rim.
    document.querySelectorAll(".music-search").forEach((search) => {
      const input = search.querySelector("input");
      if (!input) return;
      const setFocus = (on) => search.classList.toggle("lg-focused", on);
      input.addEventListener("focus", () => setFocus(true));
      input.addEventListener("blur", () => setFocus(false));
    });

    // Keep newly rendered controls glassy as the SPA changes views.
    document.addEventListener("routechange", () => {
      setTimeout(() => {
        SURFACES.forEach((selector) => {
          document.querySelectorAll(selector).forEach((el) => enhanceSurface(el, selector));
        });
        BUTTONS.forEach((selector) => {
          document.querySelectorAll(selector).forEach(enhanceButton);
        });
      }, 60);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

