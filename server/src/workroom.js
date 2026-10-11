import { randomUUID } from "node:crypto";
import { AGENTS } from "./agents.js";
import { callAgentLlm } from "./llm.js";

const PURPOSES = new Set(["consult", "handoff", "review", "status"]);
const SENSITIVITIES = new Set(["public-safe", "private"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class WorkroomInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "WorkroomInputError";
  }
}

function bounded(value, field, max, fallback = "") {
  const str = String(value ?? fallback).trim();
  if (!str || str.length > max) throw new WorkroomInputError(field + " must contain 1-" + max + " characters");
  return str;
}

export function validateWorkroomMessage(input = {}) {
  const fromAgentId = bounded(input.fromAgentId, "fromAgentId", 40, "kara");
  const toAgentId = bounded(input.toAgentId, "toAgentId", 40);
  if (!AGENTS[fromAgentId] || !AGENTS[toAgentId]) throw new WorkroomInputError("Unknown UTC.OS agent");
  if (fromAgentId === toAgentId) throw new WorkroomInputError("An agent cannot consult itself");

  const purpose = bounded(input.purpose, "purpose", 20, "consult");
  if (!PURPOSES.has(purpose)) throw new WorkroomInputError("Invalid message purpose");

  const sensitivity = bounded(input.sensitivity, "sensitivity", 30, "private");
  if (!SENSITIVITIES.has(sensitivity)) {
    throw new WorkroomInputError("Vault material must not enter the agent workroom");
  }

  const threadId = String(input.threadId || randomUUID());
  if (!UUID.test(threadId)) throw new WorkroomInputError("threadId must be a UUID");

  const evidenceRefs = input.evidenceRefs ?? [];
  if (!Array.isArray(evidenceRefs) || evidenceRefs.length > 20 ||
      evidenceRefs.some(ref => typeof ref !== "string" || !ref.trim() || ref.length > 300)) {
    throw new WorkroomInputError("evidenceRefs must be up to 20 source references");
  }

  return {
    threadId,
    fromAgentId,
    toAgentId,
    purpose,
    content: bounded(input.content, "content", 10000),
    workspace: bounded(input.workspace, "workspace", 120, "All work"),
    sensitivity,
    evidenceRefs
  };
}

export async function queueWorkroomMessage(pool, input) {
  const message = validateWorkroomMessage(input);
  const q = await pool.query(
    `INSERT INTO agent_workroom_messages
       (thread_id, from_agent, to_agent, purpose, content, workspace, sensitivity, evidence_refs)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
     RETURNING id,thread_id,from_agent,to_agent,purpose,content,workspace,sensitivity,evidence_refs,status,created_at,responded_at`,
    [
      message.threadId, message.fromAgentId, message.toAgentId, message.purpose,
      message.content, message.workspace, message.sensitivity, JSON.stringify(message.evidenceRefs)
    ]
  );
  return q.rows[0];
}

export async function listWorkroomThread(pool, threadId, workspace = "All work") {
  if (!UUID.test(String(threadId))) throw new WorkroomInputError("threadId must be a UUID");
  const safeWorkspace = bounded(workspace, "workspace", 120);
  const q = await pool.query(
    `SELECT id,thread_id,from_agent,to_agent,purpose,content,workspace,sensitivity,
            evidence_refs,status,reply_to,created_at,responded_at
       FROM agent_workroom_messages
      WHERE thread_id=$1 AND workspace=$2 ORDER BY created_at ASC, id ASC LIMIT 100`,
    [threadId, safeWorkspace]
  );
  return q.rows;
}

// One explicit consultation, not an autonomous background loop.
// No Second Brain memories, vault records, or credentials are automatically forwarded.
export async function consultWorkroomAgent(pool, input, options = {}) {
  const request = await queueWorkroomMessage(pool, { ...input, purpose: "consult" });
  let result;
  try {
    result = await callAgentLlm({
      agent: AGENTS[request.to_agent],
      messages: [{ role: "user", content: request.content }],
      memoryContext: [],
      ...(options.env ? { env: options.env } : {}),
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {})
    });
  } catch (_error) {
    return { ok: false, threadId: request.thread_id, requestId: request.id,
      delivery: "not_delivered", error: "Agent model connection failed", status: 502 };
  }

  if (!result.ok) {
    return {
      ok: false,
      threadId: request.thread_id,
      requestId: request.id,
      delivery: "not_delivered",
      error: result.error,
      status: result.status || 502
    };
  }

  // One statement keeps the request state and actual reply in the same database operation.
  const q = await pool.query(
    `WITH answered AS (
       UPDATE agent_workroom_messages SET status='answered',responded_at=now()
        WHERE id=$1 AND status='queued'
       RETURNING *
     )
     INSERT INTO agent_workroom_messages
       (thread_id,from_agent,to_agent,purpose,content,workspace,sensitivity,evidence_refs,status,reply_to,responded_at)
     SELECT thread_id,to_agent,from_agent,'status',$2,workspace,sensitivity,'[]'::jsonb,
            'recorded',id,now()
       FROM answered
     RETURNING id,thread_id,from_agent,to_agent,content,status,reply_to,created_at`,
    [request.id, result.text]
  );
  if (!q.rowCount) throw new Error("Workroom reply could not be recorded");

  return {
    ok: true,
    threadId: request.thread_id,
    requestId: request.id,
    response: q.rows[0],
    agent: AGENTS[request.to_agent],
    model: result.model,
    delivery: "responded"
  };
}