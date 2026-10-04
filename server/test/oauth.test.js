import test from "node:test";
import assert from "node:assert/strict";
import {
  sha256Hex,
  base64urlSha256,
  normalizeScopes,
  safePasswordEqual,
  authorizationServerMetadata,
  protectedResourceMetadata
} from "../src/oauth.js";

test("PKCE S256 uses URL-safe SHA-256", () => {
  assert.equal(
    base64urlSha256("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
  );
});

test("token hashing is deterministic but not plaintext", () => {
  const hash = sha256Hex("secret-token");
  assert.equal(hash.length, 64);
  assert.notEqual(hash, "secret-token");
});

test("scopes are constrained", () => {
  assert.equal(normalizeScopes("mcp:read mcp:write"), "mcp:read mcp:write");
  assert.throws(() => normalizeScopes("admin:everything"), /unsupported scope/);
});

test("approval password comparison is strict", () => {
  assert.equal(safePasswordEqual("same-password", "same-password"), true);
  assert.equal(safePasswordEqual("wrong", "same-password"), false);
});

test("metadata points at the Agent Core issuer", () => {
  const base = "https://agent.example";
  const auth = authorizationServerMetadata(base);
  const resource = protectedResourceMetadata(base);
  assert.equal(auth.issuer, base);
  assert.equal(auth.code_challenge_methods_supported[0], "S256");
  assert.deepEqual(resource.authorization_servers, [base]);
});
