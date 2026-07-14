/**
 * index.js — Main Order Automator entry point
 * Launches a Playwright browser session and delegates to store-specific automators.
 */

import { chromium } from 'playwright';
import { createSession, updateSession, takeScreenshot, closeSession } from './sessionManager.js';
import { automateAmazon, confirmAmazonOrder } from './platforms/amazon.js';
import { automateFlipkart, confirmFlipkartOrder } from './platforms/flipkart.js';

// Supported stores and their automators
const SUPPORTED_STORES = {
  amazon: { automate: automateAmazon, confirm: confirmAmazonOrder, name: 'Amazon India' },
  flipkart: { automate: automateFlipkart, confirm: confirmFlipkartOrder, name: 'Flipkart' }
};

export function getSupportedStores() {
  return Object.entries(SUPPORTED_STORES).map(([key, val]) => ({ key, name: val.name }));
}

/**
 * Launch a new order automation session.
 * Returns { sessionId, status, message } immediately.
 * The actual automation runs in background; use /api/order/screenshot/:id to poll state.
 */
export async function launchOrderSession({ store, credentials, productUrl, productName, deliveryAddress, userId }) {
  const handler = SUPPORTED_STORES[store];
  if (!handler) {
    return { error: `Store "${store}" is not supported for automated ordering. Supported: ${Object.keys(SUPPORTED_STORES).join(', ')}` };
  }

  // Launch headless browser
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata'
  });
  const page = await context.newPage();

  const sessionId = createSession({ browser, page, store, userId, productUrl, productName });

  // Run automation asynchronously
  (async () => {
    try {
      updateSession(sessionId, { status: 'logging_in' });
      await takeScreenshot(sessionId);

      const result = await handler.automate(page, credentials, productUrl, deliveryAddress);

      await takeScreenshot(sessionId);
      updateSession(sessionId, { status: result.status, lastResult: result });

      if (result.status === 'needs_otp') {
        // Switch to headed mode is not possible post-launch; inform user to use manual flow
        console.log(`[Automator] Session ${sessionId}: OTP required`);
      }
    } catch (err) {
      console.error(`[Automator] Session ${sessionId} error:`, err.message);
      await takeScreenshot(sessionId);
      updateSession(sessionId, { status: 'error', lastResult: { message: err.message } });
    }
  })();

  return { sessionId, status: 'initiated', message: `Automation started for ${handler.name}. Use sessionId to poll status.` };
}

/**
 * Confirm and finalize the order for a session.
 * Called when user clicks "Confirm & Pay" in the Symbiote UI.
 */
export async function confirmOrder(sessionId, session) {
  const handler = SUPPORTED_STORES[session.store];
  if (!handler) return { status: 'error', message: 'Unknown store' };

  updateSession(sessionId, { status: 'placing_order' });
  const result = await handler.confirm(session.page);
  await takeScreenshot(sessionId);
  updateSession(sessionId, { status: result.status, lastResult: result });

  // Close the browser after success or definitive failure
  if (result.status === 'placed' || result.status === 'error') {
    setTimeout(() => closeSession(sessionId), 10000); // give 10s for final screenshot
  }

  return result;
}
