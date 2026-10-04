import fs from "node:fs/promises";
import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
if (!process.env.UTCOS_BACKUP_KEY || process.env.UTCOS_BACKUP_KEY.length < 24) {
  console.error("UTCOS_BACKUP_KEY (24+ chars) is required");
  process.exit(1);
}

const output = process.env.UTCOS_BACKUP_PATH || `utcos-second-brain-${new Date().toISOString().replace(/[:.]/g, "-")}.backup.enc.json`;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false }
});

const tables = ["memories", "memory_versions", "ingestion_inbox", "agent_events", "vault_entries"];

try {
  const payload = {
    format: "utcos-second-brain-encrypted-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    tables: {}
  };

  for (const table of tables) {
    const q = await pool.query(`SELECT * FROM ${table}`);
    payload.tables[table] = q.rows;
  }

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(process.env.UTCOS_BACKUP_KEY, salt, 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  const envelope = {
    format: "utcos-backup-envelope",
    version: 1,
    algorithm: "aes-256-gcm+scrypt",
    createdAt: payload.createdAt,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };

  await fs.writeFile(output, JSON.stringify(envelope));
  console.log(output);
} finally {
  await pool.end();
}
