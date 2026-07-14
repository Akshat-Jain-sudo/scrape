const BACKEND_URL = 'http://localhost:5000';

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
    chrome.storage.local.set({ auth_token: request.token });
    console.log('[Symbiote Background] Auth token updated');
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
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BACKEND_URL}/api/extension/sync`, {
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
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Call server to compare prices
    const response = await fetch(`${BACKEND_URL}/api/compare`, {
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
