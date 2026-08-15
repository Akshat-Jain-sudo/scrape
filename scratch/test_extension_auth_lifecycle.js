/**
 * Test Suite: Chrome Extension Authentication Lifecycle & Logout Synchronization
 * 
 * Verifies:
 * 1. User A login -> extension receives and stores User A JWT
 * 2. Scraped product is saved under User A's account
 * 3. User A logout -> extension immediately removes auth_token from storage
 * 4. Scraping after logout cannot use User A credentials (unauthenticated rejected)
 * 5. User B login -> extension receives and stores User B JWT (not User A)
 * 6. Scraped product is saved under User B's account with strict data isolation
 * 7. Rapid polling / storage checks do not cause race conditions
 * 8. Zero JWTs or passwords logged to console
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

import app from '../server/app.js';
import { getNeonPool } from '../server/neonDb.js';
import { stopPriceHistoryScheduler } from '../server/cron.js';

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

// Log capture to verify zero secret leakage
const capturedLogs = [];
const origLog = console.log;
const origErr = console.error;
console.log = (...args) => {
  capturedLogs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
  origLog.apply(console, args);
};
console.error = (...args) => {
  capturedLogs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
  origErr.apply(console, args);
};

// Simulated Chrome Extension Storage & Runtime Environment
class MockChromeExtension {
  constructor(backendUrl) {
    this.backendUrl = backendUrl;
    this.localStorage = {};
    this.chromeStorage = {
      local: {},
      sync: {}
    };
    this.lastKnownTokenState = undefined;
    this.setupMessageDispatcher();
  }

  // Simulated background message dispatcher
  setupMessageDispatcher() {
    this.messageListeners = [];
    this.onMessage = {
      addListener: (fn) => this.messageListeners.push(fn)
    };

    // Register background.js handlers
    this.onMessage.addListener(async (request, sender, sendResponse) => {
      if (request.action === 'setAuthToken') {
        if (request.token && typeof request.token === 'string' && request.token.trim()) {
          this.chromeStorage.local.auth_token = request.token.trim();
          console.log('[Symbiote Background] Auth token updated');
        } else {
          delete this.chromeStorage.local.auth_token;
          console.log('[Symbiote Background] Auth token cleared');
        }
      } else if (request.action === 'clearAuthToken') {
        delete this.chromeStorage.local.auth_token;
        console.log('[Symbiote Background] Auth token cleared');
      } else if (request.action === 'setBackendUrl') {
        if (request.url) {
          const cleanUrl = request.url.replace(/\/+$/, '');
          this.chromeStorage.local.backend_url = cleanUrl;
          console.log('[Symbiote Background] Backend URL updated to:', cleanUrl);
        }
      }
    });
  }

  sendMessage(message) {
    for (const listener of this.messageListeners) {
      listener(message, {}, () => {});
    }
  }

  // Simulated content.js syncTokenFromStorage logic
  syncTokenFromStorage() {
    const directToken = this.localStorage['symbiote_auth_token'];
    if (directToken && typeof directToken === 'string' && directToken.trim()) {
      if (this.lastKnownTokenState !== directToken.trim()) {
        this.lastKnownTokenState = directToken.trim();
        this.sendMessage({ action: 'setAuthToken', token: this.lastKnownTokenState });
      }
    } else {
      if (this.lastKnownTokenState !== null) {
        this.lastKnownTokenState = null;
        this.sendMessage({ action: 'clearAuthToken' });
      }
    }
  }

  // Simulated content.js window event listener
  dispatchWindowEvent(token) {
    if (token && typeof token === 'string' && token.trim()) {
      this.lastKnownTokenState = token.trim();
      this.sendMessage({ action: 'setAuthToken', token: this.lastKnownTokenState });
    } else {
      this.lastKnownTokenState = null;
      this.sendMessage({ action: 'clearAuthToken' });
    }
  }

  // Simulated background.js syncProductWithServer
  async syncProductWithServer(product) {
    const token = this.chromeStorage.local.auth_token || null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await axios.post(`${this.backendUrl}/api/extension/sync`, { product }, {
        headers,
        validateStatus: () => true
      });
      return res;
    } catch (err) {
      return { status: 500, data: { error: err.message } };
    }
  }
}

async function runExtensionAuthTests() {
  origLog('\n================================================================');
  origLog('   CHROME EXTENSION AUTH LIFECYCLE & LOGOUT SYNC TEST SUITE');
  origLog('================================================================\n');

  const pool = getNeonPool();
  let server;
  let baseUrl;

  try {
    // 1. Start Server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        origLog(`🚀 Test server listening on ${baseUrl}`);
        resolve();
      });
    });

    const ext = new MockChromeExtension(baseUrl);
    const ts = Date.now();

    // 2. Register User A & User B on backend
    origLog('\n--- Setup: Registering User A and User B ---');
    const userARes = await axios.post(`${baseUrl}/api/auth/signup`, {
      email: `ext_user_a_${ts}@test.com`,
      password: 'UserA_Password_123!',
      fullName: 'Extension User A'
    });
    assert(userARes.status === 201 && userARes.data.token, 'User A registered successfully');
    const tokenA = userARes.data.token;
    const userAId = userARes.data.user.id;

    const userBRes = await axios.post(`${baseUrl}/api/auth/signup`, {
      email: `ext_user_b_${ts}@test.com`,
      password: 'UserB_Password_456!',
      fullName: 'Extension User B'
    });
    assert(userBRes.status === 201 && userBRes.data.token, 'User B registered successfully');
    const tokenB = userBRes.data.token;
    const userBId = userBRes.data.user.id;

    // 3. User A Login Flow
    origLog('\n--- Phase 1: User A Login Synchronization ---');
    ext.localStorage['symbiote_auth_token'] = tokenA;
    ext.dispatchWindowEvent(tokenA);
    ext.syncTokenFromStorage();

    assert(ext.chromeStorage.local.auth_token === tokenA, 'Extension storage contains User A JWT');

    // Scrape product 1 as User A
    const productA = {
      name: 'Apple iPhone 16 (Black, 128 GB)',
      price: 79900,
      originalPrice: 79900,
      discount: 0,
      imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/71kZ8W.jpg',
      productLink: `https://www.amazon.in/dp/B0CHX1${ts}`,
      source: 'Amazon India'
    };

    const syncARes = await ext.syncProductWithServer(productA);
    assert(syncARes.status === 200 && syncARes.data.success === true, 'Product 1 synced successfully via extension');

    // Verify DB product ownership
    const dbProductARes = await pool.query('SELECT id, user_id, title, price FROM products WHERE user_id = $1', [userAId]);
    assert(dbProductARes.rows.length === 1, 'Product 1 exists in Neon database');
    assert(dbProductARes.rows[0].user_id === userAId, 'Product 1 is strictly owned by User A');

    // Verify User A can fetch product and User B cannot
    const fetchARes = await axios.get(`${baseUrl}/api/products`, { headers: { Authorization: `Bearer ${tokenA}` } });
    const userAProds = Array.isArray(fetchARes.data) ? fetchARes.data : fetchARes.data.products;
    assert(userAProds.some(p => p.id === syncARes.data.productId), 'User A can view synced Product 1');

    const fetchBRes1 = await axios.get(`${baseUrl}/api/products`, { headers: { Authorization: `Bearer ${tokenB}` } });
    const userBProds1 = Array.isArray(fetchBRes1.data) ? fetchBRes1.data : fetchBRes1.data.products;
    assert(!userBProds1.some(p => p.id === syncARes.data.productId), 'User B cannot view User A Product 1');

    // 4. User A Logout Flow
    origLog('\n--- Phase 2: User A Logout Synchronization ---');
    delete ext.localStorage['symbiote_auth_token'];
    ext.dispatchWindowEvent(null);
    ext.syncTokenFromStorage();

    assert(!ext.chromeStorage.local.auth_token, 'Extension storage removed auth_token on logout');

    // Try scraping product 2 while logged out
    const productLoggedOut = {
      name: 'Apple MacBook Air M3 (16GB)',
      price: 114900,
      originalPrice: 134900,
      discount: 15,
      imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/71mac.jpg',
      productLink: `https://www.flipkart.com/macbook-air-${ts}`,
      source: 'Flipkart'
    };

    const syncLoggedOutRes = await ext.syncProductWithServer(productLoggedOut);
    assert(syncLoggedOutRes.status === 400, 'Unauthenticated extension sync rejected with HTTP 400');

    // Verify User A product count did not change
    const userAProductsAfterLogout = await pool.query('SELECT COUNT(*) as count FROM products WHERE user_id = $1', [userAId]);
    assert(parseInt(userAProductsAfterLogout.rows[0].count, 10) === 1, 'No new products saved under User A after logout');

    // 5. User B Login Flow
    origLog('\n--- Phase 3: User B Login Synchronization ---');
    ext.localStorage['symbiote_auth_token'] = tokenB;
    ext.dispatchWindowEvent(tokenB);
    ext.syncTokenFromStorage();

    assert(ext.chromeStorage.local.auth_token === tokenB, 'Extension storage contains User B JWT');
    assert(ext.chromeStorage.local.auth_token !== tokenA, 'Extension storage does NOT contain User A JWT');

    // Scrape product 3 as User B
    const productB = {
      name: 'Sony WH-1000XM5 Wireless Headphones',
      price: 26990,
      originalPrice: 34990,
      discount: 23,
      imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/71sony.jpg',
      productLink: `https://www.amazon.in/dp/B0SONY${ts}`,
      source: 'Amazon India'
    };

    const syncBRes = await ext.syncProductWithServer(productB);
    assert(syncBRes.status === 200 && syncBRes.data.success === true, 'Product 3 synced successfully as User B');

    // Verify DB product ownership for User B
    const dbProductBRes = await pool.query('SELECT user_id, title FROM products WHERE id = $1 AND user_id = $2', [syncBRes.data.productId, userBId]);
    assert(dbProductBRes.rows.length === 1 && dbProductBRes.rows[0].user_id === userBId, 'Product 3 is strictly owned by User B in Neon DB');

    const dbProductBUserACheck = await pool.query('SELECT user_id FROM products WHERE id = $1 AND user_id = $2', [syncBRes.data.productId, userAId]);
    assert(dbProductBUserACheck.rows.length === 0, 'Product 3 is NOT owned by User A');

    // Verify User B can see Product 3 and User A cannot
    const fetchBRes2 = await axios.get(`${baseUrl}/api/products`, { headers: { Authorization: `Bearer ${tokenB}` } });
    const userBProds2 = Array.isArray(fetchBRes2.data) ? fetchBRes2.data : fetchBRes2.data.products;
    assert(userBProds2.some(p => p.id === syncBRes.data.productId), 'User B can view Product 3 in dashboard API');

    const fetchARes2 = await axios.get(`${baseUrl}/api/products`, { headers: { Authorization: `Bearer ${tokenA}` } });
    const userAProds2 = Array.isArray(fetchARes2.data) ? fetchARes2.data : fetchARes2.data.products;
    assert(!userAProds2.some(p => p.id === syncBRes.data.productId), 'User A dashboard cannot view User B Product 3');

    // 6. Polling & Race Condition Guard Verification
    origLog('\n--- Phase 4: Polling & Storage Event Race Condition Guard ---');
    // Rapidly poll 10 times with steady token
    for (let i = 0; i < 10; i++) {
      ext.syncTokenFromStorage();
    }
    assert(ext.chromeStorage.local.auth_token === tokenB, 'Repeated polling does not wipe valid token');

    // 7. Sensitive Log Inspection
    origLog('\n--- Phase 5: Sensitive Data Log Verification ---');
    const sensitiveFound = capturedLogs.some(log => 
      log.includes(tokenA) || 
      log.includes(tokenB) || 
      log.includes('UserA_Password_123!') || 
      log.includes('UserB_Password_456!')
    );
    assert(!sensitiveFound, 'Zero JWTs, passwords, or secrets leaked into logs');

    // Cleanup Neon DB records
    origLog('\n--- Cleanup: Removing Test Data from Neon ---');
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [userAId, userBId]);
    origLog('   ✓ Cleaned up test users');

    await stopPriceHistoryScheduler();
    server.close();
    await pool.end();

    origLog('\n================================================================');
    origLog(`   ALL EXTENSION AUTH LIFECYCLE TESTS PASSED (${passed}/${passed + failed}) 🎉`);
    origLog('================================================================\n');
    process.exit(0);

  } catch (error) {
    origErr('\n❌ Test execution failed:', error);
    if (server) server.close();
    try { await stopPriceHistoryScheduler(); await pool.end(); } catch (e) {}
    process.exit(1);
  }
}

runExtensionAuthTests();
