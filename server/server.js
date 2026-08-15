import app from './app.js';
import { runAllHealthChecks } from './scraperHealth.js';
import { initNeonDb } from './neonDb.js';
import { migrateJsonCredentials } from './automator/credentialStore.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`\n🚀 Symbiote Server running on http://localhost:${PORT}`);

  // Initialize Neon DB (create auth tables)
  try {
    await initNeonDb();
    console.log(`   ✅ Neon DB connected and tables initialized`);
    await migrateJsonCredentials();
  } catch (err) {
    console.error(`   ❌ Neon DB init failed:`, err.message);
  }

  console.log(`   API endpoints:`);
  console.log(`   POST /api/scrape          — Scrape Flipkart products`);
  console.log(`   GET  /api/products        — List saved products`);
  console.log(`   POST /api/products        — Save products`);
  console.log(`   DEL  /api/products/:id    — Delete a product`);
  console.log(`   DEL  /api/products        — Clear all products`);
  console.log(`   GET  /api/analytics       — Product analytics`);
  console.log(`   GET  /api/export/csv      — Export CSV`);
  console.log(`   GET  /api/export/excel    — Export Excel`);
  console.log(`   GET  /api/history         — Scrape history`);
  console.log(`   POST /api/chat            — AI Chatbot`);
  console.log(`   POST /api/feedback        — Submit feedback`);
  console.log(`   GET  /api/feedback        — View feedback\n`);
  
  // Scraper Health Checks
  runAllHealthChecks();
  healthCheckInterval = setInterval(runAllHealthChecks, 6 * 60 * 60 * 1000); // 6 hours
});

// ── Graceful Shutdown ──
let isShuttingDown = false;
let healthCheckInterval = null;

async function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  // a. Stop accepting new HTTP connections
  server.close(() => {
    console.log('   ✓ HTTP server closed to new connections.');
  });

  // Stop periodic health check interval
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }

  try {
    // b, c, d. Stop price-history cron worker and wait for current in-flight scan to finish
    const { stopPriceHistoryScheduler } = await import('./cron.js');
    await stopPriceHistoryScheduler();
    console.log('   ✓ Price history cron worker stopped.');

    // e. Drain Neon PostgreSQL connection pool
    const { getNeonPool } = await import('./neonDb.js');
    const pool = getNeonPool();
    await pool.end();
    console.log('   ✓ Neon PostgreSQL pool drained.');
  } catch (err) {
    console.error('   ❌ Error during shutdown cleanup:', err.message);
  } finally {
    console.log('   👋 Symbiote Server shutdown complete.');
    process.exit(0);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

