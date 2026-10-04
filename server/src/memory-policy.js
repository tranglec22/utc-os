export function assertNormalMemorySensitivity(value = "private") {
  const sensitivity = String(value || "private");
  if (sensitivity === "vault") {
    throw new Error("vault sensitivity must use the encrypted Safety Vault");
  }
  if (!["public-safe","private"].includes(sensitivity)) {
    throw new Error("sensitivity must be public-safe or private");
  }
  return sensitivity;
}
