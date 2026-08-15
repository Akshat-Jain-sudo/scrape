/**
 * orderQueue.js — In-Process FIFO Queue for Order Relay Automation
 *
 * Enforces:
 * - Default maximum concurrency of 1 Playwright browser job (prevents Render memory exhaustion)
 * - Configurable maximum queue length via ORDER_RELAY_MAX_QUEUE (default: 5) -> returns 429 when full
 * - Configurable automation timeout via ORDER_RELAY_TIMEOUT_MS (default: 120000ms)
 * - Strict per-job user isolation with immutable closures (no global mutable userId)
 * - Try/finally browser resource cleanup
 * - Zero sensitive logging
 */

import { chromium } from 'playwright';
import { createSession, updateSession, takeScreenshot, closeSession } from './sessionManager.js';

export function getQueueConfig() {
  const maxConcurrency = parseInt(process.env.ORDER_RELAY_MAX_CONCURRENCY, 10);
  const maxQueue = parseInt(process.env.ORDER_RELAY_MAX_QUEUE, 10);
  const timeoutMs = parseInt(process.env.ORDER_RELAY_TIMEOUT_MS, 10);

  return {
    maxConcurrency: Number.isFinite(maxConcurrency) && maxConcurrency > 0 ? maxConcurrency : 1,
    maxQueue: Number.isFinite(maxQueue) && maxQueue >= 0 ? maxQueue : 5,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 120000
  };
}

const queue = []; // Array of pending job objects
const activeJobs = new Map(); // sessionId -> active job context

function generateJobId() {
  return `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getQueueStats() {
  return {
    queueLength: queue.length,
    activeCount: activeJobs.size,
    config: getQueueConfig()
  };
}

/**
 * Enqueue a new order automation job.
 * If queue is full, throws an error with code 'QUEUE_FULL' and statusCode 429.
 */
export function enqueueOrderJob({ store, credentials, productUrl, productName, deliveryAddress, userId, handler }) {
  const config = getQueueConfig();

  if (queue.length >= config.maxQueue) {
    const error = new Error('Order automation queue is currently full');
    error.statusCode = 429;
    error.code = 'QUEUE_FULL';
    throw error;
  }

  const jobId = generateJobId();
  // Create session upfront in 'queued' state
  const sessionId = createSession({
    browser: null,
    page: null,
    store,
    userId,
    productUrl,
    productName,
    status: 'queued'
  });

  const job = {
    jobId,
    sessionId,
    userId, // immutable authenticated user ID
    store,
    credentials: { ...credentials }, // immutable job-scoped credentials
    productUrl,
    productName,
    deliveryAddress: deliveryAddress ? { ...deliveryAddress } : null,
    handler,
    enqueuedAt: Date.now()
  };

  queue.push(job);
  console.log(`[OrderQueue] Job ${jobId} enqueued for session ${sessionId}. Queue depth: ${queue.length}, Active: ${activeJobs.size}`);

  // Trigger processing asynchronously
  setImmediate(() => {
    processQueue().catch(err => {
      console.error('[OrderQueue] Uncaught error in processQueue:', err.message);
    });
  });

  return {
    sessionId,
    jobId,
    status: 'initiated',
    message: 'Order automation queued. Use sessionId to poll status.'
  };
}

/**
 * Process next job in FIFO queue if concurrency permits.
 */
export async function processQueue() {
  const config = getQueueConfig();

  if (activeJobs.size >= config.maxConcurrency) {
    return;
  }

  if (queue.length === 0) {
    return;
  }

  const job = queue.shift();
  if (!job) return;

  const { jobId, sessionId, userId, store, credentials, productUrl, deliveryAddress, handler } = job;
  console.log(`[OrderQueue] Starting job ${jobId} (session ${sessionId}) for store ${store}. Queue remaining: ${queue.length}`);

  let browser = null;
  let context = null;
  let page = null;
  let timeoutHandle = null;

  const jobContext = {
    jobId,
    sessionId,
    userId,
    startedAt: Date.now()
  };
  activeJobs.set(sessionId, jobContext);

  try {
    // Launch headless Chromium with no filesystem persistent profile
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });

    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 900 },
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata'
    });

    page = await context.newPage();

    // Attach browser and page to session
    updateSession(sessionId, {
      browser,
      page,
      status: 'logging_in'
    });

    await takeScreenshot(sessionId);

    // Automation timeout race
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        const timeoutErr = new Error('Order automation timed out');
        timeoutErr.code = 'AUTOMATION_TIMEOUT';
        reject(timeoutErr);
      }, config.timeoutMs);
    });

    const automationPromise = handler.automate(page, credentials, productUrl, deliveryAddress);

    const result = await Promise.race([automationPromise, timeoutPromise]);

    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }

    await takeScreenshot(sessionId);
    updateSession(sessionId, { status: result.status, lastResult: result });

    if (result.status === 'awaiting_payment') {
      console.log(`[OrderQueue] Job ${jobId} reached checkout / awaiting_payment.`);
      // Browser stays active until user confirms or session times out
    } else {
      console.log(`[OrderQueue] Job ${jobId} finished with status '${result.status}'. Cleaning up session.`);
      await closeSession(sessionId);
      releaseJob(sessionId);
    }
  } catch (err) {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
    console.error(`[OrderQueue] Job ${jobId} (session ${sessionId}) error:`, err.message);

    updateSession(sessionId, {
      status: 'error',
      lastResult: { message: err.code === 'AUTOMATION_TIMEOUT' ? 'Order automation timed out' : err.message }
    });

    await takeScreenshot(sessionId);
    await closeSession(sessionId);
    releaseJob(sessionId);
  }
}

/**
 * Release an active job slot and process next job in queue.
 */
export function releaseJob(sessionId) {
  if (activeJobs.has(sessionId)) {
    const job = activeJobs.get(sessionId);
    console.log(`[OrderQueue] Released slot for job ${job.jobId} (session ${sessionId})`);
    activeJobs.delete(sessionId);
    setImmediate(() => {
      processQueue().catch(err => {
        console.error('[OrderQueue] Uncaught error in processQueue on release:', err.message);
      });
    });
  }
}

/**
 * Reset queue state for test isolations.
 */
export function resetQueueForTesting() {
  queue.length = 0;
  activeJobs.clear();
}
