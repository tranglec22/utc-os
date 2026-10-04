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
- Adds a conservative daily rollup endpoint:
  - `POST /v1/rollup/daily`
  - It currently lists pending intake only. It intentionally does **not** auto-promote raw material into durable memory until Bastion review logic is wired.
- Preserves every memory edit in `memory_versions`.

## Required environment variables

- `DATABASE_URL` — PostgreSQL connection string.
- `UTCOS_AGENT_CORE_KEY` — bearer token required by all private API routes.
- `PORT` — optional, defaults to `8787`.
- `PGSSL=disable` — optional for local PostgreSQL without TLS.

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

## Privacy boundary

The root repository is public. Do not commit private Second Brain data here.

- `data/second-brain-public.json` remains public-safe operating context only.
- Private memories belong in the database.
- `sensitivity='vault'` is reserved for protected records and should receive stronger encryption/access controls before production use.

## Next wiring

1. Add Bastion review + promotion rules for ingestion.
2. Add Echo Trace adapter.
3. Add encrypted vault storage.
4. Add scheduled daily rollup calling the deployed private endpoint.
5. Point the UTC.OS UI and ChatGPT/MCP integration at the same service.
