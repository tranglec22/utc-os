const SECRET_KEYS = ["password","passcode","api_key","apikey","token","secret","private_key","ssn","social_security"];

function flattenKeys(value, out = []) {
  if (!value || typeof value !== "object") return out;
  for (const [key, child] of Object.entries(value)) {
    out.push(String(key).toLowerCase());
    if (child && typeof child === "object") flattenKeys(child, out);
  }
  return out;
}

export function extractMemoryCandidate(item) {
  const payload = item?.payload || {};
  const memory = payload.memory;
  if (!memory || typeof memory !== "object") return null;
  const title = String(memory.title || "").trim();
  const detail = String(memory.detail || "").trim();
  if (!title || !detail) return null;
  return {
    title,
    detail,
    bucket: memory.bucket || "inbox",
    workspace: memory.workspace || "All work",
    source: memory.source || item?.source_type || "ingestion",
    sensitivity: memory.sensitivity || "private",
    confidence: Number.isFinite(Number(memory.confidence)) ? Math.max(0, Math.min(1, Number(memory.confidence))) : 1,
    createdBy: memory.createdBy || "daily-rollup"
  };
}

export function reviewIngestion(item) {
  const payload = item?.payload || {};
  const candidate = extractMemoryCandidate(item);
  if (!candidate) {
    return { state: "flagged", reason: "No structured memory candidate. Keep raw intake in the inbox." };
  }

  const keys = flattenKeys(payload);
  const secretLike = keys.some((key) => SECRET_KEYS.some((needle) => key.includes(needle)));
  if (secretLike || candidate.sensitivity === "vault") {
    return { state: "flagged", reason: "Potential secret or vault material requires manual review.", candidate: { ...candidate, sensitivity: "vault" } };
  }

  if (payload.explicitMemory !== true) {
    return { state: "flagged", reason: "No explicit memory intent. Do not silently promote.", candidate };
  }

  return { state: "approved", reason: "Explicit memory intent and no secret-like fields detected.", candidate };
}
