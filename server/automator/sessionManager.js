/**
 * sessionManager.js
 * Tracks live Playwright browser sessions. Each session is keyed by a UUID.
 * Sessions expire after 5 minutes of inactivity and the browser is closed cleanly.
 */

import { releaseJob } from './orderQueue.js';

const sessions = new Map(); // sessionId -> { id, browser, page, status, createdAt, lastActivity, screenshotBase64, store, userId }
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function generateId() {
  return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createSession({ browser = null, page = null, store, userId, productUrl, productName, status = 'queued' }) {
  const id = generateId();
  sessions.set(id, {
    id,
    browser,
    page,
    store,
    userId,
    productUrl,
    productName,
    status,
    screenshotBase64: null,
    createdAt: new Date().toISOString(),
    lastActivity: Date.now(),
    history: [{ status, timestamp: new Date().toISOString() }]
  });
  return id;
}

export function getSession(id) {
  return sessions.get(id) || null;
}

export function updateSession(id, updates) {
  const session = sessions.get(id);
  if (!session) return false;
  Object.assign(session, updates, { lastActivity: Date.now() });
  if (updates.status) {
    session.history.push({ status: updates.status, timestamp: new Date().toISOString() });
  }
  return true;
}

export async function takeScreenshot(id) {
  const session = sessions.get(id);
  if (!session || !session.page) return null;
  try {
    const buffer = await session.page.screenshot({ type: 'jpeg', quality: 75, fullPage: false });
    const b64 = buffer.toString('base64');
    session.screenshotBase64 = b64;
    session.lastActivity = Date.now();
    return b64;
  } catch {
    return null;
  }
}

export async function closeSession(id) {
  const session = sessions.get(id);
  if (!session) {
    releaseJob(id);
    return;
  }
  try {
    if (session.browser) {
      await session.browser.close();
    }
  } catch {
    /* ignore already closed browser */
  } finally {
    sessions.delete(id);
    releaseJob(id);
  }
}

// Background cleanup — close sessions that have been idle > 5 minutes
const cleanupTimer = setInterval(async () => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      console.log(`[SessionManager] Closing idle session ${id}`);
      await closeSession(id);
    }
  }
}, 60 * 1000);

if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

export function listSessions(userId) {
  const result = [];
  for (const [, session] of sessions.entries()) {
    if (session.userId === userId) {
      result.push({
        id: session.id,
        store: session.store,
        productName: session.productName,
        status: session.status,
        createdAt: session.createdAt,
        history: session.history
      });
    }
  }
  return result;
}
