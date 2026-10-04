import express from "express";
import pg from "pg";
import { AGENTS, routeAgent } from "./agents.js";
import { reviewIngestion } from "./bastion.js";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createAgentCoreMcpHandler } from "./mcp.js";
import { vaultConfigured, storeVaultEntry, readVaultEntry } from "./vault.js";
import { assertNormalMemorySensitivity } from "./memory-policy.js";
import { callAgentLlm, llmConfig } from "./llm.js";
import {
  publicBase,
  safePasswordEqual,
  registerClient,
  validateAuthorizationRequest,
  issueAuthorizationCode,
  exchangeAuthorizationCode,
  refreshAccessToken,
  verifyOauthAccess,
  authorizationServerMetadata,
  protectedResourceMetadata
} from "./oauth.js";

const { Pool } = pg;
const app = express();

const defaultOrigins = [
  "https://tranglec22.github.io",
  "https://utc-os-app.tranglec.chatgpt.site"
];
const configuredOrigins = String(process.env.UTCOS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);
const allowedOrigins = new Set(defaultOrigins.concat(configuredOrigins));

app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const port = Number(process.env.PORT || 8787);
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false } })
  : null;

function requireKey(req, res, next) {
  const configured = process.env.UTCOS_AGENT_CORE_KEY;
  if (!configured) return res.status(503).json({ error: "UTCOS_AGENT_CORE_KEY is not configured" });
  const supplied = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (supplied !== configured) return res.status(401).json({ error: "unauthorized" });
  next();
}

async function requireMcpAuth(req, res, next) {
  const supplied = req.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const staticKey = process.env.UTCOS_AGENT_CORE_KEY || "";
  if (staticKey && supplied === staticKey) return next();

  try {
    if (await verifyOauthAccess(pool, supplied, "mcp:read")) return next();
  } catch (error) {
    // Fall through to a standards-compliant OAuth challenge.
  }

  const base = publicBase(req);
  res.setHeader(
    "WWW-Authenticate",
    `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource", scope="mcp:read mcp:write"`
  );
  return res.status(401).json({ error: "authorization required" });
}

const mcpHandler = createAgentCoreMcpHandler(pool);
app.all("/mcp", requireMcpAuth, toNodeHandler(mcpHandler));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));


function oauthDbReady(res) {
  if (!pool) {
    res.status(503).json({ error: "OAuth database is not configured" });
    return false;
  }
  return true;
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

app.get("/.well-known/oauth-protected-resource", (req, res) => {
  res.json(protectedResourceMetadata(publicBase(req)));
});

app.get("/.well-known/oauth-authorization-server", (req, res) => {
  res.json(authorizationServerMetadata(publicBase(req)));
});

app.get("/oauth/about", (_req, res) => {
  res.type("text/plain").send(
    "UTC.OS Agent Core authorization protects the user's private Second Brain and MCP tools."
  );
});

app.post("/oauth/register", async (req, res) => {
  if (!oauthDbReady(res)) return;
  try {
    const client = await registerClient(pool, req.body || {});
    res.status(201).json(client);
  } catch (error) {
    res.status(400).json({ error: "invalid_client_metadata", error_description: error.message });
  }
});

app.get("/oauth/authorize", async (req, res) => {
  if (!oauthDbReady(res)) return;
  if (!process.env.UTCOS_OAUTH_PASSWORD) {
    return res.status(503).type("text/plain").send("OAuth approval is not configured.");
  }

  try {
    const base = publicBase(req);
    const auth = await validateAuthorizationRequest(pool, req.query, base);
    const hidden = {
      response_type: "code",
      client_id: auth.clientId,
      redirect_uri: auth.redirectUri,
      code_challenge: auth.codeChallenge,
      code_challenge_method: "S256",
      scope: auth.scope,
      resource: auth.resource,
      state: auth.state
    };
    const fields = Object.entries(hidden)
      .map(([k,v]) => `<input type="hidden" name="${htmlEscape(k)}" value="${htmlEscape(v)}">`)
      .join("");

    res.type("html").send(`<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Authorize UTC.OS Agents</title>
<style>
body{font-family:system-ui;background:#09070d;color:#eee;margin:0;padding:24px}
main{max-width:520px;margin:8vh auto;padding:24px;border:1px solid #5b3b78;border-radius:18px;background:#120d19}
h1{color:#d5b45b}p{line-height:1.5;color:#c9c2d0}
input[type=password]{width:100%;box-sizing:border-box;padding:14px;margin:12px 0;border-radius:10px;border:1px solid #65516f;background:#08060b;color:#fff}
button{width:100%;padding:14px;border:0;border-radius:10px;background:#c9a227;color:#100b02;font-weight:700}
.small{font-size:13px;color:#9b92a3}
</style></head><body><main>
<h1>Authorize UTC.OS Agents</h1>
<p>Allow this ChatGPT MCP client to access the shared Agent Core and Second Brain with scopes <strong>${htmlEscape(auth.scope)}</strong>.</p>
<p class="small">Safety Vault plaintext is not exposed as a generic MCP tool. Writes remain subject to ChatGPT action permissions.</p>
<form method="post" action="/oauth/authorize">
${fields}
<label for="password">UTC.OS approval password</label>
<input id="password" name="password" type="password" required autocomplete="current-password">
<button type="submit">Authorize</button>
</form></main></body></html>`);
  } catch (error) {
    res.status(400).type("text/plain").send("Invalid authorization request: " + error.message);
  }
});

app.post("/oauth/authorize", async (req, res) => {
  if (!oauthDbReady(res)) return;
  const expected = process.env.UTCOS_OAUTH_PASSWORD || "";
  if (!safePasswordEqual(req.body?.password, expected)) {
    return res.status(401).type("text/plain").send("Invalid approval password.");
  }

  try {
    const base = publicBase(req);
    const auth = await validateAuthorizationRequest(pool, req.body, base);
    const code = await issueAuthorizationCode(pool, auth);
    const redirect = new URL(auth.redirectUri);
    redirect.searchParams.set("code", code);
    if (auth.state) redirect.searchParams.set("state", auth.state);
    res.redirect(302, redirect.toString());
  } catch (error) {
    res.status(400).type("text/plain").send("Authorization failed: " + error.message);
  }
});

app.post("/oauth/token", async (req, res) => {
  if (!oauthDbReady(res)) return;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");

  try {
    const base = publicBase(req);
    let tokens;
    if (req.body?.grant_type === "authorization_code") {
      tokens = await exchangeAuthorizationCode(pool, req.body, base);
    } else if (req.body?.grant_type === "refresh_token") {
      tokens = await refreshAccessToken(pool, req.body, base);
    } else {
      return res.status(400).json({ error: "unsupported_grant_type" });
    }
    res.json(tokens);
  } catch (error) {
    res.status(400).json({ error: "invalid_grant", error_description: error.message });
  }
});

function requireDb(res) {
  if (!pool) {
    res.status(503).json({ error: "DATABASE_URL is not configured" });
    return false;
  }
  return true;
}

app.get("/ready", async (_req, res) => {
  const status = {
    ok: false,
    database: false,
    agentCoreKey: Boolean(process.env.UTCOS_AGENT_CORE_KEY),
    vaultKey: vaultConfigured()
  };
  if (pool) {
    try {
      await pool.query("SELECT 1");
      status.database = true;
    } catch (error) {
      status.database = false;
    }
  }
  status.ok = status.database && status.agentCoreKey && status.vaultKey;
  res.status(status.ok ? 200 : 503).json(status);
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "utcos-agent-core",
    agents: Object.keys(AGENTS),
    databaseConfigured: Boolean(pool),
    vaultConfigured: vaultConfigured(),
    llmConfigured: llmConfig().ready
  });
});

app.get("/v1/agents", requireKey, (_req, res) => {
  res.json({ agents: Object.values(AGENTS) });
});

app.get("/v1/status", requireKey, async (_req, res) => {
  let database = false;
  if (pool) {
    try {
      await pool.query("SELECT 1");
      database = true;
    } catch (error) {
      database = false;
    }
  }
  res.json({
    service: "utcos-agent-core",
    database,
    vault: vaultConfigured(),
    llm: llmConfig().ready,
    privateLlmContext: llmConfig().allowPrivateMemory,
    agents: Object.keys(AGENTS)
  });
});

app.post("/v1/route", requireKey, (req, res) => {
  const agent = routeAgent(req.body?.text || "");
  res.json({ agent });
});

app.post("/v1/agent/respond", requireKey, async (req, res) => {
  if (!requireDb(res)) return;
  const requested = String(req.body?.agentId || "");
  const agent = AGENTS[requested] || routeAgent(req.body?.message || "");
  const message = String(req.body?.message || "").trim();
  if (!message) return res.status(400).json({ error: "message is required" });

  const cfg = llmConfig();
  if (!cfg.ready) return res.status(503).json({ error: "Agent Core LLM is not configured" });

  const workspace = String(req.body?.workspace || "All work");
  const includePrivate = cfg.allowPrivateMemory && req.body?.includePrivateMemory !== false;
  const memorySql = includePrivate
    ? `SELECT id,title,detail,workspace,source,sensitivity,confidence,updated_at
       FROM memories
       WHERE status='active' AND sensitivity IN ('public-safe','private')
         AND (workspace=$1 OR workspace='All work')
       ORDER BY updated_at DESC LIMIT 30`
    : `SELECT id,title,detail,workspace,source,sensitivity,confidence,updated_at
       FROM memories
       WHERE status='active' AND sensitivity='public-safe'
         AND (workspace=$1 OR workspace='All work')
       ORDER BY updated_at DESC LIMIT 30`;

  const memories = await pool.query(memorySql, [workspace]);
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const result = await callAgentLlm({
    agent,
    messages: history.concat([{ role: "user", content: message }]),
    memoryContext: memories.rows
  });

  await pool.query(
    `INSERT INTO agent_events(agent_id,event_type,payload)
     VALUES($1,'agent.respond',$2::jsonb)`,
    [agent.id, JSON.stringify({
      workspace,
      ok: result.ok,
      model: result.model || null,
      privateMemoryIncluded: includePrivate,
      memoryCount: memories.rowCount
    })]
  );

  if (!result.ok) return res.status(result.status || 502).json({ error: result.error });
  res.json({
    agent,
    reply: result.text,
    model: result.model,
    context: {
      workspace,
      memoryCount: memories.rowCount,
      privateMemoryIncluded: includePrivate
    }
  });
});

app.post("/v1/memory/remember", requireKey, async (req, res) => {
  if (!requireDb(res)) return;
  const {
    title,
    detail,
    bucket = "inbox",
    workspace = "All work",
    source = "manual",
    sensitivity = "private",
    confidence = 1,
    createdBy = "user"
  } = req.body || {};
  if (!title || !detail) return res.status(400).json({ error: "title and detail are required" });
  let safeSensitivity;
  try { safeSensitivity = assertNormalMemorySensitivity(sensitivity); }
  catch (error) { return res.status(400).json({ error: error.message }); }

  const q = await pool.query(
    `INSERT INTO memories
      (title, detail, bucket, workspace, source, sensitivity, confidence, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [title, detail, bucket, workspace, source, safeSensitivity, confidence, createdBy]
  );
  const memory = q.rows[0];
  await pool.query(
    `INSERT INTO memory_versions(memory_id, version_no, snapshot, changed_by, reason)
     VALUES ($1, 1, $2::jsonb, $3, 'created')`,
    [memory.id, JSON.stringify(memory), createdBy]
  );
  res.status(201).json({ memory });
});

app.post("/v1/memory/search", requireKey, async (req, res) => {
  if (!requireDb(res)) return;
  const { query = "", workspace, limit = 20 } = req.body || {};
  const params = [query, Math.min(Number(limit) || 20, 100)];
  let sql = `
    SELECT *,
      ts_rank(
        to_tsvector('english', coalesce(title,'') || ' ' || coalesce(detail,'')),
        plainto_tsquery('english', $1)
      ) AS rank
    FROM memories
    WHERE status = 'active'
      AND ($1 = '' OR to_tsvector('english', coalesce(title,'') || ' ' || coalesce(detail,'')) @@ plainto_tsquery('english', $1))
  `;
  if (workspace) {
    params.push(workspace);
    sql += ` AND workspace = $3`;
  }
  sql += ` ORDER BY rank DESC, updated_at DESC LIMIT $2`;
  const q = await pool.query(sql, params);
  res.json({ memories: q.rows });
});

app.patch("/v1/memory/:id", requireKey, async (req, res) => {
  if (!requireDb(res)) return;
  const { id } = req.params;
  const current = await pool.query("SELECT * FROM memories WHERE id=$1", [id]);
  if (!current.rowCount) return res.status(404).json({ error: "memory not found" });

  const allowed = ["title","detail","bucket","workspace","source","sensitivity","confidence","status"];
  if (req.body?.sensitivity !== undefined) {
    try { assertNormalMemorySensitivity(req.body.sensitivity); }
    catch (error) { return res.status(400).json({ error: error.message }); }
  }
  const next = { ...current.rows[0] };
  for (const key of allowed) if (req.body?.[key] !== undefined) next[key] = req.body[key];

  const updated = await pool.query(
    `UPDATE memories SET
      title=$2, detail=$3, bucket=$4, workspace=$5, source=$6,
      sensitivity=$7, confidence=$8, status=$9, updated_at=now()
     WHERE id=$1 RETURNING *`,
    [id,next.title,next.detail,next.bucket,next.workspace,next.source,next.sensitivity,next.confidence,next.status]
  );

  const v = await pool.query(
    "SELECT COALESCE(MAX(version_no),0)+1 AS n FROM memory_versions WHERE memory_id=$1",
    [id]
  );
  await pool.query(
    `INSERT INTO memory_versions(memory_id, version_no, snapshot, changed_by, reason)
     VALUES ($1,$2,$3::jsonb,$4,$5)`,
    [id, v.rows[0].n, JSON.stringify(updated.rows[0]), req.body?.changedBy || "agent", req.body?.reason || "updated"]
  );

  res.json({ memory: updated.rows[0] });
});

app.post("/v1/context", requireKey, async (req, res) => {
  if (!requireDb(res)) return;
  const agent = AGENTS[req.body?.agentId] || routeAgent(req.body?.task || "");
  const workspace = req.body?.workspace || "All work";
  const q = await pool.query(
    `SELECT id,title,detail,bucket,workspace,source,sensitivity,confidence,updated_at
     FROM memories
     WHERE status='active' AND (workspace=$1 OR workspace='All work')
     ORDER BY updated_at DESC LIMIT 40`,
    [workspace]
  );
  res.json({ agent, workspace, memories: q.rows });
});

app.post("/v1/ingest", requireKey, async (req, res) => {
  if (!requireDb(res)) return;
  const { sourceType, sourceRef = null, payload } = req.body || {};
  if (!sourceType || payload === undefined) return res.status(400).json({ error: "sourceType and payload are required" });
  const q = await pool.query(
    `INSERT INTO ingestion_inbox(source_type, source_ref, payload)
     VALUES ($1,$2,$3::jsonb) RETURNING *`,
    [sourceType, sourceRef, JSON.stringify(payload)]
  );
  res.status(202).json({ item: q.rows[0] });
});

async function promoteIngestion(client, item, review, changedBy = "bastion") {
  const c = review.candidate;
  const created = await client.query(
    `INSERT INTO memories
      (title, detail, bucket, workspace, source, sensitivity, confidence, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [c.title, c.detail, c.bucket, c.workspace, c.source, c.sensitivity, c.confidence, c.createdBy || changedBy]
  );
  const memory = created.rows[0];
  await client.query(
    `INSERT INTO memory_versions(memory_id, version_no, snapshot, changed_by, reason)
     VALUES ($1,1,$2::jsonb,$3,'promoted from ingestion')`,
    [memory.id, JSON.stringify(memory), changedBy]
  );
  await client.query(
    `UPDATE ingestion_inbox
     SET status='processed', bastion_state='approved', processed_at=now(), notes=$2
     WHERE id=$1`,
    [item.id, review.reason]
  );
  return memory;
}

app.post("/v1/ingest/:id/review", requireKey, async (req, res) => {
  if (!requireDb(res)) return;
  const decision = String(req.body?.decision || "").toLowerCase();
  if (!["approved","flagged","rejected"].includes(decision)) {
    return res.status(400).json({ error: "decision must be approved, flagged, or rejected" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query("SELECT * FROM ingestion_inbox WHERE id=$1 FOR UPDATE", [req.params.id]);
    if (!found.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "ingestion item not found" });
    }
    const item = found.rows[0];

    if (decision === "rejected") {
      await client.query(
        `UPDATE ingestion_inbox
         SET status='rejected', bastion_state='rejected', processed_at=now(), notes=$2
         WHERE id=$1`,
        [item.id, req.body?.reason || "Rejected during manual review"]
      );
      await client.query("COMMIT");
      return res.json({ id: item.id, state: "rejected" });
    }

    if (decision === "flagged") {
      await client.query(
        `UPDATE ingestion_inbox
         SET bastion_state='flagged', notes=$2
         WHERE id=$1`,
        [item.id, req.body?.reason || "Flagged during manual review"]
      );
      await client.query("COMMIT");
      return res.json({ id: item.id, state: "flagged" });
    }

    const review = reviewIngestion(item);
    if (!review.candidate) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "item has no promotable structured memory candidate" });
    }
    review.state = "approved";
    review.reason = req.body?.reason || "Approved during manual Bastion review";
    const memory = await promoteIngestion(client, item, review, req.body?.changedBy || "bastion");
    await client.query("COMMIT");
    res.json({ id: item.id, state: "approved", memory });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "review failed", detail: error.message });
  } finally {
    client.release();
  }
});

app.get("/v1/vault", requireKey, async (req, res) => {
  if (!requireDb(res)) return;
  const params = [];
  let sql = "SELECT id,title,workspace,source,created_by,created_at,updated_at FROM vault_entries WHERE deleted_at IS NULL";
  if (req.query.workspace) { params.push(String(req.query.workspace)); sql += " AND workspace=$1"; }
  sql += " ORDER BY updated_at DESC LIMIT 200";
  const q = await pool.query(sql, params);
  res.json({ entries: q.rows });
});

app.post("/v1/vault", requireKey, async (req, res) => {
  if (!requireDb(res)) return;
  if (!vaultConfigured()) return res.status(503).json({ error: "UTCOS_VAULT_KEY is not configured" });
  try {
    const entry = await storeVaultEntry(pool, process.env.UTCOS_VAULT_KEY, req.body || {});
    await pool.query("INSERT INTO agent_events(agent_id,event_type,payload) VALUES('bastion','vault.store',$1::jsonb)", [JSON.stringify({ id: entry.id, title: entry.title, workspace: entry.workspace })]);
    res.status(201).json({ entry });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/v1/vault/:id", requireKey, async (req, res) => {
  if (!requireDb(res)) return;
  if (!vaultConfigured()) return res.status(503).json({ error: "UTCOS_VAULT_KEY is not configured" });
  try {
    const entry = await readVaultEntry(pool, process.env.UTCOS_VAULT_KEY, req.params.id);
    if (!entry) return res.status(404).json({ error: "vault entry not found" });
    await pool.query("INSERT INTO agent_events(agent_id,event_type,payload) VALUES('bastion','vault.read',$1::jsonb)", [JSON.stringify({ id: entry.id, title: entry.title })]);
    res.json({ entry });
  } catch (error) {
    res.status(500).json({ error: "vault read failed" });
  }
});

app.delete("/v1/vault/:id", requireKey, async (req, res) => {
  if (!requireDb(res)) return;
  const q = await pool.query("UPDATE vault_entries SET deleted_at=now(),updated_at=now() WHERE id=$1 AND deleted_at IS NULL RETURNING id,title", [req.params.id]);
  if (!q.rowCount) return res.status(404).json({ error: "vault entry not found" });
  await pool.query("INSERT INTO agent_events(agent_id,event_type,payload) VALUES('bastion','vault.delete',$1::jsonb)", [JSON.stringify(q.rows[0])]);
  res.json({ deleted: q.rows[0] });
});

app.post("/v1/rollup/daily", requireKey, async (_req, res) => {
  if (!requireDb(res)) return;
  const pending = await pool.query(
    `SELECT * FROM ingestion_inbox
     WHERE status='pending' AND bastion_state='unreviewed'
     ORDER BY received_at ASC
     LIMIT 200`
  );

  const result = { queued: pending.rowCount, promoted: [], flagged: [] };

  for (const item of pending.rows) {
    const review = reviewIngestion(item);
    if (review.state !== "approved") {
      await pool.query(
        `UPDATE ingestion_inbox
         SET bastion_state='flagged', notes=$2
         WHERE id=$1`,
        [item.id, review.reason]
      );
      result.flagged.push({ id: item.id, reason: review.reason });
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const memory = await promoteIngestion(client, item, review, "bastion-daily");
      await client.query("COMMIT");
      result.promoted.push({ ingestionId: item.id, memoryId: memory.id, title: memory.title });
    } catch (error) {
      await client.query("ROLLBACK");
      result.flagged.push({ id: item.id, reason: "Promotion failed: " + error.message });
    } finally {
      client.release();
    }
  }

  res.json({
    ...result,
    state: result.flagged.length ? "review-needed" : "complete"
  });
});

app.listen(port, () => {
  console.log(`UTC.OS Agent Core listening on :${port}`);
});
