import React, { useState, useEffect, useRef, useCallback } from 'react';

const API = '/api';

const SUPPORTED_STORES = [
  { key: 'amazon', name: 'Amazon India', logo: '🛒', color: '#FF9900' },
  { key: 'flipkart', name: 'Flipkart', logo: '🏬', color: '#2874F0' }
];

const STATUS_LABELS = {
  initiating: { label: 'Initiating…', color: '#6366f1', icon: '⚙️' },
  logging_in: { label: 'Logging In…', color: '#f59e0b', icon: '🔑' },
  needs_otp: { label: 'OTP Required', color: '#ef4444', icon: '📱' },
  adding_to_cart: { label: 'Adding to Cart…', color: '#8b5cf6', icon: '🛍️' },
  at_checkout: { label: 'At Checkout', color: '#06b6d4', icon: '📋' },
  awaiting_payment: { label: 'Ready — Awaiting Your Confirmation', color: '#22c55e', icon: '✅' },
  placing_order: { label: 'Placing Order…', color: '#f97316', icon: '🚀' },
  placed: { label: 'Order Placed!', color: '#22c55e', icon: '🎉' },
  error: { label: 'Error', color: '#ef4444', icon: '❌' }
};

export default function OrderRelay({ authToken, addToast, initialProduct }) {
  // ── Tabs ──
  const [tab, setTab] = useState('credentials'); // 'credentials' | 'order'

  // ── Credential Manager ──
  const [savedCreds, setSavedCreds] = useState([]);
  const [credsForm, setCredsForm] = useState({ platform: 'amazon', username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [credsSaving, setCredsSaving] = useState(false);

  // ── Order Flow ──
  const [orderForm, setOrderForm] = useState({
    store: 'amazon',
    productUrl: initialProduct?.productUrl || initialProduct?.productLink || '',
    productName: initialProduct?.name || '',
    deliveryName: '',
    deliveryPhone: '',
    deliveryLine1: '',
    deliveryLine2: '',
    deliveryCity: '',
    deliveryPincode: ''
  });
  const [session, setSession] = useState(null); // { sessionId, status, history }
  const [screenshot, setScreenshot] = useState(null);
  const [initiating, setInitiating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const pollRef = useRef(null);

  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
  };

  // ── Load saved credentials ──
  const loadCreds = useCallback(async () => {
    try {
      const res = await fetch(`${API}/order/credentials`, { headers });
      if (res.ok) setSavedCreds(await res.json());
    } catch { /* offline */ }
  }, [authToken]);

  useEffect(() => { loadCreds(); }, [loadCreds]);

  // ── Save credentials ──
  const handleSaveCreds = async (e) => {
    e.preventDefault();
    if (!credsForm.username || !credsForm.password) return;
    setCredsSaving(true);
    try {
      const res = await fetch(`${API}/order/credentials`, {
        method: 'POST', headers,
        body: JSON.stringify(credsForm)
      });
      if (res.ok) {
        addToast?.(`Credentials saved for ${credsForm.platform}`, 'success');
        setCredsForm(prev => ({ ...prev, username: '', password: '' }));
        loadCreds();
      } else {
        const d = await res.json();
        addToast?.(d.error || 'Failed to save', 'error');
      }
    } catch { addToast?.('Network error', 'error'); }
    setCredsSaving(false);
  };

  const handleDeleteCreds = async (platform) => {
    await fetch(`${API}/order/credentials/${platform}`, { method: 'DELETE', headers });
    addToast?.(`Removed credentials for ${platform}`, 'info');
    loadCreds();
  };

  // ── Initiate order ──
  const handleInitiateOrder = async (e) => {
    e.preventDefault();
    setInitiating(true);
    try {
      const res = await fetch(`${API}/order/initiate`, {
        method: 'POST', headers,
        body: JSON.stringify({
          store: orderForm.store,
          productUrl: orderForm.productUrl,
          productName: orderForm.productName,
          deliveryAddress: {
            name: orderForm.deliveryName,
            phone: orderForm.deliveryPhone,
            line1: orderForm.deliveryLine1,
            line2: orderForm.deliveryLine2,
            city: orderForm.deliveryCity,
            pincode: orderForm.deliveryPincode
          }
        })
      });
      const data = await res.json();
      if (data.error) { addToast?.(data.error, 'error'); }
      else {
        setSession({ sessionId: data.sessionId, status: 'initiating', history: [] });
        startPolling(data.sessionId);
      }
    } catch { addToast?.('Failed to start automation', 'error'); }
    setInitiating(false);
  };

  // ── Poll screenshot ──
  const startPolling = (sessionId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/order/screenshot/${sessionId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setScreenshot(data.screenshotBase64);
          setSession(prev => ({ ...prev, status: data.status, history: data.history || [] }));
          if (data.status === 'placed' || data.status === 'error') {
            clearInterval(pollRef.current);
          }
        }
      } catch { /* ignore */ }
    }, 2000);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Confirm order ──
  const handleConfirmOrder = async () => {
    if (!session?.sessionId) return;
    setConfirming(true);
    try {
      const res = await fetch(`${API}/order/confirm/${session.sessionId}`, { method: 'POST', headers });
      const data = await res.json();
      if (data.status === 'placed') {
        addToast?.(`🎉 Order placed! ${data.orderId || ''}`, 'success');
        setSession(prev => ({ ...prev, status: 'placed' }));
      } else {
        addToast?.(data.message || 'Order placement failed', 'error');
      }
    } catch { addToast?.('Network error', 'error'); }
    setConfirming(false);
  };

  const statusInfo = session ? (STATUS_LABELS[session.status] || { label: session.status, color: '#94a3b8', icon: '⏳' }) : null;

  return (
    <div className="order-relay-page">
      {/* Header */}
      <div className="order-relay-header">
        <div className="order-relay-title">
          <span className="order-relay-icon">🤖</span>
          <div>
            <h1>Order Relay</h1>
            <p>Symbiote places orders on your behalf — you confirm before paying</p>
          </div>
        </div>
        <div className="order-relay-tabs">
          <button className={`relay-tab ${tab === 'credentials' ? 'active' : ''}`} onClick={() => setTab('credentials')}>
            🔑 Saved Accounts <span className="relay-tab-badge">{savedCreds.length}</span>
          </button>
          <button className={`relay-tab ${tab === 'order' ? 'active' : ''}`} onClick={() => setTab('order')}>
            🛒 Place Order
          </button>
        </div>
      </div>

      {/* ── Credentials Tab ── */}
      {tab === 'credentials' && (
        <div className="relay-section">
          <div className="relay-card">
            <h3>Add Store Account</h3>
            <p className="relay-muted">Credentials are encrypted with AES-256-GCM. Your password is never stored in plaintext.</p>
            <form onSubmit={handleSaveCreds} className="relay-form">
              <div className="relay-form-row">
                <label>Store</label>
                <select value={credsForm.platform} onChange={e => setCredsForm(p => ({ ...p, platform: e.target.value }))}>
                  {SUPPORTED_STORES.map(s => <option key={s.key} value={s.key}>{s.logo} {s.name}</option>)}
                </select>
              </div>
              <div className="relay-form-row">
                <label>Email / Phone</label>
                <input type="text" placeholder="your@email.com" value={credsForm.username}
                  onChange={e => setCredsForm(p => ({ ...p, username: e.target.value }))} required />
              </div>
              <div className="relay-form-row">
                <label>Password</label>
                <div className="relay-password-row">
                  <input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                    value={credsForm.password}
                    onChange={e => setCredsForm(p => ({ ...p, password: e.target.value }))} required />
                  <button type="button" className="relay-show-pass" onClick={() => setShowPassword(p => !p)}>
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <button type="submit" className="relay-btn-primary" disabled={credsSaving}>
                {credsSaving ? 'Saving…' : '🔐 Save Encrypted'}
              </button>
            </form>
          </div>

          {savedCreds.length > 0 && (
            <div className="relay-card">
              <h3>Saved Accounts</h3>
              <div className="relay-creds-list">
                {savedCreds.map(c => {
                  const storeInfo = SUPPORTED_STORES.find(s => s.key === c.platform) || {};
                  return (
                    <div key={c.platform} className="relay-cred-row">
                      <span className="relay-cred-icon">{storeInfo.logo || '🏪'}</span>
                      <div className="relay-cred-info">
                        <strong>{storeInfo.name || c.platform}</strong>
                        <span>{c.username}</span>
                      </div>
                      <span className="relay-cred-date">{new Date(c.savedAt).toLocaleDateString('en-IN')}</span>
                      <button className="relay-btn-danger-sm" onClick={() => handleDeleteCreds(c.platform)}>Remove</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="relay-security-note">
            <span>🔒</span>
            <div>
              <strong>Security Notice</strong>
              <p>Credentials are stored only on your local server using AES-256-GCM encryption. They are never sent to any third-party service. You can delete them at any time. Use this feature only for your own accounts.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Order Tab ── */}
      {tab === 'order' && (
        <div className="relay-section relay-order-layout">
          {/* Left: Form */}
          <div className="relay-order-form-col">
            <div className="relay-card">
              <h3>Order Details</h3>
              <form onSubmit={handleInitiateOrder} className="relay-form">
                <div className="relay-form-row">
                  <label>Store</label>
                  <div className="relay-store-picker">
                    {SUPPORTED_STORES.map(s => {
                      const hasCreds = savedCreds.find(c => c.platform === s.key);
                      return (
                        <button type="button" key={s.key}
                          className={`relay-store-btn ${orderForm.store === s.key ? 'active' : ''} ${!hasCreds ? 'no-creds' : ''}`}
                          onClick={() => setOrderForm(p => ({ ...p, store: s.key }))}
                          title={!hasCreds ? `Add credentials for ${s.name} first` : ''}>
                          {s.logo} {s.name}
                          {hasCreds && <span className="relay-cred-dot" title="Credentials saved">●</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="relay-form-row">
                  <label>Product URL</label>
                  <input type="url" placeholder="https://www.amazon.in/dp/..." value={orderForm.productUrl}
                    onChange={e => setOrderForm(p => ({ ...p, productUrl: e.target.value }))} required />
                </div>
                <div className="relay-form-row">
                  <label>Product Name <span className="relay-optional">(optional)</span></label>
                  <input type="text" placeholder="e.g. iPhone 16 128GB" value={orderForm.productName}
                    onChange={e => setOrderForm(p => ({ ...p, productName: e.target.value }))} />
                </div>
                <hr className="relay-divider" />
                <h4>📦 Delivery Address</h4>
                <div className="relay-form-grid">
                  <div className="relay-form-row">
                    <label>Full Name</label>
                    <input type="text" placeholder="Rahul Sharma" value={orderForm.deliveryName}
                      onChange={e => setOrderForm(p => ({ ...p, deliveryName: e.target.value }))} required />
                  </div>
                  <div className="relay-form-row">
                    <label>Phone</label>
                    <input type="tel" placeholder="9876543210" value={orderForm.deliveryPhone}
                      onChange={e => setOrderForm(p => ({ ...p, deliveryPhone: e.target.value }))} required />
                  </div>
                  <div className="relay-form-row relay-full-span">
                    <label>Address Line 1</label>
                    <input type="text" placeholder="123, Sector 5" value={orderForm.deliveryLine1}
                      onChange={e => setOrderForm(p => ({ ...p, deliveryLine1: e.target.value }))} required />
                  </div>
                  <div className="relay-form-row relay-full-span">
                    <label>Address Line 2 <span className="relay-optional">(optional)</span></label>
                    <input type="text" placeholder="Near City Mall" value={orderForm.deliveryLine2}
                      onChange={e => setOrderForm(p => ({ ...p, deliveryLine2: e.target.value }))} />
                  </div>
                  <div className="relay-form-row">
                    <label>City</label>
                    <input type="text" placeholder="Mumbai" value={orderForm.deliveryCity}
                      onChange={e => setOrderForm(p => ({ ...p, deliveryCity: e.target.value }))} required />
                  </div>
                  <div className="relay-form-row">
                    <label>Pincode</label>
                    <input type="text" placeholder="400001" maxLength={6} value={orderForm.deliveryPincode}
                      onChange={e => setOrderForm(p => ({ ...p, deliveryPincode: e.target.value }))} required />
                  </div>
                </div>
                {!savedCreds.find(c => c.platform === orderForm.store) && (
                  <div className="relay-warning">
                    ⚠️ No credentials saved for <strong>{SUPPORTED_STORES.find(s => s.key === orderForm.store)?.name}</strong>.
                    <button type="button" className="relay-link" onClick={() => setTab('credentials')}>Add credentials →</button>
                  </div>
                )}
                <button type="submit" className="relay-btn-primary relay-btn-large"
                  disabled={initiating || !savedCreds.find(c => c.platform === orderForm.store)}>
                  {initiating ? '⚙️ Starting Automation…' : '🤖 Start Order Automation'}
                </button>
              </form>
            </div>
          </div>

          {/* Right: Live Browser Preview */}
          <div className="relay-preview-col">
            <div className="relay-card relay-preview-card">
              <div className="relay-preview-header">
                <h3>🖥️ Live Browser Preview</h3>
                {statusInfo && (
                  <span className="relay-status-badge" style={{ background: statusInfo.color + '22', color: statusInfo.color, border: `1px solid ${statusInfo.color}44` }}>
                    {statusInfo.icon} {statusInfo.label}
                  </span>
                )}
              </div>

              {!session && (
                <div className="relay-preview-empty">
                  <div className="relay-preview-empty-icon">🖥️</div>
                  <p>Start an order automation to see a live browser preview here.</p>
                  <p className="relay-muted">Symbiote will handle login, cart, and checkout automatically.</p>
                </div>
              )}

              {session && screenshot && (
                <div className="relay-screenshot-wrap">
                  <img src={`data:image/jpeg;base64,${screenshot}`} alt="Live browser view" className="relay-screenshot" />
                </div>
              )}

              {session && !screenshot && (
                <div className="relay-preview-loading">
                  <div className="relay-spinner" />
                  <p>Loading browser session…</p>
                </div>
              )}

              {/* Status timeline */}
              {session?.history?.length > 0 && (
                <div className="relay-timeline">
                  {session.history.slice(-6).map((h, i) => {
                    const info = STATUS_LABELS[h.status] || { icon: '⏳', label: h.status, color: '#94a3b8' };
                    return (
                      <div key={i} className="relay-timeline-step">
                        <span className="relay-timeline-icon" style={{ color: info.color }}>{info.icon}</span>
                        <span className="relay-timeline-label">{info.label}</span>
                        <span className="relay-timeline-time">{new Date(h.timestamp).toLocaleTimeString('en-IN')}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Confirm button */}
              {session?.status === 'awaiting_payment' && (
                <div className="relay-confirm-section">
                  <div className="relay-confirm-notice">
                    <span>✅</span>
                    <p>Symbiote has filled in your cart and address. Review the screenshot above, then click <strong>Confirm & Pay</strong> to place the order.</p>
                  </div>
                  <button className="relay-btn-confirm" onClick={handleConfirmOrder} disabled={confirming}>
                    {confirming ? '🚀 Placing Order…' : '✅ Confirm & Pay'}
                  </button>
                </div>
              )}

              {session?.status === 'placed' && (
                <div className="relay-success-banner">
                  🎉 Order placed successfully! Check your email for confirmation.
                </div>
              )}

              {session?.status === 'needs_otp' && (
                <div className="relay-otp-notice">
                  <span>📱</span>
                  <div>
                    <strong>OTP Required</strong>
                    <p>The store is asking for an OTP or CAPTCHA. This must be handled manually — open the store website and complete the verification, then retry.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
