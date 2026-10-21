/* Release Command quick-access widget for the existing UTC.OS reconstruction shell.
   Local-only. Read display counts from the release workspace's localStorage key.
   Never confuse content approval with publishing permission. */
(function () {
  "use strict";
  const KEY = "utcos-shell:release-command:v1";
  const PLATFORMS = {
    facebook: "Facebook", tiktok: "TikTok", youtube: "YouTube",
    instagram: "Instagram", snapchat: "Snapchat"
  };
  const $ = (selector) => document.querySelector(selector);
  const dialog = $("#releaseHubDialog");
  const frame = $("#releaseHubFrame");
  const bell = $("#releaseNotifBtn");
  const approveButton = $("#releaseHubApprove");
  const closeButton = $("#releaseHubClose");
  const next = $("#releaseHubNext");
  if (!dialog || !frame || !bell || !approveButton || !closeButton || !next) return;
  let lastFocus = null;

  function read() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || '{"campaigns":[]}');
      if (!parsed || !Array.isArray(parsed.campaigns)) return { campaigns: [], unavailable: true };
      return { campaigns: parsed.campaigns, unavailable: false };
    } catch (_) {
      return { campaigns: [], unavailable: true };
    }
  }

  function summarize() {
    const snapshot = read();
    const pending = [], backlog = [];
    for (const campaign of snapshot.campaigns) {
      if (!campaign || typeof campaign !== "object" || !campaign.channels) continue;
      for (const [id, draft] of Object.entries(campaign.channels)) {
        if (!PLATFORMS[id] || !draft) continue;
        const item = { title: String(campaign.title || "Untitled song").slice(0, 120), platform: PLATFORMS[id], updated: campaign.createdAt };
        if (draft.status === "pending") pending.push(item);
        if (draft.status === "backlog") backlog.push(item);
      }
    }
    return { pending, backlog, campaigns: snapshot.campaigns.length, unavailable: snapshot.unavailable };
  }

  function update() {
    const snapshot = summarize();
    const p = snapshot.pending.length, b = snapshot.backlog.length;
    $("#releaseHubPending").textContent = String(p);
    $("#releaseHubBacklog").textContent = String(b);
    $("#releaseHubCampaigns").textContent = String(snapshot.campaigns);
    $("#releaseHubButtonCount").textContent = String(p);
    const countLabel = p > 99 ? "99+" : String(p);
    $("#releaseNotifCount").textContent = countLabel;
    $("#releaseNotifCount").dataset.zero = String(p === 0);
    bell.setAttribute("aria-label", p ? "Open release approvals, " + p + " awaiting review" : "Open release approvals, none waiting");
    if (snapshot.unavailable) {
      next.replaceChildren();
      next.append(makeSpan("Local draft data is unavailable. Open Release Command to inspect the workspace.", true));
    } else if (p) {
      const item = snapshot.pending[0];
      next.replaceChildren();
      const icon = document.createElement("span");
      icon.className = "release-hub-next-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "🔔";
      const msg = document.createElement("span");
      const bold = document.createElement("strong");
      bold.textContent = item.title;
      const rest = document.createTextNode(" · " + item.platform + " needs your decision. " +
        (p > 1 ? (p - 1) + " more platform draft" + (p === 2 ? "" : "s") + " waiting." : "Ready to review."));
      msg.append(bold, rest);
      next.append(icon, msg);
    } else if (b) {
      next.replaceChildren();
      next.append(makeSpan("No pending approvals. " + b + " item" + (b === 1 ? "" : "s") +
        " in your backlog for later review.", false));
    } else {
      next.replaceChildren();
      next.append(makeSpan("No approvals waiting. Start a release to generate platform drafts.", false));
    }
  }
  function makeSpan(value, warning) {
    const span = document.createElement("span");
    span.textContent = value;
    if (warning) span.style.color = "#f0bd76";
    return span;
  }
  function open() {
    if (dialog.open) return;
    lastFocus = document.activeElement;
    frame.src = "release-command.html?embedded=1&review=1";
    dialog.showModal();
    closeButton.focus();
  }
  function close() {
    if (dialog.open) dialog.close();
    // Reset the frame to prevent retained session-only media/object URLs.
    frame.removeAttribute("src");
  }
  approveButton.addEventListener("click", open);
  bell.addEventListener("click", open);
  closeButton.addEventListener("click", close);
  dialog.addEventListener("close", () => {
    frame.removeAttribute("src");
    if (lastFocus && lastFocus.isConnected) lastFocus.focus();
    update();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === KEY) update();
  });
  window.addEventListener("focus", update);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) update(); });
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
    if (event.data?.source === "utcos-release-command" && event.data.type === "changed") update();
  });
  update();
})();
