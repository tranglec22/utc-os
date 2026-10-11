import test from "node:test";
import assert from "node:assert/strict";
import { validateWorkroomMessage, queueWorkroomMessage, consultWorkroomAgent, WorkroomInputError } from "../src/workroom.js";

test("workroom uses established agent IDs and defaults to Kara", () => {
  const m = validateWorkroomMessage({ toAgentId: "bastion", content: "Review release" });
  assert.equal(m.fromAgentId, "kara");
  assert.equal(m.toAgentId, "bastion");
  assert.equal(m.purpose, "consult");
  assert.equal(m.sensitivity, "private");
  assert.match(m.threadId, /^[a-f0-9-]{36}$/);
});

test("workroom rejects unknown, self-directed, and vault messages", () => {
  for (const input of [
    { fromAgentId: "kara", toAgentId: "fake", content: "hello" },
    { fromAgentId: "jarvis", toAgentId: "jarvis", content: "hello" },
    { toAgentId: "bastion", content: "secret", sensitivity: "vault" },
    { toAgentId: "bastion", content: "ok", purpose: "publish" },
    { toAgentId: "bastion", content: "ok", evidenceRefs: ["x".repeat(400)] }
  ]) assert.throws(() => validateWorkroomMessage(input), WorkroomInputError);
});

test("unconnected handoff is queued, not falsely marked delivered", async () => {
  const pool = { query: async (_sql, params) => ({ rows: [{
    id: "req-1", thread_id: params[0], from_agent: params[1],
    to_agent: params[2], purpose: params[3], content: params[4], status: "queued"
  }] }) };
  const m = await queueWorkroomMessage(pool, { toAgentId: "jarvis", content: "Review API" });
  assert.equal(m.status, "queued");
});

test("live consultation calls recipient model once and records actual response", async () => {
  const queries = [];
  const pool = { query: async (sql, params) => {
    queries.push(sql);
    return queries.length === 1
      ? { rows: [{ id: "req-1", thread_id: params[0], from_agent: params[1], to_agent: params[2], content: params[4], status: "queued" }], rowCount: 1 }
      : { rows: [{ id: "reply-1", thread_id: "thread-1", from_agent: "jarvis", to_agent: "kara", content: "Use a health check", status: "recorded" }], rowCount: 1 };
  }};
  let calls = 0;
  const fetchImpl = async (_url, opts) => {
    calls++;
    assert.match(opts.body, /Jarvis/);
    return { ok: true, json: async () => ({ model: "mock-model", choices: [{ message: { content: "Use a health check" } }] }) };
  };
  const result = await consultWorkroomAgent(pool, { fromAgentId: "kara", toAgentId: "jarvis", content: "Review API" }, {
    env: { UTCOS_LLM_API_KEY: "mock-key", UTCOS_LLM_MODEL: "mock-model" }, fetchImpl
  });
  assert.equal(calls, 1);
  assert.equal(result.delivery, "responded");
  assert.equal(result.response.content, "Use a health check");
  assert.equal(queries.length, 2);
});

test("without model configuration request stays queued, not delivered", async () => {
  let calls = 0;
  const pool = { query: async (_sql, params) => {
    calls++;
    return { rows: [{ id: "req-2", thread_id: params[0], from_agent: params[1], to_agent: params[2], content: params[4], status: "queued" }], rowCount: 1 };
  }};
  const result = await consultWorkroomAgent(pool, { toAgentId: "margaret", content: "Prioritize next steps" }, { env: {} });
  assert.equal(result.delivery, "not_delivered");
  assert.equal(calls, 1);
});