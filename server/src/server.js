import express from "express";
import pg from "pg";
import { AGENTS, routeAgent } from "./agents.js";
import { reviewIngestion } from "./bastion.js";

const { Pool } = pg;
const app = express();
app.use(express.json({ limit: "2mb" }));

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

function requireDb(res) {
  if (!pool) {
    res.status(503).json({ error: "DATABASE_URL is not configured" });
    return false;
  }
  return true;
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "utcos-agent-core",
    agents: Object.keys(AGENTS),
    databaseConfigured: Boolean(pool)
  });
});

app.get("/v1/agents", requireKey, (_req, res) => {
  res.json({ agents: Object.values(AGENTS) });
});

app.post("/v1/route", requireKey, (req, res) => {
  const agent = routeAgent(req.body?.text || "");
  res.json({ agent });
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

  const q = await pool.query(
    `INSERT INTO memories
      (title, detail, bucket, workspace, source, sensitivity, confidence, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [title, detail, bucket, workspace, source, sensitivity, confidence, createdBy]
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
