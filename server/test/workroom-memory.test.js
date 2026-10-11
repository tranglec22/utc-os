import test from "node:test";
import assert from "node:assert/strict";
import { consultWorkroomAgent } from "../src/workroom.js";

test("opt-in consultation queries public-safe scoped memories and sends limited context", async () => {
  const calls = [];
  const pool = { query: async (sql, params) => {
    calls.push({ sql, params });
    if (calls.length === 1) return { rowCount: 1, rows: [{
      id: "req-1", thread_id: params[0], from_agent: params[1],
      to_agent: params[2], content: params[4], workspace: params[5], status: "queued"
    }] };
    if (calls.length === 2) {
      assert.match(sql, /sensitivity='public-safe'/);
      assert.match(sql, /workspace=\$1/);
      assert.match(sql, /LIMIT 12/);
      assert.deepEqual(params, ["UTC.OS"]);
      return { rowCount: 1, rows: [{ title: "Active build", detail: "Use the existing Site" }] };
    }
    return { rowCount: 1, rows: [{ id: "reply-1", content: "Preserve current Site", status: "recorded" }] };
  }};
  const result = await consultWorkroomAgent(pool, {
    fromAgentId: "kara", toAgentId: "jarvis",
    content: "Give technical next steps", workspace: "UTC.OS", includeMemory: true
  }, {
    env: { UTCOS_LLM_API_KEY: "test", UTCOS_LLM_MODEL: "test-model" },
    fetchImpl: async (_url, opts) => {
      const req = JSON.parse(opts.body);
      const system = req.messages[0].content;
      assert.match(system, /Active build: Use the existing Site/);
      return { ok: true, json: async () => ({ choices: [{ message: { content: "Preserve current Site" } }] }) };
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.memoryCount, 1);
  assert.equal(calls.length, 3);
});

test("consultations do not read any Second Brain records without explicit opt-in", async () => {
  const calls = [];
  const pool = { query: async (sql, params) => {
    calls.push(sql);
    return calls.length === 1
      ? { rowCount: 1, rows: [{ id: "req", thread_id: params[0], from_agent: params[1], to_agent: params[2], content: params[4], status: "queued" }] }
      : { rowCount: 1, rows: [{ id: "reply", content: "OK" }] };
  }};
  const result = await consultWorkroomAgent(pool, {
    toAgentId: "bastion", content: "Verify gate", includeMemory: false
  }, {
    env: { UTCOS_LLM_API_KEY: "test", UTCOS_LLM_MODEL: "test-model" },
    fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "OK" } }] }) })
  });
  assert.equal(result.ok, true);
  assert.equal(result.memoryCount, 0);
  assert.equal(calls.length, 2);
});
