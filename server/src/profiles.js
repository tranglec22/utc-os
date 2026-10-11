import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AGENTS } from "./agents.js";

// The user's full profile files stay outside this public repository.
// These are fixed, allow-listed file names, never user-supplied paths.
export const PROFILE_FILES = Object.freeze({
  margaret: "Margaret.md",
  kara: "Kara.md",
  jarvis: "Jarvis.md",
  sauce: "Sauce_Sensei.md",
  bastion: "Bastion.md"
});

export class ProfileUnavailableError extends Error {
  constructor() {
    super("Agent profile is not configured or could not be loaded");
    this.name = "ProfileUnavailableError";
  }
}

function readBoundedFile(path) {
  const text = readFileSync(path, "utf8");
  if (!text.trim() || Buffer.byteLength(text, "utf8") > 32_000) {
    throw new ProfileUnavailableError();
  }
  return text.trim();
}

function extractRoleInstructions(markdown) {
  // Standalone GPT setup files contain starter prompts and attachment
  // instructions that are not part of the runtime agent identity.
  const start = markdown.indexOf("## Instructions");
  const end = markdown.indexOf("## Knowledge to attach");
  if (start < 0 || end <= start) throw new ProfileUnavailableError();
  return markdown.slice(start + "## Instructions".length, end).trim();
}

export function loadAgentProfile(id, env = process.env) {
  if (!Object.hasOwn(PROFILE_FILES, id) || !AGENTS[id]) throw new ProfileUnavailableError();
  const dir = String(env.UTCOS_AGENT_PROFILE_DIR || "").trim();
  const required = String(env.UTCOS_REQUIRE_AGENT_PROFILES || "").toLowerCase() === "true";
  if (!dir) {
    if (required) throw new ProfileUnavailableError();
    return { loaded: false, source: "generic", instructions: "", sharedRules: "" };
  }

  try {
    const instructions = extractRoleInstructions(readBoundedFile(join(dir, PROFILE_FILES[id])));
    const sharedRules = readBoundedFile(join(dir, "SHARED_BASE_RULES.md"));
    if (instructions.length > 20_000 || sharedRules.length > 20_000) throw new ProfileUnavailableError();
    return { loaded: true, source: "private-profile", instructions, sharedRules };
  } catch (_error) {
    // Configured but incomplete must fail closed; never pretend to load
    // the original personality while silently using generic fallback.
    throw new ProfileUnavailableError();
  }
}

export function agentProfileStatus(env = process.env) {
  const agents = {};
  for (const id of Object.keys(PROFILE_FILES)) {
    try {
      agents[id] = loadAgentProfile(id, env).loaded ? "loaded" : "generic";
    } catch {
      agents[id] = "unavailable";
    }
  }
  return {
    required: String(env.UTCOS_REQUIRE_AGENT_PROFILES || "").toLowerCase() === "true",
    allLoaded: Object.values(agents).every(state => state === "loaded"),
    agents
  };
}
