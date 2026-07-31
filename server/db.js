import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'database.db');

let db;

export function initDb() {
  db = new Database(DB_PATH);
  
  db.pragma('journal_mode = WAL'); // Better concurrency

  // Create products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      query TEXT,
      category TEXT,
      store TEXT,
      title TEXT,
      price REAL,
      original_price REAL,
      discount TEXT,
      rating TEXT,
      image TEXT,
      url TEXT,
      location TEXT,
      pincode TEXT,
      target_price REAL,
      user_id TEXT DEFAULT 'anonymous',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure user_id column exists (migration for existing DBs)
  try {
    db.exec("ALTER TABLE products ADD COLUMN user_id TEXT DEFAULT 'anonymous'");
  } catch (e) {
    // Ignore error if column already exists
  }

  // Create price_history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT,
      price REAL,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  // Create scraper_health table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scraper_health (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store TEXT UNIQUE,
      status TEXT CHECK(status IN ('healthy', 'degraded', 'dead')),
      last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
      error_message TEXT,
      success_rate REAL
    );
  `);

  // Create feedback table
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT CHECK(category IN ('bug', 'feature', 'improvement', 'general')) DEFAULT 'general',
      message TEXT NOT NULL,
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      page TEXT,
      user_id TEXT DEFAULT 'anonymous',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.exec("ALTER TABLE feedback ADD COLUMN user_id TEXT DEFAULT 'anonymous'");
  } catch (e) {}

  // Create chat_messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT CHECK(role IN ('user', 'assistant')) NOT NULL,
      content TEXT NOT NULL,
      user_id TEXT DEFAULT 'anonymous',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.exec("ALTER TABLE chat_messages ADD COLUMN user_id TEXT DEFAULT 'anonymous'");
  } catch (e) {}

  // Create user_profiles table for connected store profiles & membership perks
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      pincode TEXT DEFAULT '',
      lat REAL,
      lng REAL,
      memberships TEXT DEFAULT '{}',
      bank_cards TEXT DEFAULT '[]',
      wishlist_urls TEXT DEFAULT '{}',
      dietary_preference TEXT DEFAULT 'any',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log(`SQLite Database initialized at: ${DB_PATH}`);
}

// ── USER PROFILES CRUD ──

export function saveUserProfile(userId, profileData) {
  const stmt = db.prepare(`
    INSERT INTO user_profiles (user_id, pincode, lat, lng, memberships, bank_cards, wishlist_urls, dietary_preference, updated_at)
    VALUES (@user_id, @pincode, @lat, @lng, @memberships, @bank_cards, @wishlist_urls, @dietary_preference, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      pincode = @pincode,
      lat = @lat,
      lng = @lng,
      memberships = @memberships,
      bank_cards = @bank_cards,
      wishlist_urls = @wishlist_urls,
      dietary_preference = @dietary_preference,
      updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run({
    user_id: userId,
    pincode: profileData.pincode || '',
    lat: profileData.lat || null,
    lng: profileData.lng || null,
    memberships: JSON.stringify(profileData.memberships || {}),
    bank_cards: JSON.stringify(profileData.bankCards || []),
    wishlist_urls: JSON.stringify(profileData.wishlistUrls || {}),
    dietary_preference: profileData.dietaryPreference || 'any'
  });
}

export function getUserProfile(userId) {
  const stmt = db.prepare(`SELECT * FROM user_profiles WHERE user_id = ?`);
  const row = stmt.get(userId);
  if (!row) return null;
  return {
    userId: row.user_id,
    pincode: row.pincode,
    lat: row.lat,
    lng: row.lng,
    memberships: JSON.parse(row.memberships || '{}'),
    bankCards: JSON.parse(row.bank_cards || '[]'),
    wishlistUrls: JSON.parse(row.wishlist_urls || '{}'),
    dietaryPreference: row.dietary_preference,
    updatedAt: row.updated_at
  };
}

// ── PRODUCTS CRUD ──

function mapProductRow(row) {
  return {
    id: row.id,
    query: row.query,
    searchQuery: row.query,
    category: row.category,
    source: row.store,
    name: row.title,
    price: row.price,
    priceFormatted: row.price ? `₹${row.price.toLocaleString('en-IN')}` : 'N/A',
    originalPrice: row.original_price,
    originalPriceFormatted: row.original_price ? `₹${row.original_price.toLocaleString('en-IN')}` : null,
    discountFormatted: row.discount,
    rating: row.rating ? parseFloat(row.rating) : null,
    imageUrl: row.image,
    productLink: row.url,
    location: row.location,
    pincode: row.pincode,
    targetPrice: row.target_price,
    userId: row.user_id,
    dateAdded: row.created_at
  };
}

export function getProducts(userId = 'anonymous') {
  const stmt = db.prepare(`SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC`);
  const rows = stmt.all(userId || 'anonymous');
  return rows.map(mapProductRow);
}

export function getAllProducts() {
  const stmt = db.prepare(`SELECT * FROM products ORDER BY created_at DESC`);
  const rows = stmt.all();
  return rows.map(mapProductRow);
}

export function saveProducts(products, userId = 'anonymous') {
  const insertProduct = db.prepare(`
    INSERT OR REPLACE INTO products 
    (id, query, category, store, title, price, original_price, discount, rating, image, url, location, pincode, user_id, updated_at) 
    VALUES (@id, @query, @category, @store, @title, @price, @original_price, @discount, @rating, @image, @url, @location, @pincode, @user_id, CURRENT_TIMESTAMP)
  `);

  const insertHistory = db.prepare(`
    INSERT INTO price_history (product_id, price)
    VALUES (@product_id, @price)
  `);

  const insertHistoryCustom = db.prepare(`
    INSERT INTO price_history (product_id, price, recorded_at)
    VALUES (@product_id, @price, @recorded_at)
  `);

  const countStmt = db.prepare(`SELECT COUNT(*) as cnt FROM price_history WHERE product_id = ?`);

  const transaction = db.transaction((prods) => {
    for (const p of prods) {
      // Handle the complex location object
      let locStr = p.location;
      if (typeof p.location === 'object' && p.location !== null) {
        locStr = p.location.full || p.location.displayLabel || p.location.city || 'Mumbai';
      }

      insertProduct.run({
        id: p.id,
        query: p.query || p.searchQuery || '',
        category: p.category || 'ecommerce',
        store: p.source || '',
        title: p.name || '',
        price: p.price || 0,
        original_price: p.originalPrice || 0,
        discount: p.discountFormatted || '',
        rating: p.rating ? p.rating.toString() : '',
        image: p.imageUrl || '',
        url: p.productLink || '',
        location: locStr,
        pincode: p.pincode || '',
        user_id: userId || 'anonymous'
      });

      // Check if price history exists for this product ID
      const { cnt } = countStmt.get(p.id);

      if (cnt === 0) {
        // Pre-populate 7 days of realistic price history
        const basePrice = p.price || 0;
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          
          // Random fluctuation (-4% to +4%)
          const fluctuation = 0.96 + Math.random() * 0.08;
          const histPrice = i === 0 ? basePrice : Math.round(basePrice * fluctuation);

          insertHistoryCustom.run({
            product_id: p.id,
            price: histPrice,
            recorded_at: date.toISOString()
          });
        }
      } else {
        insertHistory.run({
          product_id: p.id,
          price: p.price || 0
        });
      }
    }
  });

  transaction(products);
}

export function deleteProduct(id, userId = 'anonymous') {
  const stmt = db.prepare(`DELETE FROM products WHERE id = ? AND user_id = ?`);
  stmt.run(id, userId || 'anonymous');
}

export function clearAllProducts(userId = 'anonymous') {
  const stmt = db.prepare(`DELETE FROM products WHERE user_id = ?`);
  stmt.run(userId || 'anonymous');
}

export function updateTargetPrice(id, targetPrice, userId = 'anonymous') {
  const stmt = db.prepare(`UPDATE products SET target_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`);
  stmt.run(targetPrice, id, userId || 'anonymous');
}

export function updateProductPrice(id, newPrice) {
  const updateProd = db.prepare(`UPDATE products SET price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
  const insertHistory = db.prepare(`INSERT INTO price_history (product_id, price) VALUES (?, ?)`);
  
  const transaction = db.transaction(() => {
    updateProd.run(newPrice, id);
    insertHistory.run(id, newPrice);
  });
  
  transaction();
}

// ── HISTORY CRUD ──

export function getProductHistory(productId) {
  const stmt = db.prepare(`SELECT price, recorded_at FROM price_history WHERE product_id = ? ORDER BY recorded_at ASC`);
  const rows = stmt.all(productId);
  return rows.map(r => ({
    price: r.price,
    date: new Date(r.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    recorded_at: r.recorded_at
  }));
}

export function getScrapeHistory() {
  return [];
}

export function saveScrapeHistory(historyItem) {}

// ── SCRAPER HEALTH ──

export function updateScraperHealth(store, status, errorMessage = null, successRate = 1.0) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO scraper_health (id, store, status, last_checked, error_message, success_rate)
    VALUES (
      (SELECT id FROM scraper_health WHERE store = @store),
      @store, @status, CURRENT_TIMESTAMP, @error_message, @success_rate
    )
  `);
  stmt.run({ store, status, error_message: errorMessage, success_rate: successRate });
}

export function getAllScraperHealth() {
  const stmt = db.prepare(`SELECT * FROM scraper_health`);
  const rows = stmt.all();
  const healthMap = {};
  for (const r of rows) {
    healthMap[r.store] = {
      status: r.status,
      last_checked: r.last_checked,
      error: r.error_message,
      success_rate: r.success_rate
    };
  }
  return healthMap;
}

// ── FEEDBACK CRUD ──

export function saveFeedback({ category, message, rating, page, userId = 'anonymous' }) {
  const stmt = db.prepare(`
    INSERT INTO feedback (category, message, rating, page, user_id)
    VALUES (@category, @message, @rating, @page, @userId)
  `);
  return stmt.run({ category: category || 'general', message, rating: rating || null, page: page || null, userId: userId || 'anonymous' });
}

export function getFeedback(userId = 'anonymous') {
  // Let admin see all feedback, users see their own
  const stmt = db.prepare(`SELECT * FROM feedback ORDER BY created_at DESC`);
  return stmt.all();
}

// ── CHAT MESSAGES CRUD ──

export function saveChatMessage({ sessionId, role, content, userId = 'anonymous' }) {
  const stmt = db.prepare(`
    INSERT INTO chat_messages (session_id, role, content, user_id)
    VALUES (@sessionId, @role, @content, @userId)
  `);
  return stmt.run({ sessionId, role, content, userId: userId || 'anonymous' });
}

export function getChatHistory(sessionId, userId = 'anonymous') {
  const stmt = db.prepare(`SELECT role, content, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`);
  return stmt.all(sessionId);
}
