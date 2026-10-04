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

The MCP endpoint uses the same `Authorization: Bearer <UTCOS_AGENT_CORE_KEY>` gate as the REST API. ChatGPT/plugin and Cosmic Mothership clients should point to the deployed HTTPS URL ending in `/mcp`.

## Encrypted Safety Vault

Vault records are encrypted at rest in PostgreSQL using pgcrypto AES-256. They are excluded from normal memory search/context and require explicit vault routes:
- `GET /v1/vault` — metadata only
- `POST /v1/vault` — encrypt and store
- `GET /v1/vault/:id` — explicit decrypt/read
- `DELETE /v1/vault/:id` — soft-delete

Vault access is audited through Bastion events. Keep `UTCOS_VAULT_KEY` separate from `UTCOS_AGENT_CORE_KEY` and out of Git.

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
