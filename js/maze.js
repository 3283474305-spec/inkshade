/* ============================================================
   Path maze — recursive DFS backtracker + canvas play
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("mazeCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const timeEl = document.getElementById("mazeTime");
  const movesEl = document.getElementById("mazeMoves");
  const bestEl = document.getElementById("mazeBest");
  const sizeEl = document.getElementById("mazeSize");
  const newBtn = document.getElementById("mazeNew");
  const hintEl = document.getElementById("mazeHint");
  const winEl = document.getElementById("mazeWin");
  const winStats = document.getElementById("mazeWinStats");
  const againBtn = document.getElementById("mazeAgain");
  const dismissBtn = document.getElementById("mazeDismiss");
  const moveButtons = Array.from(document.querySelectorAll("[data-move]"));

  const PAD = 14;
  const DIRS = [
    [0, -1, "n", "s"],
    [1, 0, "e", "w"],
    [0, 1, "s", "n"],
    [-1, 0, "w", "e"],
  ];

  let n = Number(sizeEl?.value) || 15;
  let cells = [];
  let player = { x: 0, y: 0 };
  let goal = { x: n - 1, y: n - 1 };
  let trail = [];
  let moves = 0;
  let started = false;
  let finished = false;
  let startedAt = 0;
  let elapsed = 0;
  let timer = 0;
  let cellSize = 0;
  let offset = 0;
  let side = 0;
  let dpr = 1;
  let raf = 0;
  let pulse = 0;

  const shuffle = (list) => {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  /* Recursive DFS (backtracker). Every cell is visited exactly once. */
  function carve(x, y) {
    cells[y][x].visited = true;
    const directions = shuffle(DIRS);

    for (const [dx, dy, wall, opposite] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      if (cells[ny][nx].visited) continue;

      cells[y][x][wall] = false;
      cells[ny][nx][opposite] = false;
      carve(nx, ny);
    }
  }

  function generate(size) {
    n = size;
    cells = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => ({
        n: true,
        e: true,
        s: true,
        w: true,
        visited: false,
      }))
    );
    carve(0, 0);
    player = { x: 0, y: 0 };
    goal = { x: n - 1, y: n - 1 };
    trail = [{ ...player }];
    moves = 0;
    started = false;
    finished = false;
    elapsed = 0;
    startedAt = 0;
    clearInterval(timer);
    timer = 0;
    if (timeEl) timeEl.textContent = "0:00";
    if (movesEl) movesEl.textContent = "0";
    if (hintEl) hintEl.textContent = "Arrow keys / WASD · click an adjacent cell · or use the pad";
    hideWin();
    renderBest();
    resize();
    draw();
  }

  function fmt(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function bestKey() {
    return `maze-best-${n}`;
  }

  function renderBest() {
    if (!bestEl) return;
    const raw = localStorage.getItem(bestKey());
    const value = Number(raw);
    bestEl.textContent = raw && value > 0 ? fmt(value) : "--";
  }

  function startTimer() {
    if (started) return;
    started = true;
    startedAt = performance.now() - elapsed * 1000;
    timer = setInterval(() => {
      elapsed = Math.max(0, Math.floor((performance.now() - startedAt) / 1000));
      if (timeEl) timeEl.textContent = fmt(elapsed);
    }, 250);
  }

  function stopTimer() {
    clearInterval(timer);
    timer = 0;
    if (started) {
      elapsed = Math.max(elapsed, Math.floor((performance.now() - startedAt) / 1000));
    }
  }

  function resize() {
    const wrap = canvas.parentElement;
    if (!wrap) return;
    const box = wrap.getBoundingClientRect();
    const available = Math.max(0, Math.min(box.width, box.height));
    if (available < 20) return;
    side = available;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(side * dpr);
    canvas.height = Math.floor(side * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    offset = PAD;
    cellSize = (side - PAD * 2) / n;
    draw();
  }

  function center(cx, cy) {
    return {
      x: offset + (cx + 0.5) * cellSize,
      y: offset + (cy + 0.5) * cellSize,
    };
  }

  function drawWalls() {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.19)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const cell = cells[y][x];
        const x0 = offset + x * cellSize;
        const y0 = offset + y * cellSize;
        const x1 = x0 + cellSize;
        const y1 = y0 + cellSize;
        if (cell.n) {
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y0);
        }
        if (cell.w) {
          ctx.moveTo(x0, y0);
          ctx.lineTo(x0, y1);
        }
        if (x === n - 1 && cell.e) {
          ctx.moveTo(x1, y0);
          ctx.lineTo(x1, y1);
        }
        if (y === n - 1 && cell.s) {
          ctx.moveTo(x0, y1);
          ctx.lineTo(x1, y1);
        }
      }
    }
    ctx.stroke();

    ctx.strokeStyle = "rgba(232, 112, 42, 0.38)";
    ctx.lineWidth = 2;
    ctx.strokeRect(offset - 1, offset - 1, side - PAD * 2 + 2, side - PAD * 2 + 2);
  }

  function drawTrail() {
    ctx.fillStyle = "rgba(232, 112, 42, 0.075)";
    for (const point of trail) {
      ctx.fillRect(
        offset + point.x * cellSize + 2,
        offset + point.y * cellSize + 2,
        cellSize - 4,
        cellSize - 4
      );
    }
  }

  function drawGoal(now) {
    const p = center(goal.x, goal.y);
    const t = Math.sin(now / 360) * 0.5 + 0.5;
    const r = cellSize * 0.24 + t * cellSize * 0.035;

    ctx.save();
    ctx.shadowColor = "rgba(74, 222, 128, 0.8)";
    ctx.shadowBlur = 18 + t * 10;
    ctx.fillStyle = "rgba(74, 222, 128, 0.94)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(74, 222, 128, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 4 + t * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(4, 20, 9, 0.85)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1.5, r * 0.25), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer() {
    const p = center(player.x, player.y);
    const r = Math.max(3.5, cellSize * 0.24);
    ctx.save();
    ctx.shadowColor = "rgba(232, 112, 42, 0.8)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#e8702a";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(p.x - r * 0.22, p.y - r * 0.22, Math.max(1, r * 0.22), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw(now = performance.now()) {
    if (!side || !cellSize) return;
    pulse = now;
    ctx.clearRect(0, 0, side, side);
    ctx.fillStyle = "#070708";
    ctx.fillRect(0, 0, side, side);

    // quiet interior grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
    ctx.lineWidth = 1;
    for (let i = 1; i < n; i++) {
      const p = offset + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(p, offset);
      ctx.lineTo(p, offset + n * cellSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(offset, p);
      ctx.lineTo(offset + n * cellSize, p);
      ctx.stroke();
    }

    drawTrail();
    drawWalls();
    drawGoal(now);
    drawPlayer();
  }

  function loop(now) {
    raf = 0;
    if (document.hidden) return;
    draw(now);
    if (!finished) raf = requestAnimationFrame(loop);
  }

  function wake() {
    if (!raf && !finished) raf = requestAnimationFrame(loop);
  }

  function canMove(dx, dy) {
    const cell = cells[player.y]?.[player.x];
    if (!cell) return false;
    if (dx === 1) return !cell.e;
    if (dx === -1) return !cell.w;
    if (dy === 1) return !cell.s;
    if (dy === -1) return !cell.n;
    return false;
  }

  function checkWin() {
    if (player.x !== goal.x || player.y !== goal.y) return;
    finished = true;
    stopTimer();
    clearInterval(timer);
    if (movesEl) movesEl.textContent = String(moves);
    const previous = Number(localStorage.getItem(bestKey())) || 0;
    if (!previous || elapsed < previous) {
      localStorage.setItem(bestKey(), String(elapsed));
    }
    renderBest();
    if (hintEl) hintEl.textContent = "Path found. Generate another maze.";
    if (winStats) {
      winStats.textContent = `${fmt(elapsed)} · ${moves} moves · ${n} × ${n} maze`;
    }
    if (winEl) winEl.hidden = false;
    draw();
  }

  function move(dx, dy) {
    if (finished) return false;
    if (!canMove(dx, dy)) return false;
    startTimer();
    player = { x: player.x + dx, y: player.y + dy };
    trail.push({ ...player });
    moves += 1;
    if (movesEl) movesEl.textContent = String(moves);
    draw();
    checkWin();
    return true;
  }

  function moveByKey(key) {
    if (key === "ArrowUp" || key === "w" || key === "W") return move(0, -1);
    if (key === "ArrowDown" || key === "s" || key === "S") return move(0, 1);
    if (key === "ArrowLeft" || key === "a" || key === "A") return move(-1, 0);
    if (key === "ArrowRight" || key === "d" || key === "D") return move(1, 0);
    return false;
  }

  function hideWin() {
    if (winEl) winEl.hidden = true;
  }

  function gameIsActive() {
    const view = document.getElementById("view-game");
    return !!view && view.classList.contains("active");
  }

  document.addEventListener("keydown", (event) => {
    if (!gameIsActive()) return;
    const target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;
    if (moveByKey(event.key)) event.preventDefault();
  });

  moveButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const dir = button.getAttribute("data-move");
      if (dir === "up") move(0, -1);
      else if (dir === "down") move(0, 1);
      else if (dir === "left") move(-1, 0);
      else if (dir === "right") move(1, 0);
    });
  });

  canvas.addEventListener("click", (event) => {
    if (!cellSize || finished) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left - offset) / cellSize);
    const y = Math.floor((event.clientY - rect.top - offset) / cellSize);
    if (x < 0 || y < 0 || x >= n || y >= n) return;
    const dx = x - player.x;
    const dy = y - player.y;
    if (Math.abs(dx) + Math.abs(dy) === 1) {
      move(dx, dy);
    }
  });

  newBtn?.addEventListener("click", () => generate(Number(sizeEl?.value) || 15));
  sizeEl?.addEventListener("change", () => generate(Number(sizeEl.value) || 15));
  againBtn?.addEventListener("click", () => generate(Number(sizeEl?.value) || 15));
  dismissBtn?.addEventListener("click", hideWin);

  document.addEventListener("routechange", (event) => {
    if (event.detail === "game") {
      requestAnimationFrame(() => {
        resize();
        draw();
        wake();
      });
    }
  });

  if ("ResizeObserver" in window) {
    const wrap = canvas.parentElement;
    if (wrap) new ResizeObserver(() => resize()).observe(wrap);
  } else {
    window.addEventListener("resize", resize);
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      draw();
      wake();
    }
  });

  generate(n);
  requestAnimationFrame(() => {
    resize();
    draw();
    wake();
  });
})();
