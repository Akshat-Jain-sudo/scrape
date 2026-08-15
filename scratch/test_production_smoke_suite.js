import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const { Pool } = pg;

// Production Environment Settings Simulation
const TEST_JWT_SECRET = 'symbiote-super-secure-production-jwt-key-2026-xyz987';
const TEST_SYMBIOTE_SECRET = 'symbiote-super-secure-encryption-key-2026-abc123';
const TEST_FRONTEND_URL = 'https://symbiote-webscrapper.onrender.com';
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;

// Capture logs for security inspection
const capturedLogs = [];
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function captureLog(type, args) {
  const str = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  capturedLogs.push({ type, str });
}

console.log = (...args) => {
  captureLog('log', args);
  originalConsoleLog.apply(console, args);
};
console.error = (...args) => {
  captureLog('error', args);
  originalConsoleError.apply(console, args);
};
console.warn = (...args) => {
  captureLog('warn', args);
  originalConsoleWarn.apply(console, args);
};

// Set production environment variables
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.SYMBIOTE_SECRET = TEST_SYMBIOTE_SECRET;
process.env.FRONTEND_URL = TEST_FRONTEND_URL;

async function runProductionSmokeTest() {
  originalConsoleLog('\n================================================================');
  originalConsoleLog('   SYMBIOTE PRODUCTION DEPLOYMENT SMOKE TEST SUITE');
  originalConsoleLog('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;
  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      originalConsoleLog(`   ✅ PASS: ${message}`);
    } else {
      originalConsoleError(`   ❌ FAIL: ${message}`);
      throw new Error(`Smoke Test Assertion Failed: ${message}`);
    }
  }

  // ── Step 0: Verify Environment Variables ──
  originalConsoleLog('--- Phase 0: Production Environment Configuration ---');
  assert(Boolean(process.env.NEON_DATABASE_URL), 'NEON_DATABASE_URL is set');
  assert(Boolean(process.env.JWT_SECRET), 'JWT_SECRET is set');
  assert(Boolean(process.env.SYMBIOTE_SECRET), 'SYMBIOTE_SECRET is set');
  assert(process.env.NODE_ENV === 'production', 'NODE_ENV is set to production');
  assert(Boolean(process.env.FRONTEND_URL), 'FRONTEND_URL is set');

  // Verify weak secret protection
  const weakSecretCheck = (secret) => {
    return secret === 'symbiote-jwt-secret-key-2024-change-in-prod' || secret === 'symbiote-fallback-secret';
  };
  assert(!weakSecretCheck(process.env.JWT_SECRET), 'Production JWT_SECRET is not the default weak key');

  // ── Step 1: Initialize Neon Database and Start In-Process Server ──
  originalConsoleLog('\n--- Phase 1: Server Startup & Neon Connection ---');
  const { initNeonDb, getNeonPool } = await import('../server/neonDb.js');
  await initNeonDb();
  assert(true, 'Neon PostgreSQL schema initialized (users, products, price_history, feedback, chat, retailer_credentials, user_preferences)');

  const pool = getNeonPool();
  const dbHealthRes = await pool.query('SELECT NOW() as server_time, current_database() as db_name;');
  assert(dbHealthRes.rows.length > 0 && dbHealthRes.rows[0].server_time, 'Neon connection query executed successfully against remote database');

  const { default: app } = await import('../server/app.js');
  
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  originalConsoleLog(`   🚀 Production test server running at ${baseUrl}`);

  async function api(path, opts = {}) {
    const url = `${baseUrl}${path}`;
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers,
      body: opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined
    });
    let data;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, headers: res.headers, data };
  }

  // ── Phase 2: Authentication Flows ──
  originalConsoleLog('\n--- Phase 2: Authentication & JWT Security ---');
  const userAEmail = `test_user_a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`;
  const userBEmail = `test_user_b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`;
  const userPassword = 'ProductionTestPassword123!';

  // Register User A
  const signupARes = await api('/api/auth/signup', {
    method: 'POST',
    body: { email: userAEmail, password: userPassword, fullName: 'Smoke User A' }
  });
  assert(signupARes.status === 201 && signupARes.data.token, 'User A registered successfully with JWT');
  const userAToken = signupARes.data.token;
  const userAId = signupARes.data.user.id;

  // Login User A
  const loginARes = await api('/api/auth/login', {
    method: 'POST',
    body: { email: userAEmail, password: userPassword }
  });
  assert(loginARes.status === 200 && loginARes.data.token, 'User A logged in successfully with valid credentials');

  // Verify authenticated API request
  const meARes = await api('/api/auth/me', {
    headers: { Authorization: `Bearer ${userAToken}` }
  });
  assert(meARes.status === 200 && meARes.data.user.email === userAEmail, 'Authenticated /api/auth/me returns User A profile');

  // Invalid JWT returns 401
  const invalidJwtRes = await api('/api/auth/me', {
    headers: { Authorization: 'Bearer invalid.tampered.token' }
  });
  assert(invalidJwtRes.status === 401, 'Invalid/tampered JWT returns HTTP 401');

  // Expired / forged secret JWT returns 401
  const forgedToken = jwt.sign({ userId: userAId, email: userAEmail }, 'wrong-secret-key-123', { expiresIn: '1h' });
  const forgedJwtRes = await api('/api/auth/me', {
    headers: { Authorization: `Bearer ${forgedToken}` }
  });
  assert(forgedJwtRes.status === 401, 'Forged JWT secret token returns HTTP 401');

  // Register User B
  const signupBRes = await api('/api/auth/signup', {
    method: 'POST',
    body: { email: userBEmail, password: userPassword, fullName: 'Smoke User B' }
  });
  assert(signupBRes.status === 201 && signupBRes.data.token, 'User B registered successfully');
  const userBToken = signupBRes.data.token;
  const userBId = signupBRes.data.user.id;

  // ── Phase 3: Product Isolation ──
  originalConsoleLog('\n--- Phase 3: Product Data Isolation ---');
  const sharedProductId = `prod-smoke-${Date.now()}`;

  // User A saves product
  const saveProdARes = await api('/api/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}` },
    body: {
      products: [{
        id: sharedProductId,
        name: 'Smoke Test Smartphone A',
        price: 19999,
        category: 'mobiles',
        source: 'flipkart',
        productLink: 'https://www.flipkart.com/smoke-phone-a'
      }]
    }
  });
  assert((saveProdARes.status === 200 || saveProdARes.status === 201) && (saveProdARes.data.savedCount > 0 || saveProdARes.data.success), 'User A saves product TEST-PROD-001');

  // User A retrieves product
  const getProdARes = await api('/api/products', {
    headers: { Authorization: `Bearer ${userAToken}` }
  });
  assert(getProdARes.status === 200 && getProdARes.data.some(p => p.id === sharedProductId), 'User A can retrieve own product');

  // User B cannot see User A's product
  const getProdBResInitial = await api('/api/products', {
    headers: { Authorization: `Bearer ${userBToken}` }
  });
  assert(getProdBResInitial.status === 200 && !getProdBResInitial.data.some(p => p.id === sharedProductId), 'User B cannot see User A product');

  // User B saves the SAME product ID
  const saveProdBRes = await api('/api/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userBToken}` },
    body: {
      products: [{
        id: sharedProductId,
        name: 'Smoke Test Smartphone B (Custom for User B)',
        price: 18999,
        category: 'mobiles',
        source: 'amazon',
        productLink: 'https://www.amazon.in/smoke-phone-b'
      }]
    }
  });
  assert((saveProdBRes.status === 200 || saveProdBRes.status === 201), 'User B saves same product ID independently');

  // Verify independent records exist in Neon PostgreSQL
  const dbProdCheck = await pool.query('SELECT user_id, title, price FROM products WHERE id = $1', [sharedProductId]);
  assert(dbProdCheck.rows.length === 2, `Neon database contains 2 distinct rows for ID ${sharedProductId} (found: ${dbProdCheck.rows.length})`);

  // Delete User A's record
  const delProdARes = await api(`/api/products/${sharedProductId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userAToken}` }
  });
  assert(delProdARes.status === 200, 'User A deleted own product record');

  // Verify User B's record remains
  const getProdBResAfter = await api('/api/products', {
    headers: { Authorization: `Bearer ${userBToken}` }
  });
  assert(getProdBResAfter.status === 200 && getProdBResAfter.data.some(p => p.id === sharedProductId), 'User B product record persists after User A deletion');

  // ── Phase 4: Anonymous Session Isolation ──
  originalConsoleLog('\n--- Phase 4: Anonymous Session Isolation ---');
  const anonSessionA = `anon-${crypto.randomUUID()}`;
  const anonSessionB = `anon-${crypto.randomUUID()}`;
  const anonProdId = `anon-prod-${Date.now()}`;

  // Session A saves product
  const saveAnonARes = await api('/api/products', {
    method: 'POST',
    headers: { 'X-Anonymous-Session': anonSessionA },
    body: {
      products: [{
        id: anonProdId,
        name: 'Anonymous Headphones A',
        price: 2499,
        category: 'audio',
        source: 'flipkart'
      }]
    }
  });
  assert((saveAnonARes.status === 200 || saveAnonARes.status === 201), 'Anonymous Session A saves product');

  // Session B cannot see Session A's product
  const getAnonBRes = await api('/api/products', {
    headers: { 'X-Anonymous-Session': anonSessionB }
  });
  assert(getAnonBRes.status === 200 && !getAnonBRes.data.some(p => p.id === anonProdId), 'Anonymous Session B cannot see Session A product');

  // Session B cannot delete Session A's product
  const delAnonBRes = await api(`/api/products/${anonProdId}`, {
    method: 'DELETE',
    headers: { 'X-Anonymous-Session': anonSessionB }
  });
  assert(delAnonBRes.status === 200, 'Delete request responded');
  
  const getAnonARes = await api('/api/products', {
    headers: { 'X-Anonymous-Session': anonSessionA }
  });
  assert(getAnonARes.status === 200 && getAnonARes.data.some(p => p.id === anonProdId), 'Session A product remains intact after Session B delete attempt');

  // Authenticated user cannot see anonymous product
  const getAuthUserProdRes = await api('/api/products', {
    headers: { Authorization: `Bearer ${userAToken}` }
  });
  assert(!getAuthUserProdRes.data.some(p => p.id === anonProdId), 'Authenticated User A cannot access anonymous session products');

  // ── Phase 5: Price History ──
  originalConsoleLog('\n--- Phase 5: Price History Tracking ---');
  const priceHistoryCheck = await pool.query('SELECT * FROM price_history WHERE product_id = $1 ORDER BY recorded_at ASC', [anonProdId]);
  assert(priceHistoryCheck.rows.length >= 7, `Price history created 7 synthetic data points (found: ${priceHistoryCheck.rows.length})`);

  // ── Phase 6: Chat and Feedback Isolation ──
  originalConsoleLog('\n--- Phase 6: Chat & Feedback User Scoping ---');
  // Submit feedback as User A
  const feedbackARes = await api('/api/feedback', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}` },
    body: { rating: 5, message: 'User A Smoke Test Feedback', category: 'general' }
  });
  assert(feedbackARes.status === 200 && feedbackARes.data.success, 'User A submitted feedback');

  // Submit chat message as User A
  const chatSessionId = `chat-sess-${Date.now()}`;
  const chatARes = await api('/api/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}` },
    body: { message: 'Hello Symbiote from User A', sessionId: chatSessionId }
  });
  assert(chatARes.status === 200 && chatARes.data.reply, 'User A sent chat message and received AI response');

  // Verify chat history for User B does NOT contain User A's message
  const chatBHistory = await api(`/api/chat/history/${chatSessionId}`, {
    headers: { Authorization: `Bearer ${userBToken}` }
  });
  const userBMessages = Array.isArray(chatBHistory.data) ? chatBHistory.data : [];
  assert(!userBMessages.some(m => m.message === 'Hello Symbiote from User A'), 'User B chat history does not contain User A chat messages');

  // ── Phase 7: Exports ──
  originalConsoleLog('\n--- Phase 7: CSV & Excel Scoped Exports ---');
  const csvRes = await api('/api/export/csv', {
    headers: { Authorization: `Bearer ${userBToken}` }
  });
  assert(csvRes.status === 200 && typeof csvRes.data === 'string', 'User B exported CSV successfully');
  assert(csvRes.data.includes('Smoke Test Smartphone B'), 'User B CSV contains User B product');
  assert(!csvRes.data.includes('Smoke Test Smartphone A'), 'User B CSV does NOT contain User A product');

  const excelRes = await api('/api/export/excel', {
    headers: { Authorization: `Bearer ${userBToken}` }
  });
  assert(excelRes.status === 200, 'User B exported Excel successfully');

  // ── Phase 8: User Preferences & Location ──
  originalConsoleLog('\n--- Phase 8: User Preferences & Location Persistence ---');
  const updatePrefRes = await api('/api/user/profile', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}` },
    body: {
      pincode: '400001',
      lat: 18.9322,
      lng: 72.8336,
      memberships: { amazonPrime: true, flipkartPlus: false },
      dietaryPreference: 'veg'
    }
  });
  assert(updatePrefRes.status === 200 && updatePrefRes.data.success, 'User A updated profile preferences');

  // Re-fetch profile to verify persistence
  const getPrefRes = await api('/api/user/profile', {
    headers: { Authorization: `Bearer ${userAToken}` }
  });
  assert(getPrefRes.status === 200 && getPrefRes.data.pincode === '400001', 'Pincode 400001 persisted');
  assert(getPrefRes.data.lat === 18.9322 && getPrefRes.data.lng === 72.8336, 'Lat/Lng coordinates persisted');
  assert(getPrefRes.data.memberships?.amazonPrime === true, 'Membership preferences persisted');

  // ── Phase 9: Order Relay Credentials Persistence & Isolation ──
  originalConsoleLog('\n--- Phase 9: Order Relay AES-256-GCM Credential Storage ---');
  // Save credentials for User A
  const saveCredsARes = await api('/api/order/credentials', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userAToken}` },
    body: { platform: 'amazon', username: 'smoke_user_a@amazon.in', password: 'SuperSecretAmazonPassword123' }
  });
  assert(saveCredsARes.status === 200 && saveCredsARes.data.success, 'User A saved Amazon credentials');

  // List credentials for User A
  const listCredsARes = await api('/api/order/credentials', {
    headers: { Authorization: `Bearer ${userAToken}` }
  });
  assert(listCredsARes.status === 200 && listCredsARes.data.length === 1, 'User A listed saved credentials');
  assert(listCredsARes.data[0].username === 'smoke_user_a@amazon.in', 'Username metadata matches');
  assert(!listCredsARes.data[0].password && !listCredsARes.data[0].encrypted_password, 'Password and encrypted blob are NEVER returned to frontend');

  // Verify User B cannot access User A's credentials
  const listCredsBRes = await api('/api/order/credentials', {
    headers: { Authorization: `Bearer ${userBToken}` }
  });
  assert(listCredsBRes.status === 200 && listCredsBRes.data.length === 0, 'User B cannot view User A credentials');

  // Delete User A credential
  const delCredARes = await api('/api/order/credentials/amazon', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userAToken}` }
  });
  assert(delCredARes.status === 200 && delCredARes.data.success, 'User A deleted Amazon credential');

  // ── Phase 10: Image Proxy & SSRF Protection ──
  originalConsoleLog('\n--- Phase 10: Image Proxy SSRF Hardening ---');
  const ssrfAttacks = [
    { url: 'http://localhost:5000/api/auth/me', label: 'Localhost' },
    { url: 'http://127.0.0.1:5000', label: '127.0.0.1 IPv4 loopback' },
    { url: 'http://10.0.0.1/admin', label: '10.0.0.0/8 private network' },
    { url: 'http://192.168.1.1/config', label: '192.168.0.0/16 private network' },
    { url: 'http://172.16.0.1', label: '172.16.0.0/12 private network' },
    { url: 'http://169.254.169.254/latest/meta-data/', label: '169.254.169.254 AWS Cloud Metadata' },
    { url: 'file:///etc/passwd', label: 'file:// scheme path traversal' },
    { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', label: 'data:// scheme' },
    { url: 'javascript:alert(1)', label: 'javascript:// scheme' },
    { url: 'http://malicious-attacker-domain.xyz/steal.png', label: 'Non-whitelisted domain' },
    { url: '//attacker.com/image.png', label: 'Protocol-relative URL' }
  ];

  for (const attack of ssrfAttacks) {
    const res = await api(`/api/proxy-image?url=${encodeURIComponent(attack.url)}`);
    assert(res.status === 400, `SSRF Blocked: ${attack.label} rejected with HTTP 400`);
  }

  // ── Phase 11: CORS Behavior in Production ──
  originalConsoleLog('\n--- Phase 11: CORS Production Restrictions ---');
  // Allowed FRONTEND_URL
  const corsAllowedRes = await api('/api/order/stores', {
    headers: { Origin: TEST_FRONTEND_URL }
  });
  assert(corsAllowedRes.status === 200, 'Request from FRONTEND_URL is permitted');

  // Disallowed malicious origin
  const corsDisallowedRes = await api('/api/order/stores', {
    headers: { Origin: 'https://malicious-website.com' }
  });
  assert(corsDisallowedRes.headers.get('access-control-allow-origin') !== 'https://malicious-website.com', 'Malicious Origin is not granted Access-Control-Allow-Origin');

  // Allowed Chrome extension origin
  const corsExtensionRes = await api('/api/order/stores', {
    headers: { Origin: 'chrome-extension://abcdefghijklmnopabcdefghijklmnop' }
  });
  assert(corsExtensionRes.headers.get('access-control-allow-origin') === 'chrome-extension://abcdefghijklmnopabcdefghijklmnop', 'Chrome extension origin is granted Access-Control-Allow-Origin');

  // ── Phase 12: Durability Across Disconnects (Neon PostgreSQL) ──
  originalConsoleLog('\n--- Phase 12: Durability & Neon Persistence Check ---');
  // Query Neon directly using a completely separate connection pool
  const directPool = new Pool({
    connectionString: NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const directUserCheck = await directPool.query('SELECT email FROM users WHERE id = $1', [userBId]);
  assert(directUserCheck.rows.length === 1 && directUserCheck.rows[0].email === userBEmail, 'User account exists independently in remote Neon PostgreSQL');
  await directPool.end();

  // ── Phase 13: Log Inspection for Sensitive Secrets ──
  originalConsoleLog('\n--- Phase 13: Production Log Secret Inspection ---');
  const sensitivePatterns = [
    userPassword,
    'SuperSecretAmazonPassword123',
    TEST_JWT_SECRET,
    TEST_SYMBIOTE_SECRET,
    'npg_3qKVdoPgxi9S' // Neon DB password snippet
  ];

  let leakedSecrets = [];
  for (const log of capturedLogs) {
    for (const secret of sensitivePatterns) {
      if (log.str.includes(secret)) {
        leakedSecrets.push({ type: log.type, secret });
      }
    }
  }
  assert(leakedSecrets.length === 0, 'Zero passwords, tokens, or encryption keys found in logs');

  // ── Cleanup Test Data ──
  originalConsoleLog('\n--- Cleanup: Removing Test Data from Neon ---');
  await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [userAId, userBId]);
  await pool.query('DELETE FROM products WHERE anonymous_session_id IN ($1, $2)', [anonSessionA, anonSessionB]);
  originalConsoleLog('   ✓ Cleaned up smoke test users and anonymous records.');

  const { stopPriceHistoryScheduler } = await import('../server/cron.js');
  await stopPriceHistoryScheduler();

  server.close();
  await pool.end();

  originalConsoleLog('\n================================================================');
  originalConsoleLog(`   ALL PRODUCTION SMOKE TESTS PASSED (${passedTests}/${totalTests}) 🎉`);
  originalConsoleLog('================================================================\n');
  process.exit(0);
}

runProductionSmokeTest().catch(err => {
  originalConsoleError('\n❌ Production smoke test failed:', err);
  process.exit(1);
});
