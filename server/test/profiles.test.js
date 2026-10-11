import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadAgentProfile, agentProfileStatus, PROFILE_FILES, ProfileUnavailableError } from "../src/profiles.js";
import { callAgentLlm } from "../src/llm.js";
import { AGENTS } from "../src/agents.js";

function withProfiles(fn) {
  const dir = mkdtempSync(join(tmpdir(), "utcos-agent-profiles-"));
  try {
    writeFileSync(join(dir, "SHARED_BASE_RULES.md"), "Only the user can approve external side effects.");
    for (const [id, filename] of Object.entries(PROFILE_FILES)) {
      writeFileSync(join(dir, filename), "# GPT Setup\n\n## Instructions\n\nYou are the original " + id + " agent.\n\n" +
        "## Team communication\nConsult the shared workroom.\n\n## Knowledge to attach\n\nPrivate sources.\n");
    }
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("each of the five separate role profiles loads only from server private directory", () => withProfiles(dir => {
  const env = { UTCOS_AGENT_PROFILE_DIR: dir, UTCOS_REQUIRE_AGENT_PROFILES: "true" };
  for (const id of Object.keys(AGENTS)) {
    const loaded = loadAgentProfile(id, env);
    assert.equal(loaded.loaded, true);
    assert.match(loaded.instructions, new RegExp("original " + id));
    assert.doesNotMatch(loaded.instructions, /Private sources/);
    assert.match(loaded.sharedRules, /approve external side effects/);
  }
  assert.equal(agentProfileStatus(env).allLoaded, true);
}));

test("does not claim original persona is loaded when no private profiles exist", () => {
  const state = agentProfileStatus({});
  assert.equal(state.allLoaded, false);
  assert.equal(state.agents.jarvis, "generic");
  assert.throws(() => loadAgentProfile("kara", { UTCOS_REQUIRE_AGENT_PROFILES: "true" }), ProfileUnavailableError);
  assert.throws(() => loadAgentProfile("invalid", {}), ProfileUnavailableError);
});

test("configured profile directory missing a file fails closed", () => withProfiles(dir => {
  const state = agentProfileStatus({ UTCOS_AGENT_PROFILE_DIR: join(dir, "not-there") });
  assert.equal(state.allLoaded, false);
  assert.equal(state.agents.margaret, "unavailable");
}));

test("real request construction includes distinct original agent instructions", async () => withProfiles(async dir => {
  let body;
  const result = await callAgentLlm({
    agent: AGENTS.sauce,
    messages: [{ role: "user", content: "Critique the layout" }],
    env: {
      UTCOS_LLM_API_KEY: "ci-placeholder",
      UTCOS_LLM_MODEL: "ci-model",
      UTCOS_AGENT_PROFILE_DIR: dir,
      UTCOS_REQUIRE_AGENT_PROFILES: "true"
    },
    fetchImpl: async (_url, opts) => {
      body = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ choices: [{ message: { content: "Specific design feedback" } }] }) };
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.profile, "private-profile");
  assert.match(body.messages[0].content, /original sauce/);
  assert.match(body.messages[0].content, /Only the user can approve external/);
}));

test("required personas missing returns 503 before calling model", async () => {
  const result = await callAgentLlm({
    agent: AGENTS.kara, messages: [{ role: "user", content: "Hello" }],
    env: { UTCOS_REQUIRE_AGENT_PROFILES: "true", UTCOS_LLM_API_KEY: "x", UTCOS_LLM_MODEL: "y" },
    fetchImpl: async () => { throw new Error("must not call"); }
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
  assert.match(result.error, /profile/i);
});