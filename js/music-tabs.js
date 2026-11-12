/* ============================================================
   Music: demo player / private NetEase iframe switch
   ============================================================ */
(function () {
  "use strict";

  const tabs = Array.from(document.querySelectorAll("[data-music-tab]"));
  const panel = document.getElementById("privateEmbed");
  const frame = document.getElementById("privateFrame");
  const exitBtn = document.getElementById("privateExit");
  if (!tabs.length || !panel || !frame) return;

  function select(name) {
    const privateMode = name === "private";
    document.body.classList.toggle("music-private", privateMode);
    panel.hidden = !privateMode;
    if (exitBtn) exitBtn.hidden = !privateMode;

    tabs.forEach((tab) => {
      const active = tab.dataset.musicTab === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    if (privateMode) {
      const url = new URL(frame.dataset.src, location.href);
      url.searchParams.set("v", Date.now());
      frame.src = url.toString();
    } else if (frame.getAttribute("src")) {
      frame.src = "about:blank";
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => select(tab.dataset.musicTab));
  });

  exitBtn?.addEventListener("click", () => select("demo"));

  select("demo");
})();
