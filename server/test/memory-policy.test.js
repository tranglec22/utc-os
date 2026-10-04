import test from "node:test";
import assert from "node:assert/strict";
import { assertNormalMemorySensitivity } from "../src/memory-policy.js";

test("normal memory accepts public-safe and private", () => {
  assert.equal(assertNormalMemorySensitivity("public-safe"), "public-safe");
  assert.equal(assertNormalMemorySensitivity("private"), "private");
});

test("normal memory rejects vault plaintext", () => {
  assert.throws(
    () => assertNormalMemorySensitivity("vault"),
    /encrypted Safety Vault/
  );
});
