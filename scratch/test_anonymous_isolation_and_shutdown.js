/**
 * test_anonymous_isolation_and_shutdown.js
 * Verifies:
 * 1. Anonymous Session A cannot see Session B data
 * 2. Anonymous Session B cannot see Session A data
 * 3. Missing anonymous session does not access a shared "anonymous" bucket (returns 400 or empty array)
 * 4. Authenticated User A cannot access User B data
 * 5. Existing authenticated behavior remains unchanged
 * 6. Order Relay confirmOrder() releases queue slot immediately
 * 7. Location endpoints with timeout protection
 */

import http from 'node:http';
import crypto from 'node:crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import app from '../server/app.js';
import { initNeonDb, createUser, getNeonPool } from '../server/neonDb.js';
import { getQueueStats, resetQueueForTesting, enqueueOrderJob } from '../server/automator/orderQueue.js';
import { confirmOrder, launchOrderSession } from '../server/automator/index.js';
import { getSession, closeSession } from '../server/automator/sessionManager.js';
import { saveCredentials } from '../server/automator/credentialStore.js';

const JWT_SECRET = process.env.JWT_SECRET || 'symbiote-jwt-secret-key-2024-change-in-prod';
let server;
let BASE_URL;

function assert(condition, message) {
  if (!condition) {
    console.error(`   ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`   ✅ PASS: ${message}`);
}

async function startServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      BASE_URL = `http://localhost:${port}`;
      console.log(`   🚀 In-process test server running at ${BASE_URL}`);
      resolve();
    });
  });
}

async function runTests() {
  console.log('🧪 Starting Anonymous Session Isolation & Production Hardening Test Suite...\n');

  try {
    await initNeonDb();
    await startServer();

    // Setup Test Users
    const emailA = `test_user_a_${Date.now()}@example.com`;
    const emailB = `test_user_b_${Date.now()}@example.com`;
    const userA = await createUser(emailA, 'Password123!', 'User A');
    const userB = await createUser(emailB, 'Password123!', 'User B');

    const tokenA = jwt.sign({ userId: userA.id, email: userA.email }, JWT_SECRET, { expiresIn: '1h' });
    const tokenB = jwt.sign({ userId: userB.id, email: userB.email }, JWT_SECRET, { expiresIn: '1h' });

    const headersA = { Authorization: `Bearer ${tokenA}` };
    const headersB = { Authorization: `Bearer ${tokenB}` };

    // Setup Anonymous Sessions
    const anonSessionA = `anon-${crypto.randomUUID()}`;
    const anonSessionB = `anon-${crypto.randomUUID()}`;

    const headersAnonA = { 'X-Anonymous-Session': anonSessionA };
    const headersAnonB = { 'X-Anonymous-Session': anonSessionB };

    // -------------------------------------------------------------
    // TEST 1: Missing anonymous session header cannot save products
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Missing anonymous session rejects write with 400 ---');
    try {
      await axios.post(`${BASE_URL}/api/products`, {
        products: [{ id: 'unauth-prod-1', name: 'Test Unauth Item', price: 999 }]
      });
      assert(false, 'Expected 400 when saving product without authentication or X-Anonymous-Session');
    } catch (err) {
      assert(err.response?.status === 400, '1. Missing anonymous session returns HTTP 400 on product save');
    }

    // -------------------------------------------------------------
    // TEST 2: Missing anonymous session reads empty product list
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Missing anonymous session does not access a shared bucket ---');
    const unauthGetRes = await axios.get(`${BASE_URL}/api/products`);
    assert(Array.isArray(unauthGetRes.data) && unauthGetRes.data.length === 0, '2. Unauthenticated GET /api/products returns empty array []');

    // -------------------------------------------------------------
    // TEST 3 & 4: Anonymous Session A and Session B save products independently
    // -------------------------------------------------------------
    console.log('\n--- Test 3 & 4: Anonymous Session A & B product isolation ---');
    const prodA = { id: `anon-a-prod-${Date.now()}`, name: 'Anon A Product', price: 1500, source: 'flipkart' };
    const prodB = { id: `anon-b-prod-${Date.now()}`, name: 'Anon B Product', price: 2500, source: 'amazon' };

    await axios.post(`${BASE_URL}/api/products`, { products: [prodA] }, { headers: headersAnonA });
    await axios.post(`${BASE_URL}/api/products`, { products: [prodB] }, { headers: headersAnonB });

    const resAnonA = await axios.get(`${BASE_URL}/api/products`, { headers: headersAnonA });
    const resAnonB = await axios.get(`${BASE_URL}/api/products`, { headers: headersAnonB });

    assert(
      resAnonA.data.length === 1 && resAnonA.data[0].id === prodA.id,
      '3. Anonymous Session A retrieves ONLY Session A products'
    );
    assert(
      resAnonB.data.length === 1 && resAnonB.data[0].id === prodB.id,
      '4. Anonymous Session B retrieves ONLY Session B products'
    );

    // -------------------------------------------------------------
    // TEST 5: Anonymous Session A cannot delete Session B product
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Anonymous cross-session deletion protection ---');
    await axios.delete(`${BASE_URL}/api/products/${prodB.id}`, { headers: headersAnonA });
    const checkBAfterDelete = await axios.get(`${BASE_URL}/api/products`, { headers: headersAnonB });
    assert(
      checkBAfterDelete.data.some(p => p.id === prodB.id),
      '5. Anonymous Session A cannot delete Session B product'
    );

    // -------------------------------------------------------------
    // TEST 6: Authenticated User Isolation remains intact
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Authenticated User Isolation ---');
    const prodUserA = { id: `user-a-prod-${Date.now()}`, name: 'User A Product', price: 5000, source: 'amazon' };
    const prodUserB = { id: `user-b-prod-${Date.now()}`, name: 'User B Product', price: 7000, source: 'flipkart' };

    await axios.post(`${BASE_URL}/api/products`, { products: [prodUserA] }, { headers: headersA });
    await axios.post(`${BASE_URL}/api/products`, { products: [prodUserB] }, { headers: headersB });

    const resUserA = await axios.get(`${BASE_URL}/api/products`, { headers: headersA });
    const resUserB = await axios.get(`${BASE_URL}/api/products`, { headers: headersB });

    assert(
      resUserA.data.some(p => p.id === prodUserA.id) && !resUserA.data.some(p => p.id === prodUserB.id),
      '6a. User A sees only User A products, not User B products'
    );
    assert(
      resUserB.data.some(p => p.id === prodUserB.id) && !resUserB.data.some(p => p.id === prodUserA.id),
      '6b. User B sees only User B products, not User A products'
    );

    // -------------------------------------------------------------
    // TEST 7: Anonymous Feedback and Chat Isolation
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Anonymous Feedback & Chat Isolation ---');
    await axios.post(`${BASE_URL}/api/feedback`, { category: 'feature', message: 'Feedback from Session A' }, { headers: headersAnonA });
    await axios.post(`${BASE_URL}/api/feedback`, { category: 'bug', message: 'Feedback from Session B' }, { headers: headersAnonB });

    const feedbackA = await axios.get(`${BASE_URL}/api/feedback`, { headers: headersAnonA });
    const feedbackB = await axios.get(`${BASE_URL}/api/feedback`, { headers: headersAnonB });

    assert(
      feedbackA.data.length === 1 && feedbackA.data[0].message === 'Feedback from Session A',
      '7a. Feedback isolated to Session A'
    );
    assert(
      feedbackB.data.length === 1 && feedbackB.data[0].message === 'Feedback from Session B',
      '7b. Feedback isolated to Session B'
    );

    // -------------------------------------------------------------
    // TEST 8: Order Relay Queue Immediate Release on Confirm
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Order Relay Immediate Slot Release on confirmOrder ---');
    resetQueueForTesting();

    await saveCredentials(userA.id, 'amazon', 'test_user_a', 'pwd_a');

    let nextJobExecuted = false;
    const fastHandler = {
      automate: async () => ({ status: 'awaiting_payment' }),
      confirm: async () => ({ status: 'placed', orderId: 'ORDER-12345' })
    };
    const queuedHandler = {
      automate: async () => {
        nextJobExecuted = true;
        return { status: 'awaiting_payment' };
      }
    };

    const initialLaunch = enqueueOrderJob({
      store: 'amazon',
      credentials: { username: 'test_user_a', password: 'pwd' },
      productUrl: 'http://test',
      userId: userA.id,
      handler: fastHandler
    });

    // Wait for job 1 to reach awaiting_payment
    let initialSession;
    const startWait1 = Date.now();
    while (Date.now() - startWait1 < 10000) {
      initialSession = getSession(initialLaunch.sessionId);
      if (initialSession && initialSession.status === 'awaiting_payment') break;
      await new Promise(r => setTimeout(r, 100));
    }
    assert(initialSession && initialSession.status === 'awaiting_payment', '8a. First order reached awaiting_payment');

    // Enqueue second job waiting in FIFO queue
    const secondLaunch = enqueueOrderJob({
      store: 'amazon',
      credentials: { username: 'test_user_a', password: 'pwd' },
      productUrl: 'http://test2',
      userId: userA.id,
      handler: queuedHandler
    });

    const statsBeforeConfirm = getQueueStats();
    assert(statsBeforeConfirm.queueLength === 1, '8b. Second job is waiting in queue');

    const confirmStartTime = Date.now();
    const confirmResult = await confirmOrder(initialLaunch.sessionId, initialSession);
    const confirmDuration = Date.now() - confirmStartTime;

    assert(confirmResult.status === 'placed', '8c. confirmOrder succeeded with status placed');
    assert(confirmDuration < 3000, `8d. confirmOrder returned immediately (${confirmDuration}ms, no 10s wait)`);

    // Wait for second job to dequeue and run
    const startWaitNext = Date.now();
    while (!nextJobExecuted && Date.now() - startWaitNext < 3000) {
      await new Promise(r => setTimeout(r, 100));
    }
    assert(nextJobExecuted === true, '8e. Next queued job ran immediately upon slot release');

    await closeSession(secondLaunch.sessionId);

    // -------------------------------------------------------------
    // TEST 9: Geocoding fallback and timeout handling
    // -------------------------------------------------------------
    console.log('\n--- Test 9: Location endpoint responds cleanly without server crash ---');
    const autoRes = await axios.get(`${BASE_URL}/api/location/autocomplete?input=Mumbai`);
    assert(Array.isArray(autoRes.data), '9. /api/location/autocomplete returned array with timeout protection');

    console.log('\n==================================================');
    console.log('Production Hardening Test Suite: All Tests Passed! 🎉');
    console.log('==================================================\n');

  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  } finally {
    const { stopPriceHistoryScheduler } = await import('../server/cron.js');
    await stopPriceHistoryScheduler();
    if (server) {
      server.close();
    }
    const pool = getNeonPool();
    await pool.end();
  }
}

runTests();
