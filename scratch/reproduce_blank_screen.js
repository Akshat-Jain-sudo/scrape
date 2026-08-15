import { chromium } from 'playwright';
import { createServer as createViteServer, preview as createVitePreview } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import app from '../server/app.js';
import { stopPriceHistoryScheduler } from '../server/cron.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

async function runInvestigation() {
  console.log('================================================================');
  console.log('   SYSTEMATIC ROOT-CAUSE INVESTIGATION: BLANK SCREEN BUG');
  console.log('================================================================\n');

  // 1. Start backend server
  const BACKEND_PORT = 5003;
  const server = app.listen(BACKEND_PORT);
  console.log(`✓ Backend server started on http://localhost:${BACKEND_PORT}`);

  // 2. Start Vite dev server programmatically
  const vite = await createViteServer({
    root: rootDir,
    server: {
      port: 5174,
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
  console.log(`✓ Vite Dev Server listening on http://localhost:5174`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  const uncaughtPageErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push({ type, text, location: msg.location() });
    if (type === 'error') {
      console.log(`🔴 [BROWSER ERROR] ${text}`);
    } else if (text.includes('Error') || text.includes('exception') || text.includes('Warning')) {
      console.log(`⚠️ [BROWSER WARN/LOG] ${text}`);
    }
  });

  page.on('pageerror', err => {
    console.error(`💥 [UNCAUGHT PAGE ERROR] ${err.name}: ${err.message}\n${err.stack}`);
    uncaughtPageErrors.push({ name: err.name, message: err.message, stack: err.stack });
  });

  page.on('requestfailed', req => {
    console.log(`❌ [REQUEST FAILED] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    networkErrors.push({ url: req.url(), error: req.failure()?.errorText });
  });

  try {
    // ── Phase 1: Landing Page Load ──
    console.log('\n--- 1. Testing Unauthenticated Visitor Landing Page ---');
    await page.goto('http://localhost:5174');
    await page.waitForTimeout(2000);

    let isBlank = await page.evaluate(() => {
      const root = document.getElementById('root');
      return !root || root.children.length === 0 || root.innerHTML.trim() === '';
    });
    console.log(`   Initial Landing page blank status: ${isBlank}`);

    // ── Phase 2: User Authentication ──
    console.log('\n--- 2. Registering & Authenticating Real User ---');
    const ts = Date.now();
    const signupRes = await fetch(`http://localhost:${BACKEND_PORT}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `investigate_${ts}@test.com`,
        password: 'Password123!',
        fullName: 'Investigator'
      })
    });
    const authData = await signupRes.json();

    await page.evaluate(({ token, user }) => {
      localStorage.setItem('symbiote_auth_token', token);
      localStorage.setItem('symbiote_auth_user', JSON.stringify(user));
    }, { token: authData.token, user: authData.user });

    await page.reload();
    await page.waitForTimeout(3000);

    const appContainerExists = await page.evaluate(() => Boolean(document.querySelector('.app-container')));
    console.log(`   Authenticated Dashboard rendered: ${appContainerExists}`);

    // ── Phase 3: Inspect "👑 My Perks" button click ──
    console.log('\n--- 3. Testing "👑 My Perks" Button in Header ---');
    const perksBtn = page.locator('.my-perks-btn');
    if (await perksBtn.count() > 0) {
      console.log('   Clicking "👑 My Perks"...');
      await perksBtn.click();
      await page.waitForTimeout(1000);
      isBlank = await page.evaluate(() => {
        const root = document.getElementById('root');
        return !root || root.children.length === 0 || root.innerHTML.trim() === '';
      });
      console.log(`   Is screen blank after clicking My Perks?: ${isBlank}`);
    }

    // ── Phase 4: Navigation Across All Tabs ──
    console.log('\n--- 4. Testing Navigation Across All Header Tabs ---');
    const navTabs = [
      { name: 'Console Scraper', selector: '.amazon-nav-item:has-text("Console Scraper")' },
      { name: 'Cart Optimizer', selector: '.amazon-nav-item:has-text("Cart Optimizer")' },
      { name: 'Cab Compare', selector: '.amazon-nav-item:has-text("Cab Compare")' },
      { name: 'Saved Products', selector: '.amazon-nav-item:has-text("Saved Products")' },
      { name: 'Analytics', selector: '.amazon-nav-item:has-text("Analytics")' },
      { name: 'Order Relay', selector: '.amazon-nav-item:has-text("Order Relay")' },
      { name: 'Today\'s Deals', selector: '.amazon-nav-item:has-text("Today\'s Deals")' },
      { name: 'Cart Icon', selector: '.amazon-cart-box:has-text("Cart")' },
      { name: 'Profile Icon', selector: '.amazon-cart-box:has-text("Profile")' },
      { name: 'Theme Toggle', selector: '.amazon-cart-box:has-text("Theme")' },
    ];

    for (const tab of navTabs) {
      const el = page.locator(tab.selector);
      if (await el.count() > 0) {
        console.log(`   Navigating to: ${tab.name}`);
        await el.first().click();
        await page.waitForTimeout(1200);
        isBlank = await page.evaluate(() => {
          const root = document.getElementById('root');
          return !root || root.children.length === 0 || root.innerHTML.trim() === '';
        });
        console.log(`      Blank status on ${tab.name}: ${isBlank}`);
      }
    }

    // ── Phase 5: Dashboard Long-Running Liveness (Simulate 5 minutes) ──
    console.log('\n--- 5. Simulating 5-Minute Continuous Dashboard Operation ---');
    console.log('   Navigating back to Today\'s Deals Dashboard...');
    await page.locator('.amazon-nav-item:has-text("Today\'s Deals")').first().click();
    await page.waitForTimeout(2000);

    // Monitor for 30 intervals of 10 seconds (5 minutes total)
    for (let i = 1; i <= 30; i++) {
      await page.waitForTimeout(10000); // 10s step

      // Simulate human mouse movement on canvas
      await page.mouse.move(100 + (i * 20) % 800, 200 + (i * 15) % 600);

      const metrics = await page.evaluate(() => {
        const root = document.getElementById('root');
        const isBlank = !root || root.children.length === 0 || root.innerHTML.trim() === '';
        const cardCount = document.querySelectorAll('.comparison-feed-card').length;
        const domNodeCount = document.querySelectorAll('*').length;
        return { isBlank, cardCount, domNodeCount };
      });

      console.log(`   [${i * 10}s / 300s] Blank: ${metrics.isBlank} | DOM Nodes: ${metrics.domNodeCount} | Feed Cards: ${metrics.cardCount} | Errors: ${uncaughtPageErrors.length}`);

      if (metrics.isBlank || uncaughtPageErrors.length > 0) {
        console.log('   ⚠️ DETECTED CRITICAL STATE ANOMALY DURING LONG RUN!');
        break;
      }
    }

    console.log('\n================================================================');
    console.log('   AUDIT RESULTS & SUMMARY');
    console.log('================================================================');
    console.log(`Total Uncaught Exceptions: ${uncaughtPageErrors.length}`);
    uncaughtPageErrors.forEach((e, idx) => {
      console.log(`\n[Exception #${idx + 1}] ${e.name}: ${e.message}`);
      console.log(e.stack);
    });

    console.log(`\nTotal Browser Console Errors: ${consoleLogs.filter(l => l.type === 'error').length}`);
    consoleLogs.filter(l => l.type === 'error').forEach((l, idx) => {
      console.log(`[Console Error #${idx + 1}] ${l.text}`);
    });

  } catch (err) {
    console.error('Diagnostic error:', err);
  } finally {
    stopPriceHistoryScheduler();
    await browser.close();
    await vite.close();
    server.close();
  }
}

runInvestigation();
