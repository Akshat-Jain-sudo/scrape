import cron from 'node-cron';
import { getAllProducts, updateProductPrice } from './db.js';
import { simulateStoreSearch } from './scraper.js';

let cronTask = null;
let initialTimeout = null;
let isShuttingDown = false;
let activeUpdatePromise = null;

/**
 * Starts the background price history tracker.
 * Runs every 5 minutes to simulate periodic scraping updates.
 */
export function startPriceHistoryScheduler() {
  if (cronTask) return; // Prevent duplicate schedulers
  isShuttingDown = false;

  console.log('⏰ [Price Cron Worker] Scheduler initialized. Running price check every 5 minutes...');

  // Run every 5 minutes
  cronTask = cron.schedule('*/5 * * * *', async () => {
    if (isShuttingDown) return;
    activeUpdatePromise = updateSavedProductsPriceHistory();
    try {
      await activeUpdatePromise;
    } finally {
      activeUpdatePromise = null;
    }
  });

  // Run once immediately on startup after a brief delay
  initialTimeout = setTimeout(() => {
    initialTimeout = null;
    if (isShuttingDown) return;
    activeUpdatePromise = updateSavedProductsPriceHistory().catch(err => {
      if (!isShuttingDown) {
        console.error('❌ [Price Cron Worker] Initial price update failed:', err);
      }
    }).finally(() => {
      activeUpdatePromise = null;
    });
  }, 10000);
}

/**
 * Gracefully stops the price history tracker and waits for active scans to finish.
 */
export async function stopPriceHistoryScheduler() {
  isShuttingDown = true;

  if (initialTimeout) {
    clearTimeout(initialTimeout);
    initialTimeout = null;
  }

  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }

  if (activeUpdatePromise) {
    // Wait for in-flight update to cleanly exit, with a 3s max timeout guard
    await Promise.race([
      activeUpdatePromise,
      new Promise((resolve) => setTimeout(resolve, 3000))
    ]);
    activeUpdatePromise = null;
  }

  console.log('🛑 [Price Cron Worker] Scheduler stopped cleanly.');
}

/**
 * Updates price history for all saved products.
 */
export async function updateSavedProductsPriceHistory() {
  if (isShuttingDown) return;

  console.log('🔍 [Price Cron Worker] Starting periodic price scan for saved products...');
  
  let products = [];
  try {
    products = await getAllProducts();
  } catch (err) {
    if (!isShuttingDown) {
      console.error('❌ [Price Cron Worker] Failed to fetch saved products:', err.message);
    }
    return;
  }

  if (!products || products.length === 0) {
    console.log('ℹ️ [Price Cron Worker] No saved products in database. Skipping price scan.');
    return;
  }

  let updatedCount = 0;

  for (const product of products) {
    if (isShuttingDown) {
      console.log('🛑 [Price Cron Worker] Shutdown detected. Halting scan loop.');
      break;
    }

    try {
      // 1. Simulate or perform a fresh search for this query at the product's source store
      const query = product.query || product.name;
      const store = product.source;
      
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

      if (isShuttingDown) break;

      // Update the database
      await updateProductPrice(product.id, newPrice);

      // Check if price fell below target alert price
      if (product.targetPrice && newPrice <= product.targetPrice) {
        console.log(`🔔 [Price Alert Triggered] ${product.name} dropped to ₹${newPrice} (Target: ₹${product.targetPrice})!`);
      }

      console.log(`✓ [Price Cron Worker] Updated ${product.name} on ${store}: Current price: ₹${newPrice}`);
      updatedCount++;
    } catch (err) {
      if (!isShuttingDown) {
        console.error(`❌ [Price Cron Worker] Failed to update product ${product.id}:`, err.message);
      }
    }
  }

  if (updatedCount > 0 && !isShuttingDown) {
    console.log(`💾 [Price Cron Worker] Saved updated price histories for ${updatedCount} products.`);
  }
}

