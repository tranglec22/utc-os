export function vaultConfigured(env = process.env) {
  return Boolean(env.UTCOS_VAULT_KEY && String(env.UTCOS_VAULT_KEY).length >= 24);
}

export function cleanVaultInput(input = {}) {
  const title = String(input.title || "").trim();
  const plaintext = String(input.plaintext || "");
  const workspace = String(input.workspace || "All work").trim() || "All work";
  const source = String(input.source || "manual").trim() || "manual";
  const createdBy = String(input.createdBy || "user").trim() || "user";
  if (!title) throw new Error("title is required");
  if (!plaintext) throw new Error("plaintext is required");
  if (title.length > 180) throw new Error("title is too long");
  if (plaintext.length > 100000) throw new Error("vault item is too large");
  return { title, plaintext, workspace, source, createdBy };
}

export async function storeVaultEntry(client, key, input) {
  const v = cleanVaultInput(input);
  const q = await client.query(
    `INSERT INTO vault_entries(title, secret_ciphertext, workspace, source, created_by)
     VALUES($1, pgp_sym_encrypt($2,$3,'cipher-algo=aes256'), $4, $5, $6)
     RETURNING id,title,workspace,source,created_by,created_at,updated_at`,
    [v.title, v.plaintext, key, v.workspace, v.source, v.createdBy]
  );
  return q.rows[0];
}

export async function readVaultEntry(client, key, id) {
  const q = await client.query(
    `SELECT id,title,workspace,source,created_by,created_at,updated_at,
            pgp_sym_decrypt(secret_ciphertext,$2)::text AS plaintext
     FROM vault_entries WHERE id=$1 AND deleted_at IS NULL`,
    [id, key]
  );
  return q.rows[0] || null;
}
