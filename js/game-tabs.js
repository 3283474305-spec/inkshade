/* ============================================================
   Play page: switch between Nailong memory and Save Dou Nai
   ============================================================ */
(function () {
  "use strict";

  const tabs = Array.from(document.querySelectorAll("[data-game-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-game-panel]"));
  if (!tabs.length || !panels.length) return;

  function select(name) {
    tabs.forEach((tab) => {
      const active = tab.dataset.gameTab === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    panels.forEach((panel) => {
      const active = panel.dataset.gamePanel === name;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
    });

    if (name === "maze") {
      document.dispatchEvent(new CustomEvent("game:tab", { detail: "maze" }));
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => select(tab.dataset.gameTab));
  });

  // Start on Nailong memory; the maze is generated lazily but kept ready.
  select("memory");
})();
