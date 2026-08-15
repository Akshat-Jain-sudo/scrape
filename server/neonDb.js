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
      ADD COLUMN IF NOT EXISTS dietary_preference TEXT DEFAULT 'any',
      ADD COLUMN IF NOT EXISTS pincode VARCHAR(20) DEFAULT '',
      ADD COLUMN IF NOT EXISTS lat NUMERIC(9, 6),
      ADD COLUMN IF NOT EXISTS lng NUMERIC(9, 6);
    `);

    // Products table (with UUID db_id as primary key and scraped id as regular text)
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        db_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id TEXT NOT NULL,
        query VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'ecommerce',
        store VARCHAR(50) NOT NULL,
        title TEXT NOT NULL,
        price NUMERIC(12, 2) NOT NULL,
        original_price NUMERIC(12, 2),
        discount VARCHAR(100),
        rating NUMERIC(3, 2),
        image TEXT,
        url TEXT NOT NULL,
        location TEXT,
        pincode VARCHAR(20),
        target_price NUMERIC(12, 2),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        anonymous_session_id VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT chk_product_ownership CHECK (
          (user_id IS NOT NULL AND anonymous_session_id IS NULL) OR
          (user_id IS NULL AND anonymous_session_id IS NOT NULL)
        )
      );
    `);

    // Price history table (shared by scraped id using text)
    await db.query(`
      CREATE TABLE IF NOT EXISTS price_history (
        id BIGSERIAL PRIMARY KEY,
        product_id TEXT NOT NULL,
        price NUMERIC(12, 2) NOT NULL,
        recorded_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Scraper health table (global diagnostics)
    await db.query(`
      CREATE TABLE IF NOT EXISTS scraper_health (
        id SERIAL PRIMARY KEY,
        store VARCHAR(50) UNIQUE NOT NULL,
        status VARCHAR(20) CHECK (status IN ('healthy', 'degraded', 'dead')),
        last_checked TIMESTAMPTZ DEFAULT NOW(),
        error_message TEXT,
        success_rate NUMERIC(3, 2) DEFAULT 1.00
      );
    `);

    // Feedback table
    await db.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        category VARCHAR(20) DEFAULT 'general' CHECK (category IN ('bug', 'feature', 'improvement', 'general')),
        message TEXT NOT NULL,
        rating INTEGER CHECK (rating BETWEEN 1 AND 5),
        page VARCHAR(100),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        anonymous_session_id VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT chk_feedback_ownership CHECK (
          (user_id IS NOT NULL AND anonymous_session_id IS NULL) OR
          (user_id IS NULL AND anonymous_session_id IS NOT NULL)
        )
      );
    `);

    // Chat messages table
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(100) NOT NULL,
        role VARCHAR(20) CHECK (role IN ('user', 'assistant')) NOT NULL,
        content TEXT NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        anonymous_session_id VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT chk_chat_ownership CHECK (
          (user_id IS NOT NULL AND anonymous_session_id IS NULL) OR
          (user_id IS NULL AND anonymous_session_id IS NOT NULL)
        )
      );
    `);

    // Retailer credentials table for Order Relay
    await db.query(`
      CREATE TABLE IF NOT EXISTS retailer_credentials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        username TEXT NOT NULL,
        encrypted_password JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT uq_user_retailer_platform UNIQUE (user_id, platform)
      );
    `);

    // Create unique index and performance indexes
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_product_user ON products(id, user_id) WHERE user_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_product_anon ON products(id, anonymous_session_id) WHERE anonymous_session_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
      CREATE INDEX IF NOT EXISTS idx_products_anon ON products(anonymous_session_id);
      CREATE INDEX IF NOT EXISTS idx_price_history_parent ON price_history(product_id);
      CREATE INDEX IF NOT EXISTS idx_chat_auth ON chat_messages(session_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_anon ON chat_messages(session_id, anonymous_session_id);
      CREATE INDEX IF NOT EXISTS idx_retailer_credentials_user ON retailer_credentials(user_id);
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

export async function findUserById(userId) {
  if (!isValidUuid(userId)) return null;
  const db = getNeonPool();
  const result = await db.query(
    `SELECT id, email, full_name, created_at FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

// ── Profile Functions ──

export async function getNeonUserProfile(userId) {
  if (!isValidUuid(userId)) return null;
  const db = getNeonPool();
  const result = await db.query(
    `SELECT u.id, u.email, u.full_name, u.created_at,
            p.theme, p.notifications_enabled,
            p.memberships, p.bank_cards, p.wishlist_urls, p.dietary_preference,
            p.pincode, p.lat, p.lng
     FROM users u
     LEFT JOIN user_preferences p ON p.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    ...row,
    pincode: row.pincode || '',
    lat: row.lat ? parseFloat(row.lat) : null,
    lng: row.lng ? parseFloat(row.lng) : null,
    bankCards: row.bank_cards || [],
    wishlistUrls: row.wishlist_urls || {},
    dietaryPreference: row.dietary_preference || 'any'
  };
}

export async function updateNeonUserProfile(userId, updates) {
  if (!isValidUuid(userId)) throw new Error('Invalid user ID');
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
    updates.dietaryPreference !== undefined ||
    updates.pincode !== undefined ||
    updates.lat !== undefined ||
    updates.lng !== undefined
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
    if (updates.pincode !== undefined) {
      fields.push(`pincode = $${idx++}`);
      values.push(updates.pincode);
    }
    if (updates.lat !== undefined) {
      fields.push(`lat = $${idx++}`);
      values.push(updates.lat);
    }
    if (updates.lng !== undefined) {
      fields.push(`lng = $${idx++}`);
      values.push(updates.lng);
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
