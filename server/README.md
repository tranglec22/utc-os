# UTC.OS Agent Core + Second Brain

This directory is the first real shared backend layer for UTC.OS.

## What it does now

- Defines the five shared agents: Margaret, Kara, Jarvis, Sauce Sensei, Bastion.
- Routes tasks to an agent using the same high-level responsibilities already present in the UTC.OS shell.
- Adds authenticated memory endpoints:
  - `POST /v1/memory/remember`
  - `POST /v1/memory/search`
  - `PATCH /v1/memory/:id`
  - `POST /v1/context`
- Adds an ingestion inbox for Echo Trace, chats, files, and other feeds:
  - `POST /v1/ingest`
- Adds Bastion-gated ingestion review and daily rollup:
  - `POST /v1/ingest/:id/review`
  - `POST /v1/rollup/daily`
  - explicit structured memories may be promoted; raw/inferred/secret-like material is flagged instead.
- Preserves every memory edit in `memory_versions`.

## Required environment variables

- `DATABASE_URL` — PostgreSQL connection string.
- `UTCOS_AGENT_CORE_KEY` — bearer token required by all private API routes.
- `PORT` — optional, defaults to `8787`.
- `PGSSL=disable` — optional for local PostgreSQL without TLS.
- `UTCOS_VAULT_KEY` — separate 24+ character symmetric key used only for encrypted vault records.

Do not commit either secret.

## Initialize

```bash
cd server
npm install
psql "$DATABASE_URL" -f db/schema.sql
UTCOS_AGENT_CORE_KEY="..." DATABASE_URL="..." npm start
```

Health check:

```bash
curl http://localhost:8787/health
```


## MCP endpoint

The service now exposes the same Agent Core and Second Brain through `/mcp` using the current Model Context Protocol HTTP server SDK.

Tools:
- `list_agents`
- `route_agent`
- `search_memory`
- `remember_memory`
- `ingest_source`
- `update_memory`
- `archive_memory`
- `list_ingestion`
- `review_ingestion`
- `list_vault_metadata`
- `store_vault_item`

The MCP endpoint uses the same `Authorization: Bearer <UTCOS_AGENT_CORE_KEY>` gate as the REST API. ChatGPT/plugin and Cosmic Mothership clients should point to the deployed HTTPS URL ending in `/mcp`.

## Encrypted Safety Vault

Vault records are encrypted at rest in PostgreSQL using pgcrypto AES-256. Normal memory APIs and MCP memory tools reject `sensitivity=vault`; protected material must use the Safety Vault so it is never stored as plaintext memory. They are excluded from normal memory search/context and require explicit vault routes:
- `GET /v1/vault` — metadata only
- `POST /v1/vault` — encrypt and store
- `GET /v1/vault/:id` — explicit decrypt/read
- `DELETE /v1/vault/:id` — soft-delete

Vault access is audited through Bastion events. Keep `UTCOS_VAULT_KEY` separate from `UTCOS_AGENT_CORE_KEY` and out of Git.

## Browser Mothership connection

The UTC.OS browser shell now has an Agent Core connection panel in Settings. It stores the Agent Core URL and bearer key on that device only, excludes the key from local backup exports, verifies credentials through `/v1/agents`, saves explicit Memory captures to the shared Second Brain, and can inject shared memory context into direct AI replies.

Cross-origin browser access is restricted to known UTC.OS origins plus optional comma-separated `UTCOS_ALLOWED_ORIGINS`. Authentication is still required on every private route.

## Privacy boundary

The root repository is public. Do not commit private Second Brain data here.

- `data/second-brain-public.json` remains public-safe operating context only.
- Private memories belong in the database.
- `sensitivity='vault'` is reserved for protected records and should receive stronger encryption/access controls before production use.

## Next wiring

1. Deploy Agent Core behind HTTPS with PostgreSQL.
2. Configure `DATABASE_URL`, `UTCOS_AGENT_CORE_KEY`, and `UTCOS_VAULT_KEY` in the host secret store.
3. Point Echo Trace at the deployed REST URL.
4. Point ChatGPT/plugin and Cosmic Mothership at `/mcp`.
5. Add off-site encrypted database backups once a storage target is chosen.


## Render deployment

The repository root now includes `render.yaml`, which provisions:

- `utcos-agent-core` as a Docker web service.
- `utcos-second-brain` as PostgreSQL.
- generated `UTCOS_AGENT_CORE_KEY` and `UTCOS_VAULT_KEY` secrets.
- the database connection through Render's database reference.
- the full `/ready` probe as the service health check.

The Docker start command runs the idempotent database schema initializer before starting the API, so the free service path does not depend on Render's paid pre-deploy command feature.

After the Blueprint is created, copy the generated Agent Core bearer key into the clients that need it. Never paste the vault key into Echo Trace, the browser shell, or ChatGPT. The vault key stays server-side.

The GitHub daily-rollup workflow still needs two repository secrets after deployment:
- `UTCOS_AGENT_CORE_URL`
- `UTCOS_AGENT_CORE_KEY`

## Encrypted backups

`npm run backup` creates an AES-256-GCM encrypted logical snapshot of Second Brain tables, including the already-encrypted vault ciphertext. The backup is encrypted again with a separate `UTCOS_BACKUP_KEY`.

`npm run backup:inspect -- <file>` decrypts only long enough in memory to validate the envelope and report record counts. It does not print memory or vault contents.

Keep `UTCOS_BACKUP_KEY` separate from both the Agent Core bearer key and the Safety Vault key. The repository does not upload backups anywhere automatically yet, because the off-site storage destination must be an account you control.


## Live deployment verification

`.github/workflows/agent-core-live-check.yml` runs a daily authenticated production check after deployment. It verifies `/ready` and `/v1/agents` with retries. Before the deployment secrets exist it exits safely instead of pretending the service is live.


## Five-agent private workroom (proposed feature)

This extension adds a recorded internal handoff/consultation mechanism. The
five established agent IDs are `margaret`, `kara`, `jarvis`, `sauce`
(Sauce Sensei), and `bastion`. Their original standalone GPT configuration
packs remain in the UTC.OS Separate Agents Library folder; this backend
change **does not** create or publish any GPT.

Authenticated REST endpoints:
- `POST /v1/workroom/messages` queues an internal handoff (202; not delivered).
- `POST /v1/workroom/consult` invokes the named recipient once through the
  existing configured model, then records its actual reply and delivery status.
- `GET /v1/workroom/threads/:threadId?workspace=All%20work` returns its trail.

The same operations are exposed through MCP tools `post_agent_handoff`,
`consult_agent`, and `read_agent_thread`.

Example JSON for `/v1/workroom/consult`:

```json
{
  "fromAgentId": "kara",
  "toAgentId": "jarvis",
  "content": "Review the Echo Trace install failure and propose the smallest safe fix.",
  "workspace": "UTC.OS",
  "sensitivity": "private",
  "evidenceRefs": []
}
```

The first call creates a new thread UUID. Supply that `threadId` on
subsequent handoffs to keep an audit trail. A model outage returns
`delivery: not_delivered`; it never claims a response happened.

**Security boundaries:** This is a single-owner backend with one privileged
bearer key, not a per-user multi-tenant authorization system. Do not expose the
key in a public site or browser bundle. Do not send raw transcripts,
credentials, vault material, or unrelated private memories to the model.
Workroom content is stored in PostgreSQL and a direct consultation sends
only its explicit request text to the configured model. An internal
handoff cannot authorize spending, publishing, sending messages to outsiders,
deletion, or production deployment. The live `utc-os-app` Site remains
unchanged until a separate verified integration.

## Existing Cosmic Mothership: deployment boundaries

The intended destination is the user's existing native ChatGPT Site:
`https://cosmic-mothership.tranglec.chatgpt.site`.
This is not a new Site or a Lovable deployment.

An authenticated `GET /v1/status` reports `personaProfiles` with each
role marked `loaded`, `generic`, or `unavailable`, plus `allLoaded`.
`POST /v1/agent/respond` includes a `personaSource` field.

Keep the five original setup files Margaret.md, Kara.md, Jarvis.md,
Sauce_Sensei.md, Bastion.md and SHARED_BASE_RULES.md outside the public
repo. Load them through the private server directory set in
`UTCOS_AGENT_PROFILE_DIR`, and set `UTCOS_REQUIRE_AGENT_PROFILES=true`.
A missing original profile then fails closed instead of impersonating it.

The two consultation APIs accept `includeMemory: true` to include up to
12 recent `public-safe` active Second Brain records from the requested
workspace or `All work`. Defaults to false; never includes private or
vault memory in workroom consultations. Successful replies report
`memoryCount` to help verify the context actually supplied.

The Mothership origin is permitted by CORS, but CORS does not grant
authentication. The Site still needs an authorized server-side bridge.
Never put the privileged `UTCOS_AGENT_CORE_KEY` in a public website,
browser source, localStorage, or client bundle. The bridge must enforce
individual user identity and workspace permission boundaries.

The live-check workflow fails if verification secrets are missing and
checks database, model configuration and all five original profiles.
A passing readiness check cannot substitute for verifying five actual
AI replies, memory persistence, handoffs, privacy and original Site
regressions before publication.


### Real five-agent release smoke test (manual, opt-in)

The scheduled Agent Core Live Check only checks readiness and credentials.
The separate **manual** workflow dispatch also invokes `server/scripts/smoke-agents.mjs`.
It deliberately costs six model calls and records one synthetic workroom
consultation, so it does **not** run automatically on every push or schedule.
Never print or commit the credentials.

In an authorized operator environment:
```bash
UTCOS_RUN_LIVE_SMOKE_TEST=1 UTCOS_AGENT_CORE_URL="https://YOUR-PRIVATE-CORE" \
 UTCOS_AGENT_CORE_KEY="<from secret store>" npm run smoke:live --prefix server
```

The smoke test fails unless the private deployment passes readiness, denies
unauthenticated access, exposes all five agent IDs with loaded original profiles,
returns a real model response for each role without private memory,
and persists an actual Kara-to-Bastion consultation and reply. It does **not**
prove Second Brain memory persistence, Site authentication/bridge integration,
permissions across users, backup restoration, or production suitability.
Check those separately with consent and a backup before enabling the existing
ChatGPT Cosmic Mothership. Never put the privileged bearer key in public
Site source or browser storage; keep it on an authenticated server-side bridge.
