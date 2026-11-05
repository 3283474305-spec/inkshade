/* ============================================================
   音乐播放器（单页应用版）
   - 完整播放器和底部迷你条共用同一个 <audio>，切换页面不会中断
   - 播放列表 + 歌词面板
   - 随机 / 循环 / 音量 / 本地文件
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const audio = $("#audio");
  const playBtn = $("#playBtn");
  if (!audio || !playBtn) return;

  /* ---------- 元素 ---------- */
  const shell = $("#playerShell");
  const disc = $("#disc");
  const discImg = $("#discCover");
  const viz = $("#viz");

  const npTitle = $("#npTitle");
  const npArtist = $("#npArtist");
  const curTimeEl = $("#curTime");
  const durTimeEl = $("#durTime");
  const seek = $("#seek");
  const seekFill = $("#seekFill");
  const prevBtn = $("#prevBtn");
  const nextBtn = $("#nextBtn");
  const shuffleBtn = $("#shuffleBtn");
  const repeatBtn = $("#repeatBtn");
  const volume = $("#volume");
  const volText = $("#volText");

  const playlistEl = $("#playlist");
  const plCount = $("#plCount");

  const lyricsEl = $("#lyrics");
  const playlistPanel = $("#panel-playlist");
  const lyricsPanel = $("#panel-lyrics");
  const tabs = $$(".pl-tab");

  const mini = {
    bar: $("#miniBar"),
    cover: $("#miniCover"),
    title: $("#miniTitle"),
    artist: $("#miniArtist"),
    play: $("#miniPlay"),
    prev: $("#miniPrev"),
    next: $("#miniNext"),
    repeat: $("#miniRepeat"),
    vol: $("#miniVol"),
    close: $("#miniClose"),
    seek: $("#miniSeek"),
    fill: $("#miniFill"),
    volume: $("#miniVolume"),
    range: $("#miniVolRange"),
    mute: $("#miniMute"),
  };

  /* ---------- 图标 ---------- */
  const ICONS = {
    play: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72L19 12z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M7 5h2v14H7zm12 0v14l-9.5-7z"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M15 5h2v14h-2zM5 5v14l9.5-7z"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    vol: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>',
    mute: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><line x1="16" y1="9" x2="21" y2="15"/><line x1="21" y1="9" x2="16" y2="15"/></svg>',
  };

  playBtn.innerHTML = ICONS.play;
  prevBtn.innerHTML = ICONS.prev;
  nextBtn.innerHTML = ICONS.next;
  shuffleBtn.innerHTML = ICONS.shuffle;
  repeatBtn.innerHTML = ICONS.repeat;

  if (mini.play) {
    mini.play.innerHTML = ICONS.play;
    mini.prev.innerHTML = ICONS.prev;
    mini.next.innerHTML = ICONS.next;
    mini.repeat.innerHTML = ICONS.repeat;
    mini.vol.innerHTML = ICONS.vol;
  }

  /* ---------- 曲库：只保留网易云 ---------- */
  const NETEASE_COVER = "images/cover-netease.jpg";
  const list = [];

  const DEMO_TRACKS = [
    {
      title: "First Light",
      artist: "Jinghang Zhang",
      src: "audio/first-light.wav",
      cover: "images/demo-first-light.jpg",
      duration: 20,
      demo: true,
      lyrics: [
        { t: 0, text: "First light on the floor" },
        { t: 4, text: "A slow room waking up" },
        { t: 8, text: "Hold the quiet" },
        { t: 12, text: "Let the morning in" },
        { t: 16, text: "First light" }
      ]
    },
    {
      title: "Night Drive",
      artist: "Jinghang Zhang",
      src: "audio/night-drive.wav",
      cover: "images/demo-night-drive.jpg",
      duration: 20,
      demo: true,
      lyrics: [
        { t: 0, text: "City lights in the glass" },
        { t: 4, text: "No destination" },
        { t: 8, text: "The radio hums" },
        { t: 12, text: "Keep the night moving" },
        { t: 16, text: "Night drive" }
      ]
    },
    {
      title: "Paper Sky",
      artist: "Jinghang Zhang",
      src: "audio/paper-sky.wav",
      cover: "images/demo-paper-sky.jpg",
      duration: 20,
      demo: true,
      lyrics: [
        { t: 0, text: "Paper sky" },
        { t: 4, text: "Fold it into blue" },
        { t: 8, text: "A small horizon" },
        { t: 12, text: "Let it drift" },
        { t: 16, text: "Paper sky" }
      ]
    }
  ];

  const STORE_KEY = "music-session";
  let lastSave = 0;

  let current = 0;
  let playing = false;
  let shuffle = localStorage.getItem("player-shuffle") === "1";
  let repeat = localStorage.getItem("player-repeat") || "all";
  let dragging = false;
  let hasStarted = false;
  let dismissed = false;
  let activeLyric = -1;
  const smoothed = [];
  let zeroSince = 0;

  /* ---------- 小提示 ---------- */
  let toastEl = null;
  let toastTimer = null;
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
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2000);
  }

  document.addEventListener("app:toast", (e) => {
    if (e.detail) toast(String(e.detail));
  });

  /* ---------- 工具 ---------- */
  function fmt(sec) {
    if (!isFinite(sec) || sec <= 0) return "--:--";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function saveSession() {
    if (!list[current]) return;
    try {
      sessionStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          i: current,
          t: audio.currentTime || 0,
          playing: !audio.paused && !audio.ended,
          ts: Date.now(),
        })
      );
    } catch (e) {
      /* ignore */
    }
  }

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function seekableEnd() {
    return audio.seekable.length ? audio.seekable.end(audio.seekable.length - 1) : 0;
  }

  // 有些静态服务器不支持分段请求，音频未完整缓冲前 seekable 是 0，
  // 这时候直接改 currentTime 会被重置，所以等可以跳转了再跳。
  function seekTo(target) {
    if (!isFinite(audio.duration) || audio.duration <= 0) return;
    const t = Math.min(Math.max(target, 0), audio.duration - 0.05);
    if (seekableEnd() >= t - 0.15) {
      audio.currentTime = t;
      return;
    }
    toast("Audio is still loading — seeking shortly…");
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (seekableEnd() >= t - 0.15) {
        clearInterval(timer);
        audio.currentTime = t;
      } else if (tries > 50) {
        clearInterval(timer);
        toast("This track cannot be seeked yet");
      }
    }, 120);
  }

  function shuffledIndex() {
    if (list.length < 2) return current;
    let i;
    do {
      i = Math.floor(Math.random() * list.length);
    } while (i === current);
    return i;
  }

  /* ---------- 播放列表 ---------- */
  function renderPlaylist() {
    if (!playlistEl) return;
    playlistEl.innerHTML = "";

    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "pl-empty";
      empty.textContent = "No tracks yet — search NetEase to add one.";
      playlistEl.appendChild(empty);
      if (plCount) plCount.textContent = "0 tracks";
      return;
    }

    list.forEach((t, i) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "track" + (i === current ? " active" : "");
      row.setAttribute("aria-label", "Play " + t.title);

      const num = document.createElement("span");
      num.className = "track-num";
      num.innerHTML =
        i === current && playing
          ? '<span class="eq"><i></i><i></i><i></i></span>'
          : String(i + 1).padStart(2, "0");

      const img = document.createElement("img");
      img.className = "track-cover";
      img.src = t.cover;
      img.alt = "";
      img.loading = "lazy";

      const meta = document.createElement("span");
      meta.className = "track-meta";
      meta.innerHTML =
        '<span class="track-title"></span><span class="track-artist"></span>';
      meta.querySelector(".track-title").textContent = t.title;
      meta.querySelector(".track-artist").textContent = t.artist;

      const dur = document.createElement("span");
      dur.className = "track-dur";
      dur.textContent = t.duration ? fmt(t.duration) : "--:--";

      row.append(num, img, meta, dur);
      row.addEventListener("click", () => {
        if (i === current) {
          playing ? pause() : play();
        } else {
          load(i, true);
        }
      });
      playlistEl.appendChild(row);
    });

    if (plCount) plCount.textContent = list.length + " tracks";
  }

  /* ---------- 歌词 ---------- */
  function lyricLines() {
    const track = list[current];
    if (!track) return [];
    if (track.lyrics) return track.lyrics;
    return (window.LYRICS || {})[track.src] || [];
  }

  function renderLyrics() {
    if (!lyricsEl) return;
    const lines = lyricLines();
    activeLyric = -1;
    lyricsEl.innerHTML = "";

    if (!lines.length) {
      const p = document.createElement("p");
      p.className = "lyrics-empty";
      const track = list[current];
      p.textContent = !track
        ? "No track playing"
        : track.neteaseId && track._lyricLoading
        ? "Loading lyrics…"
        : "No lyrics for this track.";
      lyricsEl.appendChild(p);
      return;
    }

    lines.forEach((line, i) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "lyric-line";
      item.dataset.i = String(i);
      item.textContent = line.text;
      item.addEventListener("click", () => {
        seekTo(line.t);
        if (!playing) play();
      });
      lyricsEl.appendChild(item);
    });

    // Even before playback starts, show the first line in the active style.
    const firstLine = lyricsEl.querySelector(".lyric-line");
    if (firstLine) {
      firstLine.classList.add("active");
      firstLine.style.setProperty("--lyric-progress", "0%");
      activeLyric = 0;
    }
  }

  function updateLyric(time) {
    if (!lyricsEl) return;
    const lines = lyricLines();
    if (!lines.length) return;

    let idx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (time >= lines[i].t - 0.12) idx = i;
      else break;
    }

    // Mineradio-style karaoke fill: keep advancing the active line even when
    // the index does not change (timeupdate arrives a few times per second).
    const line = lines[idx];
    const next = lines[idx + 1];
    const start = line ? line.t : 0;
    const end = next ? next.t : start + 4;
    const progress = Math.max(0, Math.min(1, (time - start) / Math.max(0.4, end - start)));
    const activeElement = lyricsEl.children[idx];
    if (activeElement && activeElement.classList) {
      activeElement.style.setProperty("--lyric-progress", (progress * 100).toFixed(2) + "%");
    }

    if (idx === activeLyric) return;
    activeLyric = idx;

    $$(".lyric-line", lyricsEl).forEach((el, i) => {
      el.classList.toggle("active", i === idx);
      el.classList.toggle("passed", i < idx);
      if (i !== idx) el.style.setProperty("--lyric-progress", i < idx ? "100%" : "0%");
    });

    const el = lyricsEl.children[idx];
    if (el && el.scrollIntoView) {
      const top = el.offsetTop - lyricsEl.clientHeight / 2 + el.clientHeight / 2;
      lyricsEl.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  }

  /* ---------- 网易云音源 ---------- */
  function parseLrc(text) {
    const out = [];
    if (!text) return out;
    const re = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

    text.split(/\r?\n/).forEach((raw) => {
      const stamps = Array.from(raw.matchAll(re));
      if (!stamps.length) return;
      const txt = raw.replace(re, "").trim();
      if (!txt) return;
      stamps.forEach((m) => {
        const sec =
          parseInt(m[1], 10) * 60 +
          parseInt(m[2], 10) +
          (m[3] ? Number("0." + m[3]) : 0);
        out.push({ t: sec, text: txt });
      });
    });

    out.sort((a, b) => a.t - b.t);
    return out;
  }

  function loadNeteaseLyric(track) {
    if (!track || !track.neteaseId || track.lyrics || track._lyricLoading) return;
    track._lyricLoading = true;

    fetch("/api/netease/lyric?id=" + encodeURIComponent(track.neteaseId))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) track.lyrics = parseLrc(d.lrc || "");
      })
      .catch(() => {
        /* 拿不到歌词就算了 */
      })
      .finally(() => {
        track._lyricLoading = false;
        if (list[current] === track) renderLyrics();
      });
  }

  document.addEventListener("music:queue", (e) => {
    const d = e.detail || {};
    const tracks = Array.isArray(d.tracks) ? d.tracks : [];
    if (!tracks.length) return;

    let selected = -1;
    tracks.forEach((t, i) => {
      if (!t.id) return;
      let idx = list.findIndex((x) => x.neteaseId === t.id);
      if (idx < 0) {
        list.push({
          title: t.name || "Unknown track",
          artist: t.artist || "NetEase Music",
          src: "/api/netease/stream?id=" + t.id,
          cover: t.cover || NETEASE_COVER,
          duration: t.duration || 0,
          neteaseId: t.id,
        });
        idx = list.length - 1;
      }
      if (i === d.index) selected = idx;
    });

    if (selected < 0) selected = 0;
    renderPlaylist();
    load(selected, true);
    toast("Playlist loaded — starting playback");
  });

  document.addEventListener("music:add", (e) => {
    const d = e.detail || {};
    if (!d.id) return;

    const exist = list.findIndex((t) => t.neteaseId === d.id);
    if (exist >= 0) {
      load(exist, true);
      toast("Already in the queue — playing now");
      return;
    }

    list.push({
      title: d.name || "Unknown track",
      artist: d.artist || "NetEase Music",
      src: "/api/netease/stream?id=" + d.id,
      cover: d.cover || NETEASE_COVER,
      duration: d.duration || 0,
      neteaseId: d.id,
    });
    renderPlaylist();
    load(list.length - 1, true);
    toast("Added and playing: " + (d.name || ""));
  });

  /* ---------- 加载曲目 ---------- */
  function updateMiniMeta(t) {
    if (!mini.title) return;
    mini.title.textContent = t.title;
    mini.artist.textContent = t.artist;
    if (mini.cover) mini.cover.src = t.cover;
  }

  function load(i, autoplay) {
    if (!list.length) {
      showEmptyState();
      return;
    }
    current = (i + list.length) % list.length;
    const t = list[current];

    audio.src = t.src;
    npTitle.textContent = t.title;
    npArtist.textContent = t.artist;
    discImg.src = t.cover;
    if (shell) shell.style.setProperty("--cover", 'url("' + t.cover + '")');
    curTimeEl.textContent = "0:00";
    durTimeEl.textContent = t.duration ? fmt(t.duration) : "--:--";
    seekFill.style.width = "0%";
    if (mini.fill) mini.fill.style.width = "0%";
    updateMiniMeta(t);

    renderPlaylist();
    loadNeteaseLyric(t);
    renderLyrics();
    updateMediaSession();

    if (autoplay) play();
  }

  /* ---------- 播放状态 ---------- */
  function setPlayingUI(state) {
    playing = state;
    playBtn.innerHTML = state ? ICONS.pause : ICONS.play;
    playBtn.setAttribute("aria-label", state ? "Pause" : "Play");
    if (mini.play) {
      mini.play.innerHTML = state ? ICONS.pause : ICONS.play;
      mini.play.setAttribute("aria-label", state ? "Pause" : "Play");
    }
    if (disc) disc.classList.toggle("playing", state);
    if (playlistEl) playlistEl.classList.toggle("paused", !state);
    renderPlaylist();
  }

  function play(quiet) {
    if (!list.length) {
      toast("Pick a track first");
      return;
    }
    initAudioGraph();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    const p = audio.play();
    if (p && p.catch) {
      p.catch(() => {
        if (!quiet) toast("Press play to start");
        setPlayingUI(false);
      });
    }
  }

  function pause() {
    audio.pause();
  }

  function toggle() {
    playing ? pause() : play();
  }

  function next() {
    if (!list.length) return;
    if (shuffle) load(shuffledIndex(), playing);
    else load((current + 1) % list.length, playing);
  }

  function prev() {
    if (!list.length) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (shuffle) load(shuffledIndex(), playing);
    else load((current - 1 + list.length) % list.length, playing);
  }

  playBtn.addEventListener("click", toggle);
  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);

  /* ---------- 随机 / 循环 ---------- */
  function syncShuffleUI() {
    shuffleBtn.classList.toggle("on", shuffle);
    shuffleBtn.setAttribute("aria-pressed", String(shuffle));
  }

  function syncRepeatUI() {
    repeatBtn.classList.toggle("on", repeat !== "off");
    repeatBtn.dataset.mode = repeat;
    repeatBtn.setAttribute(
      "aria-label",
      repeat === "one" ? "Repeat one" : repeat === "all" ? "Repeat all" : "Repeat off"
    );
    if (mini.repeat) {
      mini.repeat.classList.toggle("on", repeat !== "off");
      mini.repeat.dataset.mode = repeat;
      mini.repeat.setAttribute(
        "aria-label",
        repeat === "one" ? "Repeat one" : repeat === "all" ? "Repeat all" : "Repeat off"
      );
    }
  }

  function cycleRepeat() {
    repeat = repeat === "off" ? "all" : repeat === "all" ? "one" : "off";
    localStorage.setItem("player-repeat", repeat);
    syncRepeatUI();
    toast(
      repeat === "off" ? "Repeat off" : repeat === "all" ? "Repeat all" : "Repeat one"
    );
  }

  shuffleBtn.addEventListener("click", () => {
    shuffle = !shuffle;
    localStorage.setItem("player-shuffle", shuffle ? "1" : "0");
    syncShuffleUI();
    toast(shuffle ? "Shuffle on" : "Shuffle off");
  });

  repeatBtn.addEventListener("click", cycleRepeat);

  /* ---------- 音量 ---------- */
  function syncVolumeUI() {
    const v = audio.volume;
    if (volume) volume.value = v;
    if (volText) volText.textContent = Math.round(v * 100) + "%";
    if (mini.range) mini.range.value = v;
    if (mini.vol) mini.vol.innerHTML = audio.muted || v === 0 ? ICONS.mute : ICONS.vol;
    if (mini.mute) mini.mute.textContent = audio.muted ? "Unmute" : "Mute";
  }

  function setVolume(v, persist) {
    v = Math.min(1, Math.max(0, v));
    audio.volume = v;
    if (v > 0) audio.muted = false;
    if (persist !== false) localStorage.setItem("player-volume", v);
    syncVolumeUI();
  }

  function toggleMute() {
    audio.muted = !audio.muted;
    if (!audio.muted && audio.volume === 0) setVolume(0.6, true);
    syncVolumeUI();
  }

  if (volume) {
    volume.addEventListener("input", () => setVolume(parseFloat(volume.value)));
  }

  if (mini.range) {
    mini.range.addEventListener("input", () => setVolume(parseFloat(mini.range.value)));
  }

  if (mini.vol) {
    mini.vol.addEventListener("click", (e) => {
      e.stopPropagation();
      if (mini.volume) mini.volume.classList.toggle("open");
    });
  }

  if (mini.mute) {
    mini.mute.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMute();
    });
  }

  document.addEventListener("click", (e) => {
    if (!mini.volume || !mini.volume.classList.contains("open")) return;
    if (mini.volume.contains(e.target) || (mini.vol && mini.vol.contains(e.target))) return;
    mini.volume.classList.remove("open");
  });

  /* ---------- 迷你播放器 ---------- */
  function showMini() {
    if (!mini.bar) return;
    mini.bar.classList.add("show");
    document.body.classList.add("has-mini");
  }

  function hideMini() {
    if (!mini.bar) return;
    mini.bar.classList.remove("show");
    document.body.classList.remove("has-mini");
  }

  function updateMiniVisibility() {
    const onMusic = document.body.dataset.page === "music";
    if (onMusic || !hasStarted || dismissed) hideMini();
    else showMini();
  }

  if (mini.play) {
    mini.play.addEventListener("click", toggle);
    mini.prev.addEventListener("click", prev);
    mini.next.addEventListener("click", next);
    mini.repeat.addEventListener("click", cycleRepeat);
    mini.close.addEventListener("click", () => {
      audio.pause();
      dismissed = true;
      hideMini();
    });
  }

  if (mini.seek) {
    mini.seek.addEventListener("pointerdown", (e) => {
      if (!isFinite(audio.duration) || !audio.duration) return;
      const r = mini.seek.getBoundingClientRect();
      const ratio = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
      seekTo(ratio * audio.duration);
      mini.fill.style.width = ratio * 100 + "%";
    });
  }

  /* ---------- 音频事件 ---------- */
  audio.addEventListener("play", () => {
    hasStarted = true;
    dismissed = false;
    setPlayingUI(true);
    updateMiniVisibility();
    saveSession();
  });

  audio.addEventListener("pause", () => {
    setPlayingUI(false);
    saveSession();
  });

  audio.addEventListener("loadedmetadata", () => {
    const t = list[current];
    if (t) t.duration = audio.duration;
    durTimeEl.textContent = fmt(audio.duration);
    renderPlaylist();
    updateMediaSession();
  });

  audio.addEventListener("timeupdate", () => {
    const d = audio.duration || 0;
    const p = d ? (audio.currentTime / d) * 100 : 0;

    if (!dragging) {
      seekFill.style.width = p + "%";
      curTimeEl.textContent = fmt(audio.currentTime);
      seek.setAttribute("aria-valuenow", Math.round(p));
    }
    if (mini.fill && !dragging) mini.fill.style.width = p + "%";

    updateLyric(audio.currentTime);

    const now = Date.now();
    if (now - lastSave > 800) {
      lastSave = now;
      saveSession();
    }
  });

  audio.addEventListener("ended", () => {
    if (repeat === "one") {
      audio.currentTime = 0;
      play();
      return;
    }
    if (repeat === "off" && current === list.length - 1) {
      setPlayingUI(false);
      seekFill.style.width = "0%";
      curTimeEl.textContent = "0:00";
      return;
    }
    next();
  });

  audio.addEventListener("error", () => {
    toast("This track failed to load (it may require NetEase VIP).");
    setPlayingUI(false);
  });

  /* ---------- 进度条拖动 ---------- */
  function seekRatio(e) {
    const rect = seek.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    return rect.width ? x / rect.width : 0;
  }

  function applySeek(ratio) {
    const d = audio.duration;
    if (!d) return;
    seekFill.style.width = ratio * 100 + "%";
    curTimeEl.textContent = fmt(ratio * d);
  }

  seek.addEventListener("pointerdown", (e) => {
    if (!audio.duration) return;
    dragging = true;
    seek.classList.add("dragging");
    try {
      seek.setPointerCapture(e.pointerId);
    } catch (err) {
      /* ignore */
    }
    applySeek(seekRatio(e));
  });

  seek.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    applySeek(seekRatio(e));
  });

  seek.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;
    seek.classList.remove("dragging");
    if (isFinite(audio.duration)) seekTo(seekRatio(e) * audio.duration);
  });

  seek.addEventListener("pointercancel", () => {
    dragging = false;
    seek.classList.remove("dragging");
  });

  /* ---------- 歌词面板切换 ---------- */
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const key = tab.dataset.tab;
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", String(on));
      });
      $$(".pl-panel").forEach((p) => {
        p.hidden = p.id !== "panel-" + key;
      });
      if (key === "lyrics") updateLyric(audio.currentTime);
      if (key === "netease") {
        document.dispatchEvent(new CustomEvent("netease:open"));
      }
    });
  });

  /* ---------- Web Audio 频谱 ---------- */
  let audioCtx = null;
  let analyser = null;
  let freqData = null;

  function initAudioGraph() {
    if (audioCtx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
    const src = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.82;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    src.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  function accentColors() {
    const cs = getComputedStyle(document.documentElement);
    return [
      cs.getPropertyValue("--accent").trim() || "#6366f1",
      cs.getPropertyValue("--accent-2").trim() || "#a855f7",
    ];
  }

  const canvas = viz ? viz.getContext("2d") : null;
  let dpr = 1;

  function resizeViz() {
    if (!viz) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = viz.clientWidth;
    const h = viz.clientHeight;
    viz.width = Math.max(1, Math.round(w * dpr));
    viz.height = Math.max(1, Math.round(h * dpr));
    canvas.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const BARS = 56;
  let vizColors = ["#6366f1", "#a855f7"];
  let vizGrad = null;
  let vizGradKey = "";

  function refreshVizPalette() {
    vizColors = accentColors();
    vizGradKey = "";
  }

  function drawViz() {
    requestAnimationFrame(drawViz);
    if (!viz || !canvas) return;
    // 不在音乐页时不必绘制，省掉每帧的计算
    if (document.body.dataset.page !== "music") return;
    const w = viz.clientWidth;
    const h = viz.clientHeight;
    if (!w || !h) return;

    canvas.clearRect(0, 0, w, h);

    let usingReal = false;
    if (analyser && playing) {
      analyser.getByteFrequencyData(freqData);
      let sum = 0;
      for (let k = 0; k < freqData.length; k++) sum += freqData[k];
      usingReal = sum > 0;
      if (usingReal) zeroSince = 0;
      else if (!zeroSince) zeroSince = performance.now();
    } else {
      zeroSince = 0;
    }
    const fallback =
      playing &&
      (!analyser || (!usingReal && zeroSince && performance.now() - zeroSince > 1200));

    const key = w + "x" + h + "|" + vizColors[0] + vizColors[1];
    if (key !== vizGradKey) {
      vizGradKey = key;
      vizGrad = canvas.createLinearGradient(0, h, 0, 0);
      vizGrad.addColorStop(0, vizColors[0]);
      vizGrad.addColorStop(1, vizColors[1]);
    }

    const gap = w / BARS;
    const barW = Math.max(1.5, gap * 0.55);
    const phase = performance.now() / 1000;

    for (let i = 0; i < BARS; i++) {
      let target = 0;
      if (usingReal) {
        const idx = Math.floor((i / BARS) * freqData.length * 0.75);
        target = Math.pow(freqData[idx] / 255, 1.15) * 1.45;
        target = Math.min(1, target + 0.025);
      } else if (fallback) {
        target =
          0.16 +
          0.34 * Math.abs(Math.sin(phase * 1.6 + i * 0.42)) +
          0.18 * Math.abs(Math.sin(phase * 0.7 + i * 1.13));
      }
      smoothed[i] = smoothed[i] === undefined ? 0 : smoothed[i];
      smoothed[i] += (target - smoothed[i]) * 0.22;

      const bh = Math.max(2, smoothed[i] * (h - 6));
      const x = i * gap + (gap - barW) / 2;
      const y = h - bh;
      canvas.fillStyle = vizGrad;
      canvas.globalAlpha = 0.35 + smoothed[i] * 0.65;
      const r = barW / 2;
      canvas.beginPath();
      canvas.moveTo(x + r, y);
      canvas.lineTo(x + barW - r, y);
      canvas.arcTo(x + barW, y, x + barW, y + r, r);
      canvas.lineTo(x + barW, h - r);
      canvas.arcTo(x + barW, h, x + barW - r, h, r);
      canvas.lineTo(x + r, h);
      canvas.arcTo(x, h, x, h - r, r);
      canvas.lineTo(x, y + r);
      canvas.arcTo(x, y, x + r, y, r);
      canvas.closePath();
      canvas.fill();
    }
    canvas.globalAlpha = 1;
  }

  /* ---------- 系统媒体控制 ---------- */
  function updateMediaSession() {
    if (!("mediaSession" in navigator)) return;
    const t = list[current];
    if (!t) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title,
        artist: t.artist,
        album: "Jinhang Zhang",
        artwork: [{ src: t.cover, sizes: "640x640", type: "image/jpeg" }],
      });
      navigator.mediaSession.setActionHandler("play", () => play());
      navigator.mediaSession.setActionHandler("pause", () => pause());
      navigator.mediaSession.setActionHandler("previoustrack", () => prev());
      navigator.mediaSession.setActionHandler("nexttrack", () => next());
    } catch (e) {
      /* 不支持就算了 */
    }
  }

  /* ---------- 键盘快捷键 ---------- */
  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable) {
      return;
    }
    if (e.code === "Space") {
      e.preventDefault();
      toggle();
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      seekTo(audio.currentTime + 5);
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      seekTo(audio.currentTime - 5);
    }
  });

  /* ---------- 路由联动 ---------- */
  document.addEventListener("routechange", (e) => {
    updateMiniVisibility();
    if (e.detail === "music") {
      updateLyric(audio.currentTime);
      requestAnimationFrame(resizeViz);
    }
  });

  function showEmptyState() {
    npTitle.textContent = "No track selected";
    npArtist.textContent = "Search NetEase or pick a demo";
    discImg.src = NETEASE_COVER;
    if (shell) shell.style.setProperty("--cover", 'url("' + NETEASE_COVER + '")');
    curTimeEl.textContent = "0:00";
    durTimeEl.textContent = "--:--";
    seekFill.style.width = "0%";
    if (mini.fill) mini.fill.style.width = "0%";
    renderPlaylist();
    renderLyrics();
    updateMiniVisibility();
  }

  /* ---------- 初始化 ---------- */
  const savedVol = parseFloat(localStorage.getItem("player-volume"));
  audio.volume = isNaN(savedVol) ? 0.8 : Math.min(1, Math.max(0, savedVol));
  audio.muted = false;
  syncVolumeUI();

  syncShuffleUI();
  syncRepeatUI();
  refreshVizPalette();
  document.addEventListener("themechange", refreshVizPalette);
  resizeViz();
  drawViz();

  window.addEventListener("resize", resizeViz);
  if ("ResizeObserver" in window && viz) {
    new ResizeObserver(() => resizeViz()).observe(viz);
  }

  window.addEventListener("pagehide", saveSession);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveSession();
  });

  // Built-in demo queue: playable offline and on the static site.
  list.push(...DEMO_TRACKS);
  renderPlaylist();
  load(0, false);

  // 首页音乐卡片：跳到音乐页并打开网易云搜索
  const promoPlay = document.getElementById("mpPlay");
  if (promoPlay) {
    promoPlay.addEventListener("click", () => {
      location.hash = "#music";
      if (!playing) play();
    });
  }
})();
