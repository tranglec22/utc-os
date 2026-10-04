import test from "node:test";
import assert from "node:assert/strict";
import { extractMemoryCandidate, reviewIngestion } from "../src/bastion.js";

test("approves explicit structured memory", () => {
  const item = {
    source_type: "echo-trace",
    payload: {
      explicitMemory: true,
      memory: { title: "Decision", detail: "Use one shared Agent Core.", workspace: "UTC.OS" }
    }
  };
  const r = reviewIngestion(item);
  assert.equal(r.state, "approved");
  assert.equal(r.candidate.workspace, "UTC.OS");
});

test("flags non-explicit memory", () => {
  const r = reviewIngestion({
    source_type: "chat",
    payload: { memory: { title: "Maybe", detail: "A raw inferred detail." } }
  });
  assert.equal(r.state, "flagged");
});

test("flags secret-like material", () => {
  const r = reviewIngestion({
    source_type: "echo-trace",
    payload: {
      explicitMemory: true,
      apiKey: "hidden",
      memory: { title: "Credential", detail: "Do not promote." }
    }
  });
  assert.equal(r.state, "flagged");
  assert.equal(r.candidate.sensitivity, "vault");
});

test("rejects incomplete memory candidate", () => {
  assert.equal(extractMemoryCandidate({ payload: { memory: { title: "No detail" } } }), null);
});
