/**
 * index.js — Main Order Automator entry point
 * Delegates order automation requests to the in-process FIFO orderQueue.
 */

import { updateSession, takeScreenshot, closeSession } from './sessionManager.js';
import { automateAmazon, confirmAmazonOrder } from './platforms/amazon.js';
import { automateFlipkart, confirmFlipkartOrder } from './platforms/flipkart.js';
import { enqueueOrderJob, releaseJob } from './orderQueue.js';

// Supported stores and their automators
const SUPPORTED_STORES = {
  amazon: { automate: automateAmazon, confirm: confirmAmazonOrder, name: 'Amazon India' },
  flipkart: { automate: automateFlipkart, confirm: confirmFlipkartOrder, name: 'Flipkart' }
};

export function getSupportedStores() {
  return Object.entries(SUPPORTED_STORES).map(([key, val]) => ({ key, name: val.name }));
}

/**
 * Launch/enqueue a new order automation session.
 * Queues the job in the FIFO queue to guarantee that at most MAX_CONCURRENCY (default 1)
 * Chromium instance runs concurrently on Render.
 * Returns { sessionId, status, message } immediately.
 */
export async function launchOrderSession({ store, credentials, productUrl, productName, deliveryAddress, userId }) {
  const handler = SUPPORTED_STORES[store];
  if (!handler) {
    return {
      error: `Store "${store}" is not supported for automated ordering. Supported: ${Object.keys(SUPPORTED_STORES).join(', ')}`
    };
  }

  // Enqueue job in FIFO queue
  const queueResult = enqueueOrderJob({
    store,
    credentials,
    productUrl,
    productName,
    deliveryAddress,
    userId,
    handler
  });

  return {
    sessionId: queueResult.sessionId,
    jobId: queueResult.jobId,
    status: 'initiated',
    message: `Automation queued for ${handler.name}. Use sessionId to poll status.`
  };
}

/**
 * Confirm and finalize the order for a session.
 * Called when user clicks "Confirm & Pay" in the Symbiote UI.
 */
export async function confirmOrder(sessionId, session) {
  const handler = SUPPORTED_STORES[session.store];
  if (!handler) return { status: 'error', message: 'Unknown store' };

  updateSession(sessionId, { status: 'placing_order' });
  try {
    const result = await handler.confirm(session.page);
    await takeScreenshot(sessionId);
    updateSession(sessionId, { status: result.status, lastResult: result });
    return result;
  } catch (err) {
    updateSession(sessionId, { status: 'error', lastResult: { message: err.message } });
    return { status: 'error', message: err.message };
  } finally {
    // Schedule clean shutdown and queue slot release after 10s grace period for final screenshot
    setTimeout(async () => {
      await closeSession(sessionId);
      releaseJob(sessionId);
    }, 10000);
  }
}
