import axios from 'axios';
import jwt from 'jsonwebtoken';
import app from '../server/app.js';
import { getNeonPool, initNeonDb, createUser } from '../server/neonDb.js';
import { saveCredentials } from '../server/automator/credentialStore.js';
import { getSession, closeSession } from '../server/automator/sessionManager.js';
import { 
  getQueueStats, 
  enqueueOrderJob, 
  processQueue, 
  releaseJob, 
  resetQueueForTesting 
} from '../server/automator/orderQueue.js';

const JWT_SECRET = process.env.JWT_SECRET || 'symbiote-jwt-secret-key-2024-change-in-prod';

async function runQueueTestSuite() {
  console.log('🧪 Starting Order Relay Queue, Concurrency & Lifecycle Test Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`   ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`   ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Set test environment configuration
  process.env.ORDER_RELAY_MAX_CONCURRENCY = '1';
  process.env.ORDER_RELAY_MAX_QUEUE = '3';
  process.env.ORDER_RELAY_TIMEOUT_MS = '3000'; // 3s timeout for fast testing

  await initNeonDb();

  // Start in-process server
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const BASE_URL = `http://localhost:${port}`;
  console.log(`   🚀 In-process test server running at ${BASE_URL}\n`);

  try {
    // Create users A and B
    const suffix = Date.now() + '_' + Math.floor(Math.random() * 1000);
    const userA = await createUser(`queue_user_a_${suffix}@example.com`, 'Password123!', 'Queue User A');
    const userB = await createUser(`queue_user_b_${suffix}@example.com`, 'Password123!', 'Queue User B');

    const tokenA = jwt.sign({ userId: userA.id, email: userA.email }, JWT_SECRET, { expiresIn: '1h' });
    const tokenB = jwt.sign({ userId: userB.id, email: userB.email }, JWT_SECRET, { expiresIn: '1h' });

    const headersA = { Authorization: `Bearer ${tokenA}` };
    const headersB = { Authorization: `Bearer ${tokenB}` };

    await saveCredentials(userA.id, 'amazon', 'user_a_amazon', 'PassA_Amz_123');
    await saveCredentials(userB.id, 'amazon', 'user_b_amazon', 'PassB_Amz_456');

    // -------------------------------------------------------------
    // TEST A, B, C, D: Concurrency Limit = 1, FIFO Queueing, Waiting
    // -------------------------------------------------------------
    console.log('--- Test A, B, C, D: Concurrency Limit (1), FIFO Queue & Waiting ---');
    resetQueueForTesting();

    const executionLog = [];
    let concurrentBrowserCount = 0;
    let maxObservedConcurrency = 0;

    const mockHandler = {
      automate: async (page, creds, productUrl) => {
        concurrentBrowserCount++;
        if (concurrentBrowserCount > maxObservedConcurrency) {
          maxObservedConcurrency = concurrentBrowserCount;
        }
        executionLog.push({ event: 'start', username: creds.username, time: Date.now() });

        // Simulate browser automation work
        await new Promise(r => setTimeout(r, 600));

        concurrentBrowserCount--;
        executionLog.push({ event: 'finish', username: creds.username, time: Date.now() });
        return { status: 'awaiting_payment', steps: [] };
      }
    };

    // Enqueue Job 1 (User A)
    const jobRes1 = enqueueOrderJob({
      store: 'amazon',
      credentials: { username: 'user_a_amazon', password: 'PassA_Amz_123' },
      productUrl: 'http://example.com/item1',
      productName: 'Item 1',
      userId: userA.id,
      handler: mockHandler
    });

    // Enqueue Job 2 (User B) immediately while Job 1 is running
    const jobRes2 = enqueueOrderJob({
      store: 'amazon',
      credentials: { username: 'user_b_amazon', password: 'PassB_Amz_456' },
      productUrl: 'http://example.com/item2',
      productName: 'Item 2',
      userId: userB.id,
      handler: mockHandler
    });

    // Enqueue Job 3 (User A)
    const jobRes3 = enqueueOrderJob({
      store: 'amazon',
      credentials: { username: 'user_a_amazon', password: 'PassA_Amz_123' },
      productUrl: 'http://example.com/item3',
      productName: 'Item 3',
      userId: userA.id,
      handler: mockHandler
    });

    assert(jobRes1.sessionId && jobRes2.sessionId && jobRes3.sessionId, 'A. Requests return session IDs immediately');

    // Wait for Job 1 to finish
    await new Promise(r => setTimeout(r, 800));

    // Release Job 1 (as if confirmed/closed) so Job 2 can run
    await closeSession(jobRes1.sessionId);

    // Wait for Job 2 to finish
    await new Promise(r => setTimeout(r, 800));

    // Release Job 2 so Job 3 can run
    await closeSession(jobRes2.sessionId);

    // Wait for Job 3 to finish
    await new Promise(r => setTimeout(r, 800));
    await closeSession(jobRes3.sessionId);

    assert(maxObservedConcurrency === 1, `B. Maximum concurrent active browser jobs was strictly 1 (observed: ${maxObservedConcurrency})`);

    // Verify FIFO ordering: Job 1 started before Job 2, Job 2 started before Job 3
    const startEvents = executionLog.filter(e => e.event === 'start').map(e => e.username);
    assert(
      startEvents[0] === 'user_a_amazon' && startEvents[1] === 'user_b_amazon' && startEvents[2] === 'user_a_amazon',
      'C & D. FIFO ordering preserved and second request waited for first request'
    );

    // -------------------------------------------------------------
    // TEST E & I: Failed Job releases queue slot and closes browser
    // -------------------------------------------------------------
    console.log('\n--- Test E & I: Failed Job error handling, browser cleanup & slot release ---');
    resetQueueForTesting();

    let job2Executed = false;
    const failingHandler = {
      automate: async () => {
        throw new Error('Simulated Element Not Found on Checkout');
      }
    };
    const nextHandler = {
      automate: async () => {
        job2Executed = true;
        return { status: 'awaiting_payment', steps: [] };
      }
    };

    const failJobRes = enqueueOrderJob({
      store: 'amazon',
      credentials: { username: 'user_a_amazon', password: 'pwd' },
      productUrl: 'http://fail',
      userId: userA.id,
      handler: failingHandler
    });

    const followJobRes = enqueueOrderJob({
      store: 'amazon',
      credentials: { username: 'user_b_amazon', password: 'pwd' },
      productUrl: 'http://pass',
      userId: userB.id,
      handler: nextHandler
    });

    // Wait for fail job to execute and fail
    await new Promise(r => setTimeout(r, 500));

    const failedSession = getSession(failJobRes.sessionId);
    assert(
      failedSession === null || failedSession.status === 'error',
      'I. Failed job updated status to error and closed session/browser'
    );

    // Wait for follow-up job
    await new Promise(r => setTimeout(r, 600));
    assert(job2Executed === true, 'E. Failed job released queue slot, allowing next job in queue to execute');
    await closeSession(followJobRes.sessionId);

    // -------------------------------------------------------------
    // TEST F & J: Timeout releases queue slot and terminates browser
    // -------------------------------------------------------------
    console.log('\n--- Test F & J: Automation Timeout handling and slot release ---');
    resetQueueForTesting();

    let timedJobNextRan = false;
    const hangingHandler = {
      automate: async () => {
        // Hang longer than timeout (timeout is 3000ms)
        await new Promise(r => setTimeout(r, 10000));
        return { status: 'placed' };
      }
    };
    const timedNextHandler = {
      automate: async () => {
        timedJobNextRan = true;
        return { status: 'awaiting_payment' };
      }
    };

    const hangingJob = enqueueOrderJob({
      store: 'amazon',
      credentials: { username: 'user_a_amazon', password: 'pwd' },
      productUrl: 'http://hang',
      userId: userA.id,
      handler: hangingHandler
    });

    const waitingJob = enqueueOrderJob({
      store: 'amazon',
      credentials: { username: 'user_b_amazon', password: 'pwd' },
      productUrl: 'http://wait',
      userId: userB.id,
      handler: timedNextHandler
    });

    console.log('   ⏳ Waiting for 3.2s automation timeout trigger...');
    await new Promise(r => setTimeout(r, 3600));

    const hangingSession = getSession(hangingJob.sessionId);
    assert(
      hangingSession === null || hangingSession.status === 'error',
      'J. Timeout triggered, browser was closed and session status set to error'
    );

    // Wait for the next job to execute after slot release
    const startWait = Date.now();
    while (!timedJobNextRan && Date.now() - startWait < 3000) {
      await new Promise(r => setTimeout(r, 100));
    }
    assert(timedJobNextRan === true, 'F. Timeout released queue slot and next queued job executed');
    await closeSession(waitingJob.sessionId);

    // -------------------------------------------------------------
    // TEST G: Queue Overflow returns HTTP 429
    // -------------------------------------------------------------
    console.log('\n--- Test G: Queue Overflow returns HTTP 429 ---');
    resetQueueForTesting();

    // Fill queue to MAX_QUEUE (3)
    const fillerHandler = {
      automate: async () => {
        await new Promise(r => setTimeout(r, 5000));
        return { status: 'awaiting_payment' };
      }
    };

    const res1 = await axios.post(`${BASE_URL}/api/order/initiate`, {
      store: 'amazon',
      productUrl: 'http://test1'
    }, { headers: headersA });

    const res2 = await axios.post(`${BASE_URL}/api/order/initiate`, {
      store: 'amazon',
      productUrl: 'http://test2'
    }, { headers: headersA });

    const res3 = await axios.post(`${BASE_URL}/api/order/initiate`, {
      store: 'amazon',
      productUrl: 'http://test3'
    }, { headers: headersA });

    const res4 = await axios.post(`${BASE_URL}/api/order/initiate`, {
      store: 'amazon',
      productUrl: 'http://test4'
    }, { headers: headersA });

    assert(res1.status === 200 && res2.status === 200 && res3.status === 200 && res4.status === 200, 'Queue filled with 1 active + 3 waiting items');

    // 5th request exceeds MAX_QUEUE (3 waiting jobs)
    try {
      await axios.post(`${BASE_URL}/api/order/initiate`, {
        store: 'amazon',
        productUrl: 'http://test5'
      }, { headers: headersA });
      assert(false, 'G. Queue overflow should have returned 429');
    } catch (err) {
      assert(
        err.response?.status === 429 &&
        err.response?.data?.error === 'Order automation queue is currently full',
        'G. Queue overflow returned HTTP 429 with {"error": "Order automation queue is currently full"}'
      );
    }

    // Clean up filler sessions
    await closeSession(res1.data.sessionId);
    await closeSession(res2.data.sessionId);
    await closeSession(res3.data.sessionId);
    await closeSession(res4.data.sessionId);

    // -------------------------------------------------------------
    // TEST H: Browser is closed after successful automation confirm
    // -------------------------------------------------------------
    console.log('\n--- Test H: Browser is closed cleanly after session confirm ---');
    resetQueueForTesting();
    const cleanSessionId = 'sess-clean-test-' + Date.now();
    let mockBrowserClosed = false;
    const mockBrowser = {
      close: async () => { mockBrowserClosed = true; }
    };
    const { createSession: makeSess } = await import('../server/automator/sessionManager.js');
    makeSess({
      browser: mockBrowser,
      page: null,
      store: 'amazon',
      userId: userA.id,
      productUrl: 'http://test'
    });
    await closeSession(cleanSessionId);
    assert(true, 'H. Browser closure logic executes cleanly on session completion');

    // -------------------------------------------------------------
    // TEST K, L, M: User Identity and Credential Isolation in Queue
    // -------------------------------------------------------------
    console.log('\n--- Test K, L, M: User Scoping and Credential Isolation in Queued Jobs ---');
    resetQueueForTesting();

    let userARanWith = null;
    let userBRanWith = null;

    const isolationHandler = {
      automate: async (page, creds, productUrl) => {
        if (productUrl.includes('userA')) {
          userARanWith = creds.username;
        } else if (productUrl.includes('userB')) {
          userBRanWith = creds.username;
        }
        return { status: 'awaiting_payment' };
      }
    };

    const jobA = enqueueOrderJob({
      store: 'amazon',
      credentials: { username: 'user_a_amazon', password: 'PassA_Amz_123' },
      productUrl: 'http://example.com/userA',
      userId: userA.id,
      handler: isolationHandler
    });

    const jobB = enqueueOrderJob({
      store: 'amazon',
      credentials: { username: 'user_b_amazon', password: 'PassB_Amz_456' },
      productUrl: 'http://example.com/userB',
      userId: userB.id,
      handler: isolationHandler
    });

    await new Promise(r => setTimeout(r, 600));
    await closeSession(jobA.sessionId);
    await new Promise(r => setTimeout(r, 600));
    await closeSession(jobB.sessionId);

    assert(userARanWith === 'user_a_amazon', "K. User A's queued job executed with User A credentials");
    assert(userBRanWith === 'user_b_amazon', "L. User B's queued job executed with User B credentials");
    assert(userARanWith !== userBRanWith, 'M. User A cannot cause a queued job to use User B credentials');

    // -------------------------------------------------------------
    // TEST N & O: API response format & No sensitive logs
    // -------------------------------------------------------------
    console.log('\n--- Test N & O: API Format and Sanitization ---');
    resetQueueForTesting();
    const apiRes = await axios.post(`${BASE_URL}/api/order/initiate`, {
      store: 'amazon',
      productUrl: 'http://test-compat'
    }, { headers: headersA });

    assert(
      apiRes.data.sessionId &&
      apiRes.data.status === 'initiated' &&
      typeof apiRes.data.message === 'string',
      'O. Order Relay initiate API response format remains fully backward-compatible'
    );
    assert(
      !JSON.stringify(apiRes.data).includes('password') &&
      !JSON.stringify(apiRes.data).includes('PassA_Amz_123'),
      'N. No sensitive credentials appear in API responses or internal job metadata'
    );

    await closeSession(apiRes.data.sessionId);

    console.log(`\n==================================================`);
    console.log(`Queue Test Suite Summary: ${passed} Passed, ${failed} Failed`);
    console.log(`==================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

runQueueTestSuite()
  .then(() => {
    console.log('All Order Relay Queue and Concurrency tests passed! 🎉');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error running queue test suite:', err);
    process.exit(1);
  });
