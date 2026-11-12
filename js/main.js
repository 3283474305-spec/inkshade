/* ============================================================
   个人网站 · 共享脚本
   各页面按需使用：脚本会检测元素是否存在，不存在就跳过。
   ============================================================ */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ============ 1. 主题切换 ============ */
  const root = document.documentElement;
  const themeBtn = $("#themeBtn");

  function applyTheme(theme) {
    root.dataset.theme = theme;
    localStorage.setItem("site-theme", theme);
    if (themeBtn) {
      themeBtn.textContent = theme === "dark" ? "☀" : "☾";
      themeBtn.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      );
    }
    document.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
  }

  if (themeBtn) {
    applyTheme(localStorage.getItem("site-theme") || "light");
    themeBtn.addEventListener("click", () => {
      applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
    });
  }

  /* ============ 2. 导航栏 ============ */
  const nav = $("#nav");
  const navLinks = $("#navLinks");
  const navToggle = $("#navToggle");

  if (nav) {
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      navLinks.classList.toggle("open");
    });
    navLinks.addEventListener("click", (e) => {
      if (e.target.closest("a")) navLinks.classList.remove("open");
    });
    document.addEventListener("click", (e) => {
      if (!navLinks.contains(e.target) && !navToggle.contains(e.target)) {
        navLinks.classList.remove("open");
      }
    });
  }

  // 当前页高亮由下方的单页路由统一处理

  /* ============ 3. 滚动进场动画 ============ */
  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* ============ 4. 技能条 ============ */
  const skillBars = $$(".skill-bar i[data-level]");
  if (skillBars.length) {
    const fill = () => skillBars.forEach((bar) => {
      bar.style.width = bar.dataset.level + "%";
    });
    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            fill();
            obs.disconnect();
          }
        },
        { threshold: 0.3 }
      );
      obs.observe(skillBars[0].closest(".skill-list") || skillBars[0]);
    } else {
      fill();
    }
  }

  /* ============ 5. 数字滚动 ============ */
  const counters = $$(".stat-num[data-count]");
  if (counters.length) {
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      const dur = 1100;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              run(e.target);
              obs.unobserve(e.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      counters.forEach((c) => obs.observe(c));
    } else {
      counters.forEach(run);
    }
  }

  /* ============ 6. 打字机效果 ============ */
  const typed = $("#typed");
  if (typed && typed.dataset.texts) {
    let texts = [];
    try {
      texts = JSON.parse(typed.dataset.texts);
    } catch (e) {
      texts = [typed.dataset.texts];
    }
    let ti = 0;
    let ci = 0;
    let deleting = false;

    const tick = () => {
      const word = texts[ti % texts.length];
      if (!deleting) {
        ci++;
        typed.textContent = word.slice(0, ci);
        if (ci === word.length) {
          deleting = true;
          setTimeout(tick, 1500);
          return;
        }
        setTimeout(tick, 85);
      } else {
        ci--;
        typed.textContent = word.slice(0, ci);
        if (ci === 0) {
          deleting = false;
          ti++;
          setTimeout(tick, 320);
          return;
        }
        setTimeout(tick, 40);
      }
    };
    setTimeout(tick, 400);
  }

  /* ============ 7. 作品集筛选 ============ */
  const filterBtns = $$(".filter-btn");
  if (filterBtns.length) {
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const cat = btn.dataset.filter;
        $$(".work-card").forEach((card) => {
          const match = cat === "all" || card.dataset.cat === cat;
          card.classList.toggle("hide", !match);
          card.classList.remove("pop");
          if (match) {
            void card.offsetWidth; // 触发重排以重放动画
            card.classList.add("pop");
          }
        });
      });
    });
  }

  /* ============ 8. 作品详情弹窗 ============ */
  const modal = $("#projectModal");
  if (modal) {
    const mImg = $(".modal-thumb img", modal);
    const mTitle = $(".modal-content h3", modal);
    const mDesc = $(".modal-content p", modal);
    const mTags = $(".modal-content .tag-row", modal);

    const openModal = (card) => {
      const data = JSON.parse(card.dataset.project || "{}");
      mImg.src = data.img || "";
      mImg.alt = data.title || "";
      mTitle.textContent = data.title || "";
      mDesc.textContent = data.desc || "";
      mTags.innerHTML = (data.tags || [])
        .map((t) => '<span class="tag">' + t + "</span>")
        .join("");
      modal.classList.add("open");
      document.body.style.overflow = "hidden";
    };
    const closeModal = () => {
      modal.classList.remove("open");
      document.body.style.overflow = "";
    };

    $$(".work-card[data-project]").forEach((card) => {
      card.addEventListener("click", () => openModal(card));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") openModal(card);
      });
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.closest(".modal-close")) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  /* ============ 9. 相册灯箱 ============ */
  const lightbox = $("#lightbox");
  if (lightbox) {
    const items = $$(".gallery-item");
    const lbImg = $("img", lightbox);
    const lbCap = $("figcaption", lightbox);
    let index = 0;

    const show = (i) => {
      index = (i + items.length) % items.length;
      const img = $("img", items[index]);
      lbImg.src = img.dataset.full || img.src;
      lbImg.alt = img.alt || "";
      lbCap.textContent = items[index].dataset.caption || img.alt || "";
      lightbox.classList.add("open");
      document.body.style.overflow = "hidden";
    };
    const close = () => {
      lightbox.classList.remove("open");
      document.body.style.overflow = "";
    };

    items.forEach((item, i) => {
      item.addEventListener("click", () => show(i));
    });
    $(".lightbox-close", lightbox).addEventListener("click", close);
    $(".lightbox-btn.prev", lightbox).addEventListener("click", () => show(index - 1));
    $(".lightbox-btn.next", lightbox).addEventListener("click", () => show(index + 1));
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) close();
    });
    document.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
  }

  /* ============ 10. 提示 Toast ============ */
  let toastEl = $("#toast");
  let toastTimer;

  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "toast";
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  /* ============ 11. 复制到剪贴板 ============ */
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
        toast("Copied: " + text);
      } catch (e) {
        // 本地 file:// 打开时 clipboard 可能不可用，退回旧方法
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          toast("Copied: " + text);
        } catch (err) {
          toast("Copy failed — select it manually");
        }
        ta.remove();
      }
    });
  });

  /* ============ 12. 联系表单校验 ============ */
  const form = $("#contactForm");
  if (form) {
    const okBox = $("#formOk");
    const setErr = (input, msg) => {
      const err = input.parentElement.querySelector(".err");
      if (err) err.textContent = msg || "";
      input.classList.toggle("invalid", Boolean(msg));
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.elements.name;
      const email = form.elements.email;
      const message = form.elements.message;
      let valid = true;

      if (!name.value.trim()) {
        setErr(name, "Please enter your name");
        valid = false;
      } else setErr(name, "");

      if (!email.value.trim()) {
        setErr(email, "Please enter your email");
        valid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        setErr(email, "That email address does not look right");
        valid = false;
      } else setErr(email, "");

      if (message.value.trim().length < 5) {
        setErr(message, "Please write at least 5 characters");
        valid = false;
      } else setErr(message, "");

      if (!valid) return;

      // 演示：只保存到本地，并提示成功（没有真实后端）
      const record = {
        name: name.value.trim(),
        email: email.value.trim(),
        subject: form.elements.subject.value.trim(),
        message: message.value.trim(),
        time: new Date().toISOString(),
      };
      const list = JSON.parse(localStorage.getItem("contact-messages") || "[]");
      list.push(record);
      localStorage.setItem("contact-messages", JSON.stringify(list));

      form.reset();
      if (okBox) {
        okBox.classList.add("show");
        okBox.textContent = "✅ Message saved. (Demo mode: stored in this browser.)";
      }
      toast("Message saved (demo)");
    });

    // 输入时清除错误
    $$("input, textarea", form).forEach((el) => {
      el.addEventListener("input", () => {
        if (el.classList.contains("invalid")) setErr(el, "");
      });
    });
  }

  /* ============ 13. 单页路由 ============ */
  const VIEWS = {
    home: "Jinhang Zhang — Layers of code & craft",
    portfolio: "Work — Jinhang Zhang",
    music: "Music — Jinhang Zhang",
    game: "Play — Jinhang Zhang",
    tools: "Tools — Jinhang Zhang",
    contact: "Contact — Jinhang Zhang",
  };
  const VALID_VIEWS = Object.keys(VIEWS);
  const viewEls = $$(".view");
  const scrollMemo = new Map();
  let restoreScroll = false;

  // 导航滑动指示条
  let navIndicator = null;
  if (navLinks) {
    navIndicator = document.createElement("span");
    navIndicator.className = "nav-indicator";
    navIndicator.setAttribute("aria-hidden", "true");
    navLinks.appendChild(navIndicator);
  }

  function activeNavLink() {
    return navLinks ? navLinks.querySelector("a.active") : null;
  }

  function moveIndicator(link) {
    if (!navIndicator || !navLinks || !link) return;
    const base = navLinks.getBoundingClientRect();
    const rect = link.getBoundingClientRect();
    navIndicator.style.width = rect.width + "px";
    navIndicator.style.transform =
      "translateX(" + (rect.left - base.left) + "px)";
    navIndicator.style.opacity = "1";
  }

  function syncIndicator() {
    moveIndicator(activeNavLink());
  }

  if (navLinks) {
    navLinks.addEventListener("mouseover", (e) => {
      const a = e.target.closest("a");
      if (a) moveIndicator(a);
    });
    navLinks.addEventListener("mouseleave", syncIndicator);
  }

  function currentView() {
    const h = (location.hash || "").replace("#", "");
    return VALID_VIEWS.indexOf(h) >= 0 ? h : "home";
  }

  function closeOverlays() {
    const modal = $("#projectModal");
    if (modal) modal.classList.remove("open");
    const lightbox = $("#lightbox");
    if (lightbox) lightbox.classList.remove("open");
    document.body.style.overflow = "";
  }

  function scrollToY(y) {
    try {
      window.scrollTo({ top: y, behavior: "instant" });
    } catch (e) {
      window.scrollTo(0, y);
    }
  }

  function showView(name) {
    const prev = document.body.dataset.page;
    if (prev && prev !== name) scrollMemo.set(prev, window.scrollY);

    viewEls.forEach((v) => v.classList.toggle("active", v.dataset.view === name));
    $$(".nav-links a").forEach((a) =>
      a.classList.toggle("active", a.dataset.page === name)
    );
    document.title = VIEWS[name];
    document.body.dataset.page = name;
    closeOverlays();
    if (navLinks) navLinks.classList.remove("open");

    requestAnimationFrame(syncIndicator);

    const y = restoreScroll ? scrollMemo.get(name) || 0 : 0;
    restoreScroll = false;
    requestAnimationFrame(() => scrollToY(y));

    document.dispatchEvent(new CustomEvent("routechange", { detail: name }));
  }

  // 浏览器前进/后退时保留之前滚动位置
  window.addEventListener("popstate", () => {
    restoreScroll = true;
  });
  window.addEventListener("hashchange", () => showView(currentView()));
  window.addEventListener("resize", () => requestAnimationFrame(syncIndicator));
  window.addEventListener("load", syncIndicator);

  if (!location.hash) history.replaceState(null, "", "#home");
  showView(currentView());

  /* ============ 14. 顶栏时钟 ============ */
  const barClock = $("#barClock");
  if (barClock) {
    const tickClock = () => {
      const d = new Date();
      barClock.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
        .map((n) => String(n).padStart(2, "0"))
        .join(":");
    };
    tickClock();
    setInterval(tickClock, 1000);
  }

  /* ============ 15. 回到顶部 ============ */
  const toTop = $("#toTop");
  if (toTop) {
    window.addEventListener(
      "scroll",
      () => toTop.classList.toggle("show", window.scrollY > 420),
      { passive: true }
    );
    toTop.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
  }

  /* ============ 14. 页脚年份 ============ */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

