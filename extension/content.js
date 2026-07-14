// Selectors mapping for Amazon and Flipkart
const STORES = {
  amazon: {
    name: 'Amazon India',
    selectors: {
      title: '#productTitle',
      price: '.a-price-whole, #priceblock_ourprice, #priceblock_dealprice',
      originalPrice: '.a-text-strike, #priceblock_listprice',
      image: '#landingImage, #imgBlkFront',
      discount: '.savingsPercentage, .a-size-large.a-color-price'
    }
  },
  flipkart: {
    name: 'Flipkart',
    selectors: {
      title: '.B_NuCI, .VU-ZEz',
      price: '._30jeq3._16Jk6d, .Nx91hl',
      originalPrice: '._3I9_R0, .yRaY8j',
      image: '._396cs4._2amPTt._3qX052, .DByo1U',
      discount: '._3Ay6Sb, .UkC1ED'
    }
  }
};

function getStoreKey() {
  const host = window.location.hostname;
  if (host.includes('amazon.')) return 'amazon';
  if (host.includes('flipkart.')) return 'flipkart';
  return null;
}

function cleanPrice(priceText) {
  if (!priceText) return 0;
  // Remove currency symbols, commas, whitespace
  const cleaned = priceText.replace(/[^\d.]/g, '');
  return parseFloat(cleaned) || 0;
}

function scrapeProduct() {
  const key = getStoreKey();
  if (!key) return null;

  const config = STORES[key];
  const data = {};

  try {
    // Title
    const titleEl = document.querySelector(config.selectors.title);
    data.name = titleEl ? titleEl.innerText.trim() : '';

    // Price
    const priceEl = document.querySelector(config.selectors.price);
    const rawPrice = priceEl ? priceEl.innerText.trim() : '';
    data.price = cleanPrice(rawPrice);
    data.priceFormatted = rawPrice ? `₹${rawPrice}` : '';

    // Original Price
    const origEl = document.querySelector(config.selectors.originalPrice);
    const rawOrig = origEl ? origEl.innerText.trim() : '';
    data.originalPrice = cleanPrice(rawOrig);
    data.originalPriceFormatted = rawOrig ? `₹${rawOrig}` : '';

    // Discount
    const discEl = document.querySelector(config.selectors.discount);
    data.discountFormatted = discEl ? discEl.innerText.trim() : '';
    data.discount = cleanPrice(data.discountFormatted);

    // Image URL
    const imgEl = document.querySelector(config.selectors.image);
    data.imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-old-hires')) : '';

    data.productLink = window.location.href;
    data.source = config.name;
    data.searchQuery = data.name.substring(0, 30); // Simple query fallback

    if (data.name && data.price > 0) {
      return data;
    }
  } catch (err) {
    console.error('Error scraping product with Symbiote:', err);
  }
  return null;
}

// Injects a premium comparative banner overlay at the top of the page
function injectComparisonBanner(product) {
  const existing = document.getElementById('symbiote-comparison-banner');
  if (existing) existing.remove();

  // Create banner structure
  const banner = document.createElement('div');
  banner.id = 'symbiote-comparison-banner';
  banner.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 40px);
    max-width: 900px;
    background: rgba(8, 12, 20, 0.9);
    backdrop-filter: blur(12px) saturate(180%);
    -webkit-backdrop-filter: blur(12px) saturate(180%);
    border: 1px solid rgba(245, 114, 36, 0.3);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 15px rgba(245, 114, 36, 0.15);
    border-radius: 12px;
    padding: 12px 20px;
    z-index: 99999999;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #f3f4f6;
    animation: slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  `;

  // Animation keyframes injected dynamically
  const style = document.createElement('style');
  style.innerText = `
    @keyframes slideDown {
      0% { transform: translate(-50%, -40px); opacity: 0; }
      100% { transform: translate(-50%, 0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Ask background/server for cheaper prices
  chrome.runtime.sendMessage({ action: 'checkPrice', product }, (response) => {
    if (!response || !response.cheaperOptions || response.cheaperOptions.length === 0) {
      banner.innerHTML = `
        <div style="display: flex; alignItems: center; gap: 10px;">
          <span style="font-size: 1.2rem;">🧬</span>
          <div>
            <strong style="color: #f57224;">Symbiote Tracker:</strong> Currently browsing <strong>${product.name.substring(0, 45)}...</strong>
            <div style="font-size: 0.75rem; color: #9ca3af;">Price synced: ₹${product.price} (${product.source})</div>
          </div>
        </div>
        <button id="symbiote-close-btn" style="background: none; border: none; color: #6b7280; cursor: pointer; font-size: 1.2rem;">&times;</button>
      `;
    } else {
      const best = response.cheaperOptions[0];
      const savings = product.price - best.price;
      banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 1.5rem; animation: pulse 1s infinite alternate;">🔥</span>
          <div>
            <strong style="color: #10b981;">Cheaper option found!</strong> Save <strong style="color: #10b981;">₹${savings}</strong> on <strong>${best.store}</strong>
            <div style="font-size: 0.75rem; color: #9ca3af;">Current: ₹${product.price} vs. New: ₹${best.price}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <a href="${best.url}" target="_blank" style="background: linear-gradient(135deg, #f57224, #e05e15); color: #fff; padding: 6px 14px; border-radius: 8px; text-decoration: none; font-size: 0.8rem; font-weight: 600; box-shadow: 0 4px 10px rgba(245,114,36,0.3);">View Deal</a>
          <button id="symbiote-close-btn" style="background: none; border: none; color: #6b7280; cursor: pointer; font-size: 1.2rem; padding: 4px;">&times;</button>
        </div>
      `;
    }

    document.body.appendChild(banner);

    // Bind close action
    document.getElementById('symbiote-close-btn').addEventListener('click', () => {
      banner.remove();
    });
  });
}

// Localhost bridge: listen for token updates from the website dashboard
if (window.location.hostname === 'localhost') {
  console.log('[Symbiote Content Script] Connected to dashboard');
  document.documentElement.setAttribute('data-symbiote-extension', 'installed');
  
  // Method 1: Listen to custom window events triggered by React dashboard
  window.addEventListener('symbiote-auth-token', (event) => {
    const token = event.detail;
    chrome.runtime.sendMessage({ action: 'setAuthToken', token });
  });

  // Method 2: Periodically poll localStorage for the Supabase session
  setInterval(() => {
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (sbKey) {
      try {
        const session = JSON.parse(localStorage.getItem(sbKey));
        if (session && session.access_token) {
          chrome.runtime.sendMessage({ action: 'setAuthToken', token: session.access_token });
        }
      } catch (e) {}
    }
  }, 3000);
} else {
  // Scrape and sync on load for Amazon/Flipkart
  setTimeout(() => {
    const product = scrapeProduct();
    if (product) {
      console.log('[Symbiote] Scraped Product:', product);
      // Send data to background service worker to sync with server
      chrome.runtime.sendMessage({ action: 'syncProduct', product });
      
      // Inject comparison UI
      injectComparisonBanner(product);
    }
  }, 2000); // Wait 2s for DOM updates / client-side JS rendering
}
