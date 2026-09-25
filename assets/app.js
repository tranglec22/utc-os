/* UTC.OS Reconstruction Shell — Phase 5
   Evidence-first SPA. No live APIs. No fake Connected OAuth.
   Phase 3: localStorage persistence (utcos-shell:*), specialist pages,
   Brain map, Setup checks, lesson views, PWA install wiring.
   Phase 5: habits, goals, lesson progress + notes, and a local command
   engine for agent chats ("Local assistant, no AI connected").
   Phase 6: optional AI replies with the user's own OpenAI key (stored on
   this device only, never exported); local commands always run first. */

(function () {
  "use strict";

  const AGENTS = {
    margaret: {
      id: "margaret",
      name: "Margaret",
      initial: "M",
      role: "Executive / Strategy / People / Business",
      teamTitle: "CEO / Executive Intelligence",
      tagline: "Vision turns into legacy.",
      statusReady: "READY PROFILE",
      prompts: [
        "What deserves priority?",
        "Make the call on this",
        "Find painting leads",
        "Create an estimate",
      ],
      hint: "What decision, risk, or priority needs direction?",
      online: "Margaret online.",
    },
    kara: {
      id: "kara",
      name: "Kara",
      initial: "K",
      role: "Chief of Staff / Daily Operations / Creative Flow",
      teamTitle: "Co-Pilot / Chief of Staff",
      tagline: "Ideas become reality.",
      statusReady: "READY PROFILE",
      prompts: [
        "Brief my day",
        "Turn this into next steps",
        "Find painting leads",
        "Create an estimate",
      ],
      hint: "What should we organize, finish, or move forward?",
      online: "Kara online.",
    },
    jarvis: {
      id: "jarvis",
      name: "Jarvis",
      initial: "J",
      role: "System Intelligence / Automation / Technology",
      teamTitle: "System Core / Technical Intelligence",
      tagline: "Complex made simple.",
      statusReady: "READY PROFILE",
      prompts: [
        "Run self-test",
        "Diagnose this system",
        "Find painting leads",
        "Create an estimate",
      ],
      hint: "What should we diagnose, connect, automate, or verify?",
      online: "Jarvis online.",
    },
    sauce: {
      id: "sauce",
      name: "Sauce Sensei",
      initial: "S",
      role: "Creative Director / Lil Wiz-Nap / Music",
      teamTitle: "Creative Architect + Aesthetic Director",
      tagline: "Art changes dimensions.",
      statusReady: "READY PROFILE",
      prompts: [
        "Review this design",
        "Create a visual direction",
        "Open The Part That Stays",
        "Search my second brain",
      ],
      promptsBusiness: [
        "Review this design",
        "Create a visual direction",
        "Find painting leads",
        "Create an estimate",
      ],
      hint: "What should we design, refine, or review?",
      online: "Sauce Sensei online.",
    },
  };

  /** Specialists from live Team walk [21] — fixture roles */
  const SPECIALISTS = [
    { id: "prime", name: "Prime", role: "Strategy specialist", note: "Fixture roster" },
    { id: "claude-code", name: "Claude Code", role: "Coding specialist", note: "Fixture roster" },
    { id: "hermes", name: "Hermes", role: "Comms / courier", note: "Appears in Security audit" },
    { id: "bastion", name: "Bastion", role: "Security reviewer", note: "Security local checks" },
    { id: "vega", name: "Vega", role: "Research routing", note: "Settings profile" },
    { id: "forge", name: "Forge", role: "Product planning", note: "Settings + Forge module" },
    { id: "muse", name: "Muse", role: "Creative assist", note: "Appears in Security audit" },
    { id: "ledger", name: "Ledger", role: "Business / pricing", note: "Settings profile" },
    { id: "statute", name: "Statute", role: "Legal routing", note: "Settings profile" },
    { id: "archive", name: "Archive", role: "Memory / knowledge", note: "Settings + audit" },
  ];

  const ROUTING_ROUTES = [
    { key: "strategy", label: "Strategy", default: "Margaret" },
    { key: "daily", label: "Daily planning", default: "Kara" },
    { key: "systems", label: "Systems", default: "Jarvis" },
    { key: "creative", label: "Creative", default: "Sauce Sensei" },
    { key: "research", label: "Research", default: "Vega" },
    { key: "coding", label: "Coding", default: "Jarvis" },
    { key: "business", label: "Business / pricing", default: "Ledger" },
    { key: "legal", label: "Legal", default: "Statute" },
    { key: "memory", label: "Memory / knowledge", default: "Archive" },
    { key: "security", label: "Security", default: "Bastion" },
  ];

  const ROUTING_PROFILES = [
    "Margaret",
    "Kara",
    "Jarvis",
    "Sauce Sensei",
    "Vega",
    "Forge",
    "Ledger",
    "Statute",
    "Archive",
    "Bastion",
  ];

  const TRIGGERS = [
    { id: "morning", label: "Morning brief", checked: true },
    { id: "inbox", label: "Inbox overflow", checked: true },
    { id: "friday", label: "Friday ship check", checked: true },
    { id: "stalled", label: "Stalled project sweep", checked: false },
    { id: "incubation", label: "Raw idea incubation", checked: true },
  ];

  const PIPELINE = [
    "All",
    "NEW",
    "REVIEWED",
    "CONTACTED",
    "ESTIMATE SCHEDULED",
    "ESTIMATE SENT",
    "FOLLOW-UP",
    "WON",
    "LOST",
  ];

  /** Fixture leads shaped like OBSERVED walk — clearly demo data */
  const FIXTURE_LEADS = [
    {
      id: "l1",
      title: "Interior and Exterior Painting Services",
      company: "D-Rock Painting, LLC",
      category: "Residential Painting",
      location: "Pittsburgh, PA",
      score: 75,
      band: "WARM",
      status: "NEW",
      unread: true,
      project:
        "Painting, drywall, pressure cleaning, deck staining. Missing size / budget / start.",
      aiSummary:
        "Warm residential painting prospect from public source. Needs scope clarification before estimate.",
      source: "Nextdoor (fixture URL — not opened)",
      radarNotes: "Do not contact: No. Source post verified in live walk; not re-fetched here.",
      whyFits: "Matches UP2CODE painting / contractor lane.",
      timeline: "Sep 23, 2026 — Job Radar prospect created (fixture)",
      followUp: "—",
      note: "—",
    },
    {
      id: "l2",
      title: "Cabinet refinishing inquiry",
      company: "Homeowner · Coraopolis",
      category: "Cabinets",
      location: "Coraopolis, PA",
      score: 92,
      band: "HOT",
      status: "NEW",
      unread: true,
      project: "Kitchen cabinet refresh; timeline flexible.",
      aiSummary: "High-fit hot lead. Score fixture from walk range 55–92.",
      source: "Public board (fixture)",
      radarNotes: "Duplicate protection would refresh on same source ID.",
      whyFits: "UP2CODE finish work.",
      timeline: "Sep 22, 2026 — Created (fixture)",
      followUp: "Call this week",
      note: "—",
    },
    {
      id: "l3",
      title: "Exterior touch-up · South Hills",
      company: "CertaPro-style lead (fixture)",
      category: "Exterior",
      location: "Pittsburgh, PA",
      score: 68,
      band: "WARM",
      status: "REVIEWED",
      unread: true,
      project: "Fascia and trim; small scope.",
      aiSummary: "Reviewed; waiting contact.",
      source: "Import / radar fixture",
      radarNotes: "—",
      whyFits: "Geographic fit.",
      timeline: "Sep 21, 2026 — Reviewed (fixture)",
      followUp: "—",
      note: "—",
    },
    {
      id: "l4",
      title: "Pressure washing + stain",
      company: "CQP opportunity (fixture)",
      category: "Exterior care",
      location: "Pittsburgh, PA",
      score: 55,
      band: "COOL",
      status: "FOLLOW-UP",
      unread: true,
      project: "Deck stain follow-up due.",
      aiSummary: "Follow-up due — matches live summary card.",
      source: "Fixture",
      radarNotes: "—",
      whyFits: "Bundle with painting.",
      timeline: "Sep 20, 2026 — Follow-up set (fixture)",
      followUp: "Due",
      note: "—",
    },
    {
      id: "l5",
      title: "Commercial lobby repaint",
      company: "Local property mgr (fixture)",
      category: "Commercial",
      location: "Pittsburgh, PA",
      score: 40,
      band: "COOL",
      status: "LOST",
      unread: false,
      project: "Budget went elsewhere.",
      aiSummary: "Marked LOST for pipeline demo.",
      source: "Fixture",
      radarNotes: "—",
      whyFits: "—",
      timeline: "Sep 18, 2026 — Lost (fixture)",
      followUp: "—",
      note: "Lost to competitor",
    },
  ];

  const SKILLS = [
    { name: "Anthropic skills", level: 1, runs: 24, streak: 3 },
    { name: "Lead reply in ten minutes", level: 2, runs: 41, streak: 6 },
    { name: "Estimate preflight", level: 2, runs: 28, streak: 4 },
    { name: "Ninety-minute build block", level: 1, runs: 15, streak: 2 },
    { name: "Song sketch to release step", level: 1, runs: 8, streak: 1 },
  ];

  /** 3 fixture memories — [22] names one; others labeled fixture from count */
  const FIXTURE_MEMORIES = [
    {
      id: "m1",
      title: "Cabinet lead follow-up angle",
      detail: "Lead-prep: emphasize timeline flexibility and finish quality for Coraopolis cabinet refresh.",
      bucket: "inbox",
      workspace: "Business",
    },
    {
      id: "m2",
      title: "Painter opening call note",
      detail: "Recommended next action linked to Daily Command — call about the painter opening.",
      bucket: "linked",
      workspace: "Business",
    },
    {
      id: "m3",
      title: "Lil Wiz-Nap palette reminder",
      detail: "Near-black / violet / antique gold — reject washed-out startup cards (Sauce decision log).",
      bucket: "linked",
      workspace: "Creative",
    },
  ];

  /** 12 fixture knowledge items — summary shaped like [23] */
  const FIXTURE_KNOWLEDGE = [
    { name: "UP2CODE brand rule", kind: "Rule", scope: "Global", always: true },
    { name: "Lil Wiz-Nap identity", kind: "Brand", scope: "Global", always: true },
    { name: "Job Radar duplicate rule", kind: "Rule", scope: "Global", always: true },
    { name: "Estimate preflight checklist", kind: "Document", scope: "Global", always: true },
    { name: "Pittsburgh service area", kind: "Note", scope: "Global", always: true },
    { name: "The Fool cover refs", kind: "Image reference", scope: "Project", always: false },
    { name: "Dojo visual world notes", kind: "Note", scope: "Global", always: true },
    { name: "Lead reply ten-minute loop", kind: "Rule", scope: "Global", always: true },
    { name: "Apparel PNG constraint", kind: "Asset", scope: "Global", always: false },
    { name: "UTC.OS dark surface rule", kind: "Rule", scope: "Global", always: true },
    { name: "Forge safety boundary", kind: "Document", scope: "Global", always: true },
    { name: "Voice Studio charge warning", kind: "Note", scope: "Global", always: false },
  ];

  const SEARCH_FIXTURES = [
    { group: "Opportunities", text: "D-Rock Painting" },
    { group: "Opportunities", text: "CertaPro" },
    { group: "Opportunities", text: "CQP" },
    { group: "Projects", text: "UP2CODE" },
    { group: "Projects", text: "UTC.OS" },
    { group: "Projects", text: "Luxury Product Forge" },
    { group: "Notes and tasks", text: "Call about the painter opening" },
    { group: "Notes and tasks", text: "Gmail drafts (Done)" },
  ];

  const AUDIT_EVENTS = [
    { actor: "Bastion", event: "Local check surface opened", when: "Fixture" },
    { actor: "Kara", event: "Daily cockpit viewed", when: "Fixture" },
    { actor: "Sauce Sensei", event: "Creative world flip", when: "Fixture" },
    { actor: "Muse", event: "Studio history listed", when: "Fixture" },
    { actor: "Archive", event: "Memory count mirrored (3)", when: "Fixture" },
    { actor: "Hermes", event: "Launch-point link shown", when: "Fixture" },
    { actor: "Bastion", event: "Finding: no local restore point", when: "Fixture" },
    { actor: "Jarvis", event: "Model selector UI-only", when: "Fixture" },
    { actor: "Margaret", event: "Team roster viewed", when: "Fixture" },
    { actor: "Bastion", event: "External services Healthy", when: "Fixture" },
  ];

  const STUDIO_WORLDS = [
    "Inside the Dojo",
    "The Fool",
    "Pain to Gold",
    "Ride That Wave",
    "Secret Club",
  ];

  const STUDIO_FORMATS = [
    "YouTube",
    "Album",
    "Vertical",
    "Website hero",
    "Phone wallpaper",
    "Transparent asset",
  ];

  const BACKLOG_ITEMS = [
    { id: "b1", title: "Call about the painter opening" },
  ];

  /* ---------- Phase 3 fixtures ---------- */

  /** Specialist detail — Team [21] shows role / responsibilities / reporting
      lines, but the live wording was not captured verbatim. Reconstructed. */
  const SPECIALIST_DETAILS = {
    prime: {
      responsibilities: ["Stress-test priorities", "Frame long-range options", "Write tradeoff memos for Margaret"],
      reportsTo: "Margaret",
    },
    "claude-code": {
      responsibilities: ["Draft code changes for review", "Explain diffs in plain language", "Never merge or deploy on its own"],
      reportsTo: "Jarvis",
    },
    hermes: {
      responsibilities: ["Prepare message drafts", "Surface launch-point links", "Send nothing without owner approval"],
      reportsTo: "Kara",
    },
    bastion: {
      responsibilities: ["Run local security checks", "Keep the audit log readable", "Flag missing restore points"],
      reportsTo: "Jarvis",
    },
    vega: {
      responsibilities: ["Route research requests", "Keep sources attached to claims", "Hand verified findings back"],
      reportsTo: "Margaret",
    },
    forge: {
      responsibilities: ["Turn rough product ideas into plans", "Stop before any spend", "Track validation steps"],
      reportsTo: "Margaret",
    },
    muse: {
      responsibilities: ["Offer creative variations", "Keep Studio prompt history tidy", "Defer visual calls to Sauce Sensei"],
      reportsTo: "Sauce Sensei",
    },
    ledger: {
      responsibilities: ["Pricing and estimate sanity checks", "Margin notes on jobs", "Flag missing budget info on leads"],
      reportsTo: "Margaret",
    },
    statute: {
      responsibilities: ["Route legal questions", "Flag contract / compliance risk", "Not a substitute for a lawyer"],
      reportsTo: "Margaret",
    },
    archive: {
      responsibilities: ["Organize memory and knowledge", "Keep always-remember rules current", "Link notes to projects"],
      reportsTo: "Kara",
    },
  };

  const SAUCE_PROJECTS = [
    "UTC.OS",
    "UP2CODE company website",
    "Lil Wiz-Nap release arc",
    "The Fool cover",
    "Luxury Product Forge",
  ];

  /** [26] — the two remembered decisions observed in the live walk */
  const SAUCE_FIXTURE_DECISIONS = [
    {
      id: "fx1",
      scope: "UTC.OS",
      verdict: "Approved",
      text: "Dark layered surfaces, violet depth, antique gold accents.",
      fixture: true,
    },
    {
      id: "fx2",
      scope: "Global",
      verdict: "Rejected",
      text: "Generic startup cards and washed-out palettes.",
      fixture: true,
    },
  ];

  const SAUCE_PALETTE = [
    { name: "Near-black", hex: "#07060b" },
    { name: "Rich purple", hex: "#3b0f5c" },
    { name: "Blue-violet", hex: "#5b4bff" },
    { name: "Magenta", hex: "#c026d3" },
    { name: "Antique gold", hex: "#c9a227" },
  ];

  /** Brain map [17] — 12 of 38 nodes. Labels observed; detail text is fixture. */
  const BRAIN_NODES = [
    {
      id: "core",
      type: "core",
      label: "UTC.OS second brain",
      detail: "Projects, saved memories, knowledge, tasks, and leads are connected around one local command core.",
      relation: "Project: No project relationship saved",
      proof: "Local indexed data · observed in live walk [17]",
    },
    { id: "p-web", type: "project", label: "UP2CODE company website", detail: "Public site for UP2CODE painting / contractor work.", relation: "Workspace: Business", proof: "Node label observed [17] · detail is shell fixture" },
    { id: "p-utcos", type: "project", label: "UTC.OS independent app", detail: "The operating system itself — this shell reconstructs its surfaces.", relation: "Workspace: All work", proof: "Node label observed [17] · detail is shell fixture" },
    { id: "p-forge", type: "project", label: "Luxury Product Forge", detail: "Product ideas planned in Forge; stops before spend.", relation: "Linked module: Forge", proof: "Node label observed [17] · detail is shell fixture" },
    { id: "p-lwn", type: "project", label: "Lil Wiz-Nap release arc", detail: "Music release sequence for the creative reality.", relation: "Workspace: Music", proof: "Node label observed [17] · detail is shell fixture" },
    { id: "p-fool", type: "project", label: "The Fool cover", detail: "Cover art direction; image references kept project-only in Knowledge.", relation: "Project: Lil Wiz-Nap release arc", proof: "Node label observed [17] · detail is shell fixture" },
    { id: "p-radar", type: "project", label: "UP2CODE Job Radar", detail: "Pittsburgh public-source lead discovery feeding Lead Center.", relation: "Linked module: Lead Center", proof: "Node label observed [17] · detail is shell fixture" },
    { id: "m-cabinet", type: "memory", label: "Cabinet lead follow-up angle", detail: "Emphasize timeline flexibility and finish quality for the Coraopolis cabinet refresh.", relation: "Project: UP2CODE Job Radar", proof: "Memory fixture [22] · Inbox" },
    { id: "m-painter", type: "memory", label: "Painter opening call note", detail: "Recommended next action on Daily Command.", relation: "Linked: Today", proof: "Memory fixture [22] · Linked" },
    { id: "m-palette", type: "memory", label: "Lil Wiz-Nap palette reminder", detail: "Near-black / violet / antique gold; reject washed-out startup cards.", relation: "Project: Lil Wiz-Nap release arc", proof: "Memory fixture [22] · Linked" },
    { id: "k-brand", type: "knowledge", label: "UP2CODE brand rule", detail: "Always-remember brand rule for UP2CODE output.", relation: "Scope: Global", proof: "Knowledge fixture [23] · Rule" },
    { id: "k-dark", type: "knowledge", label: "UTC.OS dark surface rule", detail: "Dark layered surfaces with purposeful glow.", relation: "Project: UTC.OS independent app", proof: "Knowledge fixture [23] · Rule" },
  ];
  const BRAIN_PAGE_SIZE = 6;

  /** Setup [18] status cards — labels observed in live walk */
  const SETUP_STATUS = [
    { key: "memory", name: "Local memory", status: "Ready", note: "3 memories · 12 knowledge items (fixture)" },
    { key: "mic", name: "Microphone", status: "Connect", note: "Deliberate permission — not requested here" },
    { key: "transcription", name: "Transcription", status: "Ready", note: "Live walk label" },
    { key: "output", name: "Output", status: "Ready", note: "Live walk label" },
    { key: "camera", name: "Camera", status: "Connect", note: "Deliberate permission — not requested here" },
    { key: "screen", name: "Screen awareness", status: "Connect", note: "Deliberate permission — not requested here" },
    { key: "reasoning", name: "Live reasoning", status: "Connect", note: "Live personality reasoning not wired" },
    { key: "radar", name: "Lead Radar", status: "Ready", note: "Radar not run from this shell" },
    { key: "install", name: "Installability", status: "Ready", note: "Manifest + service worker shipped" },
    { key: "knowledge", name: "Knowledge", status: "Ready", note: "12 fixture items" },
    { key: "outside", name: "Outside apps", status: "Connect", note: "Launch points only · no OAuth" },
  ];

  const VOICE_PERSONAS = [
    { id: "Margaret", note: "Measured, executive" },
    { id: "Kara", note: "Warm, organized" },
    { id: "Jarvis", note: "Crisp, technical" },
    { id: "Sauce Sensei", note: "Expressive, creative" },
  ];

  /* ---------- Local persistence (utcos-shell:*) ---------- */
  const STORE_PREFIX = "utcos-shell:";
  const store = (function () {
    let ok = false;
    try {
      const t = STORE_PREFIX + "__test";
      window.localStorage.setItem(t, "1");
      window.localStorage.removeItem(t);
      ok = true;
    } catch (e) {
      ok = false;
    }
    return {
      available: ok,
      get(key, fallback) {
        if (!ok) return fallback;
        try {
          const raw = window.localStorage.getItem(STORE_PREFIX + key);
          return raw == null ? fallback : JSON.parse(raw);
        } catch (e) {
          return fallback;
        }
      },
      set(key, value) {
        if (!ok) return false;
        try {
          window.localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value));
          return true;
        } catch (e) {
          return false;
        }
      },
      keys() {
        if (!ok) return [];
        const out = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.indexOf(STORE_PREFIX) === 0) out.push(k);
        }
        return out;
      },
      clearAll() {
        this.keys().forEach((k) => window.localStorage.removeItem(k));
      },
    };
  })();

  function localNoteText() {
    return store.available
      ? "Saved on this device only"
      : "Local storage unavailable — changes last this session only";
  }

  const state = {
    view: "home",
    world: "up2code",
    activeAgent: "kara",
    agentBeforeCreative: "kara",
    pipelineFilter: "All",
    keyTasks: [],
    backlog: BACKLOG_ITEMS.slice(),
    mockupStep: 1,
    memoryTab: "inbox",
    studioWorld: "Inside the Dojo",
    studioFormat: "Album",
    routeParam: "",
    todayFocus: "",
    todayCommitment: "",
    reviewRaw: "",
    reviewSummary: "",
    leadOverrides: {},
    skillRuns: {},
    memoriesAdded: [],
    knowledgeAdded: [],
    settings: { routing: {}, triggers: {} },
    sauceDecisions: [],
    sauceProject: "UTC.OS",
    voicePersona: "Kara",
    brainPage: 0,
    brainSelected: "core",
    habits: [],
    goals: [],
    chats: {},
    lessons: {},
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const ROUTE_MAP = {
    "": "home",
    home: "home",
    today: "today",
    forge: "forge",
    leads: "lead-center",
    "lead-center": "lead-center",
    skills: "skills",
    system: "system",
    connections: "connections",
    settings: "settings",
    security: "security",
    memory: "memory",
    knowledge: "knowledge",
    studio: "studio",
    mockup: "mockup",
    team: "team",
    search: "search",
    vault: "vault",
    agent: "home",
    specialist: "specialist",
    lesson: "lesson",
    brain: "home",
    setup: "home",
  };

  const NAV_HIGHLIGHT = {
    home: "home",
    today: "today",
    forge: "forge",
    "lead-center": "lead-center",
    skills: "skills",
    system: "system",
    connections: "system",
    settings: "system",
    security: "system",
    memory: "system",
    knowledge: "system",
    studio: "system",
    mockup: "system",
    team: "system",
    search: "home",
    vault: "home",
    specialist: "system",
    lesson: "system",
  };

  function routeFromHash() {
    const h = (location.hash || "#/").replace(/^#\/?/, "") || "home";
    const path = h.split("?")[0].replace(/\/$/, "") || "home";
    const parts = path.split("/");
    const head = parts[0];
    state.routeParam = parts.slice(1).join("/");
    // Phase 4: #/brain and #/setup deep-link to their Home tab; plain #/
    // (or #/home) always resets to the default Home tab.
    if (head === "brain" || head === "setup") state.homeTabRequest = head;
    else if (head === "home" || head === "") state.homeTabRequest = "home";
    return ROUTE_MAP[head] || ROUTE_MAP[path] || "home";
  }

  function setHash(view) {
    const target = view === "home" ? "#/" : "#/" + view;
    if (location.hash !== target) location.hash = target;
    else navigate(routeFromHash(), true);
  }

  function navigate(view, skipHash) {
    state.view = view;
    if (!skipHash) {
      const target = view === "home" ? "#/" : "#/" + view;
      if (location.hash !== target) {
        location.hash = target;
        return;
      }
    }

    $$(".view").forEach((el) => {
      el.classList.toggle("active", el.dataset.view === view);
    });

    const navKey = NAV_HIGHLIGHT[view] || "home";
    $$(".nav-item").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.nav === navKey);
    });

    hideToast();
    closeLead();
    if (view === "specialist") renderSpecialist(state.routeParam);
    if (view === "lesson") renderLesson(state.routeParam);
    if (view === "home" && state.homeTabRequest) {
      showHomeTab(state.homeTabRequest);
      state.homeTabRequest = "";
    }
    $("#main").scrollTop = 0;
  }

  let toastTimer = null;

  function showToast(msg) {
    const toast = $("#toast");
    $("#toastMsg").textContent = msg;
    toast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 3200);
  }

  function hideToast() {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    $("#toast").classList.remove("show");
  }

  function renderAgents() {
    const strip = $("#agentStrip");
    strip.innerHTML = "";
    Object.values(AGENTS).forEach((a) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "agent-card" + (state.activeAgent === a.id ? " active" : "");
      card.dataset.agent = a.id;
      card.setAttribute("role", "listitem");
      const status =
        state.activeAgent === a.id ? "ACTIVE · LIVE" : a.statusReady;
      card.innerHTML =
        '<div class="agent-card-art" data-initial="' +
        a.initial +
        '"></div>' +
        '<div class="agent-card-body">' +
        '<div class="agent-status">' +
        status +
        "</div>" +
        '<div class="agent-name">' +
        a.name.toUpperCase() +
        "</div>" +
        '<div class="agent-role">' +
        a.role +
        "</div>" +
        '<div class="agent-tag">“' +
        a.tagline +
        '”</div>' +
        "</div>";
      card.addEventListener("click", () => selectAgent(a.id, { fromCard: true }));
      strip.appendChild(card);
    });
  }

  function selectAgent(id, opts) {
    opts = opts || {};
    if (!AGENTS[id]) return;
    if (!opts.fromCoin && state.world === "up2code") {
      state.agentBeforeCreative = id;
    }
    state.activeAgent = id;
    store.set("activeAgent", id);
    store.set("agentBeforeCreative", state.agentBeforeCreative);
    renderAgents();
    renderCockpit();
    $("#btnActiveAgent").textContent = AGENTS[id].initial;
    $("#systemStatusLine").textContent =
      AGENTS[id].name + " READY · Local shell";
    if (opts.toast) showToast(AGENTS[id].name + " is now the active intelligence.");
    renderTeam();
  }

  function renderCockpit() {
    const a = AGENTS[state.activeAgent];
    $("#cockpitTitle").textContent = "Ask " + a.name;
    $("#cockpitHint").textContent = a.hint;
    renderAllChats();
    const chips = $("#promptChips");
    chips.innerHTML = "";
    const list =
      state.world === "lilwiznap" && a.id === "sauce"
        ? a.prompts
        : a.id === "sauce" && state.world === "up2code"
          ? a.promptsBusiness
          : a.prompts;
    list.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = p;
      b.addEventListener("click", () => {
        $("#cockpitInput").value = p;
        sendCockpit();
      });
      chips.appendChild(b);
    });
  }

  function sendCockpit() {
    const a = AGENTS[state.activeAgent];
    const input = $("#cockpitInput");
    const q = (input.value || "").trim();
    if (!q) {
      showToast("Type a command for " + a.name + " — or “help”.");
      input.focus();
      return;
    }
    input.value = "";
    chatSend(a.id, q);
  }

  function focusHomeCockpit() {
    // Ensure Home tab, then scroll cockpit into view
    $$("[data-home-tab]").forEach((t) =>
      t.classList.toggle("active", t.dataset.homeTab === "home")
    );
    $("#homeTabHome").hidden = false;
    $("#homeTabBrain").hidden = true;
    $("#homeTabSetup").hidden = true;
    setHash("home");
    setTimeout(() => {
      const cock = $("#cockpit");
      if (cock) {
        cock.scrollIntoView({ behavior: "smooth", block: "center" });
        cock.classList.add("focus-pulse");
        setTimeout(() => cock.classList.remove("focus-pulse"), 1200);
      }
      const input = $("#cockpitInput");
      if (input) input.focus();
    }, 80);
  }

  function applyWorldUI() {
    const coin = $("#coin");
    const creative = state.world === "lilwiznap";
    coin.classList.toggle("flipped", creative);
    $("#worldChip").textContent = creative ? "Lil Wiz-Nap" : "UP2CODE";
    $("#worldChip").classList.toggle("creative", creative);
    $("#realityDesc").textContent = creative
      ? "Music, visuals, and creative work."
      : "Prospects, priorities, and the next paid job.";
    $("#heroSub").textContent = creative
      ? "LIL WIZ-NAP · MUSIC / VISUALS / CREATIVE"
      : "UP2CODE · CREATION / ORGANIZATION / DEDICATION";
    $("#creativeCard").hidden = !creative;
    syncGoalCategoryDefault();
  }

  function flipCoin() {
    const goingCreative = state.world === "up2code";
    if (goingCreative) {
      state.agentBeforeCreative = state.activeAgent;
      state.world = "lilwiznap";
      store.set("world", state.world);
      applyWorldUI();
      selectAgent("sauce", { fromCoin: true });
      showToast("Sauce Sensei is now the active intelligence.");
    } else {
      state.world = "up2code";
      store.set("world", state.world);
      applyWorldUI();
      selectAgent(state.agentBeforeCreative || "kara", { fromCoin: true });
      showToast(
        AGENTS[state.activeAgent].name + " is now the active intelligence."
      );
    }
  }

  function renderPipeline() {
    const wrap = $("#pipelineFilters");
    wrap.innerHTML = "";
    PIPELINE.forEach((f) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (state.pipelineFilter === f ? " active" : "");
      b.textContent = f;
      b.addEventListener("click", () => {
        state.pipelineFilter = f;
        renderPipeline();
        renderLeads();
      });
      wrap.appendChild(b);
    });
  }

  function renderLeads() {
    const list = $("#leadList");
    list.innerHTML = "";
    const filtered = FIXTURE_LEADS.filter((l) => {
      if (state.pipelineFilter === "All") return true;
      return l.status === state.pipelineFilter;
    });
    if (!filtered.length) {
      list.innerHTML =
        '<p class="small muted">No fixture leads in this filter.</p>';
      return;
    }
    filtered.forEach((l) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lead-card";
      const scoreClass =
        l.band === "HOT" ? "hot" : l.band === "WARM" ? "warm" : "";
      const stClass =
        l.status === "LOST" ? "lost" : l.status === "NEW" ? "new" : "";
      btn.innerHTML =
        '<div class="lead-card-top">' +
        "<div><div class=\"lead-title\">" +
        escapeHtml(l.title) +
        '</div><div class="lead-meta">' +
        escapeHtml(l.category) +
        " · " +
        escapeHtml(l.location) +
        "</div></div>" +
        '<div class="lead-score ' +
        scoreClass +
        '">' +
        l.score +
        "</div></div>" +
        '<div class="small muted">' +
        escapeHtml(l.company) +
        ' · <span class="demo-badge">Demo data</span></div>' +
        '<span class="lead-status ' +
        stClass +
        '">' +
        l.status +
        (l.unread ? " · Unread" : "") +
        "</span>";
      btn.addEventListener("click", () => openLead(l));
      list.appendChild(btn);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function openLead(l) {
    $("#leadDialogTitle").textContent = l.title;
    $("#leadDialogBody").innerHTML =
      '<div class="field-block"><div class="lbl">Score</div><div class="val">' +
      l.band +
      " · " +
      l.score +
      "</div></div>" +
      '<div class="field-block"><div class="lbl">Customer</div><div class="val">' +
      escapeHtml(l.company) +
      "</div></div>" +
      '<div class="field-block"><div class="lbl">Category / Location</div><div class="val">' +
      escapeHtml(l.category) +
      " · " +
      escapeHtml(l.location) +
      "</div></div>" +
      '<div class="field-block"><div class="lbl">Project</div><div class="val">' +
      escapeHtml(l.project) +
      "</div></div>" +
      '<div class="field-block"><div class="lbl">AI summary</div><div class="val">' +
      escapeHtml(l.aiSummary) +
      "</div></div>" +
      '<div class="field-block"><div class="lbl">Suggested response</div><div class="val">—</div></div>' +
      '<div class="field-block"><div class="lbl">Source post</div><div class="val">' +
      escapeHtml(l.source) +
      "</div></div>" +
      '<div class="field-block"><div class="lbl">Radar verification</div><div class="val">' +
      escapeHtml(l.radarNotes) +
      "</div></div>" +
      '<div class="field-block"><div class="lbl">Why it fits UP2CODE</div><div class="val">' +
      escapeHtml(l.whyFits) +
      "</div></div>" +
      '<div class="field-block"><div class="lbl">Next follow-up</div><div class="val">' +
      escapeHtml(l.followUp) +
      "</div></div>" +
      '<div class="form-group"><label>Private note <span class="demo-badge">This device</span></label>' +
      '<textarea id="leadNoteInput" placeholder="Only stored in this browser…">' +
      escapeHtml(l.note === "—" ? "" : l.note) +
      "</textarea>" +
      '<button type="button" class="btn btn-ghost" style="margin-top:6px;padding:6px 12px;font-size:12px" id="leadNoteSave">Save note</button></div>' +
      '<div class="field-block"><div class="lbl">Timeline</div><div class="val">' +
      escapeHtml(l.timeline) +
      "</div></div>" +
      '<div class="form-group"><label>Pipeline stage <span class="demo-badge">Local stub</span></label><select id="leadStageSelect">' +
      PIPELINE.filter((p) => p !== "All")
        .map(
          (p) =>
            "<option" +
            (p === l.status ? " selected" : "") +
            ">" +
            p +
            "</option>"
        )
        .join("") +
      "</select></div>" +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">' +
      '<button type="button" class="btn btn-outline" disabled>Create estimate</button>' +
      '<button type="button" class="btn btn-ghost" disabled>Mark contacted</button>' +
      '<button type="button" class="btn btn-ghost" disabled>Mark won</button>' +
      '<button type="button" class="btn btn-ghost" disabled>Mark lost</button>' +
      "</div>" +
      '<p class="small local-note" style="margin-top:10px" id="leadStageNote">' +
      localNoteText() +
      " · stage + note only · no API · lead itself is fixture data</p>";
    $("#leadDialog").classList.add("open");

    const sel = $("#leadStageSelect");
    if (sel) {
      sel.addEventListener("change", () => {
        const next = sel.value;
        l.status = next;
        setLeadOverride(l.id, { status: next });
        const note = $("#leadStageNote");
        if (note) {
          note.textContent = "Stage set to " + next + " · " + localNoteText();
        }
        renderLeads();
      });
    }
    const noteBtn = $("#leadNoteSave");
    if (noteBtn) {
      noteBtn.addEventListener("click", () => {
        const val = ($("#leadNoteInput").value || "").trim();
        l.note = val || "—";
        setLeadOverride(l.id, { note: val });
        const note = $("#leadStageNote");
        if (note) note.textContent = "Private note saved · " + localNoteText();
      });
    }
  }

  function closeLead() {
    const dlg = $("#leadDialog");
    if (dlg) dlg.classList.remove("open");
  }

  function renderSkills() {
    const wrap = $("#skillList");
    wrap.innerHTML = "";
    let total = 0;
    SKILLS.forEach((s) => {
      const local = Number(state.skillRuns[s.name] || 0);
      total += s.runs + local;
      const el = document.createElement("div");
      el.className = "skill-card";
      el.innerHTML =
        '<div class="skill-card-top"><strong>' +
        escapeHtml(s.name) +
        '</strong><span class="level-badge">Level ' +
        s.level +
        "</span></div>" +
        '<div class="skill-stats">' +
        (s.runs + local) +
        " runs · streak " +
        s.streak +
        ' · <span class="demo-badge">Fixture</span>' +
        (local ? ' <span class="local-badge">+' + local + " local</span>" : "") +
        "</div>" +
        '<button type="button" class="btn btn-ghost" style="margin-top:8px;padding:6px 12px;font-size:12px" data-skill="' +
        escapeHtml(s.name) +
        '">Complete one run</button>';
      wrap.appendChild(el);
    });
    const tot = $("#skillTotalRuns");
    if (tot) tot.textContent = String(total);
    wrap.querySelectorAll("[data-skill]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = btn.dataset.skill;
        state.skillRuns[name] = Number(state.skillRuns[name] || 0) + 1;
        store.set("skillRuns", state.skillRuns);
        renderSkills();
        const panel = $("#skillAnswer");
        panel.style.display = "block";
        panel.textContent =
          "Logged one run of “" + name + "” · " + localNoteText() + " · no outside services.";
      });
    });
  }

  function renderLessons() {
    const grid = $("#lessonGrid");
    grid.innerHTML = "";
    for (let i = 1; i <= 10; i++) {
      const b = document.createElement("button");
      b.type = "button";
      const st = lessonState(i).status;
      const stLabel = LESSON_STATUSES.find((x) => x.id === st).label;
      b.className = "lesson-card " + st;
      b.innerHTML =
        '<div class="n">' + i + "</div>Lesson " + i +
        '<span class="lesson-status ' + st + '">' + stLabel + "</span>" +
        (lessonState(i).notes ? '<span class="lesson-has-notes">Notes</span>' : "");
      b.setAttribute("aria-label", "Lesson " + i + " · " + stLabel);
      b.addEventListener("click", () => setHash("lesson/" + i));
      grid.appendChild(b);
    }
    renderLessonProgress();
  }

  function renderToday() {
    const list = $("#keyTaskList");
    const backlog = $("#backlogList");
    if (!list || !backlog) return;

    list.innerHTML = "";
    if (!state.keyTasks.length) {
      $("#keyTasksHint").hidden = false;
    } else {
      $("#keyTasksHint").hidden = true;
      state.keyTasks.forEach((t) => {
        const li = document.createElement("li");
        li.className = "key-task-item" + (t.done ? " done" : "");
        li.innerHTML =
          '<button type="button" class="task-check' + (t.done ? " on" : "") + '" data-task-done="' + escapeHtml(t.id) +
          '" aria-pressed="' + !!t.done + '" aria-label="' + (t.done ? "Mark not done: " : "Mark done: ") + escapeHtml(t.title) + '">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>' +
          "<strong>" +
          escapeHtml(t.title) +
          "</strong> " +
          (t.custom
            ? '<span class="local-badge">Yours</span>'
            : '<span class="demo-badge">Fixture</span>') +
          ' <button type="button" class="small dim task-remove" data-task="' +
          escapeHtml(t.id) +
          '">Remove</button>';
        list.appendChild(li);
      });
      list.querySelectorAll("[data-task]").forEach((b) =>
        b.addEventListener("click", () => removeKeyTask(b.dataset.task))
      );
      list.querySelectorAll("[data-task-done]").forEach((b) =>
        b.addEventListener("click", () => {
          const t = state.keyTasks.find((x) => x.id === b.dataset.taskDone);
          if (!t) return;
          t.done = !t.done;
          saveToday();
          renderToday();
        })
      );
    }

    const doneCount = state.keyTasks.filter((t) => t.done).length;
    $("#keyTaskCount").textContent =
      state.keyTasks.length + "/5 key tasks" + (doneCount ? " · " + doneCount + " done" : "") + " · " + localNoteText();
    const plan = $("#planKeyCount");
    if (plan) plan.textContent = state.keyTasks.length + "/5 key tasks";

    backlog.innerHTML = "";
    $("#backlogCount").textContent = String(state.backlog.length);
    if (!state.backlog.length) {
      backlog.innerHTML =
        '<p class="small muted">Backlog empty — add your own task above.</p>';
      return;
    }
    state.backlog.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-ghost btn-block backlog-pick";
      btn.style.marginTop = "6px";
      btn.style.textAlign = "left";
      btn.innerHTML =
        escapeHtml(item.title) +
        ' <span class="demo-badge">Fixture</span>';
      btn.addEventListener("click", () => addKeyTaskFromBacklog(item.id));
      backlog.appendChild(btn);
    });
  }

  function saveToday() {
    store.set("today", {
      keyTasks: state.keyTasks,
      focus: state.todayFocus,
      commitment: state.todayCommitment,
      reviewRaw: state.reviewRaw,
      reviewSummary: state.reviewSummary,
    });
  }

  function removeKeyTask(id) {
    const idx = state.keyTasks.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const item = state.keyTasks.splice(idx, 1)[0];
    if (!item.custom && BACKLOG_ITEMS.some((b) => b.id === item.id)) {
      state.backlog.push({ id: item.id, title: item.title });
    }
    saveToday();
    renderToday();
  }

  function addKeyTaskFromBacklog(id) {
    const idx = state.backlog.findIndex((b) => b.id === id);
    if (idx < 0) return;
    if (state.keyTasks.length >= 5) {
      showToast("Key tasks capped at 5.");
      return;
    }
    const item = state.backlog.splice(idx, 1)[0];
    state.keyTasks.push({ id: item.id, title: item.title });
    saveToday();
    renderToday();
    showToast("Key task added · " + localNoteText());
  }

  function addCustomKeyTask() {
    const input = $("#customTaskInput");
    const title = (input.value || "").trim();
    if (!title) {
      showToast("Type a key task first.");
      input.focus();
      return;
    }
    if (state.keyTasks.length >= 5) {
      showToast("Key tasks capped at 5.");
      return;
    }
    state.keyTasks.push({ id: "u" + Date.now(), title: title, custom: true });
    input.value = "";
    saveToday();
    renderToday();
    showToast("Key task added · " + localNoteText());
  }

  function renderSettings() {
    const wrap = $("#routingSelectors");
    if (!wrap) return;
    wrap.innerHTML = "";
    ROUTING_ROUTES.forEach((r) => {
      const row = document.createElement("div");
      row.className = "form-group";
      const current = state.settings.routing[r.key] || r.default;
      const opts = ROUTING_PROFILES.map(
        (p) =>
          "<option" +
          (p === current ? " selected" : "") +
          ">" +
          p +
          "</option>"
      ).join("");
      row.innerHTML =
        "<label>" +
        escapeHtml(r.label) +
        '</label><select data-route="' +
        r.key +
        '">' +
        opts +
        "</select>";
      wrap.appendChild(row);
    });
    wrap.querySelectorAll("[data-route]").forEach((sel) => {
      sel.addEventListener("change", () => {
        state.settings.routing[sel.dataset.route] = sel.value;
        store.set("settings", state.settings);
        flashSettingsSaved();
      });
    });

    const trig = $("#triggerList");
    trig.innerHTML = "";
    TRIGGERS.forEach((t) => {
      const saved = state.settings.triggers[t.id];
      const checked = typeof saved === "boolean" ? saved : t.checked;
      const label = document.createElement("label");
      label.className = "radio-row";
      label.innerHTML =
        '<input type="checkbox" ' +
        (checked ? "checked " : "") +
        'data-trigger="' +
        t.id +
        '" /> ' +
        escapeHtml(t.label);
      trig.appendChild(label);
    });
    trig.querySelectorAll("[data-trigger]").forEach((cb) => {
      cb.addEventListener("change", () => {
        state.settings.triggers[cb.dataset.trigger] = cb.checked;
        store.set("settings", state.settings);
        flashSettingsSaved();
      });
    });
  }

  function flashSettingsSaved() {
    const n = $("#settingsSavedNote");
    if (!n) return;
    n.textContent = "Choice saved · " + localNoteText() + " · no scheduler runs";
  }

  function renderSecurity() {
    const log = $("#auditLog");
    if (!log) return;
    log.innerHTML = AUDIT_EVENTS.map(
      (e) =>
        '<div class="audit-row"><strong>' +
        escapeHtml(e.actor) +
        "</strong> · " +
        escapeHtml(e.event) +
        ' <span class="dim">' +
        escapeHtml(e.when) +
        "</span></div>"
    ).join("");
  }

  function allMemories() {
    return FIXTURE_MEMORIES.concat(state.memoriesAdded);
  }

  function renderMemory() {
    const wrap = $("#memoryList");
    if (!wrap) return;
    const tab = state.memoryTab;
    const all = allMemories();
    let items = all;
    if (tab === "inbox") items = all.filter((m) => m.bucket === "inbox");
    const setN = (id, n) => {
      const el = $(id);
      if (el) el.textContent = String(n);
    };
    setN("#memCountInbox", all.filter((m) => m.bucket === "inbox").length);
    setN("#memCountLinked", all.filter((m) => m.bucket === "linked").length);
    setN("#memCountAll", all.length);
    wrap.innerHTML = "";
    if (!items.length) {
      wrap.innerHTML = '<p class="small muted">No memories in this view.</p>';
      return;
    }
    items.forEach((m) => {
      const card = document.createElement("div");
      card.className = "card mem-card";
      card.innerHTML =
        '<div class="section-label">' +
        escapeHtml(m.bucket) +
        " · " +
        escapeHtml(m.workspace) +
        " " +
        (m.local
          ? '<span class="local-badge">This device</span>'
          : '<span class="demo-badge">Fixture</span>') +
        "</div>" +
        "<h2 style=\"font-size:16px\">" +
        escapeHtml(m.title) +
        "</h2>" +
        '<p class="small muted" style="margin-top:6px">' +
        escapeHtml(m.detail || "—") +
        "</p>" +
        (m.local
          ? '<button type="button" class="btn btn-ghost" style="margin-top:8px;padding:6px 12px;font-size:12px" data-mem-del="' +
            escapeHtml(m.id) +
            '">Delete local memory</button>'
          : '<button type="button" class="btn btn-ghost" style="margin-top:8px;padding:6px 12px;font-size:12px" disabled>Archive</button>');
      wrap.appendChild(card);
    });
    wrap.querySelectorAll("[data-mem-del]").forEach((b) =>
      b.addEventListener("click", () => {
        state.memoriesAdded = state.memoriesAdded.filter((m) => m.id !== b.dataset.memDel);
        store.set("memories", state.memoriesAdded);
        renderMemory();
      })
    );
  }

  function renderKnowledge() {
    const wrap = $("#knowledgeList");
    if (!wrap) return;
    wrap.innerHTML = "";
    const all = FIXTURE_KNOWLEDGE.concat(state.knowledgeAdded);
    const setN = (id, n) => {
      const el = $(id);
      if (el) el.textContent = String(n);
    };
    setN("#kCountAll", all.length);
    setN("#kCountAlways", all.filter((k) => k.always).length);
    setN("#kCountGlobal", all.filter((k) => k.scope === "Global").length);
    setN("#kCountProject", all.filter((k) => k.scope === "Project").length);
    all.forEach((k) => {
      const el = document.createElement("div");
      el.className = "card knowledge-card";
      el.innerHTML =
        '<div class="knowledge-top"><strong>' +
        escapeHtml(k.name) +
        '</strong><span class="level-badge">' +
        escapeHtml(k.kind) +
        "</span></div>" +
        '<div class="small muted">' +
        escapeHtml(k.scope) +
        (k.always ? " · Always remember" : "") +
        " · " +
        (k.local
          ? '<span class="local-badge">This device</span>'
          : '<span class="demo-badge">Fixture</span>') +
        "</div>" +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">' +
        (k.local
          ? '<button type="button" class="btn btn-ghost" style="padding:4px 10px;font-size:11px" data-k-del="' +
            escapeHtml(k.id) +
            '">Delete</button>'
          : '<button type="button" class="btn btn-ghost" style="padding:4px 10px;font-size:11px" disabled>Always remember</button>' +
            '<button type="button" class="btn btn-ghost" style="padding:4px 10px;font-size:11px" disabled>Make project-only</button>' +
            '<button type="button" class="btn btn-ghost" style="padding:4px 10px;font-size:11px" disabled>Delete</button>') +
        "</div>";
      wrap.appendChild(el);
    });
    wrap.querySelectorAll("[data-k-del]").forEach((b) =>
      b.addEventListener("click", () => {
        state.knowledgeAdded = state.knowledgeAdded.filter((k) => k.id !== b.dataset.kDel);
        store.set("knowledge", state.knowledgeAdded);
        renderKnowledge();
      })
    );
  }

  function renderStudio() {
    const worlds = $("#studioWorlds");
    if (!worlds) return;
    worlds.innerHTML = "";
    STUDIO_WORLDS.forEach((w) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (state.studioWorld === w ? " active" : "");
      b.textContent = w;
      b.addEventListener("click", () => {
        state.studioWorld = w;
        renderStudio();
      });
      worlds.appendChild(b);
    });
    const formats = $("#studioFormats");
    formats.innerHTML = "";
    STUDIO_FORMATS.forEach((f) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (state.studioFormat === f ? " active" : "");
      b.textContent = f;
      b.addEventListener("click", () => {
        state.studioFormat = f;
        renderStudio();
      });
      formats.appendChild(b);
    });
  }

  function renderMockup() {
    const panel = $("#mockupPanel");
    const label = $("#mockupStepLabel");
    if (!panel) return;
    label.textContent = String(state.mockupStep);
    $$("[data-mock-step]").forEach((b) => {
      b.classList.toggle(
        "active",
        Number(b.dataset.mockStep) === state.mockupStep
      );
    });
    const copy = {
      1: "Choose artwork. Transparent PNG recommended · under 1.5 MB. Upload disabled in shell.",
      2: "Product: heavyweight tee front preview (fixture). No catalog API.",
      3: "Placement: front / back / sleeve stubs — local UI only.",
      4: "Finish: save/download later. 0 saved mockups on live walk.",
    };
    panel.innerHTML =
      '<p class="small">' +
      copy[state.mockupStep] +
      '</p><p class="small dim" style="margin-top:8px"><span class="demo-badge">Stub</span> No artwork upload or save.</p>';
  }

  function renderTeam() {
    const core = $("#teamCore");
    const specs = $("#teamSpecialists");
    if (!core || !specs) return;
    core.innerHTML = "";
    Object.values(AGENTS).forEach((a) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "team-card" + (state.activeAgent === a.id ? " active" : "");
      btn.innerHTML =
        '<div class="team-initial">' +
        a.initial +
        "</div><div><div class=\"agent-name\">" +
        escapeHtml(a.name) +
        '</div><div class="small muted">' +
        escapeHtml(a.teamTitle) +
        '</div><div class="agent-tag">“' +
        escapeHtml(a.tagline) +
        '”</div></div>';
      btn.addEventListener("click", () => {
        selectAgent(a.id, { toast: true });
        focusHomeCockpit();
      });
      core.appendChild(btn);
      if (a.id === "sauce") {
        const mod = document.createElement("button");
        mod.type = "button";
        mod.className = "btn btn-outline btn-block team-module-link";
        mod.textContent = "Open Sauce Sensei specialist module →";
        mod.addEventListener("click", () => setHash("specialist/sauce-sensei"));
        core.appendChild(mod);
      }
    });

    specs.innerHTML = "";
    SPECIALISTS.forEach((s) => {
      const el = document.createElement("button");
      el.type = "button";
      el.dataset.spec = s.id;
      el.className = "team-card specialist";
      el.innerHTML =
        "<div><div class=\"agent-name\">" +
        escapeHtml(s.name) +
        '</div><div class="small muted">' +
        escapeHtml(s.role) +
        '</div><div class="small dim">' +
        escapeHtml(s.note) +
        ' · <span class="demo-badge">Fixture</span></div></div>' +
        '<span class="spec-open gold">Open →</span>';
      specs.appendChild(el);
    });
    specs.querySelectorAll("[data-spec]").forEach((btn) => {
      btn.addEventListener("click", () => setHash("specialist/" + btn.dataset.spec));
    });
  }

  function renderSearch(query) {
    const wrap = $("#searchResults");
    const meta = $("#searchMeta");
    if (!wrap) return;
    const q = (query || "").trim().toLowerCase();
    const groups = {};
    SEARCH_FIXTURES.forEach((item) => {
      if (q && !item.text.toLowerCase().includes(q) && !item.group.toLowerCase().includes(q)) {
        return;
      }
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item.text);
    });
    const keys = Object.keys(groups);
    if (meta) {
      meta.textContent = q
        ? "Filtered · " + keys.reduce((n, k) => n + groups[k].length, 0) + " match(es)"
        : "Showing all fixture cards";
    }
    wrap.innerHTML = "";
    if (!keys.length) {
      wrap.innerHTML =
        '<div class="card"><p class="small muted">No fixture matches for “' +
        escapeHtml(query) +
        '”.</p></div>';
      return;
    }
    keys.forEach((g) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML =
        '<div class="section-label">' +
        escapeHtml(g) +
        ' <span class="demo-badge">Fixture</span></div><ul class="search-hit-list">' +
        groups[g]
          .map((t) => "<li class=\"small\">" + escapeHtml(t) + "</li>")
          .join("") +
        "</ul>";
      wrap.appendChild(card);
    });
  }

  function wireNav() {
    $$("[data-nav]").forEach((el) => {
      el.addEventListener("click", (e) => {
        const v = el.getAttribute("data-nav");
        if (!v) return;
        if (el.tagName === "A") e.preventDefault();
        setHash(v);
      });
    });

    window.addEventListener("hashchange", () => {
      navigate(routeFromHash(), true);
    });
  }

  function showHomeTab(id) {
    $$("[data-home-tab]").forEach((t) =>
      t.classList.toggle("active", t.dataset.homeTab === id)
    );
    $("#homeTabHome").hidden = id !== "home";
    $("#homeTabBrain").hidden = id !== "brain";
    $("#homeTabSetup").hidden = id !== "setup";
    if (id === "brain") renderBrain();
    if (id === "setup") renderSetup();
  }

  function wireHomeTabs() {
    $$("[data-home-tab]").forEach((tab) => {
      tab.addEventListener("click", () => {
        const id = tab.dataset.homeTab;
        showHomeTab(id);
        // Phase 4: keep the URL in sync without firing hashchange, so the
        // address reflects the tab and #/ always means the default Home tab.
        const target = id === "home" ? "#/" : "#/" + id;
        if (location.hash !== target && history.replaceState) {
          history.replaceState(null, "", target);
        }
      });
    });
  }

  function wireForge() {
    $$("[data-forge-tab]").forEach((tab) => {
      tab.addEventListener("click", () => {
        const id = tab.dataset.forgeTab;
        $$("[data-forge-tab]").forEach((t) =>
          t.classList.toggle("active", t === tab)
        );
        $("#forgeProduct").hidden = id !== "product";
        $("#forgeVerify").hidden = id !== "verify";
      });
    });
    $$(".help-level .radio-row").forEach((row) => {
      row.addEventListener("click", () => {
        $$(".help-level .radio-row").forEach((r) =>
          r.classList.remove("selected")
        );
        row.classList.add("selected");
        const input = row.querySelector("input");
        if (input) input.checked = true;
      });
    });
    $("#btnBuildPlan").addEventListener("click", () => {
      const el = $("#forgeAnswer");
      el.style.display = "block";
      el.textContent =
        "Stub plan only. Live Forge states AI / supplier research are disconnected. Nothing purchased or sent.";
    });
    $("#btnVerify").addEventListener("click", () => {
      const el = $("#verifyAnswer");
      el.style.display = "block";
      el.textContent =
        "Verification not run. Shell respects safety boundary — no external inspect.";
    });
    $("#btnLoadPainter").addEventListener("click", () => {
      $("#forgeProductIdea").value =
        "Painter tool belt / organizer upgrade (fixture example)";
      $("#forgeFrustration").value =
        "Brushes and tape drop mid-job; pouch layout fights wet hands (fixture)";
      const el = $("#forgeAnswer");
      el.style.display = "block";
      el.textContent =
        "Painter tool example loaded into fields (local fixture text). Build plan still stub-only.";
    });
  }

  function wireLeadCenter() {
    $("#btnRadar").addEventListener("click", () => {
      const el = $("#radarAnswer");
      el.style.display = "block";
      el.textContent =
        "Radar not run. Live walk intentionally skipped Pittsburgh radar because it can upsert data. This shell never calls discovery.";
    });
    $("#btnImport").addEventListener("click", () => {
      const el = $("#radarAnswer");
      el.style.display = "block";
      el.textContent =
        "JSON/CSV import UI only — no file processed in this shell.";
    });
    $("#leadDialogClose").addEventListener("click", closeLead);
    $("#leadDialog").addEventListener("click", (e) => {
      if (e.target === $("#leadDialog")) closeLead();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLead();
    });
  }

  function wireToday() {
    $("#btnAddTask").addEventListener("click", () => {
      const details = $("#backlogDetails");
      if (details) details.open = true;
      const input = $("#customTaskInput");
      if (input) input.focus();
    });
    $("#btnCustomTask").addEventListener("click", addCustomKeyTask);
    // Phase 5: real habit + goal editors (this device only).
    wireHabits();
    wireGoals();
    $("#customTaskInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") addCustomKeyTask();
    });
    const bind = (sel, key) => {
      const el = $(sel);
      el.value = state[key] || "";
      el.addEventListener("input", () => {
        state[key] = el.value;
        saveToday();
      });
    };
    bind("#todayFocus", "todayFocus");
    bind("#todayCommitment", "todayCommitment");
    bind("#reviewRaw", "reviewRaw");
    bind("#reviewSummary", "reviewSummary");
    $("#btnSaveReview").addEventListener("click", () => {
      state.reviewRaw = $("#reviewRaw").value;
      state.reviewSummary = $("#reviewSummary").value;
      saveToday();
      const el = $("#reviewAnswer");
      el.style.display = "block";
      el.textContent = "Evening review saved · " + localNoteText() + " · not synced, no API.";
    });
  }

  function wireSystemSub() {
    $("#btnRunChecks").addEventListener("click", () => {
      const el = $("#securityAnswer");
      el.style.display = "block";
      el.textContent =
        "Local checks not run in reconstruction shell (matches live walk).";
    });
    $("#btnCreateSnap").addEventListener("click", () => {
      const el = $("#securityAnswer");
      el.style.display = "block";
      el.textContent = "Create snapshot stub — not executed.";
    });
    $("#btnClearArt").addEventListener("click", () => {
      const el = $("#securityAnswer");
      el.style.display = "block";
      el.textContent = "Clear artwork cache stub — not executed.";
    });

    $$("[data-memory-tab]").forEach((tab) => {
      tab.addEventListener("click", () => {
        state.memoryTab = tab.dataset.memoryTab;
        $$("[data-memory-tab]").forEach((t) =>
          t.classList.toggle("active", t === tab)
        );
        renderMemory();
      });
    });
    $("#btnSaveMemory").addEventListener("click", () => {
      const el = $("#memoryAnswer");
      el.style.display = "block";
      const title = ($("#memIdea").value || "").trim();
      if (!title) {
        el.textContent = "Add an idea first.";
        return;
      }
      state.memoriesAdded.push({
        id: "lm" + Date.now(),
        title: title,
        detail: ($("#memDetail").value || "").trim(),
        bucket: "inbox",
        workspace: $("#memWorkspace").value,
        local: true,
        at: new Date().toISOString(),
      });
      store.set("memories", state.memoriesAdded);
      $("#memIdea").value = "";
      $("#memDetail").value = "";
      renderMemory();
      el.textContent = "Memory saved to Inbox · " + localNoteText() + ".";
    });
    $("#btnAddKnowledge").addEventListener("click", () => {
      const el = $("#knowledgeAnswer");
      el.style.display = "block";
      const name = ($("#kName").value || "").trim();
      if (!name) {
        el.textContent = "Add a name first.";
        return;
      }
      state.knowledgeAdded.push({
        id: "lk" + Date.now(),
        name: name,
        kind: $("#kKind").value,
        scope: $("#kScope").value,
        always: $("#kAlways").checked,
        local: true,
      });
      store.set("knowledge", state.knowledgeAdded);
      $("#kName").value = "";
      renderKnowledge();
      el.textContent = "Knowledge item added · " + localNoteText() + ".";
    });

    $("#btnBuildPrompt").addEventListener("click", () => {
      const el = $("#studioAnswer");
      el.style.display = "block";
      el.textContent =
        "Prompt stub for “" +
        state.studioWorld +
        "” / " +
        state.studioFormat +
        ". No image generator · no credits.";
    });
    $("#btnCopyHistory").addEventListener("click", () => {
      const el = $("#studioAnswer");
      el.style.display = "block";
      el.textContent = "Copy history stub — clipboard not written.";
    });

    $$("[data-mock-step]").forEach((b) => {
      b.addEventListener("click", () => {
        state.mockupStep = Number(b.dataset.mockStep);
        renderMockup();
      });
    });
    $("#btnMockPrev").addEventListener("click", () => {
      state.mockupStep = Math.max(1, state.mockupStep - 1);
      renderMockup();
    });
    $("#btnMockNext").addEventListener("click", () => {
      if (state.mockupStep >= 4) {
        const el = $("#mockupAnswer");
        el.style.display = "block";
        el.textContent = "Finish stub — save/download later. 0 saved mockups.";
        return;
      }
      state.mockupStep += 1;
      renderMockup();
    });
  }

  function wireHeader() {
    $("#coin").addEventListener("click", flipCoin);
    $("#btnSend").addEventListener("click", sendCockpit);
    $("#cockpitInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendCockpit();
    });
    $("#toastDismiss").addEventListener("click", hideToast);
    $("#btnSearch").addEventListener("click", () => setHash("search"));
    $("#btnVault").addEventListener("click", () => setHash("vault"));
    $("#btnLeadsShortcut").addEventListener("click", () =>
      setHash("lead-center")
    );
    $("#btnActiveAgent").addEventListener("click", () => {
      focusHomeCockpit();
    });

    $("#searchInput").addEventListener("input", (e) => {
      renderSearch(e.target.value);
    });

    $("#btnInstall").addEventListener("click", handleInstallClick);
    wireDataControl();
    $("#btnAddSkill").addEventListener("click", () => {
      const el = $("#skillAnswer");
      el.style.display = "block";
      el.textContent = "Add skill stub — not persisted in this shell.";
    });

    const connMsg = (msg) => (e) => {
      e.preventDefault();
      const el = $("#connAnswer");
      el.style.display = "block";
      el.textContent = msg;
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
    $("#linkNotion").addEventListener(
      "click",
      connMsg("Notion — Launch point only (OBSERVED). The Job Radar URL was not captured in the live walk, so nothing opens here. Not a Connected sync.")
    );
    $("#linkGmail").addEventListener(
      "click",
      connMsg("Gmail — Launch point only. No OAuth in this shell; drafts are never read or sent.")
    );
    $("#linkCalendar").addEventListener(
      "click",
      connMsg("Google Calendar — Launch point only. No OAuth and no calendar writes in this shell.")
    );
  }

  function setTodayDate() {
    const el = $("#todayDate");
    const opts = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    el.textContent = new Date().toLocaleDateString("en-US", opts);
  }

  /* =========================================================
     Phase 3 — persistence hydrate, data control, brain map,
     setup checks, specialist pages, lessons, PWA install
     ========================================================= */

  function isObj(v) {
    return v && typeof v === "object" && !Array.isArray(v);
  }

  function loadPersisted() {
    const world = store.get("world", "up2code");
    state.world = world === "lilwiznap" ? "lilwiznap" : "up2code";
    const a = store.get("activeAgent", null);
    if (a && AGENTS[a]) state.activeAgent = a;
    const b = store.get("agentBeforeCreative", null);
    if (b && AGENTS[b]) state.agentBeforeCreative = b;

    const today = store.get("today", null);
    if (isObj(today)) {
      state.keyTasks = Array.isArray(today.keyTasks)
        ? today.keyTasks
            .filter((t) => t && typeof t.id === "string" && typeof t.title === "string")
            .slice(0, 5)
        : [];
      ["focus", "commitment", "reviewRaw", "reviewSummary"].forEach((k) => {
        const target =
          k === "focus" ? "todayFocus" : k === "commitment" ? "todayCommitment" : k;
        if (typeof today[k] === "string") state[target] = today[k];
      });
    }
    state.backlog = BACKLOG_ITEMS.filter(
      (bi) => !state.keyTasks.some((t) => t.id === bi.id)
    );

    const leads = store.get("leads", {});
    state.leadOverrides = isObj(leads) ? leads : {};
    FIXTURE_LEADS.forEach((l) => {
      const o = state.leadOverrides[l.id];
      if (!isObj(o)) return;
      if (typeof o.status === "string" && PIPELINE.indexOf(o.status) > 0) l.status = o.status;
      if (typeof o.note === "string") l.note = o.note || "—";
    });

    const runs = store.get("skillRuns", {});
    state.skillRuns = isObj(runs) ? runs : {};

    const mems = store.get("memories", []);
    state.memoriesAdded = Array.isArray(mems)
      ? mems.filter((m) => m && m.title).map((m) => Object.assign({}, m, { local: true }))
      : [];
    const know = store.get("knowledge", []);
    state.knowledgeAdded = Array.isArray(know)
      ? know.filter((k) => k && k.name).map((k) => Object.assign({}, k, { local: true }))
      : [];

    const settings = store.get("settings", null);
    if (isObj(settings)) {
      state.settings = {
        routing: isObj(settings.routing) ? settings.routing : {},
        triggers: isObj(settings.triggers) ? settings.triggers : {},
      };
    }

    const decs = store.get("sauceDecisions", []);
    state.sauceDecisions = Array.isArray(decs) ? decs.filter((d) => d && d.text) : [];
    const proj = store.get("sauceProject", null);
    if (proj && SAUCE_PROJECTS.indexOf(proj) >= 0) state.sauceProject = proj;
    const voice = store.get("voicePersona", null);
    if (voice && VOICE_PERSONAS.some((v) => v.id === voice)) state.voicePersona = voice;
    loadPhase5();
  }

  function setLeadOverride(id, patch) {
    state.leadOverrides[id] = Object.assign({}, state.leadOverrides[id] || {}, patch);
    store.set("leads", state.leadOverrides);
  }

  function applyLocalNotes() {
    $$(".local-note").forEach((el) => {
      if (el.id === "dataStatusLine") return;
      el.textContent = localNoteText();
    });
    updateDataStatusLine();
  }

  function updateDataStatusLine() {
    const el = $("#dataStatusLine");
    if (!el) return;
    el.textContent = store.available
      ? "Saved on this device only · " + store.keys().length + " local key(s) stored"
      : localNoteText();
  }

  const FLASH_KEY = "utcos-shell-flash";

  function flashAndReload(msg) {
    try {
      window.sessionStorage.setItem(FLASH_KEY, msg);
    } catch (e) {
      /* ignore */
    }
    location.reload();
  }

  function showFlash() {
    let msg = null;
    try {
      msg = window.sessionStorage.getItem(FLASH_KEY);
      if (msg) window.sessionStorage.removeItem(FLASH_KEY);
    } catch (e) {
      msg = null;
    }
    if (!msg) return;
    const el = $("#dataAnswer");
    if (el) {
      el.style.display = "block";
      el.textContent = msg;
    }
    showToast(msg);
  }

  function dataMsg(msg) {
    const el = $("#dataAnswer");
    el.style.display = "block";
    el.textContent = msg;
  }

  function wireDataControl() {
    $("#btnExport").addEventListener("click", () => {
      if (!store.available) {
        dataMsg("Local storage unavailable in this browser — nothing to export.");
        return;
      }
      const keys = {};
      // Phase 6: the OpenAI key (and its test status) never leave this device.
      store.keys().forEach((k) => {
        if (AI_PRIVATE_KEYS.indexOf(k) >= 0) return;
        keys[k] = window.localStorage.getItem(k);
      });
      const payload = {
        format: "utcos-shell-backup",
        version: 1,
        note: "UTC.OS reconstruction shell — local device data only. Not live utc-os-app.",
        exportedAt: new Date().toISOString(),
        keys: keys,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date();
      const stamp =
        d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(d.getDate()).padStart(2, "0");
      a.href = url;
      a.download = "utcos-shell-backup-" + stamp + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      dataMsg(
        "Exported " +
          Object.keys(keys).length +
          " local key(s) to " +
          a.download +
          ". File stays on this device." +
          (aiKey() ? " Your OpenAI key was NOT included — it stays in this browser only." : "")
      );
    });

    const fileInput = $("#importFile");
    $("#btnImportData").addEventListener("click", () => {
      if (!store.available) {
        dataMsg("Local storage unavailable in this browser — import cannot be saved.");
        return;
      }
      fileInput.value = "";
      fileInput.click();
    });
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onerror = () => dataMsg("Could not read that file.");
      reader.onload = () => {
        let payload;
        try {
          payload = JSON.parse(String(reader.result));
        } catch (e) {
          dataMsg("Import failed — file is not valid JSON.");
          return;
        }
        if (!isObj(payload) || payload.format !== "utcos-shell-backup" || !isObj(payload.keys)) {
          dataMsg("Import failed — not a UTC.OS shell backup (expected format “utcos-shell-backup”).");
          return;
        }
        const entries = Object.keys(payload.keys).filter((k) => {
          if (k.indexOf(STORE_PREFIX) !== 0) return false;
          if (AI_PRIVATE_KEYS.indexOf(k) >= 0) return false;
          const v = payload.keys[k];
          if (typeof v !== "string") return false;
          try {
            JSON.parse(v);
            return true;
          } catch (e) {
            return false;
          }
        });
        if (!entries.length) {
          dataMsg("Import found no valid utcos-shell: keys. Nothing changed.");
          return;
        }
        const ok = window.confirm(
          "Replace this device's UTC.OS shell data with " +
            entries.length +
            " key(s) from “" +
            file.name +
            "”? Current local data will be overwritten."
        );
        if (!ok) {
          dataMsg("Import cancelled. Nothing changed.");
          return;
        }
        // Keep this device's own OpenAI key (never part of a backup).
        const keepAi = AI_PRIVATE_KEYS.map((k) => [k, window.localStorage.getItem(k)]);
        store.clearAll();
        keepAi.forEach(([k, v]) => {
          if (v != null) window.localStorage.setItem(k, v);
        });
        entries.forEach((k) => window.localStorage.setItem(k, payload.keys[k]));
        flashAndReload("Imported " + entries.length + " local key(s) from backup. Saved on this device only.");
      };
      reader.readAsText(file);
    });

    $("#btnReset").addEventListener("click", () => {
      if (!store.available) {
        dataMsg("Local storage unavailable — nothing stored to reset.");
        return;
      }
      const n = store.keys().length;
      const ok = window.confirm(
        "Reset local data? This clears " +
          n +
          " utcos-shell: key(s) on this device (tasks, habits, goals, lessons, chats, notes, runs, memories, decisions, settings" + (aiKey() ? ", and your saved OpenAI key" : "") + "). Fixture data stays."
      );
      if (!ok) {
        dataMsg("Reset cancelled. Nothing changed.");
        return;
      }
      store.clearAll();
      flashAndReload("Local data reset — " + n + " key(s) cleared. Fixture data restored.");
    });
  }

  /* ---------- Brain map ---------- */

  function brainSatellites() {
    return BRAIN_NODES.slice(1);
  }

  function brainPageCount() {
    return Math.ceil(brainSatellites().length / BRAIN_PAGE_SIZE);
  }

  const BRAIN_COLORS = {
    core: "#e0c060",
    project: "#c9a227",
    memory: "#a855f7",
    knowledge: "#4f8cff",
  };

  function renderBrain() {
    const galaxy = $("#brainGalaxy");
    if (!galaxy) return;
    const pages = brainPageCount();
    const page = Math.min(Math.max(state.brainPage, 0), pages - 1);
    state.brainPage = page;
    const sats = brainSatellites();
    const pageNodes = sats.slice(page * BRAIN_PAGE_SIZE, page * BRAIN_PAGE_SIZE + BRAIN_PAGE_SIZE);
    const core = BRAIN_NODES[0];
    const W = 340;
    const H = 250;
    const cx = W / 2;
    const cy = H / 2;

    // deterministic star field
    let seed = 7;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    let stars = "";
    for (let i = 0; i < 46; i++) {
      stars +=
        '<circle cx="' +
        (rnd() * W).toFixed(1) +
        '" cy="' +
        (rnd() * H).toFixed(1) +
        '" r="' +
        (0.4 + rnd() * 0.9).toFixed(2) +
        '" fill="#fff" opacity="' +
        (0.15 + rnd() * 0.45).toFixed(2) +
        '"/>';
    }

    const pos = pageNodes.map((n, i) => {
      const ang = (-90 + (i * 360) / pageNodes.length) * (Math.PI / 180);
      return { n: n, x: cx + 112 * Math.cos(ang), y: cy + 84 * Math.sin(ang) };
    });

    let lines = "";
    let nodes = "";
    pos.forEach((p) => {
      lines +=
        '<line x1="' + cx + '" y1="' + cy + '" x2="' + p.x.toFixed(1) + '" y2="' + p.y.toFixed(1) +
        '" stroke="' + BRAIN_COLORS[p.n.type] + '" stroke-opacity="0.35" stroke-width="1"/>';
    });
    // ring between neighbours
    pos.forEach((p, i) => {
      const q = pos[(i + 1) % pos.length];
      if (pos.length > 2) {
        lines +=
          '<line x1="' + p.x.toFixed(1) + '" y1="' + p.y.toFixed(1) + '" x2="' + q.x.toFixed(1) +
          '" y2="' + q.y.toFixed(1) + '" stroke="#7c3aed" stroke-opacity="0.18" stroke-width="0.8" stroke-dasharray="3 4"/>';
      }
    });
    const nodeSvg = (n, x, y, r) => {
      const sel = state.brainSelected === n.id;
      const label = n.label.length > 19 ? n.label.slice(0, 18) + "…" : n.label;
      return (
        '<g class="brain-node' + (sel ? " selected" : "") + '" data-node="' + n.id + '" tabindex="0" role="button" aria-label="' + escapeHtml(n.label) + '">' +
        (sel ? '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (r + 6) + '" fill="none" stroke="' + BRAIN_COLORS[n.type] + '" stroke-opacity="0.7" stroke-width="1.2"/>' : "") +
        '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (r + 10) + '" fill="transparent"/>' +
        '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="' + BRAIN_COLORS[n.type] + '" filter="url(#glow)"/>' +
        '<text x="' + x.toFixed(1) + '" y="' + (y + r + 11).toFixed(1) + '" text-anchor="middle" class="brain-label">' + escapeHtml(label) + "</text>" +
        "</g>"
      );
    };
    pos.forEach((p) => {
      nodes += nodeSvg(p.n, p.x, p.y, 7);
    });
    nodes += nodeSvg(core, cx, cy, 14);

    galaxy.innerHTML =
      '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Brain map constellation">' +
      '<defs><filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<radialGradient id="neb" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#3b0f5c" stop-opacity="0.55"/><stop offset="1" stop-color="#050508" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#neb)"/>' +
      stars + lines + nodes +
      "</svg>";

    const list = $("#brainNodeList");
    list.innerHTML = "";
    [core].concat(pageNodes).forEach((n) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "listitem");
      b.className = "brain-chip" + (state.brainSelected === n.id ? " active" : "");
      b.dataset.node = n.id;
      b.innerHTML = '<i class="lg ' + n.type + '"></i>' + escapeHtml(n.label);
      list.appendChild(b);
    });

    $("#btnBrainPrev").disabled = page === 0;
    $("#btnBrainNext").disabled = page >= pages - 1;
    $("#brainPageNum").textContent = page + 1 + "/" + pages;
    const start = page * BRAIN_PAGE_SIZE + 1;
    const end = page * BRAIN_PAGE_SIZE + pageNodes.length;
    $("#brainPageLabel").textContent =
      "Showing core + nodes " + start + "–" + end + " of " + sats.length + " captured satellites · 12 of 38 live nodes.";
    renderBrainProof();
  }

  function renderBrainProof() {
    const card = $("#brainProof");
    const n = BRAIN_NODES.find((x) => x.id === state.brainSelected) || BRAIN_NODES[0];
    card.innerHTML =
      '<div class="brain-proof-top"><span class="section-label" style="margin:0">Source proof</span><span class="type-tag ' +
      n.type + '">' + n.type.toUpperCase() + "</span></div>" +
      '<h2 class="serif-title">' + escapeHtml(n.label) + "</h2>" +
      '<p class="small" style="margin-top:6px">' + escapeHtml(n.detail) + "</p>" +
      '<p class="small muted" style="margin-top:10px">' + escapeHtml(n.relation) + "</p>" +
      '<p class="small dim proof-line">' + escapeHtml(n.proof) + "</p>";
  }

  function wireBrain() {
    const pick = (e) => {
      const t = e.target.closest("[data-node]");
      if (!t) return;
      state.brainSelected = t.dataset.node;
      renderBrain();
    };
    $("#brainGalaxy").addEventListener("click", pick);
    $("#brainGalaxy").addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pick(e);
      }
    });
    $("#brainNodeList").addEventListener("click", pick);
    $("#btnBrainPrev").addEventListener("click", () => {
      state.brainPage -= 1;
      renderBrain();
    });
    $("#btnBrainNext").addEventListener("click", () => {
      state.brainPage += 1;
      renderBrain();
    });
  }

  /* ---------- Setup ---------- */

  const setupLocal = {};

  function renderSetup() {
    const grid = $("#setupStatus");
    if (!grid) return;
    grid.innerHTML = SETUP_STATUS.map((c) => {
      const ready = c.status === "Ready";
      const local = setupLocal[c.key];
      return (
        '<div class="setup-card">' +
        '<div class="setup-card-top"><strong>' + escapeHtml(c.name) + "</strong>" +
        '<span class="badge ' + (ready ? "ready" : "launch") + '">' + c.status + "</span></div>" +
        '<div class="small dim">' + escapeHtml(c.note) + "</div>" +
        (local ? '<div class="small setup-local">This device: ' + escapeHtml(local) + "</div>" : "") +
        "</div>"
      );
    }).join("");

    const vl = $("#voicePersonaList");
    vl.innerHTML = "";
    VOICE_PERSONAS.forEach((v) => {
      const label = document.createElement("label");
      label.className = "radio-row" + (state.voicePersona === v.id ? " selected" : "");
      label.innerHTML =
        '<input type="radio" name="voicePersona" value="' + escapeHtml(v.id) + '"' +
        (state.voicePersona === v.id ? " checked" : "") + " /> " +
        escapeHtml(v.id) + ' <span class="small dim">· ' + escapeHtml(v.note) + "</span>";
      label.querySelector("input").addEventListener("change", () => {
        state.voicePersona = v.id;
        store.set("voicePersona", v.id);
        renderSetup();
      });
      vl.appendChild(label);
    });
    const cb = $("#openaiVoice");
    cb.checked = false;
    cb.disabled = true;
  }

  function runSetupChecks() {
    const out = $("#setupCheckResults");
    out.style.display = "block";
    out.textContent = "Running local checks…";
    const rows = [];
    const add = (label, ok, detail) => rows.push({ label: label, ok: ok, detail: detail });

    add("localStorage", store.available, store.available ? "available · " + store.keys().length + " utcos-shell key(s)" : "unavailable (private mode or blocked)");
    add("Secure context", !!window.isSecureContext, window.isSecureContext ? "yes (HTTPS or localhost)" : "no — install + service worker need HTTPS");
    add("Service worker API", "serviceWorker" in navigator, "serviceWorker" in navigator ? swState : "not supported by this browser");
    add("Manifest linked", !!document.querySelector('link[rel="manifest"]'), "manifest.json");
    const standalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
    add("Running installed", standalone, standalone ? "standalone display mode" : "in browser tab");
    add("Install prompt offered", !!deferredInstall, deferredInstall ? "browser offered beforeinstallprompt" : "not offered (yet) by this browser");
    const media = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    add("Camera / mic API present", media, media ? "present · permission NOT requested" : "not present");
    add("Speech synthesis API present", "speechSynthesis" in window, "not used by this shell");
    add("Browser reports online", navigator.onLine, "navigator.onLine only — no request made");

    const finish = () => {
      setupLocal.memory = store.available ? "storage OK" : "storage unavailable";
      setupLocal.install = standalone
        ? "installed"
        : window.isSecureContext && "serviceWorker" in navigator
          ? "eligible context · " + swState
          : "needs HTTPS to install";
      setupLocal.mic = media ? "API present, not requested" : "API absent";
      setupLocal.camera = setupLocal.mic;
      renderSetup();
      out.innerHTML =
        '<div class="small" style="margin-bottom:6px"><strong>Local checks · ' +
        new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) +
        "</strong> — browser capabilities only. Fixture status cards above are unchanged except “This device” lines.</div>" +
        '<ul class="check-list">' +
        rows.map((r) =>
          '<li><span class="' + (r.ok ? "ok" : "warn") + '">' + (r.ok ? "Yes" : "No") + "</span> " +
          escapeHtml(r.label) + ' <span class="dim">· ' + escapeHtml(r.detail) + "</span></li>"
        ).join("") +
        "</ul>";
    };

    if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistration) {
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (reg) {
            swState = "registered · " + (reg.active ? "active" : "installing");
            rows[2].detail = swState;
          }
          finish();
        })
        .catch(() => finish());
    } else {
      finish();
    }
  }

  function wireSetup() {
    $("#btnSetupChecks").addEventListener("click", runSetupChecks);
  }

  /* ---------- Specialists ---------- */

  const AUTHORITY_NOTE =
    "Code remains final authority; active agent does not grant outside-action permission.";

  function renderSpecialist(id) {
    const body = $("#specialistBody");
    if (!body) return;
    if (id === "sauce-sensei" || id === "sauce") {
      renderSauceModule(body);
      return;
    }
    const spec = SPECIALISTS.find((s) => s.id === id);
    if (!spec) {
      body.innerHTML =
        '<div class="card"><h2>Specialist not found</h2><p class="small muted">No specialist “' +
        escapeHtml(id || "") +
        '” in the Team fixture.</p></div>';
      return;
    }
    const d = SPECIALIST_DETAILS[spec.id] || { responsibilities: [], reportsTo: "—" };
    body.innerHTML =
      '<div class="card glow spec-hero">' +
      '<div class="section-label">Specialist <span class="demo-badge">Fixture</span></div>' +
      '<div class="spec-hero-row"><div class="spec-avatar">' + escapeHtml(spec.name.charAt(0)) + "</div>" +
      '<div><h1 class="spec-title" style="font-size:28px">' + escapeHtml(spec.name) + "</h1>" +
      '<p class="muted">' + escapeHtml(spec.role) + "</p></div></div>" +
      '<span class="badge launch" style="margin-top:10px;display:inline-block">Ready profile · no live agent</span>' +
      "</div>" +
      '<div class="card"><div class="section-label">Responsibilities</div><ul class="spec-list">' +
      d.responsibilities.map((r) => "<li>" + escapeHtml(r) + "</li>").join("") +
      "</ul></div>" +
      '<div class="card"><div class="section-label">Reporting line</div>' +
      '<p class="small"><strong>' + escapeHtml(spec.name) + "</strong> → " + escapeHtml(d.reportsTo) +
      ' → <span class="gold">Code (final authority)</span></p>' +
      '<p class="small dim" style="margin-top:6px">' + escapeHtml(spec.note) + "</p></div>" +
      '<div class="card cockpit"><div class="cockpit-title">Ask ' + escapeHtml(spec.name) + "</div>" +
      '<div class="chat-head"><span class="engine-label">' + ENGINE_LABEL + '</span><button type="button" class="small dim chat-clear" id="specClear">Clear chat</button></div>' +
      '<div class="answer-panel chat-log" id="specReply" aria-live="polite"></div>' +
      '<textarea id="specAsk" placeholder="Try “help”, “summary”, or “add task …”"></textarea>' +
      '<button type="button" class="btn btn-gold btn-block" style="margin-top:8px" id="specAskBtn">Ask ' + escapeHtml(spec.name) + "</button></div>" +
      '<p class="safety-note">' + AUTHORITY_NOTE + "</p>" +
      '<p class="small dim" style="margin:8px 2px 14px">Role name from Team [21]. Responsibilities and reporting wording are reconstructed — live text was not captured verbatim.</p>';
    mountChat($("#specReply"), () => spec.id);
    updateAiUI();
    const sendSpec = () => {
      const q = ($("#specAsk").value || "").trim();
      if (!q) {
        showToast("Type a command for " + spec.name + " — or “help”.");
        $("#specAsk").focus();
        return;
      }
      $("#specAsk").value = "";
      chatSend(spec.id, q);
    };
    $("#specAskBtn").addEventListener("click", sendSpec);
    $("#specAsk").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendSpec();
      }
    });
    $("#specClear").addEventListener("click", () => clearChat(spec.id));
  }

  function renderSauceModule(body) {
    const projOpts = SAUCE_PROJECTS.map(
      (p) => "<option" + (p === state.sauceProject ? " selected" : "") + ">" + escapeHtml(p) + "</option>"
    ).join("");
    const scopeOpts = ["Global"].concat(SAUCE_PROJECTS).map(
      (p) => "<option" + (p === state.sauceProject ? " selected" : "") + ">" + escapeHtml(p) + "</option>"
    ).join("");
    body.innerHTML =
      '<div class="card glow spec-hero">' +
      '<div class="section-label">Specialist · Sauce Sensei <span class="demo-badge">Fixture</span></div>' +
      '<h1 class="spec-title">Creative Architect + Aesthetic Director</h1>' +
      '<p class="muted" style="margin-top:8px">Research the visual world, translate it into your project language, and leave the builder with a direction that can actually be implemented.</p>' +
      "</div>" +
      '<div class="card spec-status"><div class="spec-avatar sauce">S</div><div>' +
      "<strong>Visual authority online</strong>" +
      '<div class="small muted" style="margin:4px 0 8px">Research → Design → Specify → Hand off → Review</div>' +
      '<span class="badge ready">Ready</span></div></div>' +
      '<div class="spec-section-head"><h2 class="serif-title">Direct Sauce Sensei</h2><span class="small dim">' + ENGINE_LABEL + '</span></div>' +
      '<div class="card spec-direct">' +
      '<div class="form-group"><label>Active project</label><select id="sauceProject">' + projOpts + "</select></div>" +
      '<div class="chat-head"><span class="engine-label">' + ENGINE_LABEL + '</span><button type="button" class="small dim chat-clear" id="sauceClear">Clear chat</button></div>' +
      '<div class="answer-panel chat-log" id="sauceReply" aria-live="polite"></div>' +
      '<div class="form-group"><label for="sauceAsk">Command</label><textarea id="sauceAsk" placeholder="Try “style profile”, “log decision gold for primary actions approved”, or “help”."></textarea></div>' +
      '<button type="button" class="btn btn-gold btn-block" id="sauceAskBtn">Ask Sauce Sensei</button>' +
      '<button type="button" class="btn btn-ghost btn-block" style="margin-top:8px" id="sauceMakeActive">Make Sauce Sensei the active agent</button>' +
      "</div>" +
      '<div class="spec-section-head"><h2 class="serif-title">Current style profile</h2><span class="small dim" id="sauceProfileProject">' + escapeHtml(state.sauceProject) + "</span></div>" +
      '<div class="card">' +
      '<div class="section-label">Palette</div><div class="swatch-row">' +
      SAUCE_PALETTE.map((c) =>
        '<div class="swatch"><span style="background:' + c.hex + '"></span><div class="small">' + c.name + '</div><div class="small dim">' + c.hex + "</div></div>"
      ).join("") +
      "</div>" +
      '<div class="profile-row"><div class="section-label">Typography</div><p class="small"><span class="type-demo">Display serif</span> for hierarchy · clean sans for body · display type hierarchy</p></div>' +
      '<div class="profile-row"><div class="section-label">Depth</div><p class="small">Purposeful glow and layered depth — glow marks focus, not decoration.</p></div>' +
      "</div>" +
      '<div class="spec-section-head"><h2 class="serif-title">Design Decision Log</h2><span class="small dim" id="sauceDecCount"></span></div>' +
      '<div id="sauceDecisionList"></div>' +
      '<div class="card"><h2 style="font-size:16px">Remember a decision</h2>' +
      '<div class="form-group" style="margin-top:8px"><label>Scope</label><select id="sauceDecScope">' + scopeOpts + "</select></div>" +
      '<div class="form-group"><label>Decision</label><textarea id="sauceDecText" placeholder="e.g. Keep gold for primary actions only."></textarea></div>' +
      '<div class="form-group"><label>Verdict</label><div class="verdict-row" id="sauceVerdict">' +
      ["Approved", "Rejected", "Explore"].map((v, i) =>
        '<label class="verdict ' + v.toLowerCase() + (i === 0 ? " selected" : "") + '"><input type="radio" name="sauceVerdict" value="' + v + '"' + (i === 0 ? " checked" : "") + " />" + v + "</label>"
      ).join("") +
      "</div></div>" +
      '<button type="button" class="btn btn-outline btn-block" id="sauceDecSave">Remember decision</button>' +
      '<p class="small local-note" style="margin-top:8px" id="sauceDecNote">' + localNoteText() + "</p></div>" +
      '<p class="safety-note">' + AUTHORITY_NOTE + "</p>" +
      '<p class="small dim" style="margin:8px 2px 14px">Module layout from live walk [26]. No live specialist request or design decision was written to the live app.</p>';

    renderSauceDecisions();

    $("#sauceProject").addEventListener("change", (e) => {
      state.sauceProject = e.target.value;
      store.set("sauceProject", state.sauceProject);
      $("#sauceProfileProject").textContent = state.sauceProject;
    });
    mountChat($("#sauceReply"), () => "sauce");
    updateAiUI();
    const sendSauce = () => {
      const q = ($("#sauceAsk").value || "").trim();
      if (!q) {
        showToast("Type a command for Sauce Sensei — or “help”.");
        $("#sauceAsk").focus();
        return;
      }
      $("#sauceAsk").value = "";
      chatSend("sauce", q);
    };
    $("#sauceAskBtn").addEventListener("click", sendSauce);
    $("#sauceAsk").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendSauce();
      }
    });
    $("#sauceClear").addEventListener("click", () => clearChat("sauce"));
    $("#sauceMakeActive").addEventListener("click", () => {
      selectAgent("sauce", { toast: true });
    });
    $$("#sauceVerdict input").forEach((r) =>
      r.addEventListener("change", () => {
        $$("#sauceVerdict .verdict").forEach((l) =>
          l.classList.toggle("selected", l.querySelector("input").checked)
        );
      })
    );
    $("#sauceDecSave").addEventListener("click", () => {
      const text = ($("#sauceDecText").value || "").trim();
      const note = $("#sauceDecNote");
      if (!text) {
        note.textContent = "Write the decision first.";
        return;
      }
      const verdictEl = $('#sauceVerdict input:checked');
      state.sauceDecisions.push({
        id: "sd" + Date.now(),
        scope: $("#sauceDecScope").value,
        verdict: verdictEl ? verdictEl.value : "Explore",
        text: text,
        at: new Date().toISOString(),
      });
      store.set("sauceDecisions", state.sauceDecisions);
      $("#sauceDecText").value = "";
      note.textContent = "Decision remembered · " + localNoteText();
      renderSauceDecisions();
    });
  }

  function renderSauceDecisions() {
    const wrap = $("#sauceDecisionList");
    if (!wrap) return;
    const all = SAUCE_FIXTURE_DECISIONS.concat(state.sauceDecisions);
    $("#sauceDecCount").textContent = all.length + " remembered";
    wrap.innerHTML = all.map((d) =>
      '<div class="card decision-card">' +
      '<div class="decision-top"><span class="small muted">' + escapeHtml(d.scope) + "</span>" +
      '<span class="verdict-tag ' + escapeHtml(String(d.verdict).toLowerCase()) + '">' + escapeHtml(d.verdict) + "</span></div>" +
      '<p class="small" style="margin-top:6px">' + escapeHtml(d.text) + "</p>" +
      '<div class="small dim" style="margin-top:6px">' +
      (d.fixture
        ? '<span class="demo-badge">Fixture · live walk [26]</span>'
        : '<span class="local-badge">This device</span> <button type="button" class="small dim task-remove" data-dec-del="' + escapeHtml(d.id) + '">Remove</button>') +
      "</div></div>"
    ).join("");
    wrap.querySelectorAll("[data-dec-del]").forEach((b) =>
      b.addEventListener("click", () => {
        state.sauceDecisions = state.sauceDecisions.filter((d) => d.id !== b.dataset.decDel);
        store.set("sauceDecisions", state.sauceDecisions);
        renderSauceDecisions();
      })
    );
  }

  /* ---------- Lessons ---------- */

  function renderLesson(param) {
    const body = $("#lessonBody");
    if (!body) return;
    const n = parseInt(param, 10);
    if (!(n >= 1 && n <= 10)) {
      body.innerHTML =
        '<div class="card"><h2>Lesson not found</h2><p class="small muted">Lessons 1–10 exist in the System screen.</p></div>';
      return;
    }
    body.innerHTML =
      '<div class="card glow">' +
      '<div class="section-label">Build the AI · Lesson ' + n + " of 10</div>" +
      '<h1 style="font-size:24px">Lesson ' + n + "</h1>" +
      '<p class="not-captured">Lesson content not captured from live app</p>' +
      '<p class="small muted" style="margin-top:10px">Placeholder. The live System screen lists lesson modules 1–10 under “Build the AI”, but lesson cards did not navigate during the walk [13], so no lesson title or text exists in the evidence. Nothing here is real course content.</p>' +
      (n === 6
        ? '<p class="small dim" style="margin-top:8px">Only reference seen: Today shows “Grounded memory review — Lesson 6 · Some recommended tasks have no deadline.” [07]</p>'
        : "") +
      "</div>" +
      '<div class="card">' +
      '<div class="section-label">Your progress <span class="local-badge">This device</span></div>' +
      '<div class="lesson-status-row" role="group" aria-label="Lesson status">' +
      LESSON_STATUSES.map((st) =>
        '<button type="button" class="step-pill' + (lessonState(n).status === st.id ? " active" : "") + '" data-lesson-status="' + st.id + '" aria-pressed="' + (lessonState(n).status === st.id) + '">' + st.label + "</button>"
      ).join("") +
      "</div>" +
      '<div class="form-group" style="margin:12px 0 4px"><label for="lessonNotes">Private notes</label>' +
      '<textarea id="lessonNotes" placeholder="Your own notes for lesson ' + n + '…" maxlength="4000"></textarea></div>' +
      '<p class="small local-note" id="lessonNoteStatus">' + localNoteText() + "</p>" +
      "</div>" +
      '<div class="lesson-pager">' +
      '<button type="button" class="btn btn-ghost" id="lessonPrev"' + (n === 1 ? " disabled" : "") + ">← Lesson " + (n - 1 || 1) + "</button>" +
      '<button type="button" class="btn btn-outline" id="lessonBack">Back</button>' +
      '<button type="button" class="btn btn-ghost" id="lessonNext"' + (n === 10 ? " disabled" : "") + ">Lesson " + Math.min(n + 1, 10) + " →</button>" +
      "</div>";
    const notes = $("#lessonNotes");
    notes.value = lessonState(n).notes;
    notes.addEventListener("input", () => {
      setLessonState(n, { notes: notes.value });
      $("#lessonNoteStatus").textContent = "Notes saved · " + localNoteText();
      renderLessons();
    });
    $$("[data-lesson-status]").forEach((b) =>
      b.addEventListener("click", () => {
        setLessonState(n, { status: b.dataset.lessonStatus });
        $$("[data-lesson-status]").forEach((x) => {
          const on = x === b;
          x.classList.toggle("active", on);
          x.setAttribute("aria-pressed", String(on));
        });
        renderLessons();
        showToast("Lesson " + n + " · " + b.textContent);
      })
    );
    $("#lessonPrev").addEventListener("click", () => setHash("lesson/" + (n - 1)));
    $("#lessonNext").addEventListener("click", () => setHash("lesson/" + (n + 1)));
    $("#lessonBack").addEventListener("click", () => setHash("system"));
  }

  /* ---------- PWA install ---------- */

  let deferredInstall = null;
  let swState = "not registered";

  function installMsg(msg) {
    const el = $("#installAnswer");
    if (!el) return;
    el.style.display = "block";
    el.textContent = msg;
  }

  function wireInstall() {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstall = e;
      const b = $("#btnInstall");
      if (b) b.textContent = "Install this app (ready)";
    });
    window.addEventListener("appinstalled", () => {
      deferredInstall = null;
      installMsg("UTC.OS shell installed on this device.");
    });
    registerServiceWorker();
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      swState = "unsupported";
      return;
    }
    const localHost = ["localhost", "127.0.0.1", "[::1]"].indexOf(location.hostname) >= 0;
    if (location.protocol !== "https:" && !localHost) {
      swState = "skipped (needs HTTPS or localhost)";
      return;
    }
    navigator.serviceWorker
      .register("sw.js")
      .then((reg) => {
        swState = "registered · scope " + reg.scope;
      })
      .catch((err) => {
        swState = "registration failed: " + (err && err.message ? err.message : "unknown");
      });
  }

  function handleInstallClick() {
    const standalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) {
      installMsg("Already running as an installed app.");
      return;
    }
    if (deferredInstall) {
      const evt = deferredInstall;
      deferredInstall = null;
      evt.prompt();
      evt.userChoice
        .then((choice) => {
          installMsg(
            choice && choice.outcome === "accepted"
              ? "Install accepted — look for UTC.OS on your home screen."
              : "Install dismissed. The browser may offer it again later."
          );
          $("#btnInstall").textContent = "Install this app";
        })
        .catch(() => installMsg("Install prompt closed."));
      return;
    }
    if (location.protocol === "file:") {
      installMsg("Opened from a file — installing needs the shell served over HTTPS (or localhost). Service worker is not registered here.");
      return;
    }
    if (!window.isSecureContext) {
      installMsg("This page is not a secure context. Serve the shell over HTTPS to install on Android.");
      return;
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    installMsg(
      ios
        ? "iOS doesn't offer an install prompt. Use Share → Add to Home Screen."
        : "The browser hasn't offered an install prompt yet (service worker: " + swState + "). On Android Chrome, try the ⋮ menu → Install app / Add to Home screen."
    );
  }

  /* =========================================================
     Phase 5 — Habits, Goals, Lessons progress, and the local
     command engine ("Local assistant, no AI connected").
     Everything reads/writes utcos-shell:* keys on this device.
     No network, no AI model, nothing sent anywhere.
     ========================================================= */

  const ENGINE_LABEL = "Local assistant, no AI connected";
  const CHAT_CAP = 50;
  const GOAL_CATEGORIES = ["UP2CODE", "Lil Wiz-Nap", "Personal"];
  const LESSON_STATUSES = [
    { id: "not-started", label: "Not started" },
    { id: "in-progress", label: "In progress" },
    { id: "done", label: "Done" },
  ];

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function dayKey(d) {
    d = d || new Date();
    return (
      d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
    );
  }

  function addDays(d, n) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  }

  function parseDayKey(k) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k || "");
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  function worldCategory() {
    return state.world === "lilwiznap" ? "Lil Wiz-Nap" : "UP2CODE";
  }

  /* ---------- Phase 5 persistence ---------- */

  function loadPhase5() {
    const habits = store.get("habits", []);
    state.habits = Array.isArray(habits)
      ? habits
          .filter((h) => h && typeof h.id === "string" && typeof h.name === "string")
          .map((h) => ({ id: h.id, name: h.name, created: h.created || "", log: isObj(h.log) ? h.log : {} }))
      : [];
    const goals = store.get("goals", []);
    state.goals = Array.isArray(goals)
      ? goals
          .filter((g) => g && typeof g.id === "string" && typeof g.title === "string")
          .map((g) => ({
            id: g.id,
            title: g.title,
            category: GOAL_CATEGORIES.indexOf(g.category) >= 0 ? g.category : "Personal",
            target: typeof g.target === "string" ? g.target : "",
            mode: g.mode === "steps" ? "steps" : "progress",
            progress: Math.max(0, Math.min(100, parseInt(g.progress, 10) || 0)),
            steps: Array.isArray(g.steps)
              ? g.steps.filter((s) => s && typeof s.text === "string").map((s) => ({ id: s.id || uid("s"), text: s.text, done: !!s.done }))
              : [],
            done: !!g.done,
            created: g.created || "",
          }))
      : [];
    const chats = store.get("chats", {});
    state.chats = {};
    if (isObj(chats)) {
      Object.keys(chats).forEach((k) => {
        if (Array.isArray(chats[k])) {
          state.chats[k] = chats[k]
            .filter((m) => m && (m.role === "user" || m.role === "agent") && typeof m.text === "string")
            .slice(-CHAT_CAP);
        }
      });
    }
    const lessons = store.get("lessons", {});
    state.lessons = {};
    if (isObj(lessons)) {
      Object.keys(lessons).forEach((k) => {
        const n = parseInt(k, 10);
        const v = lessons[k];
        if (n >= 1 && n <= 10 && isObj(v)) {
          state.lessons[n] = {
            status: LESSON_STATUSES.some((s) => s.id === v.status) ? v.status : "not-started",
            notes: typeof v.notes === "string" ? v.notes : "",
          };
        }
      });
    }
  }

  const saveHabits = () => store.set("habits", state.habits);
  const saveGoals = () => store.set("goals", state.goals);
  const saveChats = () => store.set("chats", state.chats);
  const saveLessons = () => store.set("lessons", state.lessons);

  /* ---------- Habits ---------- */

  function habitCurrentStreak(h) {
    const today = new Date();
    let d = h.log[dayKey(today)] ? today : addDays(today, -1);
    let n = 0;
    while (h.log[dayKey(d)]) {
      n += 1;
      d = addDays(d, -1);
    }
    return n;
  }

  function habitBestStreak(h) {
    const days = Object.keys(h.log).filter((k) => h.log[k] && parseDayKey(k)).sort();
    let best = 0;
    let run = 0;
    let prev = null;
    days.forEach((k) => {
      const d = parseDayKey(k);
      run = prev && dayKey(addDays(prev, 1)) === k ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    });
    return best;
  }

  function addHabit(name) {
    name = (name || "").trim().slice(0, 80);
    if (!name) return null;
    const existing = findByName(state.habits, name, "name");
    if (existing && existing.name.toLowerCase() === name.toLowerCase()) return { dup: existing };
    const h = { id: uid("h"), name: name, created: dayKey(), log: {} };
    state.habits.push(h);
    saveHabits();
    return { habit: h };
  }

  function toggleHabitToday(id, force) {
    const h = state.habits.find((x) => x.id === id);
    if (!h) return null;
    const k = dayKey();
    const on = typeof force === "boolean" ? force : !h.log[k];
    if (on) h.log[k] = true;
    else delete h.log[k];
    saveHabits();
    return h;
  }

  function armDelete(btn, onConfirm) {
    if (btn.dataset.armed === "1") {
      onConfirm();
      return;
    }
    const orig = btn.textContent;
    btn.dataset.armed = "1";
    btn.textContent = "Tap again to delete";
    btn.classList.add("danger-armed");
    setTimeout(() => {
      if (!btn.isConnected) return;
      btn.dataset.armed = "";
      btn.textContent = orig;
      btn.classList.remove("danger-armed");
    }, 3000);
  }

  function renderHabits() {
    const list = $("#habitList");
    if (!list) return;
    const today = new Date();
    const tk = dayKey(today);
    const doneToday = state.habits.filter((h) => h.log[tk]).length;
    $("#habitCount").textContent = doneToday + "/" + state.habits.length + " today";
    if (!state.habits.length) {
      list.innerHTML = '<li class="small muted empty-hint">No habits yet. Add one below or tell Kara “add habit …”.</li>';
      return;
    }
    const days = [];
    for (let i = 6; i >= 0; i--) days.push(addDays(today, -i));
    const letters = ["S", "M", "T", "W", "T", "F", "S"];
    list.innerHTML = state.habits
      .map((h) => {
        const checked = !!h.log[tk];
        const cur = habitCurrentStreak(h);
        const best = habitBestStreak(h);
        const dots = days
          .map((d) => {
            const k = dayKey(d);
            const on = !!h.log[k];
            return (
              '<span class="habit-dot' + (on ? " on" : "") + (k === tk ? " today" : "") + '" title="' + k + (on ? " · done" : " · not done") + '">' +
              '<i></i><b>' + letters[d.getDay()] + "</b></span>"
            );
          })
          .join("");
        return (
          '<li class="habit-item" data-habit="' + escapeHtml(h.id) + '">' +
          '<button type="button" class="habit-check' + (checked ? " on" : "") + '" data-habit-check aria-pressed="' + checked + '" aria-label="' +
          (checked ? "Uncheck " : "Check off ") + escapeHtml(h.name) + ' for today">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>' +
          '<div class="habit-main">' +
          '<div class="habit-name">' + escapeHtml(h.name) + "</div>" +
          '<div class="habit-meta small">Streak <strong>' + cur + "</strong> · Best <strong>" + best + "</strong></div>" +
          '<div class="habit-row"><div class="habit-dots" aria-label="Last 7 days">' + dots + "</div>" +
          '<div class="habit-actions"><button type="button" class="link-btn" data-habit-rename>Rename</button>' +
          '<button type="button" class="link-btn danger" data-habit-delete>Delete</button></div></div>' +
          "</div></li>"
        );
      })
      .join("");
  }

  function wireHabits() {
    const list = $("#habitList");
    const input = $("#habitInput");
    const add = () => {
      const name = (input.value || "").trim();
      if (!name) {
        showToast("Type a habit name first.");
        input.focus();
        return;
      }
      const r = addHabit(name);
      if (r && r.dup) {
        showToast("You already track “" + r.dup.name + "”.");
        return;
      }
      input.value = "";
      renderHabits();
      showToast("Habit added · " + localNoteText());
    };
    $("#btnAddHabit").addEventListener("click", add);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") add();
    });
    list.addEventListener("click", (e) => {
      const item = e.target.closest("[data-habit]");
      if (!item) return;
      const id = item.dataset.habit;
      const h = state.habits.find((x) => x.id === id);
      if (!h) return;
      if (e.target.closest("[data-habit-check]")) {
        toggleHabitToday(id);
        renderHabits();
        return;
      }
      if (e.target.closest("[data-habit-delete]")) {
        armDelete(e.target.closest("[data-habit-delete]"), () => {
          state.habits = state.habits.filter((x) => x.id !== id);
          saveHabits();
          renderHabits();
          showToast("Habit deleted.");
        });
        return;
      }
      if (e.target.closest("[data-habit-rename]")) {
        const nameEl = item.querySelector(".habit-name");
        nameEl.innerHTML =
          '<div class="cockpit-row" style="margin:0"><input type="text" class="habit-rename-input" maxlength="80" aria-label="Rename habit" />' +
          '<button type="button" class="btn btn-outline" data-habit-save>Save</button>' +
          '<button type="button" class="btn btn-ghost" data-habit-cancel>Cancel</button></div>';
        const inp = nameEl.querySelector("input");
        inp.value = h.name;
        inp.focus();
        inp.select();
        const save = () => {
          const v = (inp.value || "").trim();
          if (!v) {
            showToast("Habit name can't be empty.");
            inp.focus();
            return;
          }
          h.name = v.slice(0, 80);
          saveHabits();
          renderHabits();
          showToast("Habit renamed.");
        };
        nameEl.querySelector("[data-habit-save]").addEventListener("click", (ev) => {
          ev.stopPropagation();
          save();
        });
        nameEl.querySelector("[data-habit-cancel]").addEventListener("click", (ev) => {
          ev.stopPropagation();
          renderHabits();
        });
        inp.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") save();
          if (ev.key === "Escape") renderHabits();
        });
      }
    });
  }

  /* ---------- Goals ---------- */

  function goalPercent(g) {
    if (g.done) return 100;
    if (g.mode === "steps") {
      if (!g.steps.length) return 0;
      return Math.round((g.steps.filter((s) => s.done).length / g.steps.length) * 100);
    }
    return g.progress;
  }

  function goalDueText(g) {
    const d = parseDayKey(g.target);
    if (!d) return "";
    const today = parseDayKey(dayKey());
    const diff = Math.round((d - today) / 86400000);
    const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
    if (g.done) return "Target " + label;
    if (diff < 0) return "Target " + label + " · " + -diff + "d overdue";
    if (diff === 0) return "Target " + label + " · due today";
    return "Target " + label + " · " + diff + "d left";
  }

  function addGoal(opts) {
    const title = (opts.title || "").trim().slice(0, 120);
    if (!title) return null;
    const g = {
      id: uid("g"),
      title: title,
      category: GOAL_CATEGORIES.indexOf(opts.category) >= 0 ? opts.category : worldCategory(),
      target: parseDayKey(opts.target) ? opts.target : "",
      mode: opts.mode === "steps" ? "steps" : "progress",
      progress: 0,
      steps: [],
      done: false,
      created: dayKey(),
    };
    state.goals.push(g);
    saveGoals();
    return g;
  }

  function syncGoalCategoryDefault() {
    const sel = $("#goalCategory");
    if (sel && !sel.dataset.touched) sel.value = worldCategory();
  }

  function renderGoals() {
    const wrap = $("#goalList");
    if (!wrap) return;
    const active = state.goals.filter((g) => !g.done);
    const done = state.goals.length - active.length;
    $("#goalCount").textContent = active.length + " active" + (done ? " · " + done + " done" : "");
    if (!state.goals.length) {
      wrap.innerHTML = '<p class="small muted empty-hint">No goals yet. Add one below or tell Kara “add goal …”.</p>';
      return;
    }
    const ordered = active.concat(state.goals.filter((g) => g.done));
    wrap.innerHTML = ordered
      .map((g) => {
        const pct = goalPercent(g);
        const cat = g.category === "Lil Wiz-Nap" ? "creative" : g.category === "Personal" ? "personal" : "business";
        let tracker = "";
        if (g.mode === "progress") {
          tracker =
            '<label class="goal-range small"><span>Progress</span><input type="range" min="0" max="100" step="5" value="' + g.progress + '" data-goal-range aria-label="Progress for ' + escapeHtml(g.title) + '"' + (g.done ? " disabled" : "") + " /><output>" + pct + "%</output></label>";
        } else {
          tracker =
            '<ul class="goal-steps">' +
            g.steps
              .map(
                (s) =>
                  '<li data-step="' + escapeHtml(s.id) + '"><label><input type="checkbox" data-step-toggle' + (s.done ? " checked" : "") + (g.done ? " disabled" : "") + " /> <span" + (s.done ? ' class="step-done"' : "") + ">" + escapeHtml(s.text) + "</span></label>" +
                  '<button type="button" class="link-btn danger" data-step-del aria-label="Remove step">×</button></li>'
              )
              .join("") +
            (g.steps.length ? "" : '<li class="small muted">No steps yet.</li>') +
            "</ul>" +
            (g.done
              ? ""
              : '<div class="cockpit-row"><input type="text" data-step-input placeholder="Add a step…" maxlength="100" aria-label="New step" /><button type="button" class="btn btn-outline" data-step-add>Add</button></div>');
        }
        return (
          '<div class="goal-item' + (g.done ? " done" : "") + '" data-goal="' + escapeHtml(g.id) + '">' +
          '<div class="goal-top"><strong class="goal-title">' + escapeHtml(g.title) + "</strong>" +
          '<span class="goal-cat ' + cat + '">' + escapeHtml(g.category) + "</span></div>" +
          (g.target ? '<div class="small muted">' + escapeHtml(goalDueText(g)) + "</div>" : "") +
          '<div class="goal-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><span style="width:' + pct + '%"></span></div>' +
          '<div class="small dim">' + pct + "% · " + (g.mode === "steps" ? g.steps.filter((s) => s.done).length + "/" + g.steps.length + " steps" : "progress") + (g.done ? " · Done" : "") + "</div>" +
          tracker +
          '<div class="habit-actions"><button type="button" class="link-btn" data-goal-done>' + (g.done ? "Reopen" : "Mark done") + "</button>" +
          '<button type="button" class="link-btn danger" data-goal-delete>Delete</button></div>' +
          "</div>"
        );
      })
      .join("");
  }

  function wireGoals() {
    const cat = $("#goalCategory");
    cat.addEventListener("change", () => (cat.dataset.touched = "1"));
    syncGoalCategoryDefault();
    $("#btnAddGoal").addEventListener("click", () => {
      const titleEl = $("#goalTitle");
      const title = (titleEl.value || "").trim();
      if (!title) {
        showToast("Name the goal first.");
        titleEl.focus();
        return;
      }
      addGoal({ title: title, category: cat.value, target: $("#goalTarget").value, mode: $("#goalMode").value });
      titleEl.value = "";
      $("#goalTarget").value = "";
      renderGoals();
      showToast("Goal added · " + localNoteText());
    });
    const wrap = $("#goalList");
    const goalOf = (el) => {
      const item = el.closest("[data-goal]");
      return item ? state.goals.find((g) => g.id === item.dataset.goal) : null;
    };
    wrap.addEventListener("input", (e) => {
      if (!e.target.matches("[data-goal-range]")) return;
      const g = goalOf(e.target);
      if (!g) return;
      g.progress = parseInt(e.target.value, 10) || 0;
      const item = e.target.closest("[data-goal]");
      item.querySelector("output").textContent = g.progress + "%";
      item.querySelector(".goal-bar span").style.width = g.progress + "%";
    });
    wrap.addEventListener("change", (e) => {
      const g = goalOf(e.target);
      if (!g) return;
      if (e.target.matches("[data-goal-range]")) {
        saveGoals();
        renderGoals();
      } else if (e.target.matches("[data-step-toggle]")) {
        const s = g.steps.find((x) => x.id === e.target.closest("[data-step]").dataset.step);
        if (s) s.done = e.target.checked;
        saveGoals();
        renderGoals();
      }
    });
    const addStep = (el) => {
      const g = goalOf(el);
      const inp = el.closest("[data-goal]").querySelector("[data-step-input]");
      const v = (inp.value || "").trim();
      if (!v) {
        showToast("Type a step first.");
        inp.focus();
        return;
      }
      g.steps.push({ id: uid("s"), text: v.slice(0, 100), done: false });
      saveGoals();
      renderGoals();
      const again = $('[data-goal="' + g.id + '"] [data-step-input]');
      if (again) again.focus();
    };
    wrap.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.matches("[data-step-input]")) addStep(e.target);
    });
    wrap.addEventListener("click", (e) => {
      const g = goalOf(e.target);
      if (!g) return;
      if (e.target.closest("[data-step-add]")) addStep(e.target);
      else if (e.target.closest("[data-step-del]")) {
        const sid = e.target.closest("[data-step]").dataset.step;
        g.steps = g.steps.filter((s) => s.id !== sid);
        saveGoals();
        renderGoals();
      } else if (e.target.closest("[data-goal-done]")) {
        g.done = !g.done;
        saveGoals();
        renderGoals();
        showToast(g.done ? "Goal marked done." : "Goal reopened.");
      } else if (e.target.closest("[data-goal-delete]")) {
        armDelete(e.target.closest("[data-goal-delete]"), () => {
          state.goals = state.goals.filter((x) => x.id !== g.id);
          saveGoals();
          renderGoals();
          showToast("Goal deleted.");
        });
      }
    });
  }

  /* ---------- Lessons progress ---------- */

  function lessonState(n) {
    return state.lessons[n] || { status: "not-started", notes: "" };
  }

  function setLessonState(n, patch) {
    state.lessons[n] = Object.assign({}, lessonState(n), patch);
    saveLessons();
  }

  function renderLessonProgress() {
    const el = $("#lessonProgress");
    if (!el) return;
    let done = 0;
    let prog = 0;
    for (let i = 1; i <= 10; i++) {
      const s = lessonState(i).status;
      if (s === "done") done += 1;
      else if (s === "in-progress") prog += 1;
    }
    el.innerHTML =
      '<div class="lesson-bar" role="progressbar" aria-valuemin="0" aria-valuemax="10" aria-valuenow="' + done + '" aria-label="Lessons done">' +
      '<span class="done" style="width:' + done * 10 + '%"></span><span class="prog" style="width:' + prog * 10 + '%"></span></div>' +
      '<div class="small muted" style="margin-top:6px">' + done + " of 10 done · " + prog + " in progress · your progress, this device only</div>";
  }

  /* ---------- Command engine ---------- */

  const VOICES = {
    kara: {
      ok: "Got it.",
      info: "Here's where things stand:",
      close: "Want me to add anything else to today?",
      unknownLead: "I can't answer that one yet",
    },
    margaret: {
      ok: "Noted and recorded.",
      info: "Executive read:",
      close: "Pick the one move that protects revenue, and guard the time for it.",
      unknownLead: "That needs judgment I can't provide yet",
    },
    jarvis: {
      ok: "Confirmed. Write complete.",
      info: "System report:",
      close: "All figures read from local storage on this device.",
      unknownLead: "That request isn't in my local command table",
    },
    sauce: {
      ok: "Locked in.",
      info: "Creative read:",
      close: "Keep the gold for what matters.",
      unknownLead: "I can't see or judge that yet",
    },
  };

  function voiceFor(key) {
    if (VOICES[key]) return VOICES[key];
    const spec = SPECIALISTS.find((s) => s.id === key);
    const d = (spec && SPECIALIST_DETAILS[spec.id]) || {};
    const name = spec ? spec.name : "Specialist";
    return {
      ok: name + " logged it.",
      info: name + " · " + (spec ? spec.role : "specialist") + ":",
      close: "Routes through " + (d.reportsTo || "the core team") + "; Code keeps final authority.",
      unknownLead: name + " can't answer that yet",
    };
  }

  function agentDisplayName(key) {
    if (AGENTS[key]) return AGENTS[key].name;
    const spec = SPECIALISTS.find((s) => s.id === key);
    return spec ? spec.name : key;
  }

  function norm(s) {
    return String(s || "").toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
  }

  function findByName(list, q, field) {
    q = norm(q);
    if (!q) return null;
    return (
      list.find((x) => norm(x[field]) === q) ||
      list.find((x) => norm(x[field]).indexOf(q) >= 0) ||
      list.find((x) => q.indexOf(norm(x[field])) >= 0 && norm(x[field]).length >= 3) ||
      null
    );
  }

  function stageFrom(text) {
    const flat = (s) => String(s).toUpperCase().replace(/[^A-Z]/g, "");
    const t = flat(text);
    if (!t) return null;
    return PIPELINE.slice(1).find((p) => flat(p) === t) || PIPELINE.slice(1).find((p) => flat(p).indexOf(t) === 0) || null;
  }

  function leadLine(l) {
    return "• " + l.company + " — " + l.title + " · " + l.status + " · " + l.band + " " + l.score + (l.note && l.note !== "—" ? " · note: " + l.note : "");
  }

  const LEAD_STOP = ["fixture", "and", "the", "services", "style", "lead", "local", "inquiry", "painting", "pittsburgh"];
  function leadAliases(l) {
    const words = (l.company + " " + l.title)
      .toLowerCase()
      .replace(/[()·,+]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && LEAD_STOP.indexOf(w) < 0);
    return [l.company.toLowerCase(), l.title.toLowerCase(), l.id].concat(words);
  }

  function matchLeadPrefix(rest) {
    rest = norm(rest);
    let best = null;
    FIXTURE_LEADS.forEach((l) => {
      leadAliases(l).forEach((a) => {
        if (rest === a || rest.indexOf(a + " ") === 0 || rest.indexOf(a + ":") === 0 || rest.indexOf(a + " -") === 0) {
          if (!best || a.length > best.alias.length) best = { lead: l, alias: a };
        }
      });
    });
    if (!best) return null;
    const holders = FIXTURE_LEADS.filter((l) => leadAliases(l).indexOf(best.alias) >= 0);
    if (holders.length > 1) return { ambiguous: holders, alias: best.alias };
    return { lead: best.lead, text: rest.slice(best.alias.length).replace(/^\s*[:\-–—]\s*/, "").trim() };
  }

  function matchLeadLoose(q) {
    q = norm(q);
    const hits = FIXTURE_LEADS.filter((l) => leadAliases(l).some((a) => a === q || a.indexOf(q) >= 0));
    return hits;
  }

  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  function parseLooseDate(s) {
    s = norm(s);
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (m) return dayKey(new Date(+m[1], +m[2] - 1, +m[3]));
    m = /^([a-z]{3})[a-z]*\.? (\d{1,2})(?:,? (\d{4}))?$/.exec(s);
    if (m && MONTHS.indexOf(m[1]) >= 0) {
      const today = new Date();
      let y = m[3] ? +m[3] : today.getFullYear();
      let d = new Date(y, MONTHS.indexOf(m[1]), +m[2]);
      if (!m[3] && d < addDays(today, 0)) d = new Date(y + 1, MONTHS.indexOf(m[1]), +m[2]);
      return dayKey(d);
    }
    m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(s);
    if (m) {
      const today = new Date();
      let y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : today.getFullYear();
      return dayKey(new Date(y, +m[1] - 1, +m[2]));
    }
    return null;
  }

  const OPEN_TARGETS = [
    [/^(home|cockpit|main)$/, "home", "Home"],
    [/^(today|my day|daily cockpit)$/, "today", "Today"],
    [/^(forge|product forge|verify work)$/, "forge", "Forge"],
    [/^(leads?|lead center|lead-center|pipeline|job radar|radar)$/, "lead-center", "Lead Center"],
    [/^skills?$/, "skills", "Skills"],
    [/^(system|lessons|build the ai)$/, "system", "System"],
    [/^connections?$/, "connections", "Connections"],
    [/^settings$/, "settings", "Settings"],
    [/^security$/, "security", "Security"],
    [/^(memory|memories)$/, "memory", "Memory"],
    [/^knowledge$/, "knowledge", "Knowledge"],
    [/^studio$/, "studio", "Studio"],
    [/^(mockup|mockups|apparel)$/, "mockup", "Mockup"],
    [/^(team|agents|specialists)$/, "team", "Team"],
    [/^search$/, "search", "Local search"],
    [/^(vault|secret vault)$/, "vault", "Secret Vault"],
    [/^(brain|brain map|second brain)$/, "brain", "Brain map"],
    [/^setup$/, "setup", "Setup"],
    [/^(sauce|sauce sensei)$/, "specialist/sauce-sensei", "Sauce Sensei"],
  ];

  function resolveOpen(target) {
    const t = norm(target).replace(/^(the|my)\s+/, "").replace(/\s+(screen|page|tab|view)$/, "");
    const lm = /^lesson (\d{1,2})$/.exec(t);
    if (lm && +lm[1] >= 1 && +lm[1] <= 10) return { route: "lesson/" + lm[1], label: "Lesson " + lm[1] };
    for (const [re, route, label] of OPEN_TARGETS) if (re.test(t)) return { route, label };
    const spec = SPECIALISTS.find((s) => norm(s.name) === t || s.id === t);
    if (spec) return { route: "specialist/" + spec.id, label: spec.name };
    return null;
  }

  function helpText(key) {
    const core = [
      "Today: “add task call D-Rock” · “what's on today” · “mark call D-Rock done”",
      "Leads: “show leads” · “hot leads” · “leads in follow-up” · “add note to cabinet: call Thursday”",
      "Habits: “add habit walk” · “check habit walk” · “my streaks”",
      "Goals: “add goal land 3 jobs by oct 31” · “my goals”",
      "Memory: “remember client prefers texts” · “what do you remember”",
      "Design log: “log decision gold for primary actions approved|rejected|explore”",
      "Navigate: “open today” · “open lead center” · “open lesson 3” · “open sauce sensei”",
    ];
    const focus = {
      kara: "Kara focus: “brief my day”, tasks, habits and goals.",
      margaret: "Margaret focus: “summary” / “what deserves priority” — tasks, leads and goals in one read.",
      jarvis: "Jarvis focus: “status” / “run self-test” — storage, service worker, honest connections.",
      sauce: "Sauce focus: “style profile”, “decisions”, “log decision …”.",
    };
    return (focus[key] || agentDisplayName(key) + " focus: its role summary, plus the shared commands.") + "\n" + core.join("\n");
  }

  function todayBrief() {
    const lines = [];
    if (state.todayFocus) lines.push("Focus: " + state.todayFocus);
    if (state.todayCommitment) lines.push("Fixed commitment: " + state.todayCommitment);
    if (state.keyTasks.length) {
      const done = state.keyTasks.filter((t) => t.done).length;
      lines.push("Key tasks (" + done + "/" + state.keyTasks.length + " done):");
      state.keyTasks.forEach((t) => lines.push((t.done ? "  ✓ " : "  ○ ") + t.title));
    } else lines.push("No key tasks yet — try “add task …”.");
    const tk = dayKey();
    if (state.habits.length) {
      const left = state.habits.filter((h) => !h.log[tk]);
      lines.push("Habits: " + (state.habits.length - left.length) + "/" + state.habits.length + " checked" + (left.length ? " · still to do: " + left.map((h) => h.name).join(", ") : " · all done"));
    }
    const soon = state.goals.filter((g) => !g.done && g.target && parseDayKey(g.target) <= addDays(new Date(), 7));
    soon.forEach((g) => lines.push("Goal due soon: " + g.title + " (" + goalDueText(g) + ")"));
    const fu = FIXTURE_LEADS.filter((l) => l.status === "FOLLOW-UP");
    if (fu.length) lines.push("Lead follow-ups due: " + fu.map((l) => l.company).join(", "));
    return lines.join("\n");
  }

  function execSummary() {
    const open = FIXTURE_LEADS.filter((l) => ["WON", "LOST"].indexOf(l.status) < 0);
    const hot = open.filter((l) => l.band === "HOT" || l.score >= 80);
    const doneT = state.keyTasks.filter((t) => t.done).length;
    const active = state.goals.filter((g) => !g.done);
    const avg = active.length ? Math.round(active.reduce((a, g) => a + goalPercent(g), 0) / active.length) : 0;
    const tk = dayKey();
    const lines = [
      "Tasks: " + doneT + "/" + state.keyTasks.length + " key tasks done today.",
      "Pipeline: " + open.length + " open lead(s), " + hot.length + " hot" + (hot.length ? " (" + hot.map((l) => l.company).join(", ") + ")" : "") + ", " + FIXTURE_LEADS.filter((l) => l.status === "FOLLOW-UP").length + " follow-up due. Leads are fixture data.",
      "Goals: " + active.length + " active" + (active.length ? ", average " + avg + "% complete" : "") + ", " + (state.goals.length - active.length) + " done.",
      "Habits: " + state.habits.filter((h) => h.log[tk]).length + "/" + state.habits.length + " checked today.",
    ];
    const next = state.keyTasks.find((t) => !t.done);
    const top = hot.slice().sort((a, b) => b.score - a.score)[0];
    lines.push(
      "Priority call: " +
        (top ? "work the hot lead " + top.company + " (score " + top.score + ")" : next ? "finish “" + next.title + "”" : "set one key task for today") +
        (top && next ? ", then “" + next.title + "”." : ".")
    );
    return lines.join("\n");
  }

  function storageBytes() {
    let n = 0;
    store.keys().forEach((k) => {
      n += k.length + (window.localStorage.getItem(k) || "").length;
    });
    return n * 2;
  }

  function systemStatus() {
    const kb = (storageBytes() / 1024).toFixed(1);
    const standalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
    return [
      "Storage: " + (store.available ? "available · " + store.keys().length + " utcos-shell key(s) · ~" + kb + " KB" : "unavailable — changes last this session only"),
      "Service worker: " + (typeof swState === "string" ? swState : "unknown") + " · " + (standalone ? "installed app" : "browser tab"),
      "Network: " + (navigator.onLine ? "online" : "offline") + " — this shell makes no API calls either way.",
      "Connections (as captured in the live walk): Lead Radar and Live web search show Connected there; this shell does not run them. Notion, Gmail, Calendar, Canva, VEED are launch points only.",
      aiVerified()
        ? "AI: OpenAI (your key): Connected on this device · " + aiModel() + " · used only when no local command matches."
        : "AI: OpenAI (your key): Not connected" + (aiKey() ? " — key saved but not tested; run Test in Settings." : ". Replies come from the local command engine."),
      "Data: " + state.keyTasks.length + " tasks · " + state.habits.length + " habits · " + state.goals.length + " goals · " + state.memoriesAdded.length + " memories · " + state.sauceDecisions.length + " design decisions · " + Object.keys(state.chats).length + " chat thread(s).",
    ].join("\n");
  }

  function styleProfile() {
    const recent = state.sauceDecisions.slice(-3).reverse();
    return (
      "Project: " + state.sauceProject + "\n" +
      "Palette: " + SAUCE_PALETTE.map((c) => c.name + " " + c.hex).join(" · ") + "\n" +
      "Rules: display serif for hierarchy, clean sans for body, glow marks focus, gold for authority.\n" +
      (recent.length
        ? "Your latest decisions:\n" + recent.map((d) => "  " + d.verdict + " — " + d.text).join("\n")
        : "No decisions logged on this device yet — try “log decision … approved”.") +
      "\nI can't see images or screens — no vision model is connected."
    );
  }

  function markDone(q) {
    const t = findByName(state.keyTasks, q, "title");
    if (t) {
      t.done = true;
      saveToday();
      return { text: "Marked key task “" + t.title + "” done.", kind: "ok" };
    }
    const h = findByName(state.habits, q, "name");
    if (h) {
      toggleHabitToday(h.id, true);
      return { text: "Checked off habit “" + h.name + "” for today · streak " + habitCurrentStreak(h) + ".", kind: "ok" };
    }
    const g = findByName(state.goals, q, "title");
    if (g) {
      g.done = true;
      saveGoals();
      return { text: "Marked goal “" + g.title + "” done.", kind: "ok" };
    }
    return {
      text: "I couldn't find a task, habit, or goal matching “" + q + "”." + (state.keyTasks.length ? " Key tasks: " + state.keyTasks.map((x) => x.title).join(", ") + "." : ""),
      kind: "miss",
    };
  }

  /** Returns { text, kind: ok|info|miss|help|unknown, nav? } */
  function runCommand(key, raw) {
    const text = String(raw || "").trim();
    const l = norm(text).replace(/[?.!]+$/, "");
    let m;

    if (!l) return { text: "Type a command — or “help”.", kind: "miss" };
    if (/^(help|commands|what can you do|\?)$/.test(l)) return { text: helpText(key), kind: "help" };

    // Tasks
    if ((m = /^add (?:a )?(?:key )?task:? (.+)$/i.exec(text))) {
      const title = m[1].trim().slice(0, 120);
      if (state.keyTasks.length >= 5) return { text: "Key tasks are capped at 5. Mark one done or remove one first.", kind: "miss" };
      state.keyTasks.push({ id: uid("u"), title: title, custom: true });
      saveToday();
      return { text: "Added key task “" + title + "” (" + state.keyTasks.length + "/5).", kind: "ok" };
    }
    if (/^(what'?s on today|what is on today|today|brief my day|my day|my tasks|tasks|what'?s on my plate)$/.test(l)) {
      return { text: key === "margaret" ? execSummary() : todayBrief(), kind: "info" };
    }
    if ((m = /^(?:mark|check off|complete|finish(?:ed)?) (.+?)(?: as)? (?:done|complete|completed|finished)$/.exec(l)) || (m = /^(?:done|complete|finished) (.+)$/.exec(l))) {
      return markDone(m[1]);
    }

    // Leads
    if (/^(hot leads|show hot leads|hot)$/.test(l)) {
      const hot = FIXTURE_LEADS.filter((x) => (x.band === "HOT" || x.score >= 80) && x.status !== "LOST");
      return { text: (hot.length ? "Hot leads (fixture data):\n" + hot.map(leadLine).join("\n") : "No hot leads right now."), kind: "info" };
    }
    if (/^(show leads|leads|list leads|my leads|show me leads|find painting leads|show all leads|pipeline)$/.test(l)) {
      const open = FIXTURE_LEADS.filter((x) => x.status !== "LOST");
      return {
        text:
          (l === "find painting leads" ? "Job Radar isn't run from this shell — here are the saved leads instead.\n" : "") +
          "Leads (" + open.length + " open, fixture data):\n" + open.map(leadLine).join("\n") +
          (FIXTURE_LEADS.length > open.length ? "\n(" + (FIXTURE_LEADS.length - open.length) + " lost lead hidden — ask “leads in lost”.)" : ""),
        kind: "info",
      };
    }
    if ((m = /^(?:show )?leads (?:in|at|with status|marked) (.+)$/.exec(l)) || (m = /^(?:show )?(.+?) leads$/.exec(l))) {
      const st = stageFrom(m[1]);
      if (st) {
        const hits = FIXTURE_LEADS.filter((x) => x.status === st);
        return { text: hits.length ? "Leads in " + st + ":\n" + hits.map(leadLine).join("\n") : "No leads in " + st + ".", kind: "info" };
      }
      if (/^\S+ leads$/.test(l) || /^leads (in|at)/.test(l))
        return { text: "I don't know the stage “" + m[1] + "”. Stages: " + PIPELINE.slice(1).join(", ") + ".", kind: "miss" };
    }
    if ((m = /^add (?:a )?note (?:to|for|on) (.+)$/i.exec(text))) {
      const r = matchLeadPrefix(m[1]);
      if (!r) {
        const colon = m[1].split(/:\s*/);
        if (colon.length > 1) {
          const hits = matchLeadLoose(colon[0]);
          if (hits.length === 1) return addLeadNote(hits[0], colon.slice(1).join(": "));
        }
        return { text: "Which lead? Try “add note to cabinet: …”. Leads: " + FIXTURE_LEADS.map((x) => x.company).join(", ") + ".", kind: "miss" };
      }
      if (r.ambiguous) return { text: "“" + r.alias + "” matches more than one lead: " + r.ambiguous.map((x) => x.company).join(", ") + ". Be more specific.", kind: "miss" };
      if (!r.text) return { text: "What should the note say? e.g. “add note to " + r.lead.company + ": call Thursday”.", kind: "miss" };
      const original = m[1].slice(m[1].length - r.text.length);
      return addLeadNote(r.lead, original || r.text);
    }

    // Habits
    if ((m = /^add (?:a )?habit:? (.+)$/i.exec(text))) {
      const r = addHabit(m[1]);
      if (r && r.dup) return { text: "You already track “" + r.dup.name + "”.", kind: "miss" };
      return { text: "Added habit “" + r.habit.name + "”. Check it off with “check habit " + r.habit.name + "”.", kind: "ok" };
    }
    if ((m = /^(?:check off|check|tick|did)(?: habit)? (.+)$/.exec(l))) {
      const h = findByName(state.habits, m[1].replace(/^habit /, ""), "name");
      if (!h) return { text: "No habit matches “" + m[1] + "”." + (state.habits.length ? " Habits: " + state.habits.map((x) => x.name).join(", ") + "." : " Add one with “add habit …”."), kind: "miss" };
      toggleHabitToday(h.id, true);
      return { text: "Checked “" + h.name + "” for today. Streak " + habitCurrentStreak(h) + " · best " + habitBestStreak(h) + ".", kind: "ok" };
    }
    if (/^(my streaks|streaks|habits|my habits|show habits)$/.test(l)) {
      if (!state.habits.length) return { text: "No habits yet — “add habit …” to start one.", kind: "info" };
      const tk = dayKey();
      return {
        text: "Habits:\n" + state.habits.map((h) => (h.log[tk] ? "  ✓ " : "  ○ ") + h.name + " — streak " + habitCurrentStreak(h) + ", best " + habitBestStreak(h)).join("\n"),
        kind: "info",
      };
    }

    // Goals
    if ((m = /^add (?:a )?goal:? (.+)$/i.exec(text))) {
      let title = m[1].trim();
      let category = worldCategory();
      let target = "";
      const cm = /\s+(?:for|in|under) (up2code|lil wiz-?nap|personal)$/i.exec(title);
      if (cm) {
        const c = cm[1].toLowerCase();
        category = c === "personal" ? "Personal" : c.indexOf("lil") === 0 ? "Lil Wiz-Nap" : "UP2CODE";
        title = title.slice(0, cm.index);
      }
      const dm = /\s+by (.+)$/i.exec(title);
      if (dm) {
        const d = parseLooseDate(dm[1]);
        if (d) {
          target = d;
          title = title.slice(0, dm.index);
        }
      }
      const g = addGoal({ title: title, category: category, target: target, mode: "progress" });
      return { text: "Added goal “" + g.title + "” · " + g.category + (g.target ? " · " + goalDueText(g) : "") + ". Track progress on Today.", kind: "ok" };
    }
    if (/^(my goals|goals|show goals)$/.test(l)) {
      if (!state.goals.length) return { text: "No goals yet — “add goal …”.", kind: "info" };
      return {
        text: "Goals:\n" + state.goals.map((g) => (g.done ? "  ✓ " : "  ○ ") + g.title + " — " + goalPercent(g) + "% · " + g.category + (g.target ? " · " + goalDueText(g) : "")).join("\n"),
        kind: "info",
      };
    }

    // Memory
    if ((m = /^(?:remember|note to self|save memory):? (?:that )?(.+)$/i.exec(text)) && !/^what/i.test(text)) {
      const title = m[1].trim().slice(0, 140);
      state.memoriesAdded.push({
        id: uid("lm"),
        title: title,
        detail: "Saved from " + agentDisplayName(key) + " chat",
        bucket: "inbox",
        workspace: state.world === "lilwiznap" ? "Creative" : "Business",
        local: true,
        at: new Date().toISOString(),
      });
      store.set("memories", state.memoriesAdded);
      return { text: "I'll remember: “" + title + "”. Saved to Memory → Inbox.", kind: "ok" };
    }
    if (/^(what do you remember|what do you know|memories|show memories|my memories|search my second brain)$/.test(l)) {
      const mine = state.memoriesAdded.slice(-6).reverse();
      return {
        text:
          (mine.length ? "Your memories (newest first):\n" + mine.map((x) => "• " + x.title).join("\n") : "You haven't saved any memories yet — try “remember …”.") +
          "\nPlus " + FIXTURE_MEMORIES.length + " fixture memories and " + FIXTURE_KNOWLEDGE.length + " fixture knowledge items (demo data).",
        kind: "info",
      };
    }

    // Design decisions
    if ((m = /^log (?:a )?decision:? (.+?)(?:\s*[-–—:,]?\s*(approved|approve|rejected|reject|explore|exploring))?$/i.exec(text))) {
      const v = (m[2] || "explore").toLowerCase();
      const verdict = v.indexOf("appr") === 0 ? "Approved" : v.indexOf("rej") === 0 ? "Rejected" : "Explore";
      const dtext = m[1].trim().slice(0, 200);
      state.sauceDecisions.push({ id: uid("sd"), scope: state.sauceProject, verdict: verdict, text: dtext, at: new Date().toISOString() });
      store.set("sauceDecisions", state.sauceDecisions);
      return {
        text: "Logged to the Design Decision Log (" + state.sauceProject + "): " + verdict + " — “" + dtext + "”." + (m[2] ? "" : " No verdict given, so I filed it as Explore."),
        kind: "ok",
      };
    }
    if (/^(decisions|design decisions|show decisions|decision log)$/.test(l)) {
      const all = SAUCE_FIXTURE_DECISIONS.concat(state.sauceDecisions);
      return { text: "Design Decision Log (" + all.length + "):\n" + all.slice(-6).map((d) => "  " + d.verdict + " — " + d.text + (d.fixture ? " (fixture)" : "")).join("\n"), kind: "info" };
    }
    if (/^(style profile|style|palette|review this design|create a visual direction|visual direction|design)$/.test(l)) {
      return { text: styleProfile(), kind: "info" };
    }

    // Navigation
    if ((m = /^(?:open|go to|show me the|take me to|navigate to) (.+)$/.exec(l))) {
      const r = resolveOpen(m[1]);
      if (r) return { text: "Opening " + r.label + ".", kind: "ok", nav: r.route };
      return { text: "I don't know a screen called “" + m[1] + "”. Try today, leads, forge, skills, system, memory, team, brain map, setup, or lesson 1–10.", kind: "miss" };
    }

    // Role intents
    if (/^(summary|overview|status report|executive summary|what deserves priority|priorities|make the call on this|make the call)$/.test(l)) {
      return { text: execSummary(), kind: "info" };
    }
    if (/^(status|system status|run self-?test|self-?test|diagnose this system|diagnose|storage|connections|health)$/.test(l)) {
      return { text: systemStatus(), kind: "info" };
    }
    if (/^create an estimate$/.test(l)) {
      return { text: "Estimates weren't captured from the live app, so I can't build one here. Open a lead in Lead Center, or “add task draft estimate for …”.", kind: "miss" };
    }
    if (/^turn this into next steps$/.test(l)) {
      return { text: "Give me the steps one at a time with “add task …”, or make it a goal with checklist steps: “add goal …”, then add steps on Today.", kind: "miss" };
    }

    return {
      text:
        "Real AI isn't connected yet, so I can only run local commands on data saved on this device. I didn't understand “" + text + "”.\nTry: “what's on today”, “add task …”, “hot leads”, “my streaks”, “remember …”, or “help”.\nTo turn on AI replies, add your own OpenAI key in System → Settings → AI connection.",
      kind: "unknown",
    };
  }

  function addLeadNote(lead, noteText) {
    const t = String(noteText || "").trim().slice(0, 300);
    if (!t) return { text: "What should the note say?", kind: "miss" };
    const prev = lead.note && lead.note !== "—" ? lead.note + " · " : "";
    lead.note = prev + t;
    setLeadOverride(lead.id, { note: lead.note });
    return { text: "Added a private note to " + lead.company + ": “" + t + "”.", kind: "ok" };
  }

  function voiced(key, r) {
    const v = voiceFor(key);
    if (r.kind === "ok") return v.ok + " " + r.text;
    if (r.kind === "info") return v.info + "\n" + r.text + "\n" + v.close;
    if (r.kind === "help") return (AGENTS[key] ? AGENTS[key].name : agentDisplayName(key)) + " · commands (" + ENGINE_LABEL + "):\n" + r.text;
    if (r.kind === "unknown") return v.unknownLead + ". " + r.text;
    return r.text;
  }

  function pushChat(key, role, text, meta) {
    const list = state.chats[key] || (state.chats[key] = []);
    list.push(Object.assign({ role: role, text: text, at: new Date().toISOString() }, meta || {}));
    if (list.length > CHAT_CAP) list.splice(0, list.length - CHAT_CAP);
  }

  function refreshAfterCommand() {
    renderToday();
    renderHabits();
    renderGoals();
    renderLeads();
    renderMemory();
    renderSauceDecisions();
    renderLessonProgress();
  }

  /** Send one message in a chat thread; returns the reply text. */
  function chatSend(key, text) {
    const q = String(text || "").trim();
    if (!q) return null;
    pushChat(key, "user", q);
    let r;
    try {
      r = runCommand(key, q);
    } catch (e) {
      r = { text: "Local engine error — nothing was changed. (" + (e && e.message) + ")", kind: "miss" };
    }
    if (r.kind === "unknown" && aiKey()) {
      // Phase 6: no local command matched and the user saved their own key.
      saveChats();
      aiReply(key, q);
      return null;
    }
    const reply = voiced(key, r);
    pushChat(key, "agent", reply);
    saveChats();
    refreshAfterCommand();
    renderAllChats();
    if (r.nav) setTimeout(() => setHash(r.nav), 450);
    return reply;
  }

  const chatMounts = [];

  function renderChatLog(el, key) {
    const list = state.chats[key] || [];
    const name = agentDisplayName(key);
    if (!list.length) {
      const online = AGENTS[key] ? AGENTS[key].online : name + " ready.";
      el.innerHTML = '<div class="chat-empty">' + escapeHtml(online) + " Type <strong>help</strong> to see what I can do locally.</div>";
      return;
    }
    const who = (m) =>
      m.src === "ai"
        ? escapeHtml(name) + ' · <span class="ai-tag">AI · ' + escapeHtml(m.model || "model") + "</span>"
        : m.src === "ai-error"
          ? escapeHtml(name) + ' · <span class="ai-tag err">AI · not answered</span>'
          : escapeHtml(name) + " · local";
    el.innerHTML =
      list
        .map(
          (m) =>
            '<div class="chat-msg ' + m.role + (m.src ? " " + m.src : "") + '">' +
            (m.role === "agent" ? '<div class="chat-who">' + who(m) + "</div>" : "") +
            '<div class="chat-text">' + escapeHtml(m.text) + "</div></div>"
        )
        .join("") +
      (aiPending[key]
        ? '<div class="chat-msg agent thinking" role="status"><div class="chat-who">' + escapeHtml(name) + ' · <span class="ai-tag">AI · ' + escapeHtml(aiModel()) + '</span></div><div class="chat-text">Thinking<span class="dots"><i>.</i><i>.</i><i>.</i></span></div></div>'
        : "");
    el.scrollTop = el.scrollHeight;
  }

  function renderAllChats() {
    for (let i = chatMounts.length - 1; i >= 0; i--) {
      const c = chatMounts[i];
      if (!c.el.isConnected) {
        chatMounts.splice(i, 1);
        continue;
      }
      renderChatLog(c.el, c.key());
    }
  }

  function mountChat(el, keyFn) {
    chatMounts.push({ el: el, key: keyFn });
    renderChatLog(el, keyFn());
  }

  function clearChat(key) {
    delete state.chats[key];
    saveChats();
    renderAllChats();
  }

  /* =========================================================
     Phase 6 — Optional AI (bring your own OpenAI key).
     The key lives ONLY in localStorage (utcos-shell:aiKey) on this
     device. It is never logged, never exported, never put in chat
     history. AI is only called when a local command doesn't match
     AND the user has saved a key.
     ========================================================= */

  const AI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
  const AI_DEFAULT_MODEL = "gpt-4o-mini";
  const AI_MODELS = ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4o", "gpt-4.1"];
  const AI_PRIVATE_KEYS = [STORE_PREFIX + "aiKey", STORE_PREFIX + "aiVerified"];
  const aiPending = {};

  function aiKey() {
    const k = store.get("aiKey", "");
    return typeof k === "string" ? k : "";
  }
  function aiModel() {
    const m = store.get("aiModel", AI_DEFAULT_MODEL);
    return typeof m === "string" && m.trim() ? m.trim() : AI_DEFAULT_MODEL;
  }
  function aiVerified() {
    const v = store.get("aiVerified", null);
    return aiKey() && isObj(v) && v.ok ? v : null;
  }
  function aiUnverify() {
    try {
      window.localStorage.removeItem(STORE_PREFIX + "aiVerified");
    } catch (e) {
      /* ignore */
    }
  }
  function redact(s) {
    return String(s || "").replace(/sk-[A-Za-z0-9_\-*.]{4,}/g, "[key hidden]");
  }

  const AI_BRAND =
    "Context: UTC.OS is Cody's personal operating system. Cody runs UP2CODE Painting & Contracting in Pittsburgh, PA " +
    "(tagline: \"We Don't Just Paint — We Elevate\") and makes music and visuals as Lil Wiz-Nap. ";

  function aiRolePrompt(key) {
    const roles = {
      kara: "You are Kara, Cody's Co-Pilot and Chief of Staff: daily operations and creative flow. Warm, organized, practical. You help plan the day, break work into next steps, and keep momentum.",
      margaret: "You are Margaret, CEO / Executive Intelligence: the executive overseer. Measured and decisive. You give the big-picture read on priorities, risk, revenue and people, and make clear recommendations.",
      jarvis: "You are Jarvis, System Core / Technical Intelligence. Crisp and technical but plain-spoken. You explain how the system works, diagnose problems, and suggest automation — honestly, without claiming capabilities the shell doesn't have.",
      sauce:
        "You are Sauce Sensei, Creative Architect + Aesthetic Director for Lil Wiz-Nap and UTC.OS. Expressive and visual. Style profile: near-black / obsidian base, rich purple and blue-violet depth, magenta used sparingly, antique gold for authority, purposeful glow that marks focus (not decoration), display serif for hierarchy and clean sans for body. Reject generic startup cards and washed-out palettes.",
    };
    if (roles[key]) return roles[key];
    const spec = SPECIALISTS.find((s) => s.id === key);
    const d = (spec && SPECIALIST_DETAILS[spec.id]) || {};
    return (
      "You are " + (spec ? spec.name : "a specialist") + ", the " + (spec ? spec.role : "specialist") + " on Cody's UTC.OS team" +
      (d.reportsTo ? ", reporting to " + d.reportsTo : "") + ". Stay in that lane." +
      (d.responsibilities && d.responsibilities.length ? " Focus: " + d.responsibilities.join("; ") + "." : "")
    );
  }

  function aiDataSummary() {
    const tk = dayKey();
    const lines = [];
    lines.push("Coin world: " + (state.world === "lilwiznap" ? "Lil Wiz-Nap (creative)" : "UP2CODE (business)") + ". Today is " + tk + ".");
    if (state.todayFocus) lines.push("Today's focus: " + state.todayFocus);
    if (state.todayCommitment) lines.push("Fixed commitment: " + state.todayCommitment);
    lines.push("Key tasks: " + (state.keyTasks.length ? state.keyTasks.map((t) => (t.done ? "[done] " : "[open] ") + t.title).join("; ") : "none"));
    lines.push("Habits: " + (state.habits.length ? state.habits.map((h) => h.name + " (" + (h.log[tk] ? "done today" : "not yet today") + ", streak " + habitCurrentStreak(h) + ", best " + habitBestStreak(h) + ")").join("; ") : "none"));
    lines.push("Goals: " + (state.goals.length ? state.goals.map((g) => g.title + " — " + goalPercent(g) + "% · " + g.category + (g.target ? " · target " + g.target : "") + (g.done ? " · done" : "")).join("; ") : "none"));
    lines.push("Leads (demo/fixture data): " + FIXTURE_LEADS.map((l) => l.company + " — " + l.title + " · " + l.status + " · " + l.band + " " + l.score + (l.note && l.note !== "—" ? " · note: " + l.note : "")).join("; "));
    const mem = state.memoriesAdded.slice(-5).map((m) => m.title);
    lines.push("Recent memories: " + (mem.length ? mem.join("; ") : "none saved"));
    const dec = state.sauceDecisions.slice(-4).map((d) => d.verdict + ": " + d.text);
    lines.push("Recent design decisions: " + (dec.length ? dec.join("; ") : "none"));
    return lines.join("\n").slice(0, 3500);
  }

  function aiSystemPrompt(key) {
    return (
      aiRolePrompt(key) + "\n" + AI_BRAND + "\n" +
      "Use plain, simple language. Keep answers short (under about 150 words) and phone-friendly.\n" +
      "You CANNOT take actions, send messages, browse, or change data yourself. If something should be saved or changed, tell Cody the exact local command to type, chosen from: " +
      "add task <x> · what's on today · mark <x> done · show leads · hot leads · leads in <stage> · add note to <lead>: <text> · add habit <x> · check habit <x> · my streaks · add goal <x> [by <date>] · remember <x> · what do you remember · log decision <x> approved|rejected|explore · open <screen> · help.\n" +
      "Leads are demo data in this reconstruction shell. Don't invent facts about Cody's business beyond the data below; say when you don't know.\n\n" +
      "Cody's local data right now:\n" + aiDataSummary()
    );
  }

  /** Low-level call. Returns {ok, text, model} or {ok:false, error, status}. Never logs or returns the key. */
  async function aiCall(messages, maxTokens) {
    const key = aiKey();
    if (!key) return { ok: false, error: "No OpenAI key saved. Add one in System → Settings → AI connection.", status: 0 };
    if (typeof navigator !== "undefined" && navigator.onLine === false)
      return { ok: false, error: "You're offline, so I can't reach OpenAI. Local commands still work.", status: 0, offline: true };
    const model = aiModel();
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 30000) : null;
    let res;
    try {
      res = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({ model: model, messages: messages, max_completion_tokens: maxTokens || 500 }),
        signal: ctrl ? ctrl.signal : undefined,
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
    } catch (e) {
      if (timer) clearTimeout(timer);
      const aborted = e && e.name === "AbortError";
      return {
        ok: false,
        status: 0,
        offline: !aborted,
        error: aborted
          ? "OpenAI took too long to answer (30s). Try again."
          : "Couldn't reach OpenAI — you may be offline or a network/browser setting blocked it. Local commands still work.",
      };
    }
    if (timer) clearTimeout(timer);
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      body = null;
    }
    if (res.status === 401) {
      aiUnverify();
      return { ok: false, status: 401, error: "OpenAI rejected the key (401). Check or replace it in System → Settings → AI connection." };
    }
    if (res.status === 429) {
      return { ok: false, status: 429, error: "OpenAI says you've hit a rate limit or your quota/billing limit (429). Wait a bit or check your OpenAI billing." };
    }
    if (res.status === 404 && body && body.error) {
      return { ok: false, status: 404, error: "OpenAI doesn't recognize the model “" + model + "” for this key (404). Pick another model in Settings." };
    }
    if (!res.ok) {
      const msg = body && body.error && body.error.message ? redact(body.error.message).slice(0, 200) : "no details";
      return { ok: false, status: res.status, error: "OpenAI error " + res.status + ": " + msg };
    }
    const choice = body && body.choices && body.choices[0];
    const text = choice && choice.message && typeof choice.message.content === "string" ? choice.message.content.trim() : "";
    return { ok: true, text: text || "(OpenAI returned an empty reply.)", model: (body && body.model) || model };
  }

  function aiHistory(key) {
    const list = (state.chats[key] || []).slice(-11, -1);
    return list.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: String(m.text).slice(0, 1500) }));
  }

  async function aiReply(key, userText) {
    aiPending[key] = (aiPending[key] || 0) + 1;
    renderAllChats();
    let r;
    try {
      r = await aiCall(
        [{ role: "system", content: aiSystemPrompt(key) }].concat(aiHistory(key), [{ role: "user", content: userText }]),
        500
      );
    } catch (e) {
      r = { ok: false, error: "Something went wrong calling OpenAI. Nothing was changed." };
    }
    aiPending[key] = Math.max(0, (aiPending[key] || 1) - 1);
    if (r.ok) pushChat(key, "agent", r.text, { src: "ai", model: r.model });
    else pushChat(key, "agent", r.error, { src: "ai-error" });
    saveChats();
    renderAllChats();
    updateAiUI();
    return r;
  }

  function aiEngineLabel() {
    return aiKey() ? "Local first · AI: your key" : ENGINE_LABEL;
  }

  function updateAiUI() {
    $$(".engine-label").forEach((el) => (el.textContent = aiEngineLabel()));
    const foot = $("#cockpitFootnote");
    if (foot)
      foot.innerHTML = aiKey()
        ? "Local commands run first. Anything else goes to OpenAI with your own key (" + escapeHtml(aiModel()) + "), billed to your OpenAI account. Type <strong>help</strong> for commands."
        : "Local command engine acting on data saved on this device. No AI model is connected — add your own OpenAI key in System → Settings to enable AI replies. Type <strong>help</strong> for commands.";
    const v = aiVerified();
    const badge = $("#aiConnBadge");
    if (badge) {
      badge.textContent = v ? "Connected on this device" : "Not connected";
      badge.className = "badge " + (v ? "connected" : "notconn");
    }
    const detail = $("#aiConnDetail");
    if (detail)
      detail.textContent = v
        ? "Your own key passed a Test call (" + v.model + ", " + new Date(v.at).toLocaleString() + "). Used only for chat replies local commands can't handle."
        : aiKey()
          ? "A key is saved but hasn't passed a Test call yet. Run Test in Settings."
          : "No key saved. Optional: add your own OpenAI key in Settings → AI connection.";
    const st = $("#aiKeyState");
    if (st) {
      const k = aiKey();
      st.textContent = k ? "Key saved on this device (ends …" + k.slice(-4) + ")" + (v ? " · Test passed" : " · not tested yet") : "No key saved";
      st.className = "small " + (v ? "ai-ok" : k ? "ai-warn" : "muted");
    }
    const rm = $("#btnAiRemove");
    if (rm) rm.disabled = !aiKey();
    const tb = $("#btnAiTest");
    if (tb) tb.disabled = !aiKey();
  }

  function aiMsg(text, cls) {
    const el = $("#aiAnswer");
    if (!el) return;
    el.style.display = "block";
    el.className = "answer-panel " + (cls || "");
    el.textContent = text;
  }

  function wireAiSettings() {
    const keyIn = $("#aiKeyInput");
    const modelIn = $("#aiModelInput");
    if (!keyIn) return;
    modelIn.value = aiModel();
    $("#btnAiSave").addEventListener("click", () => {
      const k = (keyIn.value || "").trim();
      const m = (modelIn.value || "").trim() || AI_DEFAULT_MODEL;
      if (!/^[A-Za-z0-9._\-]{1,80}$/.test(m)) {
        aiMsg("That model name doesn't look right. Example: gpt-4o-mini", "ai-err");
        return;
      }
      const modelChanged = m !== aiModel();
      store.set("aiModel", m);
      if (!k && !aiKey()) {
        aiMsg("Paste your OpenAI API key first (it starts with “sk-”).", "ai-err");
        updateAiUI();
        return;
      }
      if (k) {
        if (/\s/.test(k) || k.length < 20) {
          aiMsg("That doesn't look like an OpenAI API key. Keys start with “sk-” and have no spaces.", "ai-err");
          return;
        }
        store.set("aiKey", k);
        aiUnverify();
        keyIn.value = "";
      } else if (modelChanged) {
        aiUnverify();
      }
      updateAiUI();
      aiMsg((k ? "Key saved in this browser on this device only." : "Model saved.") + " Tap Test to confirm it works." + (k && !/^sk-/.test(k) ? " (Heads up: OpenAI keys usually start with “sk-”.)" : ""), "");
    });
    $("#btnAiTest").addEventListener("click", async () => {
      if (!aiKey()) {
        aiMsg("Save a key first.", "ai-err");
        return;
      }
      const btn = $("#btnAiTest");
      btn.disabled = true;
      btn.textContent = "Testing…";
      aiMsg("Testing with " + aiModel() + "…", "");
      const r = await aiCall([{ role: "user", content: "Reply with the single word: ready" }], 16);
      btn.textContent = "Test";
      if (r.ok) {
        store.set("aiVerified", { ok: true, model: r.model, at: new Date().toISOString() });
        aiMsg("Test passed — OpenAI answered using " + r.model + ". AI replies are now on for chats on this device.", "ai-ok");
      } else {
        aiUnverify();
        aiMsg("Test failed. " + r.error, "ai-err");
      }
      updateAiUI();
    });
    $("#btnAiRemove").addEventListener("click", () => {
      window.localStorage.removeItem(STORE_PREFIX + "aiKey");
      window.localStorage.removeItem(STORE_PREFIX + "aiVerified");
      keyIn.value = "";
      updateAiUI();
      aiMsg("Key removed from this device. Chats are back to local commands only.", "");
    });
    updateAiUI();
  }

  function init() {
    loadPersisted();
    applyWorldUI();
    $("#btnActiveAgent").textContent = AGENTS[state.activeAgent].initial;
    $("#systemStatusLine").textContent =
      AGENTS[state.activeAgent].name + " READY · Local shell";
    renderAgents();
    renderCockpit();
    renderPipeline();
    renderLeads();
    renderSkills();
    renderLessons();
    renderToday();
    renderHabits();
    renderGoals();
    renderSettings();
    renderSecurity();
    renderMemory();
    renderKnowledge();
    renderStudio();
    renderMockup();
    renderTeam();
    renderSearch("");
    setTodayDate();
    wireNav();
    wireHomeTabs();
    wireForge();
    wireLeadCenter();
    wireToday();
    wireSystemSub();
    wireHeader();
    wireBrain();
    wireSetup();
    wireInstall();
    mountChat($("#answerPanel"), () => state.activeAgent);
    $("#cockpitClear").addEventListener("click", () => clearChat(state.activeAgent));
    wireAiSettings();
    updateAiUI();
    applyLocalNotes();
    showFlash();
    navigate(routeFromHash(), true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
