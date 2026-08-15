const DEFAULT_BACKEND_URL = 'http://localhost:5000';

async function getBackendUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync?.get(['backend_url'], (syncRes) => {
      if (syncRes && syncRes.backend_url) {
        return resolve(syncRes.backend_url.replace(/\/+$/, ''));
      }
      chrome.storage.local.get(['backend_url'], (localRes) => {
        resolve((localRes && localRes.backend_url ? localRes.backend_url : DEFAULT_BACKEND_URL).replace(/\/+$/, ''));
      });
    });
  });
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'syncProduct') {
    syncProductWithServer(request.product);
  } else if (request.action === 'checkPrice') {
    checkCheaperPrice(request.product)
      .then(res => sendResponse(res))
      .catch(() => sendResponse({ cheaperOptions: [] }));
    return true; // Keep message port open for async response
  } else if (request.action === 'setAuthToken') {
    if (request.token && typeof request.token === 'string' && request.token.trim()) {
      chrome.storage.local.set({ auth_token: request.token.trim() }, () => {
        console.log('[Symbiote Background] Auth token updated');
      });
    } else {
      chrome.storage.local.remove(['auth_token'], () => {
        console.log('[Symbiote Background] Auth token cleared');
      });
    }
  } else if (request.action === 'clearAuthToken') {
    chrome.storage.local.remove(['auth_token'], () => {
      console.log('[Symbiote Background] Auth token cleared');
    });
  } else if (request.action === 'setBackendUrl') {
    if (request.url) {
      const cleanUrl = request.url.replace(/\/+$/, '');
      chrome.storage.local.set({ backend_url: cleanUrl });
      chrome.storage.sync?.set({ backend_url: cleanUrl });
      console.log('[Symbiote Background] Backend URL updated to:', cleanUrl);
    }
  }
});

async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['auth_token'], (result) => {
      resolve(result.auth_token || null);
    });
  });
}

async function syncProductWithServer(product) {
  try {
    const token = await getAuthToken();
    const backendUrl = await getBackendUrl();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${backendUrl}/api/extension/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ product })
    });

    if (response.ok) {
      console.log('[Symbiote Background] Product synced successfully');
      
      // Store in recently tracked list for popup display
      chrome.storage.local.get(['tracked_products'], (res) => {
        let list = res.tracked_products || [];
        list = list.filter(p => p.productLink !== product.productLink);
        list.unshift(product);
        chrome.storage.local.set({ tracked_products: list.slice(0, 10) });
      });
    } else {
      console.error('[Symbiote Background] Failed to sync product');
    }
  } catch (error) {
    console.error('[Symbiote Background] Error syncing product:', error);
  }
}

async function checkCheaperPrice(product) {
  try {
    const token = await getAuthToken();
    const backendUrl = await getBackendUrl();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Call server to compare prices
    const response = await fetch(`${backendUrl}/api/compare`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: product.name,
        category: 'electronics' // fallback category
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.results) {
        // Filter results that are cheaper than current store price
        const cheaperOptions = data.results
          .filter(r => r.price < product.price)
          .map(r => ({
            store: r.source,
            price: r.price,
            url: r.productLink
          }));
        
        return { cheaperOptions };
      }
    }
  } catch (error) {
    console.error('[Symbiote Background] Error checking price comparison:', error);
  }
  return { cheaperOptions: [] };
}
