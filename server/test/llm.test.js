import test from "node:test";
import assert from "node:assert/strict";
import { llmConfig, agentInstructions, callAgentLlm } from "../src/llm.js";

const agent = {
  id: "kara",
  name: "Kara",
  role: "Chief of Staff / Daily Operations",
  teamTitle: "Co-Pilot / Chief of Staff",
  tagline: "Ideas become reality."
};

test("LLM runtime requires key and model", () => {
  assert.equal(llmConfig({}).ready, false);
  assert.equal(llmConfig({ UTCOS_LLM_API_KEY: "x", UTCOS_LLM_MODEL: "model" }).ready, true);
});

test("agent instructions preserve truth-state rule", () => {
  const text = agentInstructions(agent);
  assert.match(text, /Kara/);
  assert.match(text, /Never invent connection/);
  assert.match(text, /Bastion/);
});

test("calls compatible chat-completions provider", async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      async json() {
        return { model: "test-model", choices: [{ message: { content: "Handled." } }] };
      }
    };
  };

  const result = await callAgentLlm({
    agent,
    messages: [{ role: "user", content: "Plan my day" }],
    memoryContext: [{ title: "Preference", detail: "Phone-first" }],
    fetchImpl,
    env: {
      UTCOS_LLM_BASE_URL: "https://example.test/v1/",
      UTCOS_LLM_API_KEY: "secret",
      UTCOS_LLM_MODEL: "test-model"
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.text, "Handled.");
  assert.equal(request.url, "https://example.test/v1/chat/completions");
  const body = JSON.parse(request.options.body);
  assert.equal(body.model, "test-model");
  assert.match(body.messages[0].content, /Phone-first/);
});
