import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

let pool = null;

export function getNeonPool() {
  if (pool) return pool;
  pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  pool.on('error', (err) => {
    console.error('Neon DB pool error:', err);
  });
  return pool;
}

// ── Initialize Neon DB Tables ──
export async function initNeonDb() {
  const db = getNeonPool();

  try {
    // Users table (replaces Supabase auth.users)
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // User preferences table (replaces Supabase public.user_preferences)
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        theme TEXT DEFAULT 'dark',
        notifications_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Add new columns if they don't exist
    await db.query(`
      ALTER TABLE user_preferences
      ADD COLUMN IF NOT EXISTS memberships JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS bank_cards JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS wishlist_urls JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS dietary_preference TEXT DEFAULT 'any';
    `);

    console.log('✅ Neon DB tables initialized successfully');
  } catch (err) {
    console.error('❌ Neon DB initialization failed:', err.message);
    throw err;
  }
}

// ── User Auth Functions ──

export async function createUser(email, password, fullName = '') {
  const db = getNeonPool();
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  try {
    const result = await db.query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, created_at`,
      [email.toLowerCase().trim(), passwordHash, fullName.trim()]
    );

    const user = result.rows[0];

    // Auto-create default preferences row
    await db.query(
      `INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [user.id]
    );

    return user;
  } catch (err) {
    if (err.code === '23505') {
      // Unique constraint violation — email already exists
      throw new Error('An account with this email already exists');
    }
    throw err;
  }
}

export async function authenticateUser(email, password) {
  const db = getNeonPool();

  const result = await db.query(
    `SELECT id, email, password_hash, full_name, created_at FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );

  if (result.rows.length === 0) {
    throw new Error('No account found with this email');
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    throw new Error('Incorrect password');
  }

  // Return user without password_hash
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    created_at: user.created_at,
  };
}

export async function findUserById(userId) {
  const db = getNeonPool();
  const result = await db.query(
    `SELECT id, email, full_name, created_at FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

// ── Profile Functions ──

export async function getNeonUserProfile(userId) {
  const db = getNeonPool();
  const result = await db.query(
    `SELECT u.id, u.email, u.full_name, u.created_at,
            p.theme, p.notifications_enabled,
            p.memberships, p.bank_cards, p.wishlist_urls, p.dietary_preference
     FROM users u
     LEFT JOIN user_preferences p ON p.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    ...row,
    bankCards: row.bank_cards || [],
    wishlistUrls: row.wishlist_urls || {},
    dietaryPreference: row.dietary_preference || 'any'
  };
}

export async function updateNeonUserProfile(userId, updates) {
  const db = getNeonPool();

  // Update users table if full_name is provided
  if (updates.full_name !== undefined) {
    await db.query(
      `UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2`,
      [updates.full_name, userId]
    );
  }

  // Update preferences if any preference fields are provided
  if (
    updates.theme !== undefined || 
    updates.notifications_enabled !== undefined ||
    updates.memberships !== undefined ||
    updates.bankCards !== undefined ||
    updates.wishlistUrls !== undefined ||
    updates.dietaryPreference !== undefined
  ) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (updates.theme !== undefined) {
      fields.push(`theme = $${idx++}`);
      values.push(updates.theme);
    }
    if (updates.notifications_enabled !== undefined) {
      fields.push(`notifications_enabled = $${idx++}`);
      values.push(updates.notifications_enabled);
    }
    if (updates.memberships !== undefined) {
      fields.push(`memberships = $${idx++}`);
      values.push(JSON.stringify(updates.memberships));
    }
    if (updates.bankCards !== undefined) {
      fields.push(`bank_cards = $${idx++}`);
      values.push(JSON.stringify(updates.bankCards));
    }
    if (updates.wishlistUrls !== undefined) {
      fields.push(`wishlist_urls = $${idx++}`);
      values.push(JSON.stringify(updates.wishlistUrls));
    }
    if (updates.dietaryPreference !== undefined) {
      fields.push(`dietary_preference = $${idx++}`);
      values.push(updates.dietaryPreference);
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    await db.query(
      `UPDATE user_preferences SET ${fields.join(', ')} WHERE user_id = $${idx}`,
      values
    );
  }

  return getNeonUserProfile(userId);
}
