import crypto from "node:crypto";

const ACCESS_TTL_SECONDS = 3600;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;
const CODE_TTL_SECONDS = 300;
const ALLOWED_SCOPES = new Set(["mcp:read", "mcp:write"]);

export function sha256Hex(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function base64urlSha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("base64url");
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function publicBase(req, env = process.env) {
  const configured = String(env.UTCOS_PUBLIC_URL || "").trim().replace(/\/+$/, "");
  if (configured) return configured;
  const proto = String(req.get("x-forwarded-proto") || req.protocol || "https").split(",")[0].trim();
  const host = req.get("x-forwarded-host") || req.get("host");
  return `${proto}://${host}`.replace(/\/+$/, "");
}

export function normalizeScopes(scope = "") {
  const requested = String(scope)
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const scopes = requested.length ? requested : ["mcp:read", "mcp:write"];
  for (const item of scopes) {
    if (!ALLOWED_SCOPES.has(item)) throw new Error(`unsupported scope: ${item}`);
  }
  return [...new Set(scopes)].join(" ");
}

export function safePasswordEqual(input, expected) {
  const a = Buffer.from(String(input || ""));
  const b = Buffer.from(String(expected || ""));
  if (!a.length || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function validRedirectUri(uri) {
  try {
    const u = new URL(uri);
    return u.protocol === "https:" || (u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname));
  } catch {
    return false;
  }
}

export async function registerClient(pool, body = {}) {
  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.map(String) : [];
  if (!redirectUris.length || redirectUris.some((u) => !validRedirectUri(u))) {
    throw new Error("valid redirect_uris are required");
  }
  if (body.token_endpoint_auth_method && body.token_endpoint_auth_method !== "none") {
    throw new Error("only public PKCE clients are supported");
  }

  const clientId = "utcos_" + randomToken(24);
  const clientName = String(body.client_name || "ChatGPT MCP client").slice(0, 160);
  await pool.query(
    `INSERT INTO oauth_clients(client_id,client_name,redirect_uris)
     VALUES($1,$2,$3::jsonb)`,
    [clientId, clientName, JSON.stringify(redirectUris)]
  );

  return {
    client_id: clientId,
    client_name: clientName,
    redirect_uris: redirectUris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"]
  };
}

export async function validateAuthorizationRequest(pool, params, base) {
  if (params.response_type !== "code") throw new Error("response_type must be code");
  if (!params.client_id) throw new Error("client_id is required");
  if (!params.redirect_uri) throw new Error("redirect_uri is required");
  if (!params.code_challenge) throw new Error("code_challenge is required");
  if (params.code_challenge_method !== "S256") throw new Error("code_challenge_method must be S256");

  const client = await pool.query("SELECT * FROM oauth_clients WHERE client_id=$1", [params.client_id]);
  if (!client.rowCount) throw new Error("unknown client_id");
  const redirects = client.rows[0].redirect_uris || [];
  if (!Array.isArray(redirects) || !redirects.includes(params.redirect_uri)) {
    throw new Error("redirect_uri is not registered");
  }

  const resource = String(params.resource || base).replace(/\/+$/, "");
  if (resource !== base) throw new Error("resource does not match this Agent Core");

  return {
    clientId: params.client_id,
    redirectUri: params.redirect_uri,
    codeChallenge: params.code_challenge,
    scope: normalizeScopes(params.scope),
    resource,
    state: params.state ? String(params.state) : ""
  };
}

export async function issueAuthorizationCode(pool, request) {
  const code = randomToken(32);
  await pool.query(
    `INSERT INTO oauth_codes(code_hash,client_id,redirect_uri,code_challenge,scope,resource,expires_at)
     VALUES($1,$2,$3,$4,$5,$6,now()+($7 || ' seconds')::interval)`,
    [
      sha256Hex(code),
      request.clientId,
      request.redirectUri,
      request.codeChallenge,
      request.scope,
      request.resource,
      String(CODE_TTL_SECONDS)
    ]
  );
  return code;
}

async function issueTokenPair(pool, clientId, scope, resource, familyId = null) {
  const accessToken = randomToken(32);
  const refreshToken = randomToken(40);
  const family = familyId || crypto.randomUUID();

  await pool.query(
    `INSERT INTO oauth_tokens(token_hash,token_type,client_id,scope,resource,expires_at,family_id)
     VALUES
       ($1,'access',$3,$4,$5,now()+($6 || ' seconds')::interval,$7),
       ($2,'refresh',$3,$4,$5,now()+($8 || ' seconds')::interval,$7)`,
    [
      sha256Hex(accessToken),
      sha256Hex(refreshToken),
      clientId,
      scope,
      resource,
      String(ACCESS_TTL_SECONDS),
      family,
      String(REFRESH_TTL_SECONDS)
    ]
  );

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TTL_SECONDS,
    refresh_token: refreshToken,
    scope
  };
}

export async function exchangeAuthorizationCode(pool, body, base) {
  const code = String(body.code || "");
  const clientId = String(body.client_id || "");
  const redirectUri = String(body.redirect_uri || "");
  const verifier = String(body.code_verifier || "");
  if (!code || !clientId || !redirectUri || !verifier) throw new Error("missing authorization_code fields");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const q = await client.query(
      `SELECT * FROM oauth_codes
       WHERE code_hash=$1 AND used=false AND expires_at>now()
       FOR UPDATE`,
      [sha256Hex(code)]
    );
    if (!q.rowCount) throw new Error("authorization code is invalid or expired");
    const row = q.rows[0];
    if (row.client_id !== clientId) throw new Error("client_id mismatch");
    if (row.redirect_uri !== redirectUri) throw new Error("redirect_uri mismatch");
    if (row.resource !== base) throw new Error("resource mismatch");
    if (base64urlSha256(verifier) !== row.code_challenge) throw new Error("PKCE verification failed");

    await client.query("UPDATE oauth_codes SET used=true WHERE code_hash=$1", [sha256Hex(code)]);
    const tokens = await issueTokenPair(client, row.client_id, row.scope, row.resource);
    await client.query("COMMIT");
    return tokens;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function refreshAccessToken(pool, body, base) {
  const refresh = String(body.refresh_token || "");
  const clientId = String(body.client_id || "");
  if (!refresh || !clientId) throw new Error("refresh_token and client_id are required");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const q = await client.query(
      `SELECT * FROM oauth_tokens
       WHERE token_hash=$1 AND token_type='refresh' AND revoked=false AND expires_at>now()
       FOR UPDATE`,
      [sha256Hex(refresh)]
    );
    if (!q.rowCount) throw new Error("refresh token is invalid or expired");
    const row = q.rows[0];
    if (row.client_id !== clientId) throw new Error("client_id mismatch");
    if (row.resource !== base) throw new Error("resource mismatch");

    await client.query("UPDATE oauth_tokens SET revoked=true WHERE token_hash=$1", [sha256Hex(refresh)]);
    const tokens = await issueTokenPair(client, row.client_id, row.scope, row.resource, row.family_id);
    await client.query("COMMIT");
    return tokens;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function verifyOauthAccess(pool, token, requiredScope = "mcp:read") {
  if (!pool || !token) return false;
  const q = await pool.query(
    `SELECT scope FROM oauth_tokens
     WHERE token_hash=$1 AND token_type='access' AND revoked=false AND expires_at>now()
     LIMIT 1`,
    [sha256Hex(token)]
  );
  if (!q.rowCount) return false;
  return String(q.rows[0].scope).split(/\s+/).includes(requiredScope);
}

export function authorizationServerMetadata(base) {
  return {
    issuer: base,
    authorization_endpoint: base + "/oauth/authorize",
    token_endpoint: base + "/oauth/token",
    registration_endpoint: base + "/oauth/register",
    scopes_supported: ["mcp:read", "mcp:write"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"]
  };
}

export function protectedResourceMetadata(base) {
  return {
    resource: base,
    authorization_servers: [base],
    scopes_supported: ["mcp:read", "mcp:write"],
    resource_documentation: base + "/oauth/about"
  };
}
