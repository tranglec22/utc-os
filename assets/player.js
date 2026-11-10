/* UTC.OS Mothership music player (Phase 9).
   Plays audio from two places, with no sign-in and no server:
     1. Files picked on this device. On Android the picker also lists the
        Google Drive app, so Drive songs can be picked directly.
     2. Google Drive share links ("Anyone with the link").
   The library is saved in this browser (IndexedDB) so it survives reloads.
   Nothing is uploaded anywhere. */
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const DB_NAME = "utcos-player";
  const STORE = "tracks";
  const LAST_KEY = "utcos-shell:playerLast";
  const VOL_KEY = "utcos-shell:playerVolume";

  /* ---------- Google Drive link handling ---------- */

  /* Returns { id } for a file link, { folder: true } for a folder link, or null. */
  function parseDriveLink(text) {
    const raw = String(text || "").trim();
    if (!raw) return null;
    if (/\/folders\//.test(raw) || /\/drive\/(u\/\d+\/)?(my-drive|shared)/.test(raw)) return { folder: true };
    const patterns = [
      /\/file\/d\/([\w-]{20,})/,
      /\/d\/([\w-]{20,})/,
      /[?&]id=([\w-]{20,})/,
      /^([\w-]{25,})$/,
    ];
    for (const re of patterns) {
      const m = raw.match(re);
      if (m) return { id: m[1] };
    }
    return null;
  }

  /* Direct-stream addresses Google serves for publicly shared files, tried in order. */
  function driveStreamUrls(id) {
    const safe = encodeURIComponent(id);
    return [
      "https://drive.usercontent.google.com/download?id=" + safe + "&export=download",
      "https://drive.google.com/uc?export=download&id=" + safe,
    ];
  }

  function driveEmbedUrl(id) {
    return "https://drive.google.com/file/d/" + encodeURIComponent(id) + "/preview";
  }

  /* ---------- Storage (IndexedDB, with an in-memory fallback) ---------- */

  let db = null;
  let memory = [];

  function openDb() {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  function dbAll() {
    if (!db) return Promise.resolve(memory.slice());
    return new Promise((resolve) => {
      try {
        const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  }

  function dbPut(track) {
    if (!db) {
      memory = memory.filter((t) => t.id !== track.id).concat(track);
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(track);
        tx.oncomplete = () => resolve(true);
        tx.onerror = tx.onabort = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  function dbDelete(id) {
    if (!db) {
      memory = memory.filter((t) => t.id !== id);
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = tx.onabort = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  function lsGet(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  /* ---------- State ---------- */

  let tracks = [];      // { id, name, kind: "file" | "drive", blob?, driveId?, addedAt }
  let current = -1;     // index into tracks
  let objectUrl = null; // blob URL of the file track that is loaded
  let driveAttempt = 0; // which driveStreamUrls() entry is being tried
  let embedFor = null;  // track id currently shown in Drive's own embedded player
  let loadTimer = null;
  let els = {};

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function fmt(sec) {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function say(text, kind) {
    els.status.textContent = text || "";
    els.status.className = "player-status" + (kind ? " " + kind : "");
    els.status.hidden = !text;
  }

  /* ---------- Rendering ---------- */

  function render() {
    const t = tracks[current] || null;
    const audio = els.audio;
    const playing = !!t && !audio.paused && !embedFor;
    els.title.textContent = t ? t.name : "Nothing loaded yet";
    els.sub.textContent = t
      ? (current + 1) + " of " + tracks.length + " · " + (t.kind === "drive" ? "Google Drive link" : "saved on this device")
      : "Add a song below to get started.";
    els.play.textContent = playing ? "Pause" : "Play";
    els.play.setAttribute("aria-label", playing ? "Pause" : "Play");
    els.play.disabled = !tracks.length;
    els.prev.disabled = els.next.disabled = tracks.length < 2;
    els.time.textContent = fmt(audio.currentTime) + " / " + fmt(audio.duration);
    els.progress.disabled = !(Number.isFinite(audio.duration) && audio.duration > 0);
    if (!els.progress.disabled && document.activeElement !== els.progress) {
      els.progress.value = Math.round((audio.currentTime / audio.duration) * 1000);
    } else if (els.progress.disabled) {
      els.progress.value = 0;
    }
    els.transport.hidden = !!embedFor;
    els.embedWrap.hidden = !embedFor;
    els.btn.classList.toggle("playing", playing);
    els.btn.setAttribute("aria-label", playing ? "Music player, playing " + t.name : "Music player");
  }

  function renderList() {
    const list = els.list;
    list.innerHTML = "";
    els.empty.hidden = tracks.length > 0;
    tracks.forEach((t, i) => {
      const row = document.createElement("div");
      row.className = "player-track" + (i === current ? " current" : "");
      row.setAttribute("role", "listitem");

      const pick = document.createElement("button");
      pick.type = "button";
      pick.className = "player-track-pick";
      const name = document.createElement("span");
      name.className = "player-track-name";
      name.textContent = t.name;
      const kind = document.createElement("span");
      kind.className = "player-track-kind";
      kind.textContent = t.kind === "drive" ? "Drive" : "Device";
      pick.appendChild(name);
      pick.appendChild(kind);
      pick.addEventListener("click", () => load(i, true));

      const del = document.createElement("button");
      del.type = "button";
      del.className = "player-track-del";
      del.setAttribute("aria-label", "Remove " + t.name);
      del.textContent = "×";
      del.addEventListener("click", () => removeTrack(t.id));

      row.appendChild(pick);
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  /* ---------- Playback ---------- */

  function clearSource() {
    clearTimeout(loadTimer);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
    embedFor = null;
    els.embed.removeAttribute("src");
  }

  function load(index, autoplay) {
    if (!tracks.length) return;
    current = ((index % tracks.length) + tracks.length) % tracks.length;
    const t = tracks[current];
    const audio = els.audio;
    audio.pause();
    clearSource();
    say("");
    lsSet(LAST_KEY, t.id);

    if (t.kind === "file") {
      if (!t.blob) {
        say("This song's file is no longer saved on this device. Remove it and add it again.", "warn");
        renderList();
        render();
        return;
      }
      objectUrl = URL.createObjectURL(t.blob);
      audio.src = objectUrl;
    } else {
      driveAttempt = 0;
      audio.src = driveStreamUrls(t.driveId)[0];
      if (autoplay) say("Loading from Google Drive…");
      // Drive sometimes answers with a web page instead of the song and never
      // reports an error, so give up on the direct stream after a while.
      loadTimer = setTimeout(() => {
        if (tracks[current] === t && !embedFor && !(audio.readyState >= 1)) driveFailed();
      }, 15000);
    }
    audio.load();
    renderList();
    render();
    if (autoplay) {
      const p = audio.play();
      if (p && p.catch) {
        p.catch((err) => {
          // NotAllowedError = the browser wants a tap first. Source errors are
          // handled by the "error" event below.
          if (err && err.name === "NotAllowedError") say("Tap Play to start the music.");
          render();
        });
      }
    }
  }

  function driveFailed() {
    const t = tracks[current];
    if (!t || t.kind !== "drive") return;
    clearTimeout(loadTimer);
    const urls = driveStreamUrls(t.driveId);
    if (driveAttempt + 1 < urls.length) {
      driveAttempt += 1;
      els.audio.src = urls[driveAttempt];
      els.audio.load();
      const p = els.audio.play();
      if (p && p.catch) p.catch(() => {});
      loadTimer = setTimeout(() => {
        if (tracks[current] === t && !embedFor && !(els.audio.readyState >= 1)) driveFailed();
      }, 15000);
      return;
    }
    // Last resort: Google's own embedded player. It plays any file shared as
    // "Anyone with the link", but it cannot be controlled from here.
    els.audio.removeAttribute("src");
    els.audio.load();
    embedFor = t.id;
    els.embed.src = driveEmbedUrl(t.driveId);
    say(
      "Google would not stream this file directly, so it is open in Google's own player above. " +
        "If that also shows an error, open the file in Drive, tap Share, and set General access to “Anyone with the link”.",
      "warn"
    );
    render();
  }

  function next() { if (tracks.length) load(current + 1, true); }
  function prev() { if (tracks.length) load(current - 1, true); }

  function togglePlay() {
    if (!tracks.length) return;
    if (current < 0) return load(0, true);
    const audio = els.audio;
    if (embedFor) return;
    if (!audio.currentSrc && !audio.src) return load(current, true);
    if (audio.paused) {
      const p = audio.play();
      if (p && p.catch) p.catch(() => say("That song could not start. Try tapping it in the list.", "warn"));
    } else {
      audio.pause();
    }
  }

  /* ---------- Library changes ---------- */

  async function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const audioFiles = files.filter((f) => /^audio\//.test(f.type) || /\.(mp3|m4a|aac|wav|flac|ogg|oga|opus|weba)$/i.test(f.name));
    const skipped = files.length - audioFiles.length;
    if (!audioFiles.length) {
      say("Those files are not audio. Pick MP3, M4A, WAV, FLAC or OGG files.", "warn");
      return;
    }
    const wasEmpty = tracks.length === 0;
    const firstNew = tracks.length;
    let unsaved = 0;
    for (const f of audioFiles) {
      const t = { id: uid(), name: f.name.replace(/\.[^.]+$/, ""), kind: "file", blob: f, addedAt: Date.now() };
      tracks.push(t);
      if (!(await dbPut(t))) unsaved += 1;
    }
    renderList();
    if (wasEmpty || els.audio.paused) load(firstNew, true);
    else render();
    // Shown after load(), which clears the status line.
    const saved = !(unsaved || !db);
    say(
      audioFiles.length + " song" + (audioFiles.length === 1 ? "" : "s") + " added" +
        (saved ? " and saved on this device." : ", but they could not be saved on this device, so they will be gone after you close the app.") +
        (skipped ? " " + skipped + " file" + (skipped === 1 ? " was" : "s were") + " skipped because " + (skipped === 1 ? "it is" : "they are") + " not audio." : ""),
      saved ? "ok" : "warn"
    );
  }

  async function addDriveLink() {
    const parsed = parseDriveLink(els.link.value);
    if (!parsed) {
      say("That does not look like a Google Drive link. In Drive, open the song's ⋮ menu, tap Share → Copy link, and paste it here.", "warn");
      els.link.focus();
      return;
    }
    if (parsed.folder) {
      say("That is a folder link. A folder cannot be read without signing in to Google, so add each song's own link instead, or use “Add from this device” and pick the songs from the Drive app.", "warn");
      els.link.focus();
      return;
    }
    if (tracks.some((t) => t.kind === "drive" && t.driveId === parsed.id)) {
      say("That Drive song is already in your list.", "warn");
      return;
    }
    const typed = els.linkName.value.trim();
    const count = tracks.filter((t) => t.kind === "drive").length + 1;
    const t = { id: uid(), name: typed || "Drive song " + count, kind: "drive", driveId: parsed.id, addedAt: Date.now() };
    tracks.push(t);
    await dbPut(t);
    els.link.value = "";
    els.linkName.value = "";
    renderList();
    load(tracks.length - 1, true);
  }

  async function removeTrack(id) {
    const i = tracks.findIndex((t) => t.id === id);
    if (i < 0) return;
    const wasCurrent = i === current;
    tracks.splice(i, 1);
    await dbDelete(id);
    if (wasCurrent) {
      els.audio.pause();
      clearSource();
      els.audio.removeAttribute("src");
      els.audio.load();
      current = tracks.length ? Math.min(i, tracks.length - 1) : -1;
      if (current >= 0) load(current, false);
    } else if (i < current) {
      current -= 1;
    }
    say("");
    renderList();
    render();
  }

  /* ---------- Panel ---------- */

  function setOpen(open) {
    els.panel.classList.toggle("open", open);
    els.btn.setAttribute("aria-expanded", String(open));
    if (open) els.close.focus();
  }

  function build() {
    const panel = document.createElement("section");
    panel.className = "player-panel";
    panel.id = "playerPanel";
    panel.setAttribute("aria-label", "Music player");
    panel.innerHTML =
      '<div class="player-head">' +
        '<div class="player-now"><div class="section-label">Music</div>' +
        '<div class="player-title" id="playerTitle"></div><div class="player-sub" id="playerSub"></div></div>' +
        '<button type="button" class="player-close" id="playerClose" aria-label="Close music player">×</button>' +
      "</div>" +
      '<div id="playerTransport">' +
        '<input type="range" class="player-progress" id="playerProgress" min="0" max="1000" value="0" aria-label="Position in song" />' +
        '<div class="player-controls">' +
          '<button type="button" class="btn btn-outline" id="playerPrev" aria-label="Previous song">Prev</button>' +
          '<button type="button" class="btn btn-gold" id="playerPlay">Play</button>' +
          '<button type="button" class="btn btn-outline" id="playerNext" aria-label="Next song">Next</button>' +
          '<span class="player-time" id="playerTime">0:00 / 0:00</span>' +
        "</div>" +
        '<label class="player-volume">Volume <input type="range" id="playerVolume" min="0" max="1" step="0.01" aria-label="Volume" /></label>' +
      "</div>" +
      '<div class="player-embed" id="playerEmbedWrap" hidden><iframe id="playerEmbed" title="Google Drive player" allow="autoplay" loading="lazy"></iframe></div>' +
      '<p class="player-status" id="playerStatus" role="status" hidden></p>' +
      '<div class="player-list" id="playerList" role="list" aria-label="Your songs"></div>' +
      '<p class="player-empty" id="playerEmpty">No songs yet.</p>' +
      '<div class="player-add">' +
        '<button type="button" class="btn btn-gold btn-block" id="playerAddFiles">Add from this device</button>' +
        '<p class="player-hint">On Android, the file chooser also lists Google Drive, so you can pick your Drive songs right there.</p>' +
        '<details class="player-drive"><summary>Add a Google Drive link instead</summary>' +
          '<label for="playerLink">Drive share link</label>' +
          '<input type="url" id="playerLink" placeholder="https://drive.google.com/file/d/…" autocomplete="off" inputmode="url" />' +
          '<label for="playerLinkName">Song name (optional)</label>' +
          '<input type="text" id="playerLinkName" placeholder="Name to show in your list" autocomplete="off" />' +
          '<button type="button" class="btn btn-outline btn-block" id="playerAddLink">Add Drive song</button>' +
          '<p class="player-hint">The file must be shared as “Anyone with the link”. In Drive: ⋮ → Share → General access → Anyone with the link → Copy link.</p>' +
        "</details>" +
      "</div>" +
      '<input type="file" id="playerFiles" accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus" multiple hidden />' +
      '<audio id="playerAudio" preload="metadata"></audio>';
    (document.getElementById("app") || document.body).appendChild(panel);

    els = {
      panel,
      btn: $("#btnMusic"),
      title: $("#playerTitle"), sub: $("#playerSub"), close: $("#playerClose"),
      transport: $("#playerTransport"), progress: $("#playerProgress"),
      prev: $("#playerPrev"), play: $("#playerPlay"), next: $("#playerNext"),
      time: $("#playerTime"), volume: $("#playerVolume"),
      embedWrap: $("#playerEmbedWrap"), embed: $("#playerEmbed"),
      status: $("#playerStatus"), list: $("#playerList"), empty: $("#playerEmpty"),
      addFiles: $("#playerAddFiles"), files: $("#playerFiles"),
      link: $("#playerLink"), linkName: $("#playerLinkName"), addLink: $("#playerAddLink"),
      audio: $("#playerAudio"),
    };
  }

  function wire() {
    const audio = els.audio;
    els.btn.addEventListener("click", () => setOpen(!els.panel.classList.contains("open")));
    els.close.addEventListener("click", () => { setOpen(false); els.btn.focus(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.panel.classList.contains("open")) { setOpen(false); els.btn.focus(); }
    });
    document.querySelectorAll("[data-open-player]").forEach((b) => b.addEventListener("click", () => setOpen(true)));

    els.play.addEventListener("click", togglePlay);
    els.prev.addEventListener("click", prev);
    els.next.addEventListener("click", next);
    els.progress.addEventListener("input", () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = (Number(els.progress.value) / 1000) * audio.duration;
      }
    });
    const vol = Number(lsGet(VOL_KEY, 0.9));
    audio.volume = vol >= 0 && vol <= 1 ? vol : 0.9;
    els.volume.value = String(audio.volume);
    els.volume.addEventListener("input", () => {
      audio.volume = Number(els.volume.value);
      lsSet(VOL_KEY, audio.volume);
    });

    els.addFiles.addEventListener("click", () => els.files.click());
    els.files.addEventListener("change", () => {
      addFiles(els.files.files);
      els.files.value = "";
    });
    els.addLink.addEventListener("click", addDriveLink);
    els.link.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addDriveLink(); } });
    els.linkName.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addDriveLink(); } });

    ["play", "pause", "timeupdate", "durationchange", "emptied"].forEach((ev) => audio.addEventListener(ev, render));
    audio.addEventListener("loadedmetadata", () => {
      clearTimeout(loadTimer);
      const t = tracks[current];
      if (t && t.kind === "drive") say("");
      render();
    });
    audio.addEventListener("ended", () => {
      if (tracks.length > 1) next();
      else render();
    });
    audio.addEventListener("error", () => {
      const t = tracks[current];
      if (!t || !audio.getAttribute("src")) return;
      if (t.kind === "drive") driveFailed();
      else say("This browser could not play that file. It may be a format it does not support; MP3 and M4A are the safest.", "warn");
      render();
    });

    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("play", () => audio.play());
        navigator.mediaSession.setActionHandler("pause", () => audio.pause());
        navigator.mediaSession.setActionHandler("previoustrack", prev);
        navigator.mediaSession.setActionHandler("nexttrack", next);
      } catch (e) { /* older browsers */ }
      audio.addEventListener("play", () => {
        const t = tracks[current];
        if (!t) return;
        try {
          navigator.mediaSession.metadata = new MediaMetadata({ title: t.name, artist: "Lil Wiz-Nap", album: "UTC.OS" });
        } catch (e) { /* older browsers */ }
      });
    }
  }

  async function start() {
    if (!$("#btnMusic") || $("#playerPanel")) return;
    build();
    wire();
    renderList();
    render();
    db = await openDb();
    tracks = (await dbAll()).sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
    renderList();
    if (tracks.length) {
      const last = lsGet(LAST_KEY, null);
      const i = tracks.findIndex((t) => t.id === last);
      const t = tracks[i >= 0 ? i : 0];
      // File songs are queued up ready to play. Drive songs are only fetched
      // when you press Play, so opening the app never touches the network.
      if (t.kind === "file") load(i >= 0 ? i : 0, false);
      else { current = i >= 0 ? i : 0; renderList(); }
    }
    render();
  }

  // Exposed for tests and for other Mothership code.
  window.UTCOSPlayer = { parseDriveLink, driveStreamUrls, open: () => setOpen(true) };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
