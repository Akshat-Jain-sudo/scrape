function parseJwtEmail(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const payload = JSON.parse(jsonPayload);
    return payload.email || null;
  } catch (e) {
    console.error('Error parsing token JWT:', e);
    return null;
  }
}

function updatePopupUI() {
  chrome.storage.local.get(['auth_token', 'tracked_products'], (data) => {
    const token = data.auth_token;
    const trackedList = data.tracked_products || [];

    const statusBadge = document.getElementById('connection-status');
    const statusText = document.getElementById('status-text');
    const panelDisconnected = document.getElementById('panel-disconnected');
    const panelConnected = document.getElementById('panel-connected');
    const userEmailText = document.getElementById('user-email-text');
    const trackedListContainer = document.getElementById('tracked-list');

    if (token) {
      // Connected State
      const email = parseJwtEmail(token) || 'authenticated-user@symbiote';
      
      statusBadge.className = 'status-badge connected';
      statusText.innerText = 'Connected';
      
      panelDisconnected.classList.remove('active');
      panelConnected.classList.add('active');
      userEmailText.innerText = email;

      // Render tracked products
      if (trackedList.length === 0) {
        trackedListContainer.innerHTML = `
          <div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 16px;">
            No items tracked yet. Browse products on Amazon/Flipkart!
          </div>
        `;
      } else {
        trackedListContainer.innerHTML = '';
        trackedList.slice(0, 4).forEach(prod => {
          const item = document.createElement('div');
          item.className = 'product-item';
          item.innerHTML = `
            <img src="${prod.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}" class="product-img" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'" />
            <div class="product-info-wrap">
              <span class="product-name" title="${prod.name}">${prod.name}</span>
              <div class="product-meta">
                <span class="product-price">₹${prod.price}</span>
                <span class="product-store">${prod.source}</span>
              </div>
            </div>
          `;
          trackedListContainer.appendChild(item);
        });
      }
    } else {
      // Disconnected State
      statusBadge.className = 'status-badge disconnected';
      statusText.innerText = 'Offline';
      
      panelDisconnected.classList.add('active');
      panelConnected.classList.remove('active');
    }
  });
}

// Connect Account CTA Button Click Handler
document.getElementById('btn-login-redirect').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:5173/?triggerAuth=true' });
});

document.addEventListener('DOMContentLoaded', updatePopupUI);

// Keep UI updated if storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.auth_token || changes.tracked_products) {
    updatePopupUI();
  }
});
