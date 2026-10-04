import test from "node:test";
import assert from "node:assert/strict";
import { cleanVaultInput, vaultConfigured } from "../src/vault.js";

test("vault requires a separate strong key", () => {
  assert.equal(vaultConfigured({ UTCOS_VAULT_KEY: "short" }), false);
  assert.equal(vaultConfigured({ UTCOS_VAULT_KEY: "123456789012345678901234" }), true);
});

test("cleans valid vault input", () => {
  const v = cleanVaultInput({ title: " Recovery note ", plaintext: "secret", workspace: "UTC.OS" });
  assert.equal(v.title, "Recovery note");
  assert.equal(v.workspace, "UTC.OS");
});

test("rejects empty vault payload", () => {
  assert.throws(() => cleanVaultInput({ title: "", plaintext: "" }));
});
