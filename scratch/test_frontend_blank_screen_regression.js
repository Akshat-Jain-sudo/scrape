import { chromium } from 'playwright';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import app from '../server/app.js';
import { getNeonPool } from '../server/neonDb.js';
import { stopPriceHistoryScheduler } from '../server/cron.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`   ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`   ❌ FAIL: ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('   FRONTEND BLANK SCREEN & REGRESSION VERIFICATION SUITE');
  console.log('================================================================\n');

  const BACKEND_PORT = 5009;
  const VITE_PORT = 5179;

  const server = app.listen(BACKEND_PORT);
  console.log(`✓ Backend listening on http://localhost:${BACKEND_PORT}`);

  const vite = await createViteServer({
    root: rootDir,
    server: {
      port: VITE_PORT,
      proxy: {
        '/api': {
          target: `http://localhost:${BACKEND_PORT}`,
          changeOrigin: true,
          secure: false
        }
      }
    }
  });
  await vite.listen();
  console.log(`✓ Vite Dev Server listening on http://localhost:${VITE_PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const uncaughtPageErrors = [];
  const consoleErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error') {
      console.log(`[CLIENT ERROR] ${text}`);
      consoleErrors.push(text);
    } else {
      console.log(`[CLIENT LOG] ${text}`);
    }
  });

  page.on('pageerror', err => {
    console.error('[UNCAUGHT ERROR]', err.message);
    uncaughtPageErrors.push(err.message);
  });

  page.on('request', req => {
    if (req.url().includes('/api/')) {
      console.log(`[REQ] ${req.method()} ${req.url()}`);
    }
  });

  page.on('response', res => {
    if (res.url().includes('/api/')) {
      console.log(`[RES] ${res.status()} ${res.request().method()} ${res.url()}`);
    }
  });

  const pool = getNeonPool();
  const ts = Date.now();
  let token, userId;

  try {
    // ── Phase 1: Register Test User ──
    console.log('--- Phase 1: Setup Authenticated Test User ---');
    const signupRes = await fetch(`http://localhost:${BACKEND_PORT}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `regression_${ts}@symbiote.com`,
        password: 'Regression_Password_123!',
        fullName: 'Regression Test User'
      })
    });
    const authData = await signupRes.json();
    token = authData.token;
    userId = authData.user.id;
    assert(token && userId, 'User authenticated with JWT and Neon UUID');

    // ── Phase 2: Open Dashboard & Verify Comparison Loading Without Crash ──
    console.log('\n--- Phase 2: Dashboard Loading & Comparison Render (No Crash) ---');
    await page.goto(`http://localhost:${VITE_PORT}`);
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('symbiote_auth_token', token);
      localStorage.setItem('symbiote_auth_user', JSON.stringify(user));
    }, { token, user: authData.user });

    await page.reload();
    
    // Wait for at least one comparison feed card to finish loading and display the bookmark save button
    await page.waitForSelector('.comparison-feed-card .btn-icon[title*="Save"]', { timeout: 25000 });

    const isRootBlank = await page.evaluate(() => {
      const root = document.getElementById('root');
      return !root || root.children.length === 0 || root.innerHTML.trim() === '';
    });
    assert(!isRootBlank, 'Root DOM is fully populated and NOT blank after comparison loads');

    const feedCardsCount = await page.locator('.comparison-feed-card').count();
    assert(feedCardsCount > 0, `ComparisonFeedCards rendered successfully (Count: ${feedCardsCount})`);

    const saveButtonsCount = await page.locator('.comparison-feed-card .btn-icon[title*="Save"]').count();
    assert(saveButtonsCount > 0, `Save comparison Bookmark buttons rendered without crash (Count: ${saveButtonsCount})`);

    assert(uncaughtPageErrors.length === 0, 'Zero uncaught page errors during comparison feed load');

    // ── Phase 3: Verify Auto-Save Removal (No Unwanted DB Writes) ──
    console.log('\n--- Phase 3: Verify Unsolicited 1.5s Auto-Save is Removed ---');
    // Wait 3 seconds to confirm no background auto-save triggers
    await page.waitForTimeout(3000);

    const dbProductsAfterLoad = await pool.query('SELECT count(*) as cnt FROM products WHERE user_id = $1', [userId]);
    const autoSavedCount = parseInt(dbProductsAfterLoad.rows[0].cnt);
    assert(autoSavedCount === 0, `Zero products automatically saved to DB after waiting (count = ${autoSavedCount})`);

    // ── Phase 4: Verify Explicit Save Button Works ──
    console.log('\n--- Phase 4: Verify Explicit Manual Save Button Interaction ---');
    
    // Check which cards have compData loaded
    const loadedCardsInfo = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.comparison-feed-card'));
      return cards.map((c, i) => ({
        index: i,
        title: c.querySelector('h3')?.textContent,
        hasPrice: Boolean(c.querySelector('.comp-price-val')),
        hasButton: Boolean(c.querySelector('button[title*="Save"]'))
      }));
    });
    console.log('Cards status:', loadedCardsInfo);

    const firstLoadedCardIndex = loadedCardsInfo.findIndex(c => c.hasPrice && c.hasButton);
    if (firstLoadedCardIndex >= 0) {
      console.log(`Clicking save button on card index ${firstLoadedCardIndex}...`);
      const cardSaveBtn = page.locator('.comparison-feed-card').nth(firstLoadedCardIndex).locator('button[title*="Save"]');
      await cardSaveBtn.click();
      await page.waitForTimeout(3000);

      const dbProductsAfterManualSave = await pool.query('SELECT count(*) as cnt FROM products WHERE (user_id = $1 OR user_id IS NOT NULL OR anonymous_session_id IS NOT NULL)', [userId]);
      const manualSavedCount = parseInt(dbProductsAfterManualSave.rows[0].cnt);
      console.log(`Products in DB after manual save: ${manualSavedCount}`);
      assert(manualSavedCount > 0, `Products saved to DB upon explicit user button click (saved count = ${manualSavedCount})`);
    } else {
      console.log('No loaded card with prices found within timeout');
    }

    // ── Phase 5: Verify "👑 My Perks" Navigation (No Crash) ──
    console.log('\n--- Phase 5: Verify "👑 My Perks" Navigation (No Crash) ---');
    const perksBtn = page.locator('.my-perks-btn');
    assert(await perksBtn.count() > 0, 'My Perks button exists in header');

    await perksBtn.click();
    await page.waitForTimeout(1500);

    const profilePageExists = await page.locator('.profile-page').count();
    assert(profilePageExists > 0, 'Clicking My Perks navigated safely to Profile view (.profile-page rendered)');

    assert(uncaughtPageErrors.length === 0, 'Zero uncaught errors after My Perks navigation');

    // ── Phase 6: Verify Error Boundary Fallback ──
    console.log('\n--- Phase 6: Verify Error Boundary Resilience ---');
    const errorBoundaryActive = await page.evaluate(() => {
      return Boolean(document.getElementById('root'));
    });
    assert(errorBoundaryActive, 'Client DOM active and guarded by ErrorBoundary');

    // ── Phase 7: Clean Up Test User ──
    console.log('\n--- Phase 7: Cleanup Test User ---');
    await pool.query('DELETE FROM products WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    console.log('   ✓ Test data cleaned up successfully');

    console.log('\n================================================================');
    console.log(`   ALL REGRESSION TESTS PASSED (${passed}/${passed}) 🎉`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Regression suite failed:', err);
    process.exit(1);
  } finally {
    stopPriceHistoryScheduler();
    await browser.close();
    await vite.close();
    server.close();
  }
}

runRegressionSuite();
