/* ============================================================
   Floating player layout interactions
   - right-edge hover drawer for the track list
   - closes on leave / Escape / route change
   ============================================================ */
(function () {
  "use strict";

  const drawer = document.getElementById("trackDrawer");
  const handle = document.getElementById("trackDrawerHandle");
  const hotzone = document.getElementById("trackDrawerHotzone");
  const closeBtn = document.getElementById("trackDrawerClose");
  if (!drawer || !handle) return;

  let closeTimer = 0;
  let pinned = false;

  const isOpen = () => drawer.classList.contains("open");

  function open() {
    clearTimeout(closeTimer);
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    handle.setAttribute("aria-expanded", "true");
    document.body.classList.add("drawer-open");
  }

  function close() {
    clearTimeout(closeTimer);
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    handle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("drawer-open");
  }

  function scheduleClose() {
    if (pinned) return;
    if (drawer.contains(document.activeElement)) return;
    clearTimeout(closeTimer);
    closeTimer = setTimeout(close, 460);
  }

  handle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (isOpen()) close();
    else open();
  });

  hotzone?.addEventListener("pointerenter", () => {
    if (window.matchMedia?.("(hover: hover)").matches) open();
  });

  hotzone?.addEventListener("pointerleave", () => {
    if (!pinned) scheduleClose();
  });

  drawer.addEventListener("pointerenter", () => {
    pinned = true;
    clearTimeout(closeTimer);
  });

  drawer.addEventListener("pointerleave", () => {
    pinned = false;
    scheduleClose();
  });

  drawer.addEventListener("focusin", () => {
    pinned = true;
    clearTimeout(closeTimer);
  });

  drawer.addEventListener("focusout", () => {
    pinned = false;
    setTimeout(() => {
      if (!drawer.contains(document.activeElement)) scheduleClose();
    }, 0);
  });

  closeBtn?.addEventListener("click", close);

  document.getElementById("carouselDockClose")?.addEventListener("click", () => {
    document.querySelector('#neViewToggle button[data-view="list"]')?.click();
    open();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) close();
  });

  document.addEventListener("routechange", (event) => {
    if (event.detail !== "music") close();
  });

  document.addEventListener("track-drawer:open", open);
  document.addEventListener("track-drawer:close", close);

  // Clicking outside closes the drawer, but a click inside the player search
  // or another control is allowed to proceed normally.
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!isOpen()) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (drawer.contains(target) || handle.contains(target) || hotzone?.contains(target)) return;
      close();
    },
    true
  );
})();
