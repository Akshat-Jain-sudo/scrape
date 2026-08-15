import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { getNeonPool } from '../neonDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDS_FILE = path.join(__dirname, 'creds.encrypted.json');
const ALGORITHM = 'aes-256-gcm';
const SUPPORTED_PLATFORMS = new Set(['amazon', 'flipkart']);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

function getKey() {
  const secret = process.env.SYMBIOTE_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: SYMBIOTE_SECRET environment variable is required in production.');
    }
  }
  const effectiveSecret = secret || 'symbiote-default-key-change-in-prod-32c';
  // Derive a 32-byte key from the secret via SHA-256
  return crypto.createHash('sha256').update(effectiveSecret).digest();
}

/**
 * Encrypt plaintext using AES-256-GCM with a fresh random 12-byte IV.
 */
export function encrypt(plaintext) {
  if (typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a string');
  }
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

/**
 * Decrypt an AES-256-GCM payload object { iv, authTag, data }.
 */
export function decrypt(obj) {
  if (!obj || !obj.iv || !obj.authTag || !obj.data) {
    throw new Error('Invalid encrypted payload structure');
  }
  const key = getKey();
  const iv = Buffer.from(obj.iv, 'hex');
  const authTag = Buffer.from(obj.authTag, 'hex');
  const encrypted = Buffer.from(obj.data, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Save encrypted credentials for a platform for a specific user into Neon PostgreSQL.
 * Atomic UPSERT prevents duplicate rows and race conditions.
 */
export async function saveCredentials(userId, platform, username, password) {
  if (!isValidUuid(userId)) {
    throw new Error('Valid authenticated user ID is required');
  }

  const normalizedPlatform = (platform || '').toLowerCase().trim();
  if (!SUPPORTED_PLATFORMS.has(normalizedPlatform)) {
    throw new Error(`Unsupported retailer platform: ${platform}. Supported: ${Array.from(SUPPORTED_PLATFORMS).join(', ')}`);
  }

  const trimmedUsername = (username || '').trim();
  if (!trimmedUsername) {
    throw new Error('Username is required');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    throw new Error('Password is required');
  }

  const encryptedPassword = encrypt(password);
  const db = getNeonPool();

  const query = `
    INSERT INTO retailer_credentials (user_id, platform, username, encrypted_password, updated_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (user_id, platform)
    DO UPDATE SET
      username = EXCLUDED.username,
      encrypted_password = EXCLUDED.encrypted_password,
      updated_at = NOW()
    RETURNING id, platform, username, created_at, updated_at;
  `;

  const result = await db.query(query, [
    userId,
    normalizedPlatform,
    trimmedUsername,
    JSON.stringify(encryptedPassword)
  ]);

  return {
    success: true,
    platform: result.rows[0].platform,
    username: result.rows[0].username,
    savedAt: result.rows[0].updated_at
  };
}

/**
 * List platforms for which a user has saved credentials.
 * Returns only non-sensitive metadata (NEVER passwords, encrypted blobs, IVs, or authTags).
 */
export async function listCredentials(userId) {
  if (!isValidUuid(userId)) {
    return [];
  }

  const db = getNeonPool();
  const query = `
    SELECT platform, username, created_at, updated_at
    FROM retailer_credentials
    WHERE user_id = $1
    ORDER BY platform ASC;
  `;

  const result = await db.query(query, [userId]);

  return result.rows.map(row => ({
    platform: row.platform,
    username: row.username,
    savedAt: row.updated_at || row.created_at,
    created_at: row.created_at,
    updated_at: row.updated_at
  }));
}

/**
 * Retrieve decrypted credentials for a specific platform.
 * Plaintext password exists only in server memory for immediate automation usage.
 */
export async function getCredentials(userId, platform) {
  if (!isValidUuid(userId)) {
    return null;
  }

  const normalizedPlatform = (platform || '').toLowerCase().trim();
  const db = getNeonPool();

  const query = `
    SELECT username, encrypted_password
    FROM retailer_credentials
    WHERE user_id = $1 AND platform = $2;
  `;

  const result = await db.query(query, [userId, normalizedPlatform]);
  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  try {
    const payload = typeof row.encrypted_password === 'string'
      ? JSON.parse(row.encrypted_password)
      : row.encrypted_password;

    const decryptedPassword = decrypt(payload);
    return {
      username: row.username,
      password: decryptedPassword
    };
  } catch (err) {
    console.error(`[CredentialStore] Decryption failed for user ${userId} platform ${normalizedPlatform}`);
    return null;
  }
}

/**
 * Delete credentials for a platform strictly scoped to the authenticated user.
 */
export async function deleteCredentials(userId, platform) {
  if (!isValidUuid(userId)) {
    return false;
  }

  const normalizedPlatform = (platform || '').toLowerCase().trim();
  const db = getNeonPool();

  const query = `
    DELETE FROM retailer_credentials
    WHERE user_id = $1 AND platform = $2;
  `;

  const result = await db.query(query, [userId, normalizedPlatform]);
  return (result.rowCount || 0) > 0;
}

/**
 * Idempotent migration from legacy creds.encrypted.json into Neon PostgreSQL.
 * Verifies user existence, payload integrity, and decrypts/re-encrypts safely.
 * The legacy JSON file is NOT deleted.
 */
export async function migrateJsonCredentials(customPool = null) {
  if (!fs.existsSync(CREDS_FILE)) {
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  let store;
  try {
    const raw = fs.readFileSync(CREDS_FILE, 'utf8');
    store = JSON.parse(raw);
  } catch (err) {
    console.error('[CredentialStore] Failed to read or parse legacy creds.encrypted.json:', err.message);
    return { migrated: 0, skipped: 0, errors: 1 };
  }

  const db = customPool || getNeonPool();
  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const [userId, platforms] of Object.entries(store)) {
    if (!isValidUuid(userId)) {
      skipped++;
      continue;
    }

    // Verify user exists in Neon users table
    try {
      const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        skipped++;
        continue;
      }
    } catch (err) {
      console.error(`[CredentialStore] User lookup error for ${userId} during migration:`, err.message);
      errors++;
      continue;
    }

    if (!platforms || typeof platforms !== 'object') {
      skipped++;
      continue;
    }

    for (const [platform, credData] of Object.entries(platforms)) {
      const normalizedPlatform = platform.toLowerCase().trim();
      if (!SUPPORTED_PLATFORMS.has(normalizedPlatform)) {
        skipped++;
        continue;
      }

      if (!credData || !credData.username || !credData.password) {
        skipped++;
        continue;
      }

      try {
        // Verify and decrypt legacy payload
        const decryptedPassword = decrypt(credData.password);
        // Re-encrypt with fresh IV
        const freshEncrypted = encrypt(decryptedPassword);

        const insertQuery = `
          INSERT INTO retailer_credentials (user_id, platform, username, encrypted_password, created_at, updated_at)
          VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, NOW()), NOW())
          ON CONFLICT (user_id, platform) DO NOTHING;
        `;

        const insertRes = await db.query(insertQuery, [
          userId,
          normalizedPlatform,
          credData.username.trim(),
          JSON.stringify(freshEncrypted),
          credData.savedAt || null
        ]);

        if ((insertRes.rowCount || 0) > 0) {
          migrated++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`[CredentialStore] Migration decryption/insert failed for user ${userId} platform ${normalizedPlatform}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`[CredentialStore] Legacy JSON migration completed: ${migrated} migrated, ${skipped} skipped, ${errors} errors.`);
  return { migrated, skipped, errors };
}
