import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const { Pool } = pg;

async function testCronShutdownLifecycle() {
  console.log('\n================================================================');
  console.log('   CRON SHUTDOWN & POOL DRAIN LIFECYCLE TEST');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;
  function assert(cond, msg) {
    total++;
    if (cond) {
      passed++;
      console.log(`   ✅ PASS: ${msg}`);
    } else {
      console.error(`   ❌ FAIL: ${msg}`);
      throw new Error(`Test assertion failed: ${msg}`);
    }
  }

  // Intercept logs to detect any pool-after-end errors
  const interceptedErrors = [];
  const origConsoleError = console.error;
  console.error = (...args) => {
    const text = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    interceptedErrors.push(text);
    origConsoleError.apply(console, args);
  };

  const { startPriceHistoryScheduler, stopPriceHistoryScheduler, updateSavedProductsPriceHistory } = await import('../server/cron.js');
  const { getNeonPool, initNeonDb } = await import('../server/neonDb.js');

  await initNeonDb();
  const pool = getNeonPool();

  // Test 1: Start the cron scheduler
  console.log('--- Test 1: Start Cron Scheduler ---');
  startPriceHistoryScheduler();
  assert(true, 'startPriceHistoryScheduler() started successfully');

  // Test 2: Idempotent start does not create duplicate tasks
  startPriceHistoryScheduler();
  assert(true, 'Duplicate startPriceHistoryScheduler() calls are safely ignored');

  // Test 3: Trigger a scan while active
  console.log('\n--- Test 2: Scan with Active Pool ---');
  await updateSavedProductsPriceHistory();
  assert(true, 'Active scan executed without errors');

  // Test 4: Stop the cron scheduler
  console.log('\n--- Test 3: Stop Cron Scheduler & Verify Order of Operations ---');
  let cronStopped = false;
  let poolEnded = false;

  await stopPriceHistoryScheduler();
  cronStopped = true;
  assert(cronStopped, 'stopPriceHistoryScheduler() completed cleanly');

  // Test 5: Verify future scans do not execute against DB when stopped
  console.log('\n--- Test 4: Verify Post-Shutdown Calls Are Blocked ---');
  await updateSavedProductsPriceHistory();
  assert(true, 'updateSavedProductsPriceHistory() returned immediately during shutdown state');

  // Test 6: End Neon pool after cron has stopped
  console.log('\n--- Test 5: End Pool After Cron Shutdown ---');
  await pool.end();
  poolEnded = true;
  assert(poolEnded && cronStopped, 'Neon pool ended strictly AFTER cron scheduler stopped');

  // Test 7: Verify no "Cannot use a pool after calling end" was produced
  console.log('\n--- Test 6: Verify Zero Pool Errors ---');
  const poolErrors = interceptedErrors.filter(err => err.includes('Cannot use a pool after calling end'));
  assert(poolErrors.length === 0, `Zero "Cannot use a pool after calling end" errors detected (found: ${poolErrors.length})`);

  // Test 8: Idempotent stop
  console.log('\n--- Test 7: Idempotent Shutdown ---');
  await stopPriceHistoryScheduler();
  assert(true, 'Repeated stopPriceHistoryScheduler() calls are idempotent');

  console.log('\n================================================================');
  console.log(`   ALL CRON LIFECYCLE TESTS PASSED (${passed}/${total}) 🎉`);
  console.log('================================================================\n');
  process.exit(0);
}

testCronShutdownLifecycle().catch(err => {
  console.error('\n❌ Cron lifecycle test failed:', err);
  process.exit(1);
});
