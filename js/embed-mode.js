/* ============================================================
   Private player iframe mode: shell off, login drawer ready
   ============================================================ */
(function () {
  "use strict";

  const params = new URLSearchParams(location.search);
  if (params.get("embed") !== "1") return;

  document.documentElement.classList.add("embed-mode");

  if (location.hash !== "#music") {
    history.replaceState(null, "", location.pathname + "?embed=1#music");
  }

  window.setTimeout(() => {
    const neteaseTab = document.querySelector('.pl-tab[data-tab="netease"]');
    const drawer = document.getElementById("trackDrawer");
    if (neteaseTab) neteaseTab.click();
    if (drawer) drawer.classList.add("open");
    document.body.classList.add("drawer-open");
  }, 800);
})();
