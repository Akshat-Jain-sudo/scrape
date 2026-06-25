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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

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

  console.log(`SQLite Database initialized at: ${DB_PATH}`);
}

// ── PRODUCTS CRUD ──

export function getProducts() {
  const stmt = db.prepare(`SELECT * FROM products ORDER BY created_at DESC`);
  const rows = stmt.all();
  // Map SQLite row shape back to what frontend expects
  return rows.map(row => ({
    id: row.id,
    query: row.query,
    category: row.category,
    source: row.store,
    name: row.title,
    price: row.price,
    originalPrice: row.original_price,
    discountFormatted: row.discount,
    rating: row.rating ? parseFloat(row.rating) : null,
    imageUrl: row.image,
    productLink: row.url,
    location: row.location,
    pincode: row.pincode,
    targetPrice: row.target_price,
    dateAdded: row.created_at
  }));
}

export function saveProducts(products) {
  const insertProduct = db.prepare(`
    INSERT OR REPLACE INTO products 
    (id, query, category, store, title, price, original_price, discount, rating, image, url, location, pincode, updated_at) 
    VALUES (@id, @query, @category, @store, @title, @price, @original_price, @discount, @rating, @image, @url, @location, @pincode, CURRENT_TIMESTAMP)
  `);

  const insertHistory = db.prepare(`
    INSERT INTO price_history (product_id, price)
    VALUES (@product_id, @price)
  `);

  const transaction = db.transaction((prods) => {
    for (const p of prods) {
      // Handle the complex location object
      let locStr = p.location;
      if (typeof p.location === 'object' && p.location !== null) {
        locStr = p.location.full || p.location.displayLabel || p.location.city || 'Mumbai';
      }

      insertProduct.run({
        id: p.id,
        query: p.query || '',
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
        pincode: p.pincode || ''
      });

      insertHistory.run({
        product_id: p.id,
        price: p.price || 0
      });
    }
  });

  transaction(products);
}

export function deleteProduct(id) {
  const stmt = db.prepare(`DELETE FROM products WHERE id = ?`);
  stmt.run(id);
}

export function clearAllProducts() {
  db.exec(`DELETE FROM products`);
}

export function updateTargetPrice(id, targetPrice) {
  const stmt = db.prepare(`UPDATE products SET target_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
  stmt.run(targetPrice, id);
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
  const rows = stmt.all();
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
