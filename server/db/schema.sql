CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  bucket TEXT NOT NULL DEFAULT 'inbox',
  workspace TEXT NOT NULL DEFAULT 'All work',
  source TEXT NOT NULL DEFAULT 'unknown',
  sensitivity TEXT NOT NULL DEFAULT 'private'
    CHECK (sensitivity IN ('public-safe','private','vault')),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 1.0
    CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','archived','superseded')),
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memory_versions (
  id BIGSERIAL PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  changed_by TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(memory_id, version_no)
);

CREATE TABLE IF NOT EXISTS ingestion_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_ref TEXT,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','processed','rejected')),
  bastion_state TEXT NOT NULL DEFAULT 'unreviewed'
    CHECK (bastion_state IN ('unreviewed','approved','flagged','rejected')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS agent_events (
  id BIGSERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memories_search_idx
  ON memories USING gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(detail,'')));

CREATE INDEX IF NOT EXISTS memories_workspace_idx ON memories(workspace);
CREATE INDEX IF NOT EXISTS memories_status_idx ON memories(status);
CREATE INDEX IF NOT EXISTS ingestion_status_idx ON ingestion_inbox(status, bastion_state);


CREATE TABLE IF NOT EXISTS vault_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  secret_ciphertext BYTEA NOT NULL,
  workspace TEXT NOT NULL DEFAULT 'All work',
  source TEXT NOT NULL DEFAULT 'manual',
  created_by TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS vault_entries_workspace_idx ON vault_entries(workspace) WHERE deleted_at IS NULL;


CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id TEXT PRIMARY KEY,
  client_name TEXT,
  redirect_uris JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oauth_codes (
  code_hash TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  scope TEXT NOT NULL,
  resource TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oauth_tokens (
  token_hash TEXT PRIMARY KEY,
  token_type TEXT NOT NULL CHECK (token_type IN ('access','refresh')),
  client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  resource TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  family_id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS oauth_codes_expiry_idx ON oauth_codes(expires_at);
CREATE INDEX IF NOT EXISTS oauth_tokens_lookup_idx ON oauth_tokens(token_hash, token_type, revoked, expires_at);
