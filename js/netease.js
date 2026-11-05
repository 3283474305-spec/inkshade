/* ============================================================
   网易云面板：扫码登录 + 我的歌单 + 搜索
   - 通过本地 server/server.mjs 的 /api/netease/* 接口
   - 登录成功后自动载入账号歌单，点歌曲直接播放
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const tab = $('.pl-tab[data-tab="netease"]');
  if (!tab) return;

  const input = $("#neQuery");
  const btn = $("#neBtn");
  const results = $("#neResults");
  if (!input || !btn || !results) return;

  const loginBtn = $("#neLoginBtn");
  const userBox = $("#neUser");
  const avatar = $("#neAvatar");
  const nameEl = $("#neName");
  const logoutBtn = $("#neLogout");

  const modal = $("#neLoginModal");
  const qrBox = $("#neQr");
  const qrStatus = $("#neQrStatus");
  const closeBtn = $("#neLoginClose");
  const loginSub = modal ? modal.querySelector(".login-sub") : null;

  const libraryEl = $("#neLibrary");
  const playlistSwap = $("#nePlaylistSwapRoot");
  const listEl = $("#neAnimatedListRoot");
  const libraryRefresh = $("#neLibraryRefresh");
  const viewToggle = $("#neViewToggle");
  const viewButtons = viewToggle
    ? Array.from(viewToggle.querySelectorAll("button"))
    : [];
  const carouselEl = $("#neCarousel");

  let serverOk = null;
  let busy = false;
  let checkedOnce = false;
  let pollTimer = null;
  let profile = null;

  let library = [];
  let libraryUid = null;
  let currentPlaylistId = "";
  let libraryLoading = false;
  let publicMode = false;
  let staticMode = false;
  let viewMode = "list";
  let currentSongs = [];
  let currentMode = "search";
  let carouselExpandTimer = 0;

  const HINT_OFFLINE =
    "The local music service is not running.\n" +
    "1. Double-click Personal Site or the one-click launcher.\n" +
    "2. Open http://127.0.0.1:8787/ and refresh.\n" +
    "The NetEase panel cannot work from a plain index.html file.";

  const HINT_PUBLIC =
    "This is the public edition: search and preview are available.\n" +
    "NetEase sign-in, personal playlists, and VIP sources are only available locally.";

  function setHint(text) {
    viewMode = "list";
    updateViewButtons();
    if (listEl) listEl.hidden = true;
    if (carouselEl) carouselEl.hidden = true;
    if (results) results.hidden = false;
    results.innerHTML = "";
    const p = document.createElement("p");
    p.className = "ne-hint";
    p.textContent = text;
    results.appendChild(p);
  }

  function toast(msg) {
    document.dispatchEvent(new CustomEvent("app:toast", { detail: msg }));
  }

  function fmt(sec) {
    if (!isFinite(sec) || sec <= 0) return "";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  async function ensureServer(force) {
    // 只缓存“在线”；失败时下次操作重新检测
    if (!force && serverOk === true) return true;
    if (location.protocol === "file:") {
      serverOk = false;
      return false;
    }
    try {
      const r = await fetch("/api/health", { cache: "no-store" });
      serverOk = r.ok;
    } catch (e) {
      serverOk = false;
    }
    return serverOk;
  }

  /* ---------- 登录态 ---------- */
  function renderProfile(p, loggedIn) {
    profile = p || null;
    const ok =
      loggedIn !== undefined ? Boolean(loggedIn) : Boolean(profile && profile.nickname);

    if (ok) {
      if (loginBtn) loginBtn.hidden = true;
      if (userBox) userBox.hidden = false;
      if (avatar) {
        avatar.src = (profile && profile.avatar) || "";
        avatar.alt = (profile && profile.nickname) || "Signed in";
      }
      if (nameEl) {
        const name = (profile && profile.nickname) || "Signed in";
        nameEl.textContent = name + (profile && profile.vipType ? " · VIP" : "");
      }
    } else {
      if (loginBtn) loginBtn.hidden = false;
      if (userBox) userBox.hidden = true;
      if (libraryEl) libraryEl.hidden = true;
      library = [];
      libraryUid = null;
      currentPlaylistId = "";
      window.__nePlaylists = [];
      window.dispatchEvent(new CustomEvent("netease:playlists", { detail: { playlists: [] } }));
      clearSongs();
    }
  }

  async function loadConfig() {
    try {
      const r = await fetch("/api/config", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      publicMode = Boolean(d.publicMode);
    } catch (e) {
      /* 本地旧服务没有 config 接口时按私有模式处理 */
    }
  }

  function applyPublicMode() {
    if (loginBtn) loginBtn.hidden = true;
    if (userBox) userBox.hidden = true;
    if (libraryEl) libraryEl.hidden = true;
    setHint(HINT_PUBLIC);
  }

  function applyStaticMode() {
    if (staticMode) return;
    staticMode = true;
    document.body.classList.add("music-static");

    if (loginBtn) loginBtn.hidden = true;
    if (userBox) userBox.hidden = true;
    if (libraryEl) libraryEl.hidden = true;
    if (carouselEl) carouselEl.hidden = true;
    if (listEl) listEl.hidden = true;
    document.querySelector(".track-drawer")?.classList.remove("open");
    document.body.classList.remove("drawer-open");

    const headText = document.querySelector("#view-music .page-head p");
    if (headText) {
      headText.textContent =
        "An online portfolio with three original demo tracks. The full NetEase player and personal playlists live in the local edition.";
    }

    // Keep the built-in demo queue and player controls available.
    const neteaseTab = document.querySelector('.pl-tab[data-tab="netease"]');
    const neteasePanel = document.querySelector("#panel-netease");
    const queueTab = document.querySelector('.pl-tab[data-tab="playlist"]');
    if (neteaseTab) neteaseTab.hidden = true;
    if (neteasePanel) neteasePanel.hidden = true;
    if (queueTab) queueTab.click();

    const tip = document.querySelector(".player-tip");
    if (tip) {
      tip.textContent = "Three demo tracks are included. The full NetEase player is available in the local build.";
    }

    let note = document.querySelector(".music-static-note");
    if (!note) {
      note = document.createElement("div");
      note.className = "container music-static-note";
      note.innerHTML =
        "<strong>Online edition</strong><span>Three demo tracks are included. NetEase search, sign-in, and personal playlists are available in the local build.</span>";
      const anchor = document.querySelector(".music-search-wrap");
      if (anchor) anchor.after(note);
      else document.querySelector("#view-music .page-head")?.after(note);
    }
  }

  async function loadStatus() {
    if (publicMode) {
      applyPublicMode();
      return;
    }
    try {
      const r = await fetch("/api/netease/login/status", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      renderProfile(d.profile, d.loggedIn);
      if (d.loggedIn) loadLibrary();
    } catch (e) {
      /* 服务没起来时忽略 */
    }
  }

  /* ---------- 我的歌单 ---------- */
  async function loadLibrary(force) {
    if (publicMode) return;
    if (!force && library.length && libraryUid && profile && libraryUid === profile.userId) {
      if (libraryEl) libraryEl.hidden = false;
      window.__nePlaylists = library;
      window.dispatchEvent(new CustomEvent("netease:playlists", { detail: { playlists: library } }));
      return;
    }
    if (libraryLoading) return;
    libraryLoading = true;
    if (libraryEl) libraryEl.hidden = false;

    try {
      const r = await fetch("/api/netease/playlists", { cache: "no-store" });
      if (r.status === 401) {
        renderProfile(null, false);
        setHint("Your session expired. Scan the QR code again.");
        return;
      }
      if (!r.ok) throw new Error("HTTP " + r.status);

      const d = await r.json();
      library = d.playlists || [];
      libraryUid = d.uid || (profile && profile.userId) || null;

      if (!library.length) {
        window.__nePlaylists = [];
        window.dispatchEvent(new CustomEvent("netease:playlists", { detail: { playlists: [] } }));
        setHint("Signed in, but this account has no playlists yet.");
        return;
      }

      let saved = "";
      try {
        saved = localStorage.getItem("ne-playlist") || "";
      } catch (e) {
        /* ignore */
      }

      const liked = library.find((p) => p.specialType === 5);
      const pick =
        library.find((p) => String(p.id) === saved) || liked || library[0];

      const ordered = [pick, ...library.filter((p) => p !== pick)];
      window.__nePlaylists = ordered;
      window.dispatchEvent(new CustomEvent("netease:playlists", { detail: { playlists: ordered } }));
      await loadPlaylist(pick.id);
    } catch (e) {
      setHint("Could not load playlists: " + e.message + "\nCheck that the local service is still running.");
      serverOk = null;
    } finally {
      libraryLoading = false;
    }
  }

  async function loadPlaylist(id) {
    if (!id) return;
    currentPlaylistId = String(id);
    try {
      localStorage.setItem("ne-playlist", currentPlaylistId);
    } catch (e) {
      /* ignore */
    }

    skeleton();
    try {
      const r = await fetch(
        "/api/netease/playlist?id=" + encodeURIComponent(id),
        { cache: "no-store" }
      );
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      render(d.songs || [], "library");
    } catch (e) {
      setHint("Could not load playlists: " + e.message);
    }
  }

  /* ---------- 列表 / 轮播 ---------- */
  function updateViewButtons() {
    viewButtons.forEach((btn) => {
      const on = btn.dataset.view === viewMode;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function dispatchCarousel() {
    const detail = { songs: currentSongs, mode: currentMode };
    window.__neCarouselPayload = detail;
    window.dispatchEvent(new CustomEvent("netease:carousel", { detail }));
  }

  function dispatchSongList() {
    const detail = { songs: currentSongs, mode: currentMode };
    window.__neListPayload = detail;
    window.dispatchEvent(new CustomEvent("netease:animated-list", { detail }));
  }

  function applyView(mode) {
    if (mode === "carousel" && !currentSongs.length) {
      toast("Search or sign in to load tracks first");
      mode = "list";
    }
    viewMode = mode;
    updateViewButtons();
    const hasSongs = currentSongs.length > 0;
    const showCarousel = viewMode === "carousel" && hasSongs;
    const showList = viewMode === "list" && hasSongs;
    if (results) results.hidden = showCarousel || showList;
    if (listEl) listEl.hidden = !showList;
    if (carouselEl) carouselEl.hidden = !showCarousel;
    if (showList) dispatchSongList();
    if (showCarousel) {
      dispatchCarousel();
      document.dispatchEvent(new CustomEvent("track-drawer:close"));
      if (carouselEl) {
        clearTimeout(carouselExpandTimer);
        carouselEl.classList.add("expanded");
        carouselExpandTimer = setTimeout(() => {
          carouselEl.classList.remove("expanded");
        }, 2600);
      }
    } else if (carouselEl) {
      clearTimeout(carouselExpandTimer);
      carouselEl.classList.remove("expanded");
    }
  }

  function clearSongs() {
    currentSongs = [];
    currentMode = "search";
    viewMode = "list";
    if (listEl) listEl.hidden = true;
    if (carouselEl) {
      carouselEl.hidden = true;
      carouselEl.classList.remove("expanded");
    }
    clearTimeout(carouselExpandTimer);
    if (results) results.hidden = false;
    updateViewButtons();
    const detail = { songs: [], mode: "search" };
    window.__neListPayload = detail;
    window.dispatchEvent(new CustomEvent("netease:animated-list", { detail }));
    window.__neCarouselPayload = detail;
    window.dispatchEvent(new CustomEvent("netease:carousel", { detail }));
  }

  /* ---------- 扫码登录 ---------- */
  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    stopPoll();
    if (qrBox) qrBox.innerHTML = "";
  }

  function startPoll(key) {
    let tries = 0;
    stopPoll();
    pollTimer = setInterval(async () => {
      tries++;
      if (tries > 90) {
        stopPoll();
        if (qrStatus) qrStatus.textContent = "The QR code expired. Close and try again.";
        return;
      }
      try {
        const r = await fetch(
          "/api/netease/login/qr/check?key=" + encodeURIComponent(key),
          { cache: "no-store" }
        );
        const d = await r.json();
        if (d.code === 803) {
          stopPoll();
          renderProfile(d.profile, true);
          if (qrStatus) qrStatus.textContent = "Signed in — loading your playlists…";
          setTimeout(closeModal, 900);
          toast("Signed in to NetEase");
          document.dispatchEvent(new CustomEvent("netease:login"));
        } else if (d.code === 802) {
          if (qrStatus) qrStatus.textContent = "Scanned — confirm on your phone";
        } else if (d.code === 800) {
          stopPoll();
          if (qrStatus) qrStatus.textContent = "The QR code expired. Close and try again.";
        }
      } catch (e) {
        /* 单次轮询失败不影响 */
      }
    }, 2000);
  }

  async function openLogin() {
    if (staticMode) return;
    if (publicMode) {
      setHint(HINT_PUBLIC);
      return;
    }
    if (!(await ensureServer(true))) {
      setHint(HINT_OFFLINE);
      if (modal) {
        modal.hidden = false;
        if (qrBox) {
          qrBox.hidden = true;
          qrBox.innerHTML = "";
        }
        if (loginSub) {
          loginSub.textContent =
            "Start the local service first, then open http://127.0.0.1:8787/";
        }
        if (qrStatus) qrStatus.textContent = "Local service is not running";
      }
      toast("Start the local service first");
      return;
    }
    if (!modal) return;

    modal.hidden = false;
    if (loginSub) loginSub.textContent = "Scan with the NetEase Cloud Music app";
    if (qrBox) {
      qrBox.hidden = false;
      qrBox.innerHTML = "";
    }
    if (qrStatus) qrStatus.textContent = "Generating QR code…";
    stopPoll();

    try {
      const r = await fetch("/api/netease/login/qr", { method: "POST" });
      const d = await r.json();
      if (!r.ok || !d.svg) throw new Error(d.error || "Could not generate the QR code");
      if (qrBox) qrBox.innerHTML = d.svg;
      if (qrStatus) qrStatus.textContent = "Scan with the NetEase app";
      startPoll(d.key);
    } catch (e) {
      if (qrStatus) qrStatus.textContent = "Could not generate the QR code: " + e.message;
    }
  }

  if (loginBtn) loginBtn.addEventListener("click", openLogin);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && !modal.hidden) closeModal();
  });

  document.addEventListener("netease:login", () => loadLibrary(true));

  document.addEventListener("netease:playlist-select", (e) => {
    const id = e.detail && e.detail.id;
    if (id) loadPlaylist(id);
  });

  if (libraryRefresh) {
    libraryRefresh.addEventListener("click", () => {
      loadLibrary(true);
    });
  }

  viewButtons.forEach((btn) => {
    btn.addEventListener("click", () => applyView(btn.dataset.view));
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/netease/logout", { method: "POST" });
      } catch (e) {
        /* ignore */
      }
      renderProfile(null, false);
      setHint("Sign in to load your playlists, or search for a track.");
      toast("Signed out of NetEase");
    });
  }

  /* ---------- 搜索 ---------- */
  function skeleton() {
    if (listEl) listEl.hidden = true;
    if (carouselEl) carouselEl.hidden = true;
    if (results) results.hidden = false;
    results.innerHTML = "";
    for (let i = 0; i < 5; i++) {
      const row = document.createElement("div");
      row.className = "ne-skel";
      const cover = document.createElement("span");
      cover.className = "ne-skel-cover";
      const lines = document.createElement("span");
      lines.className = "ne-skel-lines";
      lines.innerHTML = "<i></i><i></i>";
      row.append(cover, lines);
      results.appendChild(row);
    }
  }

  async function search() {
    if (busy || staticMode) return;

    const q = input.value.trim();
    if (!q) {
      setHint("Enter a song or artist, then press Search.");
      input.focus();
      return;
    }

    const neteaseTab = document.querySelector('.pl-tab[data-tab="netease"]');
    if (neteaseTab && !neteaseTab.classList.contains("active")) neteaseTab.click();

    viewMode = "list";
    updateViewButtons();
    document.dispatchEvent(new CustomEvent("track-drawer:open"));

    if (!(await ensureServer())) {
      setHint(HINT_OFFLINE);
      return;
    }

    busy = true;
    btn.disabled = true;
    btn.textContent = "Searching";
    skeleton();

    try {
      const r = await fetch(
        "/api/netease/search?q=" + encodeURIComponent(q) + "&limit=20",
        { cache: "no-store" }
      );
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      render(d.songs || []);
    } catch (e) {
      setHint("Search failed: " + e.message + "\nCheck that the local service is still running.");
      serverOk = null;
    } finally {
      busy = false;
      btn.disabled = false;
      btn.textContent = "Search";
    }
  }

  function render(songs, mode = "search") {
    currentSongs = songs || [];
    currentMode = mode;
    results.innerHTML = "";

    if (!songs.length) {
      applyView("list");
      setHint(
        mode === "library"
          ? "This playlist has no playable tracks."
          : "No matching tracks. Try another keyword."
      );
      return;
    }

    dispatchSongList();
    applyView(viewMode === "carousel" ? "carousel" : "list");
  }

  btn.addEventListener("click", search);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      search();
    }
  });

  document.addEventListener("netease:open", () => {
    if (staticMode) return;
    document.dispatchEvent(new CustomEvent("track-drawer:open"));
    input.focus();
    if (publicMode) {
      applyPublicMode();
      return;
    }
    loadStatus();
    if (checkedOnce) return;
    checkedOnce = true;
    ensureServer().then((ok) => {
      if (!ok) setHint(HINT_OFFLINE);
      else if (!currentSongs.length) {
        setHint("Sign in to load your playlists, or search for a track.");
      }
    });
  });

  // 离开音乐页时收起扫码弹窗
  document.addEventListener("routechange", (e) => {
    if (e.detail !== "music") closeModal();
  });

  updateViewButtons();

  // 页面加载时同步服务状态、公开模式、登录态和歌单
  const forceStatic = new URLSearchParams(location.search).has("static");
  const localPage =
    location.protocol === "file:" ||
    ["localhost", "127.0.0.1", "::1"].includes(location.hostname);

  if (forceStatic) {
    applyStaticMode();
    return;
  }

  ensureServer().then(async (ok) => {
    if (!ok) {
      if (!localPage) applyStaticMode();
      else if (tab.classList.contains("active")) setHint(HINT_OFFLINE);
      return;
    }
    await loadConfig();
    if (publicMode) {
      applyPublicMode();
      return;
    }
    loadStatus();
    if (tab.classList.contains("active") && !currentSongs.length) {
      setHint("Sign in to load your playlists, or search for a track.");
    }
  });
})();
