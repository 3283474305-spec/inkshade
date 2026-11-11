/* ============================================================
   Save Dou Nai — three recursive-DFS mazes
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("mazeCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const levelEl = document.getElementById("mazeLevel");
  const timeEl = document.getElementById("mazeTime");
  const movesEl = document.getElementById("mazeMoves");
  const hintEl = document.getElementById("mazeHint");
  const progressEl = document.getElementById("mazeProgress");
  const winEl = document.getElementById("mazeWin");
  const winEyebrow = document.getElementById("mazeWinEyebrow");
  const winTitle = document.getElementById("mazeWinTitle");
  const winStats = document.getElementById("mazeWinStats");
  const nextBtn = document.getElementById("mazeNext");
  const newBtn = document.getElementById("mazeNew");
  const memeEl = document.getElementById("mazeWinMeme");
  const laughEl = document.getElementById("mazeLaugh");
  const moveButtons = Array.from(document.querySelectorAll("[data-move]"));
  let laughTimer = 0;

  const LEVELS = [
    { size: 11, name: "Blob", image: "images/maze/player-1.png" },
    { size: 13, name: "Worm", image: "images/maze/player-2.png" },
    { size: 15, name: "Pup", image: "images/maze/player-3.png" },
  ];

  const playerImages = LEVELS.map((level) => {
    const image = new Image();
    image.decoding = "async";
    image.src = level.image;
    return image;
  });
  const douNai = new Image();
  douNai.decoding = "async";
  douNai.src = "images/maze/dou-nai.png";

  const PAD = 14;
  const DIRS = [
    [0, -1, "n", "s"],
    [1, 0, "e", "w"],
    [0, 1, "s", "n"],
    [-1, 0, "w", "e"],
  ];

  let levelIndex = 0;
  let n = LEVELS[0].size;
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
  let escaping = false;
  let escapeAt = 0;
  let corneredHint = false;

  const shuffle = (list) => {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  /* Recursive DFS backtracker: visit every cell once. */
  function carve(x, y) {
    cells[y][x].visited = true;
    for (const [dx, dy, wall, opposite] of shuffle(DIRS)) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      if (cells[ny][nx].visited) continue;
      cells[y][x][wall] = false;
      cells[ny][nx][opposite] = false;
      carve(nx, ny);
    }
  }

  function buildMaze(size) {
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
    escaping = false;
    escapeAt = 0;
    corneredHint = false;
    elapsed = 0;
    startedAt = 0;
    clearInterval(timer);
    timer = 0;
    if (timeEl) timeEl.textContent = "0:00";
    if (movesEl) movesEl.textContent = "0";
    hideWin();
    updateHud();
    resize();
    draw();
  }

  function updateHud() {
    if (levelEl) levelEl.textContent = `${levelIndex + 1} / ${LEVELS.length}`;
    if (progressEl) {
      Array.from(progressEl.children).forEach((dot, index) => {
        dot.classList.toggle("done", index < levelIndex);
        dot.classList.toggle("active", index === levelIndex);
      });
    }
    if (hintEl) {
      hintEl.textContent =
        levelIndex === LEVELS.length - 1
          ? "Final maze · reach Dou Nai at the exit"
          : `Level ${levelIndex + 1} · ${LEVELS[levelIndex].name} · Dou Nai is waiting at the exit`;
    }
  }

  function playLaugh() {
    if (!laughEl) return;
    clearTimeout(laughTimer);
    try {
      laughEl.pause();
      laughEl.currentTime = 0;
      laughEl.volume = 0.3;
      const played = laughEl.play();
      if (played && played.catch) played.catch(() => {});
      laughTimer = setTimeout(() => {
        laughEl.pause();
        laughEl.currentTime = 0;
      }, 3000);
    } catch (error) {
      /* Audio is optional. */
    }
  }

  function stopLaugh() {
    clearTimeout(laughTimer);
    laughTimer = 0;
    if (!laughEl) return;
    try {
      laughEl.pause();
      laughEl.currentTime = 0;
    } catch (error) {
      /* ignore */
    }
  }

  function startLevel(index) {
    levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
    stopLaugh();
    if (memeEl) memeEl.hidden = true;
    buildMaze(LEVELS[levelIndex].size);
  }

  function fmt(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
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
        Math.max(1, cellSize - 4),
        Math.max(1, cellSize - 4)
      );
    }
  }

  function drawSprite(image, x, y, maxW, maxH, alpha = 1) {
    if (!image || !image.complete || !image.naturalWidth) return false;
    const scale = Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight);
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
    ctx.restore();
    return true;
  }

  function drawDouNai(now) {
    const p = center(goal.x, goal.y);
    let x = p.x;
    let y = p.y + Math.sin(now / 500) * 1.6;
    let alpha = 1;

    if (escaping && levelIndex < LEVELS.length - 1) {
      const t = Math.min(1, (now - escapeAt) / 620);
      const eased = 1 - Math.pow(1 - t, 3);
      x += eased * cellSize * 2.8;
      y -= eased * cellSize * 1.1;
      alpha = 1 - t;
    }

    if (alpha <= 0) return;

    // A soft halo so a pale character stays visible on dark ground.
    ctx.save();
    ctx.globalAlpha = alpha * 0.7;
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, cellSize * 0.8);
    glow.addColorStop(0, "rgba(255, 220, 140, 0.18)");
    glow.addColorStop(1, "rgba(255, 220, 140, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, cellSize * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const drawn = drawSprite(
      douNai,
      x,
      y,
      cellSize * 0.84,
      cellSize * 1.05,
      alpha
    );

    if (!drawn) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#f6d77a";
      ctx.beginPath();
      ctx.arc(x, y, cellSize * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPlayer() {
    const p = center(player.x, player.y);
    const image = playerImages[levelIndex];
    const drawn = drawSprite(image, p.x, p.y, cellSize * 0.78, cellSize * 0.78);

    if (!drawn) {
      const r = Math.max(3.5, cellSize * 0.24);
      ctx.save();
      ctx.shadowColor = "rgba(232, 112, 42, 0.8)";
      ctx.shadowBlur = 16;
      ctx.fillStyle = "#e8702a";
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = "rgba(232, 112, 42, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, cellSize * 0.36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function draw(now = performance.now()) {
    if (!side || !cellSize) return;
    ctx.clearRect(0, 0, side, side);
    ctx.fillStyle = "#070708";
    ctx.fillRect(0, 0, side, side);

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
    drawDouNai(now);
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

  function finishLevel() {
    finished = true;
    stopTimer();
    draw();
    const final = levelIndex === LEVELS.length - 1;

    if (winEyebrow) winEyebrow.textContent = final ? "Rescued" : "Level complete";
    if (winTitle) {
      winTitle.textContent = final
        ? "You saved Dou Nai."
        : `She slipped away to level ${levelIndex + 2}.`;
    }
    if (winStats) {
      winStats.textContent = final
        ? `${fmt(elapsed)} · ${moves} moves · all three mazes cleared`
        : `${fmt(elapsed)} · ${moves} moves · level ${levelIndex + 1} clear`;
    }
    if (nextBtn) nextBtn.textContent = final ? "Play again" : `Enter level ${levelIndex + 2}`;
    if (hintEl) {
      hintEl.textContent = final
        ? "Dou Nai is safe. Start again for a new set of three mazes."
        : "Dou Nai has already run ahead — follow her.";
    }
    if (memeEl) memeEl.hidden = !final;
    if (final) playLaugh();
    else stopLaugh();
    if (winEl) winEl.hidden = false;
  }

  function checkEscape() {
    if (levelIndex === LEVELS.length - 1) {
      if (!corneredHint && Math.abs(player.x - goal.x) + Math.abs(player.y - goal.y) <= 2) {
        corneredHint = true;
        if (hintEl) hintEl.textContent = "Dou Nai is cornered — reach her!";
      }
      return;
    }
    if (escaping) return;
    if (Math.abs(player.x - goal.x) + Math.abs(player.y - goal.y) <= 2) {
      escaping = true;
      escapeAt = performance.now();
      if (hintEl) hintEl.textContent = `Dou Nai ran to level ${levelIndex + 2}! Follow her.`;
      wake();
    }
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
    checkEscape();
    if (player.x === goal.x && player.y === goal.y) finishLevel();
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
    if (target && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
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
    if (Math.abs(dx) + Math.abs(dy) === 1) move(dx, dy);
  });

  newBtn?.addEventListener("click", () => startLevel(0));
  nextBtn?.addEventListener("click", () => {
    if (levelIndex < LEVELS.length - 1) startLevel(levelIndex + 1);
    else startLevel(0);
  });

  douNai.addEventListener("load", () => draw());
  playerImages.forEach((image) => image.addEventListener("load", () => draw()));

  document.addEventListener("routechange", (event) => {
    if (event.detail === "game") {
      requestAnimationFrame(() => {
        resize();
        draw();
        wake();
      });
    }
  });

  document.addEventListener("game:tab", (event) => {
    if (event.detail === "maze") {
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

  startLevel(0);
  requestAnimationFrame(() => {
    resize();
    draw();
    wake();
  });
})();
