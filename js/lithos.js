/* Lithos spotlight — soft circular reveal following the cursor */
(function () {
  "use strict";

  const hero = document.getElementById("hero");
  const reveal = document.getElementById("heroReveal");
  const canvas = document.getElementById("heroMask");
  if (!hero || !reveal || !canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const R = 260;
  const mouse = { x: -999, y: -999 };
  const smooth = { x: -999, y: -999 };
  let raf = 0;
  let running = false;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function draw(x, y) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, R);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.4, "rgba(255,255,255,1)");
    gradient.addColorStop(0.6, "rgba(255,255,255,0.75)");
    gradient.addColorStop(0.75, "rgba(255,255,255,0.4)");
    gradient.addColorStop(0.88, "rgba(255,255,255,0.12)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fill();

    const mask = "url(" + canvas.toDataURL() + ")";
    reveal.style.webkitMaskImage = mask;
    reveal.style.maskImage = mask;
  }

  function loop() {
    if (!running) return;
    smooth.x += (mouse.x - smooth.x) * 0.1;
    smooth.y += (mouse.y - smooth.y) * 0.1;
    draw(smooth.x, smooth.y);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    resize();
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  window.addEventListener(
    "mousemove",
    (event) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    },
    { passive: true }
  );

  window.addEventListener("resize", () => {
    resize();
    draw(smooth.x, smooth.y);
  });

  document.addEventListener("routechange", (event) => {
    if (event.detail === "home") start();
    else stop();
  });

  if (document.body.dataset.page === "home") start();
})();
