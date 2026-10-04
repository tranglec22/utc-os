import test from "node:test";
import assert from "node:assert/strict";
import { configStatus } from "../src/config.js";

test("reports required deployment settings", () => {
  assert.deepEqual(configStatus({}), {
    ready: false,
    missing: ["DATABASE_URL","UTCOS_AGENT_CORE_KEY"],
    port: 8787,
    ssl: "required"
  });
});

test("reports ready config", () => {
  const value = configStatus({DATABASE_URL:"postgres://x",UTCOS_AGENT_CORE_KEY:"secret",PORT:"9000",PGSSL:"disable"});
  assert.equal(value.ready,true);
  assert.equal(value.port,9000);
  assert.equal(value.ssl,"disabled");
});
