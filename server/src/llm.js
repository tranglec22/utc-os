export function llmConfig(env = process.env) {
  const baseUrl = String(env.UTCOS_LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const apiKey = String(env.UTCOS_LLM_API_KEY || "");
  const model = String(env.UTCOS_LLM_MODEL || "");
  return {
    ready: Boolean(apiKey && model),
    baseUrl,
    apiKey,
    model,
    allowPrivateMemory: String(env.UTCOS_ALLOW_PRIVATE_LLM_CONTEXT || "").toLowerCase() === "true"
  };
}

export function agentInstructions(agent) {
  return [
    `You are ${agent.name}, part of the UTC.OS Agent Core.`,
    `Role: ${agent.role}.`,
    agent.teamTitle ? `Team title: ${agent.teamTitle}.` : "",
    agent.tagline ? `Operating principle: "${agent.tagline}"` : "",
    "Use plain language and stay inside your role.",
    "Treat supplied Second Brain memory as context, not as infallible truth.",
    "Never invent connection, completion, permission, deployment, backup, or security states.",
    "If evidence conflicts, call out the conflict instead of silently choosing a version.",
    "Do not claim an external action happened unless the caller provides evidence it completed.",
    "Bastion is the truth/security gate; security-sensitive uncertainty should be routed or flagged for Bastion.",
    "Keep answers concise and action-oriented."
  ].filter(Boolean).join("\n");
}

export async function callAgentLlm({ agent, messages, memoryContext = [], fetchImpl = fetch, env = process.env }) {
  const cfg = llmConfig(env);
  if (!cfg.ready) {
    return { ok: false, status: 503, error: "Agent Core LLM is not configured" };
  }

  const memoryText = memoryContext.length
    ? "\n\nSecond Brain context:\n" + memoryContext.map((m) => `- ${m.title}: ${m.detail}`).join("\n")
    : "";

  const safeMessages = Array.isArray(messages)
    ? messages
        .filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) }))
    : [];

  const res = await fetchImpl(cfg.baseUrl + "/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + cfg.apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: "system", content: agentInstructions(agent) + memoryText },
        ...safeMessages
      ],
      temperature: 0.4
    })
  });

  let body = null;
  try { body = await res.json(); } catch (error) {}

  if (!res.ok) {
    const message = body?.error?.message || `LLM provider returned HTTP ${res.status}`;
    return { ok: false, status: res.status, error: String(message).slice(0, 500) };
  }

  const text = body?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    return { ok: false, status: 502, error: "LLM provider returned an empty response" };
  }

  return {
    ok: true,
    text: text.trim(),
    model: body?.model || cfg.model
  };
}
