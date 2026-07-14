import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDS_FILE = path.join(__dirname, 'creds.encrypted.json');
const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const secret = process.env.SYMBIOTE_SECRET || 'symbiote-default-key-change-in-prod-32c';
  // Derive a 32-byte key from the secret
  return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    data: encrypted.toString('hex')
  };
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

function loadStore() {
  if (!fs.existsSync(CREDS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveStore(store) {
  fs.writeFileSync(CREDS_FILE, JSON.stringify(store, null, 2), 'utf8');
}

/**
 * Save encrypted credentials for a platform for a specific user.
 */
export function saveCredentials(userId, platform, username, password) {
  const store = loadStore();
  if (!store[userId]) store[userId] = {};
  store[userId][platform] = {
    username,
    password: encrypt(password),
    savedAt: new Date().toISOString()
  };
  saveStore(store);
}

/**
 * List platforms for which a user has saved credentials.
 * NEVER returns the actual password.
 */
export function listCredentials(userId) {
  const store = loadStore();
  const userCreds = store[userId] || {};
  return Object.entries(userCreds).map(([platform, data]) => ({
    platform,
    username: data.username,
    savedAt: data.savedAt
  }));
}

/**
 * Retrieve decrypted credentials for a specific platform.
 */
export function getCredentials(userId, platform) {
  const store = loadStore();
  const userCreds = store[userId] || {};
  const entry = userCreds[platform];
  if (!entry) return null;
  try {
    return {
      username: entry.username,
      password: decrypt(entry.password)
    };
  } catch {
    return null;
  }
}

/**
 * Delete credentials for a platform.
 */
export function deleteCredentials(userId, platform) {
  const store = loadStore();
  if (store[userId] && store[userId][platform]) {
    delete store[userId][platform];
    saveStore(store);
    return true;
  }
  return false;
}
