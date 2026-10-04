import fs from "node:fs/promises";
import crypto from "node:crypto";

const file = process.argv[2] || process.env.UTCOS_BACKUP_PATH;
if (!file) {
  console.error("Backup file path is required");
  process.exit(1);
}
if (!process.env.UTCOS_BACKUP_KEY || process.env.UTCOS_BACKUP_KEY.length < 24) {
  console.error("UTCOS_BACKUP_KEY (24+ chars) is required");
  process.exit(1);
}

const envelope = JSON.parse(await fs.readFile(file, "utf8"));
if (envelope.format !== "utcos-backup-envelope" || envelope.version !== 1) {
  throw new Error("Unsupported backup envelope");
}

const salt = Buffer.from(envelope.salt, "base64");
const iv = Buffer.from(envelope.iv, "base64");
const tag = Buffer.from(envelope.tag, "base64");
const ciphertext = Buffer.from(envelope.ciphertext, "base64");
const key = crypto.scryptSync(process.env.UTCOS_BACKUP_KEY, salt, 32);
const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
decipher.setAuthTag(tag);
const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
const payload = JSON.parse(plaintext.toString("utf8"));

const counts = Object.fromEntries(
  Object.entries(payload.tables || {}).map(([name, rows]) => [name, Array.isArray(rows) ? rows.length : 0])
);

console.log(JSON.stringify({
  valid: true,
  format: payload.format,
  version: payload.version,
  createdAt: payload.createdAt,
  counts
}, null, 2));
