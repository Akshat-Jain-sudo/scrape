import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const ALGORITHM = 'aes-256-gcm';
function getKey() {
  const secret = process.env.SYMBIOTE_SECRET || 'symbiote-default-key-change-in-prod-32c';
  return crypto.createHash('sha256').update(secret).digest();
}

function decrypt(obj) {
  const key = getKey();
  const iv = Buffer.from(obj.iv, 'hex');
  const authTag = Buffer.from(obj.authTag, 'hex');
  const encrypted = Buffer.from(obj.data, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '../server/automator/creds.encrypted.json'), 'utf8'));

for (const [userId, platforms] of Object.entries(raw)) {
  console.log(`User: ${userId}`);
  for (const [platform, cred] of Object.entries(platforms)) {
    console.log(`  Platform: ${platform}, Username: ${cred.username}`);
    try {
      const dec = decrypt(cred.password);
      console.log(`  Decrypted successfully (len: ${dec.length})`);
    } catch (err) {
      console.log(`  Failed to decrypt: ${err.message}`);
    }
  }
}
