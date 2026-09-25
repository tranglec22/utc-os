# UTC.OS Reconstruction Shell — Phase 5

**This is a reconstruction shell — not the live utc-os-app.**

**Live (GitHub Pages):** https://tranglec22.github.io/utc-os/ · repo: https://github.com/tranglec22/utc-os
Still a reconstruction shell with local-only data — nothing on the hosted copy connects to the live app or any account.

Phone-first SPA that mirrors the **OBSERVED** structure from the 2026-09-24 live walk (`utc-os-reconstruction/live/`). Demo / fixture data only. No live agent APIs, no Pittsburgh radar upsert, no OAuth.

Evidence sources: `live/QUICK-SUMMARY.md`, `live/SCREEN-WALK.md`, `02-SCREEN-ROUTE-MAP.md`, `04-DATA-MODEL.md`, screenshots `01`–`26`.

## Preview on phone / DeX

### Option A — Simple static server (recommended)

```bash
cd utc-os-shell
python3 -m http.server 8765   # localhost also enables the service worker
```

Then open on the phone (same Wi‑Fi) or DeX browser:

- `http://<your-machine-ip>:8765/`
- `http://<your-machine-ip>:8765/lead-center.html` → redirects to Lead Center
- Hash routes listed below

Phone-size tip: Chrome DevTools → device toolbar → 390×844, or pinch-zoom on DeX.

### Option B — Open files directly

Open `index.html` in a browser. Hash routing works from `file://` for all views. (Service worker + install are skipped on `file://`; localStorage persistence still works in most browsers.)

### Install on Android (PWA)

Serve the folder over **HTTPS** (any static host) and open it in Chrome on Android. The shell ships `manifest.json`, `sw.js` (cache-first for same-origin shell files) and gold-UTC-on-obsidian icons. System → **Install this app** uses `beforeinstallprompt` when the browser offers it; otherwise it shows an honest message (e.g. use ⋮ → Install app, or "needs HTTPS").

### Option C — Zip

Unzip `utc-os-shell.zip` (at `/workspace/utc-os-shell.zip`) anywhere and use Option A or B.  
The zip **excludes** `preview-*.png` to keep size down; previews may still exist in the folder on disk.

## Wired hash routes

| Route | Surface | Notes |
|-------|---------|--------|
| `#/` / `#/home` | Home / Command Center | Agents, coin, cockpit, Brain map / Setup tabs |
| `#/brain` | Home → Brain map tab | **Phase 3** · SVG constellation, 12 of 38 fixture nodes, tap → source proof, Previous/Next nodes [17] |
| `#/setup` | Home → Setup tab | **Phase 3** · 11 status cards [18], Voice Studio personality (saved), OpenAI voice unchecked + disabled, Run checks (local browser checks only) |
| `#/today` | Today / Daily cockpit | Focus, commitment, key tasks (backlog or your own), evening review — **saved locally** |
| `#/forge` | Product Forge + Verify Work | Load painter tool example fills fields |
| `#/lead-center` / `#/leads` | Lead Center + Job Radar | Pipeline filter; detail dialog; stage + private note **saved locally** |
| `#/skills` | Skills | Fixture library + "Complete one run" counts **saved locally** |
| `#/system` | System overview | Lessons → `#/lesson/<n>`; Install; Data control (Export / Import / Reset — real, local only) |
| `#/lesson/<n>` | Lesson 1–10 | **Phase 3** · placeholder marked "Lesson content not captured from live app", Prev / Back / Next |
| `#/connections` | Connections | Lead Radar + Live web search **Connected**; others Launch point (in-page panel, no alert) |
| `#/settings` | Settings | Routing selectors + triggers [15] — **saved locally** |
| `#/security` | Security | Bastion local checks UI fixture [16] |
| `#/memory` | Memory | 3 fixture memories [22] + captured memories **saved locally** |
| `#/knowledge` | Knowledge | 12 fixture items [23] + added items **saved locally** |
| `#/studio` | Studio | LWN visual worlds + composer stub [24] |
| `#/mockup` | Mockup generator | 4-step Artwork→Finish stub [25] |
| `#/team` | Agent Team | Core four (tap → Home cockpit) + 10 specialists (tap → specialist page) [21] |
| `#/specialist/sauce-sensei` | Sauce Sensei specialist module | **Phase 3** · [26] Creative Architect + Aesthetic Director, Direct Sauce Sensei (stub reply), active project (saved), style profile, Design Decision Log (2 fixtures + your decisions, saved) |
| `#/specialist/<id>` | Generic specialist | **Phase 3** · prime, claude-code, hermes, bastion, vega, forge, muse, ledger, statute, archive — role, responsibilities, reporting line, stub Ask box |
| `#/search` | Local search | Client-side filter of fixture cards [19] |
| `#/vault` | Secret Vault landing | Satellite link; no iframe sound |

## Local persistence (Phase 3)

All state is stored in `localStorage` under the `utcos-shell:` prefix — **saved on this device only**, never synced, no network.

| Key | Contents |
|-----|----------|
| `utcos-shell:world` | Coin side (`up2code` / `lilwiznap`) |
| `utcos-shell:activeAgent`, `utcos-shell:agentBeforeCreative` | Active agent + agent to restore after flipping back |
| `utcos-shell:today` | Key tasks, focus, fixed commitment, evening review raw + summary |
| `utcos-shell:leads` | Per-lead stage overrides + private notes (leads themselves are fixture data) |
| `utcos-shell:skillRuns` | Local run counts added on top of fixture counts |
| `utcos-shell:memories` | Memories captured on the Memory screen |
| `utcos-shell:knowledge` | Knowledge items added on the Knowledge screen |
| `utcos-shell:settings` | Routing profile choices + trigger checkboxes |
| `utcos-shell:sauceDecisions`, `utcos-shell:sauceProject` | Sauce Sensei decision log entries + active project |
| `utcos-shell:voicePersona` | Setup → Voice Studio personality |

System → Data control:
- **Export backup** downloads `utcos-shell-backup-YYYY-MM-DD.json` (`{"format":"utcos-shell-backup","version":1,"keys":{...}}`).
- **Import backup** reads such a file, validates keys/JSON, asks `confirm()`, replaces local keys, reloads.
- **Reset local data** asks `confirm()`, clears only `utcos-shell:` keys, reloads with fixtures.

Bottom nav highlight: Connections / Settings / Security / Memory / Knowledge / Studio / Mockup / Team / Specialist / Lesson all highlight **System**. Search / Vault highlight **Home**.

Header active-agent avatar (`btnActiveAgent`) focuses Home cockpit for the current agent (no fake Connected badge).

## What matches OBSERVED

| Surface | Match |
|---------|--------|
| Bottom nav (6) | Home · Today · Forge · Leads · Skills · System |
| Header | UTC.OS, world chip, Local·shell (honest), Search, Vault, Lead Center shortcut, active-agent initial, workspace chooser |
| Coin | UP2CODE ↔ Lil Wiz-Nap flip; creative flip → Sauce Sensei ACTIVE; flip back restores prior agent; toast clears on navigate |
| Agents | Margaret, Kara, Jarvis, Sauce Sensei — roles/taglines from walk; Ask-[Agent] cockpit stubs only |
| Team | Core four expanded titles + specialists Prime, Claude Code, Hermes, Bastion, Vega, Forge, Muse, Ledger, Statute, Archive |
| Home | Fixture summary counts, Lead Center card, Second Brain counts, Coming soon for media / Crew / Materials / Profit |
| Today | Plan, focus, key tasks (in-memory from backlog), habits, goals, evening review Save stub |
| Forge | Product Forge + Verify Work; painter example fixture text; local-engine safety copy |
| Lead Center | Job Radar region (no run); pipeline; 5 fixture leads + detail dialog |
| Connections | Lead Radar **Connected**; Live web search **Connected**; Notion / Gmail / Calendar / Canva / VEED = **Launch point** only |
| Banner | “Reconstruction shell — not live utc-os-app” |
| Footer | Phase 5 shell |

## Intentional stubs

- Sync pill says **Local · shell** (not “Cloud synced”)
- Agent attach / speak — disabled. Send runs the local command engine (below), not an AI
- Job Radar Run / Import — message only; no upsert
- Lead action buttons (Create estimate / Mark contacted / won / lost) — disabled; stage select + private note persist locally
- Lesson content — placeholder only (not captured from live app); progress + private notes are yours
- Agent / specialist chats — local command engine only, nothing sent anywhere
- Brain map detail text — fixture (node labels observed); 26 of 38 nodes not captured
- Setup status cards — labels from live walk; Run checks only tests local browser capabilities
- OpenAI voice — unchecked + disabled; Preview voice disabled
- Secret Vault — landing + satellite link
- Media player, Crew, Materials, Profit — Coming soon
- No stock photos, no fake customer reviews, no invented Connected OAuth
- No live API calls of any kind; no `alert()` anywhere (in-page panels instead)

## Phase 5 — working features

Everything below is **yours, saved on this device only** (`utcos-shell:` keys), and is covered by System → Export / Import / Reset.

| Key | Contents |
|-----|----------|
| `utcos-shell:habits` | `[{id, name, created, log: {"YYYY-MM-DD": true}}]` |
| `utcos-shell:goals` | `[{id, title, category, target, mode: progress or steps, progress, steps[], done}]` |
| `utcos-shell:chats` | Per-agent chat history `{kara: [...], margaret: [...], jarvis: [...], sauce: [...], <specialist-id>: [...]}`, capped at 50 messages each |
| `utcos-shell:lessons` | `{"3": {status: not-started, in-progress or done, notes}}` |
| `utcos-shell:today` | now also stores a `done` flag per key task |

**Today → Habits:** add, rename (inline), delete (tap twice to confirm), check off today (40px circle), current streak (counts back from today, or from yesterday if today isn't checked yet), best streak, and dots for the last 7 days.

**Today → Goals:** add with category (UP2CODE / Lil Wiz-Nap / Personal; defaults to the current coin world), optional target date (days left / overdue), tracked by a 0–100% slider or checklist steps (add / check / remove). Mark done / reopen, delete (tap twice).

**Lessons 1–10:** each lesson page has Not started / In progress / Done and private notes (autosave). System → Build the AI shows a progress bar and per-card status. Body text stays “Lesson content not captured from live app” — no lesson content is invented.

**Agent chats — “Local assistant, no AI connected”.** Home cockpit (active agent), every specialist page, and the Sauce Sensei module run a local command engine that reads and writes the data above. No AI model, no network. Each agent keeps its own history (Clear chat per agent).

| Area | Commands (natural-ish, case-insensitive) |
|------|-----------|
| Help | `help` — commands, with that agent's focus first |
| Tasks | `add task <x>` · `what's on today` / `brief my day` · `mark <x> done` / `done <x>` (also matches a habit or goal) |
| Leads | `show leads` / `find painting leads` · `hot leads` · `leads in <stage>` / `<stage> leads` · `add note to <lead> <text>` or `add note to <lead>: <text>` (lead by company/title word, e.g. cabinet, d-rock, cqp) |
| Habits | `add habit <x>` · `check habit <x>` / `check off <x>` / `did <x>` · `my streaks` |
| Goals | `add goal <x>` (+ optional `by 2026-10-31` / `by oct 31`, `for personal` / `for lil wiz-nap`) · `my goals` |
| Memory | `remember <x>` (Memory → Inbox) · `what do you remember` |
| Design log | `log decision <x> approved, rejected or explore` (no verdict → Explore) · `decisions` · `style profile` |
| Navigate | `open <screen>` — today, leads / lead center, forge, skills, system, connections, settings, security, memory, knowledge, studio, mockup, team, search, vault, brain map, setup, lesson 1–10, sauce sensei, any specialist name |
| Role | `summary` / `what deserves priority` (Margaret's executive read) · `status` / `run self-test` (Jarvis: storage, service worker, honest connections, AI = none) |

Role voices: **Kara** daily co-pilot (“Here's where things stand”), **Margaret** executive overview (her “what's on today” is a tasks/leads/goals/habits summary with a priority call), **Jarvis** system report, **Sauce Sensei** creative read, **specialists** answer as “Name · role” and note their reporting line. Unknown input gets an honest reply that real AI isn't connected yet, plus suggestions. The prompt chips (Brief my day, Find painting leads, Run self-test, Review this design…) map to these commands; “Create an estimate” honestly says estimates weren't captured.

## Phase 4 polish (QA sweep)

Checked at 390×844, Fold inner ~884×1104 and Fold cover ~344×882 (headless Chrome).

- Header Search icon rendered as a filled dot → proper stroked magnifying-glass SVG; all header line icons now stroke by default (Lead Center icon was also rendering filled).
- `#/` always opens the default **Home** tab (previously re-opened whichever Home tab was last used); `#/brain` and `#/setup` still deep-link. Clicking a Home tab now updates the URL via `replaceState` (no extra history entries).
- Setup status cards overflowed horizontally on the 344px cover screen → grid columns can shrink, long text wraps.
- Tap targets: header icons/avatar 36→40px; buttons, tabs, Home tabs, back links ("← Back to System"), "Add task", backlog summary ≥40px; chips/step pills/brain chips ≥36px with gaps; checkboxes/radios 13→20px.
- Contrast: dim text `#6b655c` (~3.2:1) → `#938b7f` (~4.9:1); hero sub-label gold brightened.
- Fold inner screen: content column widens from 430px to 680px at ≥700px viewport instead of a narrow strip.
- Dead buttons: Today "Add" with empty input now toasts + focuses the field; Add habit / Add goal toast that they are uncaptured stubs.
- Service worker cache bumped to `utcos-shell-v4` so installed copies pick up the update.

## Files

```
utc-os-shell/
  index.html          SPA shell + all views
  lead-center.html    Path entry → #/lead-center
  manifest.json       PWA manifest (standalone, obsidian theme)
  sw.js               Service worker — cache-first same-origin shell files
  icons/              icon.svg, icon-192/512.png, icon-maskable-512.png, apple-touch-icon.png
  assets/styles.css   Obsidian / violet / gold theme (+ Phase 2, Phase 3, Phase 4 polish, Phase 5 editors + chat)
  assets/app.js       Routing, coin, agents, fixtures, persistence, specialists, brain map, setup
  README.md
  preview-*.png       Optional local screenshots (excluded from zip)
```

## Palette

Near-black / obsidian · deep purple / violet · electric blue accents · antique gold. Luxury cyber-mystic — not generic SaaS.

## Next phases

See `utc-os-reconstruction/06-RECONSTRUCTION-PLAN.md` for Lead Center store, second-brain persistence, Forge AI adapters, and real connectors — only when credentials and product decisions exist.
