
/* Cosmic Mothership living behavior layer.
   Keeps the base shell untouched and adds persistent audio + truthful refresh/radar states. */
(() => {
  "use strict";

  const STORAGE_KEY = "utcos-living:last-checks";
  const $ = (sel, root = document) => root.querySelector(sel);

  function formatClock(ms) {
    if (!ms) return "Not checked";
    const d = new Date(ms);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function safeReadChecks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (_) {
      return {};
    }
  }

  function safeWriteChecks(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (_) {}
  }

  function activeViewName() {
    const active = $(".view.active");
    return active?.dataset?.view || "system";
  }

  function scopeName(view) {
    const labels = {
      "lead-center": "Job Radar",
      today: "Daily systems",
      memory: "Second Brain",
      knowledge: "Knowledge",
      studio: "Studio library",
      connections: "Connections",
      home: "Mothership",
    };
    return labels[view] || "System";
  }

  function createToast() {
    const toast = document.createElement("div");
    toast.className = "living-toast";
    toast.id = "livingToast";
    document.body.appendChild(toast);
    let timer = null;
    return (message) => {
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(timer);
      timer = setTimeout(() => toast.classList.remove("show"), 2400);
    };
  }

  function installRefresh(showToast) {
    const headerSub = $(".header-sub");
    if (!headerSub || $("#livingRefresh")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = "livingRefresh";
    button.className = "living-refresh";
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M20 7v5h-5"/><path d="M4 17v-5h5"/>
        <path d="M6.1 8.3A7 7 0 0118.8 6L20 12"/>
        <path d="M17.9 15.7A7 7 0 015.2 18L4 12"/>
      </svg>
      <span class="living-refresh-text">Refresh</span>
      <span class="living-refresh-meta"></span>
    `;
    const workspace = $(".workspace-select", headerSub);
    headerSub.insertBefore(button, workspace || null);

    const radarView = $("#view-lead-center");
    let radarStrip = null;
    if (radarView) {
      radarStrip = document.createElement("div");
      radarStrip.className = "living-radar-strip";
      radarStrip.id = "livingRadarStrip";
      radarStrip.innerHTML = `
        <div class="living-radar-row">
          <div>
            <div class="living-radar-title">Job Radar · active surface</div>
            <div class="living-radar-copy" id="livingRadarCopy">Ready to check local lead state.</div>
          </div>
          <span class="living-dot" aria-hidden="true"></span>
        </div>
      `;
      radarView.insertBefore(radarStrip, radarView.firstChild);
    }

    const checks = safeReadChecks();

    function renderMeta() {
      const view = activeViewName();
      const meta = $(".living-refresh-meta", button);
      const label = $(".living-refresh-text", button);
      if (label) label.textContent = scopeName(view);
      if (meta) meta.textContent = formatClock(checks[view]);
      if (view === "lead-center" && radarStrip) {
        const copy = $("#livingRadarCopy");
        if (copy) {
          copy.textContent = checks[view]
            ? `Last checked ${formatClock(checks[view])} · live source not connected in this shell.`
            : "Ready to check local lead state · live source not connected in this shell.";
        }
      }
    }

    function requestRefresh() {
      if (button.classList.contains("scanning")) return;
      const view = activeViewName();
      const beforeLeadCount = document.querySelectorAll("#view-lead-center .lead-card").length;
      button.classList.add("scanning");
      radarStrip?.classList.add("scanning");

      const detail = {
        scope: view,
        requestedAt: Date.now(),
        source: "living-ui",
        liveHandled: false,
      };
      window.dispatchEvent(new CustomEvent("utcos:refresh-requested", { detail }));

      setTimeout(() => {
        const afterLeadCount = document.querySelectorAll("#view-lead-center .lead-card").length;
        checks[view] = Date.now();
        safeWriteChecks(checks);
        button.classList.remove("scanning");
        radarStrip?.classList.remove("scanning");
        renderMeta();

        if (view === "lead-center") {
          const delta = Math.max(0, afterLeadCount - beforeLeadCount);
          const message = detail.liveHandled
            ? (delta ? `${delta} new lead${delta === 1 ? "" : "s"} found.` : "Radar check complete. No new leads.")
            : (delta ? `${delta} new local lead${delta === 1 ? "" : "s"} appeared.` : "Local lead state checked. Live Job Radar feed is not connected yet.");
          const copy = $("#livingRadarCopy");
          if (copy) copy.textContent = message + ` · ${formatClock(checks[view])}`;
          showToast(message);
        } else {
          showToast(`${scopeName(view)} refreshed at ${formatClock(checks[view])}.`);
        }
      }, 1050);
    }

    button.addEventListener("click", requestRefresh);

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-nav]")) {
        setTimeout(renderMeta, 40);
      }
    });

    window.UTCOSLivingRefresh = {
      request: requestRefresh,
      markLiveHandled() {
        /* Backends can listen for utcos:refresh-requested and update DOM/data before scan completion. */
      },
    };

    renderMeta();
  }

  function installPlayer(showToast) {
    if ($("#livingSpeaker")) return;

    const speaker = document.createElement("button");
    speaker.type = "button";
    speaker.className = "living-speaker";
    speaker.id = "livingSpeaker";
    speaker.setAttribute("aria-label", "Open global music player");
    speaker.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M5 10v4h3l5 4V6L8 10H5z"/>
        <path d="M16 9.2a4 4 0 010 5.6"/>
        <path d="M18.5 6.8a7.5 7.5 0 010 10.4"/>
      </svg>
    `;

    const player = document.createElement("section");
    player.className = "living-player";
    player.id = "livingPlayer";
    player.setAttribute("aria-label", "Global music player");
    player.innerHTML = `
      <div class="living-player-head">
        <div class="living-player-title">
          <div class="living-player-eyebrow">Lil Wiznap · global audio</div>
          <div class="living-track-name" id="livingTrackName">Nothing loaded</div>
          <div class="living-track-sub" id="livingTrackSub">Import a song and it will keep playing between scenes.</div>
        </div>
        <button type="button" class="living-close" id="livingPlayerClose" aria-label="Close player">×</button>
      </div>

      <div class="living-progress-wrap">
        <input id="livingProgress" class="living-progress" type="range" min="0" max="1000" value="0" aria-label="Track progress" />
      </div>

      <div class="living-player-row">
        <button type="button" class="btn btn-outline" id="livingPrev" aria-label="Previous track">⏮</button>
        <button type="button" class="btn btn-gold" id="livingPlay" aria-label="Play">▶</button>
        <button type="button" class="btn btn-outline" id="livingNext" aria-label="Next track">⏭</button>
        <button type="button" class="btn btn-outline living-import" id="livingImport">Import audio</button>
        <span class="living-time" id="livingTime">0:00 / 0:00</span>
      </div>

      <div class="living-player-row" style="margin-top:8px">
        <span class="living-track-sub">Volume</span>
        <input id="livingVolume" class="living-volume" type="range" min="0" max="1" step="0.01" value="0.85" aria-label="Volume" />
        <button type="button" class="btn btn-ghost" id="livingDrive">Drive</button>
      </div>

      <div class="living-player-note" id="livingPlayerNote">
        Local audio works now. Google Drive playback needs a real Drive connection/OAuth and is not faked in this shell.
      </div>
      <input class="living-audio-input" id="livingAudioInput" type="file" accept="audio/*,.wav,.mp3,.m4a,.aac,.flac,.ogg" multiple />
      <audio id="livingAudio" preload="metadata"></audio>
    `;

    document.body.appendChild(player);
    document.body.appendChild(speaker);

    const audio = $("#livingAudio");
    const input = $("#livingAudioInput");
    const playButton = $("#livingPlay");
    const progress = $("#livingProgress");
    const volume = $("#livingVolume");
    const title = $("#livingTrackName");
    const sub = $("#livingTrackSub");
    const time = $("#livingTime");

    const queue = [];
    let index = -1;

    function currentTrack() {
      return index >= 0 ? queue[index] : null;
    }

    function setOpen(open) {
      player.classList.toggle("open", open);
      speaker.setAttribute("aria-expanded", String(open));
    }

    function render() {
      const track = currentTrack();
      title.textContent = track ? track.name : "Nothing loaded";
      sub.textContent = track
        ? `${index + 1} of ${queue.length} · local file`
        : "Import a song and it will keep playing between scenes.";
      playButton.textContent = audio.paused ? "▶" : "❚❚";
      speaker.classList.toggle("playing", !audio.paused && !!track);
      speaker.setAttribute("aria-label", track ? `Music player: ${track.name}` : "Open global music player");
      time.textContent = `${formatDuration(audio.currentTime)} / ${formatDuration(audio.duration)}`;
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        progress.value = Math.round((audio.currentTime / audio.duration) * 1000);
      } else {
        progress.value = 0;
      }

      if ("mediaSession" in navigator && track) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.name,
            artist: "Lil Wiznap",
            album: "UTC.OS Studio",
          });
        } catch (_) {}
      }
    }

    function loadTrack(newIndex, autoplay = true) {
      if (!queue.length) return;
      index = (newIndex + queue.length) % queue.length;
      const track = queue[index];
      audio.src = track.url;
      audio.load();
      render();
      if (autoplay) {
        audio.play().catch(() => {
          showToast("Tap play once to allow audio on this device.");
          render();
        });
      }
    }

    function nextTrack() {
      if (queue.length) loadTrack(index + 1, true);
    }

    function previousTrack() {
      if (queue.length) loadTrack(index - 1, true);
    }

    speaker.addEventListener("click", () => setOpen(!player.classList.contains("open")));
    $("#livingPlayerClose").addEventListener("click", () => setOpen(false));
    $("#livingImport").addEventListener("click", () => input.click());

    input.addEventListener("change", () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;
      files.forEach((file) => {
        queue.push({
          name: file.name.replace(/\.[^.]+$/, ""),
          file,
          url: URL.createObjectURL(file),
        });
      });
      const shouldStart = index < 0;
      if (shouldStart) loadTrack(0, true);
      else render();
      setOpen(true);
      showToast(`${files.length} audio file${files.length === 1 ? "" : "s"} added to the global queue.`);
      input.value = "";
    });

    playButton.addEventListener("click", () => {
      if (!currentTrack()) {
        input.click();
        return;
      }
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    });

    $("#livingPrev").addEventListener("click", previousTrack);
    $("#livingNext").addEventListener("click", nextTrack);

    progress.addEventListener("input", () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = (Number(progress.value) / 1000) * audio.duration;
      }
    });

    volume.addEventListener("input", () => {
      audio.volume = Number(volume.value);
    });
    audio.volume = Number(volume.value);

    audio.addEventListener("play", render);
    audio.addEventListener("pause", render);
    audio.addEventListener("timeupdate", render);
    audio.addEventListener("loadedmetadata", render);
    audio.addEventListener("ended", nextTrack);

    $("#livingDrive").addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("utcos:drive-connect-requested", {
        detail: { source: "living-player", requestedAt: Date.now() },
      }));
      const connectionNav = document.querySelector('[data-nav="connections"]');
      if (connectionNav) connectionNav.click();
      showToast("Drive is not authenticated in this shell. Opening Connections instead of faking access.");
    });

    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("play", () => audio.play());
        navigator.mediaSession.setActionHandler("pause", () => audio.pause());
        navigator.mediaSession.setActionHandler("previoustrack", previousTrack);
        navigator.mediaSession.setActionHandler("nexttrack", nextTrack);
      } catch (_) {}
    }

    window.addEventListener("beforeunload", () => {
      queue.forEach((track) => URL.revokeObjectURL(track.url));
    });

    window.UTCOSLivingPlayer = {
      audio,
      queue,
      open: () => setOpen(true),
      import: () => input.click(),
    };

    render();
  }

  function start() {
    const showToast = createToast();
    installRefresh(showToast);
    installPlayer(showToast);
    document.documentElement.classList.add("living-mothership-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
