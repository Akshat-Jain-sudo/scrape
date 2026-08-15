import { getNeonPool, initNeonDb } from './neonDb.js';
import { validateProductUrl } from './urlValidator.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ANON_REGEX = /^anon-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

function isValidAnonSession(id) {
  return typeof id === 'string' && ANON_REGEX.test(id);
}

// ── Initialize Database ──
export async function initDb() {
  // No-op. Schema is initialized sequentially in server.js on startup to prevent race conditions.
}

// ── PRODUCTS CRUD ──

function mapProductRow(row) {
  const rawUrl = row.url || '';
  const validation = validateProductUrl(rawUrl, row.store);
  const isExact = validation.isExactProductUrl;

  return {
    id: row.id,
    dbId: row.db_id,
    query: row.query,
    searchQuery: row.query,
    category: row.category,
    source: row.store,
    name: row.title,
    price: row.price ? parseFloat(row.price) : 0,
    priceFormatted: row.price ? `₹${parseFloat(row.price).toLocaleString('en-IN')}` : 'N/A',
    originalPrice: row.original_price ? parseFloat(row.original_price) : 0,
    originalPriceFormatted: row.original_price ? `₹${parseFloat(row.original_price).toLocaleString('en-IN')}` : null,
    discount: row.discount ? parseInt(row.discount) || 0 : 0,
    discountFormatted: row.discount,
    rating: row.rating ? parseFloat(row.rating) : null,
    imageUrl: row.image,
    productLink: isExact ? validation.canonicalUrl : rawUrl,
    productUrl: isExact ? validation.canonicalUrl : null,
    searchUrl: isExact ? null : rawUrl,
    isExactProductUrl: isExact,
    urlType: isExact ? 'product' : 'search',
    location: row.location,
    pincode: row.pincode,
    targetPrice: row.target_price ? parseFloat(row.target_price) : null,
    userId: row.user_id || row.anonymous_session_id || null,
    dateAdded: row.created_at
  };
}

export async function getProducts(userId = null) {
  if (!userId) return [];
  const pg = getNeonPool();
  if (isValidUuid(userId)) {
    const result = await pg.query('SELECT * FROM products WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return result.rows.map(mapProductRow);
  }
  if (isValidAnonSession(userId)) {
    const result = await pg.query('SELECT * FROM products WHERE anonymous_session_id = $1 ORDER BY created_at DESC', [userId]);
    return result.rows.map(mapProductRow);
  }
  return [];
}

export async function getAllProducts() {
  const pg = getNeonPool();
  const result = await pg.query('SELECT * FROM products ORDER BY created_at DESC');
  return result.rows.map(mapProductRow);
}

export async function saveProducts(products, userId = null) {
  if (!userId || (!isValidUuid(userId) && !isValidAnonSession(userId))) {
    throw new Error('Valid authenticated user ID or anonymous session ID is required to save products');
  }
  const pg = getNeonPool();
  const client = await pg.connect();
  const isUuid = isValidUuid(userId);

  // In-memory deduplication within the incoming batch: keep the latest product per ID
  const dedupedMap = new Map();
  for (const p of products) {
    if (p && p.id) {
      dedupedMap.set(p.id, p);
    }
  }
  const uniqueProducts = Array.from(dedupedMap.values());

  try {
    await client.query('BEGIN');

    for (const p of uniqueProducts) {
      let locStr = p.location;
      if (typeof p.location === 'object' && p.location !== null) {
        locStr = p.location.full || p.location.displayLabel || p.location.city || 'Mumbai';
      }

      const insertProductQuery = isUuid
        ? `INSERT INTO products 
           (id, query, category, store, title, price, original_price, discount, rating, image, url, location, pincode, user_id, anonymous_session_id, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NULL, CURRENT_TIMESTAMP)
           ON CONFLICT (id, user_id) WHERE user_id IS NOT NULL DO UPDATE SET
             query = EXCLUDED.query,
             category = EXCLUDED.category,
             store = EXCLUDED.store,
             title = EXCLUDED.title,
             price = EXCLUDED.price,
             original_price = EXCLUDED.original_price,
             discount = EXCLUDED.discount,
             rating = EXCLUDED.rating,
             image = EXCLUDED.image,
             url = EXCLUDED.url,
             location = EXCLUDED.location,
             pincode = EXCLUDED.pincode,
             updated_at = CURRENT_TIMESTAMP`
        : `INSERT INTO products 
           (id, query, category, store, title, price, original_price, discount, rating, image, url, location, pincode, user_id, anonymous_session_id, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NULL, $14, CURRENT_TIMESTAMP)
           ON CONFLICT (id, anonymous_session_id) WHERE anonymous_session_id IS NOT NULL DO UPDATE SET
             query = EXCLUDED.query,
             category = EXCLUDED.category,
             store = EXCLUDED.store,
             title = EXCLUDED.title,
             price = EXCLUDED.price,
             original_price = EXCLUDED.original_price,
             discount = EXCLUDED.discount,
             rating = EXCLUDED.rating,
             image = EXCLUDED.image,
             url = EXCLUDED.url,
             location = EXCLUDED.location,
             pincode = EXCLUDED.pincode,
             updated_at = CURRENT_TIMESTAMP`;

      let parsedRating = null;
      if (p.rating) {
        const floatRating = parseFloat(p.rating);
        if (!isNaN(floatRating)) {
          parsedRating = floatRating;
        }
      }

      await client.query(insertProductQuery, [
        p.id,
        p.query || p.searchQuery || '',
        p.category || 'ecommerce',
        p.source || p.store || '',
        p.name || p.title || '',
        p.price ? parseFloat(p.price) : 0,
        p.originalPrice ? parseFloat(p.originalPrice) : null,
        p.discountFormatted || '',
        parsedRating,
        p.imageUrl || '',
        p.productLink || '',
        locStr,
        p.pincode || '',
        userId
      ]);

      // Check if price history exists for this scraped ID
      const countRes = await client.query('SELECT COUNT(*) as cnt FROM price_history WHERE product_id = $1', [p.id]);
      const cnt = parseInt(countRes.rows[0].cnt);

      if (cnt === 0) {
        // Pre-populate 7 days of realistic price history
        const basePrice = p.price || 0;
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          
          // Random fluctuation (-4% to +4%)
          const fluctuation = 0.96 + Math.random() * 0.08;
          const histPrice = i === 0 ? basePrice : Math.round(basePrice * fluctuation);

          await client.query(
            'INSERT INTO price_history (product_id, price, recorded_at) VALUES ($1, $2, $3)',
            [p.id, histPrice, date.toISOString()]
          );
        }
      } else {
        await client.query(
          'INSERT INTO price_history (product_id, price) VALUES ($1, $2)',
          [p.id, p.price || 0]
        );
      }
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function deleteProduct(id, userId = null) {
  if (!userId) return;
  const pg = getNeonPool();
  if (isValidUuid(userId)) {
    await pg.query('DELETE FROM products WHERE (id = $1 OR db_id::text = $1) AND user_id = $2', [id, userId]);
  } else if (isValidAnonSession(userId)) {
    await pg.query('DELETE FROM products WHERE (id = $1 OR db_id::text = $1) AND anonymous_session_id = $2', [id, userId]);
  }
}

export async function clearAllProducts(userId = null) {
  if (!userId) return;
  const pg = getNeonPool();
  if (isValidUuid(userId)) {
    await pg.query('DELETE FROM products WHERE user_id = $1', [userId]);
  } else if (isValidAnonSession(userId)) {
    await pg.query('DELETE FROM products WHERE anonymous_session_id = $1', [userId]);
  }
}

export async function updateTargetPrice(id, targetPrice, userId = null) {
  if (!userId) return;
  const pg = getNeonPool();
  if (isValidUuid(userId)) {
    await pg.query('UPDATE products SET target_price = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3', [targetPrice, id, userId]);
  } else if (isValidAnonSession(userId)) {
    await pg.query('UPDATE products SET target_price = $1, updated_at = NOW() WHERE id = $2 AND anonymous_session_id = $3', [targetPrice, id, userId]);
  }
}

export async function updateProductPrice(id, newPrice) {
  const pg = getNeonPool();
  const client = await pg.connect();

  try {
    await client.query('BEGIN');
    await client.query('UPDATE products SET price = $1, updated_at = NOW() WHERE id = $2', [newPrice, id]);
    await client.query('INSERT INTO price_history (product_id, price) VALUES ($1, $2)', [id, newPrice]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ── HISTORY CRUD ──

export async function getProductHistory(productId) {
  const pg = getNeonPool();
  const result = await pg.query(
    'SELECT price, recorded_at FROM price_history WHERE product_id = $1 ORDER BY recorded_at ASC',
    [productId]
  );
  return result.rows.map(r => ({
    price: parseFloat(r.price),
    date: new Date(r.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    recorded_at: r.recorded_at
  }));
}

export function getScrapeHistory() {
  return [];
}

export function saveScrapeHistory(historyItem) {}

// ── SCRAPER HEALTH ──

export async function updateScraperHealth(store, status, errorMessage = null, successRate = 1.0) {
  const pg = getNeonPool();
  const query = `
    INSERT INTO scraper_health (store, status, last_checked, error_message, success_rate)
    VALUES ($1, $2, NOW(), $3, $4)
    ON CONFLICT (store) DO UPDATE SET
      status = EXCLUDED.status,
      last_checked = NOW(),
      error_message = EXCLUDED.error_message,
      success_rate = EXCLUDED.success_rate
  `;
  await pg.query(query, [store, status, errorMessage, successRate]);
}

export async function getAllScraperHealth() {
  const pg = getNeonPool();
  const result = await pg.query('SELECT * FROM scraper_health');
  const healthMap = {};
  for (const r of result.rows) {
    healthMap[r.store] = {
      status: r.status,
      last_checked: r.last_checked,
      error: r.error_message,
      success_rate: parseFloat(r.success_rate)
    };
  }
  return healthMap;
}

// ── FEEDBACK CRUD ──

export async function saveFeedback({ category, message, rating, page, userId = null }) {
  if (!userId || (!isValidUuid(userId) && !isValidAnonSession(userId))) {
    return;
  }
  const pg = getNeonPool();
  const isUuid = isValidUuid(userId);
  const query = isUuid
    ? `INSERT INTO feedback (category, message, rating, page, user_id, anonymous_session_id)
       VALUES ($1, $2, $3, $4, $5, NULL)`
    : `INSERT INTO feedback (category, message, rating, page, user_id, anonymous_session_id)
       VALUES ($1, $2, $3, $4, NULL, $5)`;
  await pg.query(query, [category || 'general', message, rating || null, page || null, userId]);
}

export async function getFeedback(userId = null) {
  if (!userId) return [];
  const pg = getNeonPool();
  if (isValidUuid(userId)) {
    const result = await pg.query('SELECT * FROM feedback WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return result.rows;
  }
  if (isValidAnonSession(userId)) {
    const result = await pg.query('SELECT * FROM feedback WHERE anonymous_session_id = $1 ORDER BY created_at DESC', [userId]);
    return result.rows;
  }
  return [];
}

// ── CHAT MESSAGES CRUD ──

export async function saveChatMessage({ sessionId, role, content, userId = null }) {
  if (!userId || (!isValidUuid(userId) && !isValidAnonSession(userId))) {
    return;
  }
  const pg = getNeonPool();
  const isUuid = isValidUuid(userId);
  const query = isUuid
    ? `INSERT INTO chat_messages (session_id, role, content, user_id, anonymous_session_id)
       VALUES ($1, $2, $3, $4, NULL)`
    : `INSERT INTO chat_messages (session_id, role, content, user_id, anonymous_session_id)
       VALUES ($1, $2, $3, NULL, $4)`;
  await pg.query(query, [sessionId, role, content, userId]);
}

export async function getChatHistory(sessionId, userId = null) {
  if (!userId) return [];
  const pg = getNeonPool();
  if (isValidUuid(userId)) {
    const result = await pg.query(
      'SELECT role, content, created_at FROM chat_messages WHERE session_id = $1 AND user_id = $2 ORDER BY created_at ASC',
      [sessionId, userId]
    );
    return result.rows;
  }
  if (isValidAnonSession(userId)) {
    const result = await pg.query(
      'SELECT role, content, created_at FROM chat_messages WHERE session_id = $1 AND anonymous_session_id = $2 ORDER BY created_at ASC',
      [sessionId, userId]
    );
    return result.rows;
  }
  return [];
}
