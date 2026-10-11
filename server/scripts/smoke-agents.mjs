// UTC.OS release gate: explicit, billable live smoke test.
// Run only against an authorized private deployment, never as part of ordinary CI.
const base = (process.env.UTCOS_AGENT_CORE_URL || "").replace(/\/+$/, "");
const key = process.env.UTCOS_AGENT_CORE_KEY || "";
if (process.env.UTCOS_RUN_LIVE_SMOKE_TEST !== "1" || !base || !key || !/^https:\/\//i.test(base)) {
  console.error("Live smoke test requires UTCOS_RUN_LIVE_SMOKE_TEST=1, HTTPS UTCOS_AGENT_CORE_URL, and UTCOS_AGENT_CORE_KEY.");
  process.exit(2);
}
const required = ["margaret", "kara", "jarvis", "sauce", "bastion"];
const ensure = (value, reason) => { if (!value) throw new Error(reason); };
async function request(path, { method = "GET", body, authorized = true } = {}) {
  const headers = { Accept: "application/json", ...(authorized ? { Authorization: `Bearer ${key}` } : {}) };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(base + path, {
    method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(60000)
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}
try {
  const ready = await request("/ready");
  ensure(ready.status === 200 && ready.payload.ok && ready.payload.database && ready.payload.llm,
    "Backend readiness (database/model) is not verified");
  ensure(ready.payload.personaProfiles?.allLoaded,
    "All five original private agent profiles must be loaded; generic fallback is not acceptable");

  const denied = await request("/v1/agents", { authorized: false });
  ensure(denied.status === 401, "Protected route accessible without an Agent Core credential");

  const agents = await request("/v1/agents");
  ensure(agents.status === 200 && Array.isArray(agents.payload.agents), "Agent directory unavailable");
  const seen = new Set(agents.payload.agents.map(a => a.id));
  ensure(required.every(id => seen.has(id)), "Agent directory does not include all five agents");

  for (const agentId of required) {
    const result = await request("/v1/agent/respond", {
      method: "POST",
      body: { agentId, workspace: "All work", includePrivateMemory: false,
        message: "Live release test: in one sentence, say your UTC.OS role. Do not use personal data." }
    });
    ensure(result.status === 200 && typeof result.payload.reply === "string" &&
      result.payload.reply.trim().length > 0 && result.payload.model,
      `No verified live model reply from ${agentId}`);
    ensure(result.payload.personaSource === "private-profile",
      `Original persona identity not confirmed for ${agentId}`);
    ensure(result.payload.context?.privateMemoryIncluded === false,
      `Private memory was unexpectedly included for ${agentId}`);
    console.log(`PASS: ${agentId} returned a live model reply using its private profile`);
  }

  // This records a synthetic consultation in the private workroom.
  const consulted = await request("/v1/workroom/consult", {
    method: "POST",
    body: { fromAgentId: "kara", toAgentId: "bastion",
      content: "Release smoke test: identify one safe check before publication; no personal information.",
      workspace: "UTC.OS Live Smoke", sensitivity: "public-safe", includeMemory: false,
      evidenceRefs: ["smoke:test"] }
  });
  ensure(consulted.status === 200 && consulted.payload.ok &&
    consulted.payload.delivery === "responded" &&
    consulted.payload.response?.content?.trim() &&
    consulted.payload.memoryCount === 0 && consulted.payload.threadId,
    "An actual one-hop consultation and zero-memory default were not verified");
  const thread = await request(
    `/v1/workroom/threads/${encodeURIComponent(consulted.payload.threadId)}?workspace=${encodeURIComponent("UTC.OS Live Smoke")}`
  );
  ensure(thread.status === 200 && Array.isArray(thread.payload.messages) &&
    thread.payload.messages.some(m => m.status === "answered") &&
    thread.payload.messages.some(m => m.status === "recorded"),
    "Consultation reply was not persisted to the workroom");
  console.log("PASS: authenticated consultation, durable handoff trail, no automatic memory forwarding");
  console.log("PASS: LIVE AGENT CORE SMOKE TEST. Not a substitute for Site integration, Second Brain persistence, or full security review.");
} catch (error) {
  console.error("FAIL: " + error.message);
  process.exitCode = 1;
}
