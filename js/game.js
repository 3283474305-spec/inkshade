/* ============================================================
   奶龙翻翻乐 · 记忆配对
   - 图片来自 images/nailong（奶龙表情包首帧）
   - 三档难度、计时、步数、星级、本地最佳记录、音效
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const board = $("#gameBoard");
  if (!board) return;

  const IMAGES = Array.from(
    { length: 10 },
    (_, i) => "images/nailong/nailong-" + String(i + 1).padStart(2, "0") + ".jpg"
  );

  const DIFFS = {
    easy: { pairs: 6, cols: 4 },
    normal: { pairs: 8, cols: 4 },
    hard: { pairs: 10, cols: 5 },
  };

  const el = {
    moves: $("#gMoves"),
    time: $("#gTime"),
    best: $("#gBest"),
    hint: $("#gHint"),
    sound: $("#gSound"),
    restart: $("#gRestart"),
    diff: $("#gDiff"),
    overlay: $("#winOverlay"),
    stats: $("#winStats"),
    stars: $("#winStars"),
    emoji: $("#winEmoji"),
    again: $("#winAgain"),
    close: $("#winClose"),
    confetti: $("#winConfetti"),
  };

  const state = {
    diff: "normal",
    first: null,
    lock: false,
    moves: 0,
    matched: 0,
    running: false,
    startedAt: 0,
    accum: 0,
    timer: null,
    sound: localStorage.getItem("nailong-sound") !== "0",
  };

  const BEST_PREFIX = "nailong-best-";

  /* ---------- 工具 ---------- */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function fmt(sec) {
    const s = Math.max(0, Math.floor(sec));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function elapsedMs() {
    return state.accum + (state.running ? Date.now() - state.startedAt : 0);
  }

  function tick() {
    el.time.textContent = fmt(elapsedMs() / 1000);
  }

  function startTimer() {
    if (state.running) return;
    state.startedAt = Date.now();
    state.running = true;
    clearInterval(state.timer);
    state.timer = setInterval(tick, 250);
    tick();
  }

  function pauseTimer() {
    if (!state.running) return;
    state.accum += Date.now() - state.startedAt;
    state.running = false;
    clearInterval(state.timer);
    state.timer = null;
    tick();
  }

  function ensureTimer() {
    if (state.running) return;
    if (state.accum > 0) {
      state.startedAt = Date.now();
      state.running = true;
      state.timer = setInterval(tick, 250);
    } else {
      startTimer();
    }
  }

  /* ---------- 最佳记录 ---------- */
  function loadBest(diff) {
    try {
      return JSON.parse(localStorage.getItem(BEST_PREFIX + diff) || "null");
    } catch (e) {
      return null;
    }
  }

  function saveBest(diff, rec) {
    try {
      localStorage.setItem(BEST_PREFIX + diff, JSON.stringify(rec));
    } catch (e) {
      /* ignore */
    }
  }

  function updateBest() {
    const b = loadBest(state.diff);
    el.best.textContent = b ? fmt(b.time) : "--";
  }

  /* ---------- 音效 ---------- */
  let actx = null;

  function beep(freq, dur, type, gain, delay) {
    if (!state.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = actx || new AC();
      if (actx.state === "suspended") actx.resume();
      const t = actx.currentTime + (delay || 0);
      const osc = actx.createOscillator();
      const g = actx.createGain();
      osc.type = type || "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain || 0.05, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(actx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    } catch (e) {
      /* 静默失败 */
    }
  }

  function sound(kind) {
    if (kind === "flip") beep(520, 0.08, "triangle", 0.035);
    else if (kind === "match") {
      beep(660, 0.12, "sine", 0.05);
      beep(990, 0.16, "sine", 0.035, 0.06);
    } else if (kind === "miss") beep(170, 0.16, "sawtooth", 0.025);
    else if (kind === "win") {
      [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.22, "sine", 0.045, i * 0.1));
    }
  }

  function syncSoundUI() {
    el.sound.textContent = state.sound ? "🔊" : "🔇";
    el.sound.setAttribute("aria-pressed", String(state.sound));
    el.sound.setAttribute("aria-label", state.sound ? "Turn sound off" : "Turn sound on");
  }

  /* ---------- 发牌 ---------- */
  function build(diff) {
    state.diff = diff;
    const cfg = DIFFS[diff];

    const picks = shuffle(IMAGES.slice()).slice(0, cfg.pairs);
    const deck = shuffle(
      picks.flatMap((src, key) => [
        { key, src },
        { key, src },
      ])
    );

    state.first = null;
    state.lock = false;
    state.moves = 0;
    state.matched = 0;
    state.running = false;
    state.accum = 0;
    state.startedAt = 0;
    clearInterval(state.timer);
    state.timer = null;

    el.moves.textContent = "0";
    el.time.textContent = "0:00";
    el.hint.textContent = "Flip the first card to start the timer";
    el.overlay.hidden = true;
    updateBest();

    board.style.setProperty("--cols", String(cfg.cols));
    board.innerHTML = "";

    deck.forEach((card, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card";
      btn.dataset.i = String(i);
      btn.dataset.key = String(card.key);
      btn.setAttribute("aria-label", "Card " + (i + 1));

      const inner = document.createElement("span");
      inner.className = "card-inner";

      const back = document.createElement("span");
      back.className = "card-face card-back";
      back.innerHTML = '<span class="card-logo">NL</span>';

      const front = document.createElement("span");
      front.className = "card-face card-front";
      const img = document.createElement("img");
      img.src = card.src;
      img.alt = "Nailong sticker";
      img.decoding = "async";
      front.appendChild(img);

      inner.append(back, front);
      btn.appendChild(inner);
      btn.addEventListener("click", () => flip(btn));
      board.appendChild(btn);
    });
  }

  /* ---------- 翻牌 ---------- */
  function flip(card) {
    if (state.lock) return;
    if (card.classList.contains("flipped") || card.classList.contains("matched")) return;

    ensureTimer();
    card.classList.add("flipped");
    sound("flip");

    if (!state.first) {
      state.first = card;
      el.hint.textContent = "Flip another card and look for a match";
      return;
    }

    state.moves++;
    el.moves.textContent = String(state.moves);

    const a = state.first;
    const b = card;
    state.first = null;

    if (a.dataset.key === b.dataset.key) {
      a.classList.add("matched");
      b.classList.add("matched");
      a.setAttribute("aria-label", "Matched");
      b.setAttribute("aria-label", "Matched");
      state.matched++;
      sound("match");

      if (state.matched === DIFFS[state.diff].pairs) {
        win();
      } else {
        el.hint.textContent = "Match found — keep going";
      }
    } else {
      state.lock = true;
      el.hint.textContent = "Not a match — try to remember";
      sound("miss");
      setTimeout(() => {
        a.classList.remove("flipped");
        b.classList.remove("flipped");
        state.lock = false;
      }, 720);
    }
  }

  /* ---------- 胜利 ---------- */
  function win() {
    const ms = elapsedMs();
    pauseTimer();
    el.hint.textContent = "All pairs found!";

    const sec = Math.round(ms / 1000);
    const pairs = DIFFS[state.diff].pairs;
    const stars = state.moves <= pairs * 1.4 ? 3 : state.moves <= pairs * 2 ? 2 : 1;

    const best = loadBest(state.diff);
    if (!best || sec < best.time || (sec === best.time && state.moves < best.moves)) {
      saveBest(state.diff, { time: sec, moves: state.moves });
    }
    updateBest();

    el.stats.textContent =
      "Time " + fmt(sec) + " · " + state.moves + " moves · " + pairs + " pairs";
    el.stars.textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
    el.emoji.textContent = stars === 3 ? "🤩" : stars === 2 ? "😄" : "😅";
    el.overlay.hidden = false;

    sound("win");
    confetti();
    setTimeout(() => el.again.focus(), 80);
  }

  /* ---------- 彩带 ---------- */
  let confettiRaf = 0;

  function confetti() {
    const canvas = el.confetti;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = ["#6366f1", "#a855f7", "#22d3ee", "#f59e0b", "#ef4444", "#22c55e"];
    const parts = Array.from({ length: 90 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * 180,
      y: h / 2 - 20,
      vx: (Math.random() - 0.5) * 10,
      vy: -Math.random() * 12 - 3,
      w: 4 + Math.random() * 6,
      h: 6 + Math.random() * 8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
    }));

    cancelAnimationFrame(confettiRaf);
    const start = performance.now();
    let last = start;

    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);

      parts.forEach((p) => {
        p.vy += 30 * dt;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= dt * 0.22;
        if (p.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life * 1.7);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (now - start < 3200) {
        confettiRaf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    }

    confettiRaf = requestAnimationFrame(frame);
  }

  /* ---------- 交互 ---------- */
  el.restart.addEventListener("click", () => build(state.diff));

  el.again.addEventListener("click", () => build(state.diff));

  el.close.addEventListener("click", () => {
    el.overlay.hidden = true;
    location.hash = "#home";
  });

  el.sound.addEventListener("click", () => {
    state.sound = !state.sound;
    localStorage.setItem("nailong-sound", state.sound ? "1" : "0");
    syncSoundUI();
    if (state.sound) sound("flip");
  });

  el.diff.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-diff]");
    if (!btn) return;
    const diff = btn.dataset.diff;
    if (!DIFFS[diff]) return;
    $$("button[data-diff]", el.diff).forEach((b) =>
      b.classList.toggle("active", b === btn)
    );
    el.overlay.hidden = true;
    build(diff);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el.overlay.hidden) el.overlay.hidden = true;
  });

  // 离开游戏页时暂停计时并收起弹层，避免切走还在计时
  document.addEventListener("routechange", (e) => {
    if (e.detail !== "game") {
      pauseTimer();
      el.overlay.hidden = true;
    }
  });

  /* ---------- 初始化 ---------- */
  syncSoundUI();
  build("normal");
})();
