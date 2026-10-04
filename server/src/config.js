export function configStatus(env = process.env) {
  const missing = [];
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!env.UTCOS_AGENT_CORE_KEY) missing.push("UTCOS_AGENT_CORE_KEY");
  return {
    ready: missing.length === 0,
    missing,
    port: Number(env.PORT || 8787),
    ssl: env.PGSSL === "disable" ? "disabled" : "required"
  };
}
