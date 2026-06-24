import cron from 'node-cron';
import { readDb, writeDb } from './db.js';
import { simulateStoreSearch } from './scraper.js';

/**
 * Starts the background price history tracker.
 * Runs every 5 minutes to simulate periodic scraping updates.
 */
export function startPriceHistoryScheduler() {
  console.log('⏰ [Price Cron Worker] Scheduler initialized. Running price check every 5 minutes...');

  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await updateSavedProductsPriceHistory();
  });

  // Run once immediately on startup after a brief delay
  setTimeout(() => {
    updateSavedProductsPriceHistory().catch(err => {
      console.error('❌ [Price Cron Worker] Initial price update failed:', err);
    });
  }, 10000);
}

/**
 * Updates price history for all saved products.
 */
export async function updateSavedProductsPriceHistory() {
  console.log('🔍 [Price Cron Worker] Starting periodic price scan for saved products...');
  const db = await readDb();

  if (!db.products || db.products.length === 0) {
    console.log('ℹ️ [Price Cron Worker] No saved products in database. Skipping price scan.');
    return;
  }

  let updatedCount = 0;

  for (const product of db.products) {
    try {
      // 1. Simulate or perform a fresh search for this query at the product's source store
      const query = product.searchQuery || product.name;
      const store = product.source;
      const category = product.category || 'ecommerce';
      
      const results = simulateStoreSearch(query, store, 1);
      let newPrice = product.price;

      if (results && results.length > 0) {
        // Find closest matching product name or just pick the best option
        const match = results[0];
        newPrice = match.price;
      } else {
        // Fallback: slight random price fluctuation (+/- 3%)
        const fluctuation = 0.97 + Math.random() * 0.06;
        newPrice = Math.round(product.price * fluctuation);
      }

      // 2. Append new price to history
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' + 
                      now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

      if (!product.priceHistory) {
        product.priceHistory = [];
      }

      product.priceHistory.push({
        price: newPrice,
        date: dateStr
      });

      // Keep only last 10 entries
      if (product.priceHistory.length > 10) {
        product.priceHistory = product.priceHistory.slice(-10);
      }

      // Update current price
      product.price = newPrice;
      product.priceFormatted = `₹${newPrice.toLocaleString('en-IN')}`;

      // Check if price fell below target alert price
      if (product.targetPrice && newPrice <= product.targetPrice) {
        console.log(`🔔 [Price Alert Triggered] ${product.name} dropped to ₹${newPrice} (Target: ₹${product.targetPrice})!`);
      }

      console.log(`✓ [Price Cron Worker] Updated ${product.name} on ${store}: Current price: ₹${newPrice}`);
      updatedCount++;
    } catch (err) {
      console.error(`❌ [Price Cron Worker] Failed to update product ${product.id}:`, err.message);
    }
  }

  if (updatedCount > 0) {
    db.productsUpdatedLast = new Date().toISOString();
    await writeDb(db);
    console.log(`💾 [Price Cron Worker] Saved updated price histories for ${updatedCount} products.`);
  }
}
