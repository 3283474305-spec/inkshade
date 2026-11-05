/* ============================================================
   Tools: Pomodoro timer + local to-do list
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Pomodoro ---------- */
  const pomoTime = document.getElementById("pomoTime");
  if (pomoTime) {
    const startBtn = document.getElementById("pomoStart");
    const resetBtn = document.getElementById("pomoReset");
    const stateEl = document.getElementById("pomoState");
    const caption = document.getElementById("pomoCaption");
    const countEl = document.getElementById("pomoCount");
    const ring = document.getElementById("pomoRing");
    const modeButtons = Array.from(document.querySelectorAll("[data-pomo-mode]"));

    const DURATIONS = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
    const LABELS = { focus: "Focus", short: "Short break", long: "Long break" };
    const CAPTIONS = {
      focus: "Ready to focus",
      short: "Time for a short break",
      long: "Step away for a while",
    };
    const CIRC = 2 * Math.PI * 104;

    let mode = "focus";
    let total = DURATIONS[mode];
    let remaining = total;
    let running = false;
    let timer = 0;
    let sessions = 0;

    try {
      sessions = Number(localStorage.getItem("tools-pomodoro-count")) || 0;
    } catch (e) {
      /* ignore */
    }

    if (ring) {
      ring.style.strokeDasharray = String(CIRC);
      ring.style.strokeDashoffset = "0";
    }

    function fmt(seconds) {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${String(s).padStart(2, "0")}`;
    }

    function paint() {
      pomoTime.textContent = fmt(remaining);
      stateEl.textContent = LABELS[mode];
      const progress = total > 0 ? remaining / total : 0;
      if (ring) ring.style.strokeDashoffset = String(CIRC * (1 - progress));
      countEl.textContent = `${sessions} focus session${sessions === 1 ? "" : "s"} completed`;
      startBtn.textContent = running ? "Pause" : "Start";
    }

    function stop() {
      running = false;
      clearInterval(timer);
      timer = 0;
      paint();
    }

    function chime() {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.85);
      } catch (e) {
        /* audio is optional */
      }
    }

    function complete() {
      stop();
      if (mode === "focus") {
        sessions += 1;
        try {
          localStorage.setItem("tools-pomodoro-count", String(sessions));
        } catch (e) {
          /* ignore */
        }
        caption.textContent = "Session complete — take a break";
      } else {
        caption.textContent = "Break over — ready for another round";
      }
      chime();
      paint();
    }

    function setMode(next) {
      mode = next;
      total = DURATIONS[mode];
      remaining = total;
      caption.textContent = CAPTIONS[mode];
      modeButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.pomoMode === mode);
      });
      stop();
    }

    function tick() {
      remaining -= 1;
      if (remaining <= 0) {
        remaining = 0;
        complete();
        return;
      }
      paint();
    }

    startBtn.addEventListener("click", () => {
      if (running) {
        stop();
        caption.textContent = "Paused";
        return;
      }
      if (remaining <= 0) remaining = total;
      running = true;
      caption.textContent = mode === "focus" ? "Stay with one thing" : "Enjoy the pause";
      paint();
      timer = setInterval(tick, 1000);
    });

    resetBtn.addEventListener("click", () => {
      remaining = total;
      caption.textContent = CAPTIONS[mode];
      stop();
    });

    modeButtons.forEach((button) => {
      button.addEventListener("click", () => setMode(button.dataset.pomoMode));
    });

    paint();
  }

  /* ---------- To-do ---------- */
  const todoList = document.getElementById("todoList");
  if (todoList) {
    const form = document.getElementById("todoForm");
    const input = document.getElementById("todoInput");
    const empty = document.getElementById("todoEmpty");
    const countEl = document.getElementById("todoCount");
    const summary = document.getElementById("todoSummary");
    const clearBtn = document.getElementById("todoClear");
    const filterButtons = Array.from(document.querySelectorAll("[data-todo-filter]"));

    const KEY = "tools-todos-v1";
    let todos = [];
    let filter = "all";

    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(raw)) todos = raw.filter((item) => item && typeof item.text === "string");
    } catch (e) {
      /* ignore */
    }

    function save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(todos));
      } catch (e) {
        /* ignore */
      }
    }

    function render() {
      const visible = todos.filter((todo) => {
        if (filter === "active") return !todo.done;
        if (filter === "done") return todo.done;
        return true;
      });

      todoList.innerHTML = "";
      visible.forEach((todo) => {
        const li = document.createElement("li");
        li.className = `todo-item${todo.done ? " done" : ""}`;
        li.dataset.id = todo.id;

        const check = document.createElement("button");
        check.type = "button";
        check.className = "todo-check";
        check.setAttribute("aria-label", todo.done ? "Mark as not done" : "Mark as done");
        check.setAttribute("aria-pressed", todo.done ? "true" : "false");
        check.textContent = todo.done ? "✓" : "";

        const text = document.createElement("span");
        text.className = "todo-text";
        text.textContent = todo.text;

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "todo-delete";
        remove.setAttribute("aria-label", "Delete task");
        remove.textContent = "✕";

        li.append(check, text, remove);
        todoList.appendChild(li);
      });

      const active = todos.filter((todo) => !todo.done).length;
      const done = todos.length - active;
      countEl.textContent = String(active);
      summary.textContent = `${todos.length} task${todos.length === 1 ? "" : "s"} · ${done} done`;
      empty.hidden = visible.length > 0;
      empty.textContent =
        filter === "done"
          ? "No completed tasks yet."
          : filter === "active"
          ? "Everything is done. Nice."
          : "Nothing here yet. Add your first task above.";
      clearBtn.disabled = done === 0;
      clearBtn.style.opacity = done === 0 ? "0.35" : "";
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      todos.unshift({ id: String(Date.now()) + Math.random().toString(16).slice(2), text, done: false });
      input.value = "";
      save();
      render();
      input.focus();
    });

    todoList.addEventListener("click", (event) => {
      const item = event.target.closest(".todo-item");
      if (!item) return;
      const todo = todos.find((entry) => entry.id === item.dataset.id);
      if (!todo) return;
      if (event.target.closest(".todo-check")) {
        todo.done = !todo.done;
        save();
        render();
      } else if (event.target.closest(".todo-delete")) {
        todos = todos.filter((entry) => entry.id !== todo.id);
        save();
        render();
      }
    });

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        filter = button.dataset.todoFilter;
        filterButtons.forEach((b) => b.classList.toggle("active", b === button));
        render();
      });
    });

    clearBtn.addEventListener("click", () => {
      todos = todos.filter((todo) => !todo.done);
      save();
      render();
    });

    render();
  }
})();
