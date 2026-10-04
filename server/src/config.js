export function configStatus(env = process.env) {
  const missing = [];
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!env.UTCOS_AGENT_CORE_KEY) missing.push("UTCOS_AGENT_CORE_KEY");
  if (!env.UTCOS_VAULT_KEY || String(env.UTCOS_VAULT_KEY).length < 24) missing.push("UTCOS_VAULT_KEY");
  return {
    ready: missing.length === 0,
    missing,
    port: Number(env.PORT || 8787),
    ssl: env.PGSSL === "disable" ? "disabled" : "required"
  };
}
