/* Lil Wiznap Release Command — local-first prototype for the UTC.OS reconstruction shell.
   No external API is called. "Approved" is content approval, NEVER a publish receipt. */
(() => {
  "use strict";
  const KEY = "utcos-shell:release-command:v1";
  const CHANNELS = [
    { id: "facebook", label: "Facebook", format: "Feed / Reel" },
    { id: "tiktok", label: "TikTok", format: "Vertical 9:16" },
    { id: "youtube", label: "YouTube", format: "Short / video" },
    { id: "instagram", label: "Instagram", format: "Reel / feed" },
    { id: "snapchat", label: "Snapchat", format: "Vertical 9:16" }
  ];
  const CONCEPTS = [
    { name: "Electric dojo", desc: "Cinematic purple lightning, antique gold, dramatic buildup.", hook: "The dojo doors are opening.", cta: "Step inside. Which moment hits hardest?" },
    { name: "Sauce comedy", desc: "A sharp, funny setup with a satisfying punchline.", hook: "This escalated faster than expected.", cta: "Send this to the friend who gets it." },
    { name: "Behind the bars", desc: "A lyric breakdown, process clip, or raw studio moment.", hook: "Catch what I slipped into that line.", cta: "What bar should I unpack next?" },
    { name: "Split-universe battle", desc: "Two versions, one choice, side-by-side fan debate.", hook: "Same energy. Two completely different angles.", cta: "Vote for your version in the comments." },
    { name: "Midnight signal", desc: "Minimal, dark, moody cuts and an unexpected hook.", hook: "Not every signal is meant to be quiet.", cta: "Save this for the night drive." }
  ];
  const STATUS = { pending: "Pending", approved: "Approved locally", rejected: "Rejected", backlog: "Backlog" };
  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const channelById = (id) => CHANNELS.find((ch) => ch.id === id);
  const now = () => new Date().toISOString();
  const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : "r-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  const localDate = (iso) => {
    if (!iso) return "No date proposed";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "Invalid proposed date" : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  };
  const eventDate = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "Unknown time" : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  };
  const conceptFor = (release) => CONCEPTS[release.concept] || CONCEPTS[0];
  let localStore = true;
  let campaigns = [];
  let selectedConcept = 0;
  let activeTab = "inbox";
  let activeIndex = 0;
  let priorFocus = null;
  const sessionPreview = new Map();

  function restore() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{"campaigns":[]}');
      if (raw && Array.isArray(raw.campaigns)) {
        campaigns = raw.campaigns.filter((c) =>
          c && typeof c.id === "string" && typeof c.title === "string" &&
          c.channels && typeof c.channels === "object" && !Array.isArray(c.channels)
        ).slice(0, 300);
      }
    } catch (_) {
      localStore = false;
      campaigns = [];
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ version: 1, campaigns }));
      localStore = true;
    } catch (_) {
      localStore = false;
      notify("Browser storage is blocked or full. Changes may disappear after refresh.");
    }
    render();
    if (window.parent !== window) {
      window.parent.postMessage({ source: "utcos-release-command", type: "changed", pending: entries("pending").length }, window.location.origin);
    }
  }
  function notify(text) {
    const box = $("#notice");
    box.textContent = text;
    box.hidden = false;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => { box.hidden = true; }, 4500);
  }
  function entries(status) {
    return campaigns.flatMap((campaign) =>
      Object.entries(campaign.channels).filter(([id, channel]) =>
        channelById(id) && channel && (!status || channel.status === status)
      ).map(([id, channel]) => ({ campaign, channelId: id, channel }))
    ).sort((a, b) => new Date(b.campaign.createdAt) - new Date(a.campaign.createdAt));
  }
  function caption(title, type, concept, channelId) {
    const conceptData = CONCEPTS[concept];
    const intro = type === "battle" ? "Two versions. One decision." : type === "full" ? "The full track is on the way." : "First listen.";
    const endings = {
      facebook: "Tell me which part you're replaying. 🎵",
      tiktok: "Duet or stitch your reaction.",
      youtube: "Subscribe for the full release.",
      instagram: "Save it and share it to your story.",
      snapchat: "Send this Snap to someone who needs to hear it."
    };
    return "LIL WIZNAP · " + title + "\n" + conceptData.hook + " " + intro + "\n" +
      (type === "battle" ? "Drop your vote below. " : conceptData.cta + " ") + (endings[channelId] || "");
  }
  function renderConcepts() {
    $("#conceptList").innerHTML = CONCEPTS.map((concept, i) =>
      '<button type="button" class="concept' + (i === selectedConcept ? ' selected' : '') +
      '" data-concept="' + i + '" aria-pressed="' + (i === selectedConcept) + '">' +
      '<span class="concept-num">0' + (i + 1) + '</span><span><strong>' +
      escapeHtml(concept.name) + '</strong><span>' + escapeHtml(concept.desc) +
      '</span></span><span class="check" aria-hidden="true">✓</span></button>'
    ).join("");
  }
  function createCampaign(options) {
    const title = String(options.title || "").trim().slice(0, 120);
    const ids = options.ids.filter((id) => channelById(id));
    if (!title) { $("#formMessage").textContent = "Enter the song title first."; return; }
    if (!ids.length) { $("#formMessage").textContent = "Choose at least one platform."; return; }
    const id = newId();
    const campaign = {
      id, title, type: options.type, concept: options.concept, date: options.date || "",
      createdAt: now(), demo: !!options.demo, assetName: options.file?.name || "",
      channels: Object.fromEntries(ids.map((channelId) => [channelId, {
        status: "pending",
        caption: caption(title, options.type, options.concept, channelId),
        changedAt: now(),
        events: [{ action: "Draft created · pending review", at: now() }]
      }]))
    };
    if (options.file) {
      const url = URL.createObjectURL(options.file);
      sessionPreview.set(id, { url, type: options.file.type, name: options.file.name });
    }
    campaigns.unshift(campaign);
    $("#formMessage").textContent = "Created " + ids.length + " platform drafts. Nothing was posted.";
    $("#releaseForm").reset();
    selectedConcept = 0;
    renderConcepts();
    activeTab = "inbox";
    save();
    openReview(0);
  }
  function selectedChannels() {
    return Array.from(document.querySelectorAll('input[name="channels"]:checked')).map((input) => input.value);
  }
  function setTab(tab) {
    if (!["inbox", "calendar", "backlog", "history"].includes(tab)) return;
    activeTab = tab;
    renderQueue();
  }
  function prettyType(type) {
    return ({ teaser: "Teaser", full: "Full release", battle: "VS battle" })[type] || "Release";
  }
  function card(item, actions = true) {
    const { campaign, channelId, channel } = item;
    const name = channelById(channelId)?.label || channelId;
    return '<article class="queue-item"><div class="item-top"><div>' +
      '<div class="eyebrow">' + (campaign.demo ? "DEMO · " : "") + escapeHtml(prettyType(campaign.type)) +
      ' / ' + escapeHtml(conceptFor(campaign).name) + '</div><h3>' + escapeHtml(campaign.title) +
      '</h3><div class="item-sub">' + escapeHtml(name) + ' · ' + escapeHtml(localDate(campaign.date)) +
      ' · Proposed only</div></div><span class="tag ' + escapeHtml(channel.status) + '">' +
      escapeHtml(STATUS[channel.status] || "Unknown") + '</span></div>' +
      '<div class="item-meta"><span class="tag">' + escapeHtml(name) + '</span><span class="tag">' +
      escapeHtml(channelById(channelId)?.format) + '</span></div>' +
      '<p class="caption-preview">' + escapeHtml(channel.caption).slice(0, 420) + '</p>' +
      (actions ? '<div class="item-actions"><button type="button" class="btn btn-outline" data-review="' +
      escapeHtml(campaign.id) + '" data-channel="' + channelId + '">Preview / decide ↗</button>' +
      (channel.status !== "pending" ? '<button type="button" class="btn btn-muted" data-reopen="' +
      escapeHtml(campaign.id) + '" data-channel="' + channelId + '">Move to pending</button>' : '') +
      '</div>' : '') + '</article>';
  }
  function empty(title, copy) {
    return '<div class="empty-state"><div><div class="empty-icon" aria-hidden="true">✦</div><strong>' +
      escapeHtml(title) + '</strong><p>' + escapeHtml(copy) + '</p></div></div>';
  }
  function renderQueue() {
    document.querySelectorAll("[data-tab]").forEach((el) => {
      el.setAttribute("aria-selected", String(el.dataset.tab === activeTab));
    });
    const target = $("#queueContent");
    if (activeTab === "inbox") {
      const pending = entries("pending");
      target.innerHTML = pending.length ? pending.map((item) => card(item)).join("") :
        empty("No approvals waiting", "Create a release to prepare platform drafts, or load the clearly labeled demo to explore the review workflow.");
    } else if (activeTab === "backlog") {
      const backlog = entries("backlog");
      target.innerHTML = backlog.length ? backlog.map((item) => card(item)).join("") :
        empty("Backlog is clear", "Use Later in the approval pop-up to park a post here without losing its caption.");
    } else if (activeTab === "calendar") {
      const all = entries().filter((item) => item.campaign.date)
        .sort((a, b) => new Date(a.campaign.date) - new Date(b.campaign.date));
      target.innerHTML = '<p class="muted">Draft planning calendar only. These are not scheduled platform posts.</p>' +
        (all.length ? all.map((item) => card(item)).join("") :
          empty("No planned dates", "Add a proposed date when you create your next release."));
    } else {
      const audit = entries().flatMap(({ campaign, channelId, channel }) =>
        (Array.isArray(channel.events) ? channel.events : []).map((log) => ({ campaign, channelId, log }))
      ).sort((a, b) => new Date(b.log.at) - new Date(a.log.at)).slice(0, 120);
      target.innerHTML = audit.length ? '<div class="audit-list">' + audit.map(({ campaign, channelId, log }) =>
        '<div class="audit-row"><strong>' + escapeHtml(campaign.title) + '</strong> · ' +
        escapeHtml(channelById(channelId)?.label) + ': ' + escapeHtml(log.action) +
        '<time>' + escapeHtml(eventDate(log.at)) + '</time></div>'
      ).join("") + '</div>' : empty("No decision history", "Your local draft and approval actions will appear here.");
    }
  }
  function render() {
    const pending = entries("pending").length;
    const backlog = entries("backlog").length;
    $("#pendingCount").textContent = String(pending);
    $("#heroCampaigns").textContent = String(campaigns.length);
    $("#heroPending").textContent = String(pending);
    $("#heroBacklog").textContent = String(backlog);
    renderQueue();
  }
  function findItem(campaignId, channelId) {
    const campaign = campaigns.find((c) => c.id === campaignId);
    const channel = campaign?.channels?.[channelId];
    return campaign && channel && channelById(channelId) ? { campaign, channelId, channel } : null;
  }
  function setDecision(item, status) {
    if (!item || !STATUS[status]) return;
    if (item.channel.status === status) return;
    item.channel.status = status;
    item.channel.changedAt = now();
    item.channel.events = Array.isArray(item.channel.events) ? item.channel.events : [];
    item.channel.events.push({
      action: status === "approved" ? "Content approved locally; not scheduled or published" :
        status === "backlog" ? "Moved to backlog; no publishing action" :
        status === "pending" ? "Returned to pending review" : "Rejected; no publishing action",
      at: now()
    });
    save();
    notify((channelById(item.channelId)?.label || "Platform") + ": " + (STATUS[status] || status) + ". No post was sent.");
  }
  function previewMarkup(campaign) {
    const entry = sessionPreview.get(campaign.id);
    if (!entry) return '<div class="media-box"><div>▶ Preview not attached in this session</div><p>' +
      (campaign.assetName ? 'Original file: ' + escapeHtml(campaign.assetName) + '. Reattach on a future edit.' :
        'Media generation and uploads are not connected to this prototype.') + '</p></div>';
    let player = "";
    if (entry.type.startsWith("video/")) player = '<video controls playsinline preload="metadata" src="' + escapeHtml(entry.url) + '"></video>';
    else if (entry.type.startsWith("audio/")) player = '<audio controls preload="metadata" src="' + escapeHtml(entry.url) + '"></audio>';
    else if (entry.type.startsWith("image/")) player = '<img alt="Uploaded preview image" src="' + escapeHtml(entry.url) + '">';
    return '<div class="media-box">' + player + '<p>' + escapeHtml(entry.name) +
      ' · On this device only, not uploaded</p></div>';
  }
  function renderDialog() {
    const all = entries("pending");
    const title = $("#dialogProgress");
    const body = $("#dialogBody");
    $("#prevApproval").disabled = !all.length || activeIndex <= 0;
    $("#nextApproval").disabled = !all.length || activeIndex >= all.length - 1;
    if (!all.length) {
      title.textContent = "All caught up";
      body.innerHTML = empty("Inbox zero", "No items waiting for approval. Backlogged or rejected drafts can be reopened from the Review Center.");
      return;
    }
    activeIndex = Math.max(0, Math.min(activeIndex, all.length - 1));
    const item = all[activeIndex];
    title.textContent = (activeIndex + 1) + " of " + all.length + " · " + channelById(item.channelId).label;
    body.innerHTML = '<article class="review-card">' +
      '<div class="eyebrow">' + (item.campaign.demo ? "DEMO CAMPAIGN · " : "") +
      escapeHtml(prettyType(item.campaign.type)) + ' / ' + escapeHtml(conceptFor(item.campaign).name) +
      '</div><h3>' + escapeHtml(item.campaign.title) + '</h3><div class="item-meta"><span class="tag">' +
      escapeHtml(channelById(item.channelId).label) + '</span><span class="tag">' +
      escapeHtml(channelById(item.channelId).format) + '</span><span class="tag">LOCAL DRAFT</span></div>' +
      previewMarkup(item.campaign) +
      '<div class="muted">Proposed time: ' + escapeHtml(localDate(item.campaign.date)) + '. Not scheduled.</div>' +
      '<label class="caption-label" for="reviewCaption">Platform caption · editable</label>' +
      '<textarea id="reviewCaption" class="caption-editor" maxlength="2000" rows="5">' +
      escapeHtml(item.channel.caption) + '</textarea>' +
      '<div class="item-actions"><button type="button" class="btn btn-muted" data-save-caption="1">Save caption revision</button></div>' +
      '<div class="actions-row">' +
      '<button type="button" class="btn decision-yes" data-decision="approved">✓ YES</button>' +
      '<button type="button" class="btn decision-no" data-decision="rejected">✕ NO</button>' +
      '<button type="button" class="btn decision-later" data-decision="backlog">▣ BACKLOG</button></div>' +
      '<div class="review-status">Yes means <strong>content approved locally</strong>, not posted or scheduled. No rejects this platform draft. Backlog keeps it for later. Closing this pop-up makes no changes.</div>' +
      '</article>';
  }
  function openReview(index = 0) {
    priorFocus = document.activeElement;
    activeIndex = index;
    renderDialog();
    const dialog = $("#approvalDialog");
    if (!dialog.open) dialog.showModal();
  }
  function closeReview() {
    const dialog = $("#approvalDialog");
    if (dialog.open) dialog.close();
    if (priorFocus && typeof priorFocus.focus === "function") priorFocus.focus();
  }
  function currentReviewItem() {
    return entries("pending")[activeIndex] || null;
  }
  function reviseCaption(item) {
    const value = $("#reviewCaption")?.value?.trim();
    if (!item || !value) { notify("Caption cannot be empty."); return; }
    if (value === item.channel.caption) { notify("No caption changes to save."); return; }
    item.channel.caption = value.slice(0, 2000);
    item.channel.changedAt = now();
    item.channel.events = Array.isArray(item.channel.events) ? item.channel.events : [];
    item.channel.events.push({ action: "Caption revised; pending review", at: now() });
    item.channel.status = "pending";
    save();
    renderDialog();
    notify("Caption saved locally. Still waiting for approval.");
  }
  function bind() {
    $("#releaseForm").addEventListener("submit", (event) => {
      event.preventDefault();
      createCampaign({
        title: $("#trackTitle").value, type: $("#releaseType").value,
        date: $("#releaseDate").value, concept: selectedConcept, ids: selectedChannels(),
        file: $("#previewFile").files?.[0] || null
      });
    });
    $("#loadDemo").addEventListener("click", () => {
      createCampaign({ title: "Namaste (DEMO)", type: "battle", date: "", concept: 3,
        ids: CHANNELS.map((ch) => ch.id), demo: true, file: null });
    });
    $("#surpriseMe").addEventListener("click", () => {
      const offset = 1 + Math.floor(Math.random() * (CONCEPTS.length - 1));
      selectedConcept = (selectedConcept + offset) % CONCEPTS.length;
      renderConcepts();
      notify("Creative direction: " + CONCEPTS[selectedConcept].name);
    });
    $("#conceptList").addEventListener("click", (event) => {
      const button = event.target.closest("[data-concept]");
      if (button) { selectedConcept = Number(button.dataset.concept); renderConcepts(); }
    });
    $(".tabs").addEventListener("click", (event) => {
      const button = event.target.closest("[data-tab]");
      if (button) setTab(button.dataset.tab);
    });
    $("#queueContent").addEventListener("click", (event) => {
      const review = event.target.closest("[data-review]");
      const reopen = event.target.closest("[data-reopen]");
      if (review) {
        const pending = entries("pending");
        const idx = pending.findIndex((i) => i.campaign.id === review.dataset.review && i.channelId === review.dataset.channel);
        if (idx >= 0) openReview(idx);
        else { setDecision(findItem(review.dataset.review, review.dataset.channel), "pending"); openReview(0); }
      }
      if (reopen) setDecision(findItem(reopen.dataset.reopen, reopen.dataset.channel), "pending");
    });
    $("#openInbox").addEventListener("click", () => openReview(0));
    $("#quickReview").addEventListener("click", () => openReview(0));
    $("#closeDialog").addEventListener("click", closeReview);
    $("#prevApproval").addEventListener("click", () => { activeIndex--; renderDialog(); });
    $("#nextApproval").addEventListener("click", () => { activeIndex++; renderDialog(); });
    $("#dialogBody").addEventListener("click", (event) => {
      if (event.target.closest("[data-save-caption]")) { reviseCaption(currentReviewItem()); return; }
      const choice = event.target.closest("[data-decision]");
      if (!choice) return;
      const item = currentReviewItem();
      if (!item) return;
      const draftCaption = $("#reviewCaption")?.value?.trim();
      if (draftCaption && draftCaption !== item.channel.caption) {
        notify("Save your caption revision before deciding.");
        $("#reviewCaption").focus();
        return;
      }
      setDecision(item, choice.dataset.decision);
      renderDialog();
    });
    window.addEventListener("storage", (event) => {
      if (event.key === KEY) { restore(); render(); if ($("#approvalDialog").open) renderDialog(); }
    });
    $("#approvalDialog").addEventListener("close", () => { if (priorFocus?.isConnected) priorFocus.focus(); });
  }
  if (new URLSearchParams(location.search).has("embedded")) {
    document.body.classList.add("embedded");
  }
  restore();
  renderConcepts();
  render();
  bind();
  if (!localStore) notify("Local storage unavailable. These drafts will not persist.");
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  $("#dateHint").textContent = "Planning only · " + (tz || "device local time") + ". No platform scheduling connected.";
})();