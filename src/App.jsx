import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { 
  LayoutDashboard, 
  Terminal, 
  Archive, 
  BarChart3, 
  Sparkles,
  Palette,
  ShoppingBag,
  ShoppingCart,
  Bell,
  LineChart,
  Trash2,
  Car
} from 'lucide-react';
import SymbioteLogo from './components/SymbioteLogo';
import Dashboard from './components/Dashboard';
import { LocationProvider, LocationContext } from './context/LocationContext';
import LocationBar from './components/LocationBar';
import AIChatbot from './components/AIChatbot';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import CyberBackgroundCanvas from './components/CyberBackgroundCanvas';
import CyberCursor from './components/CyberCursor';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import LandingPage from './components/LandingPage';
import SuspenseLoader from './components/common/SuspenseLoader';
import SkeletonCard from './components/common/SkeletonCard';

// Lazy-loaded heavy views for optimal bundle splitting
const ScrapeConsole = lazy(() => import('./components/ScrapeConsole'));
const InsightHub = lazy(() => import('./components/InsightHub'));
const CartOptimizer = lazy(() => import('./components/CartOptimizer'));
const CabCompare = lazy(() => import('./components/CabCompare'));
const OrderRelay = lazy(() => import('./components/OrderRelay'));
const UserProfile = lazy(() => import('./components/UserProfile'));


function ProductHistoryChart({ productId, currentPrice }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/products/${productId}/history`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [productId]);

  if (loading) return <SkeletonCard height="80px" count={1} />;

  if (!history || history.length < 2) {
    return (
      <div style={{ marginTop: '0.75rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Not enough history yet — check back after a few searches.
      </div>
    );
  }
  
  const prices = history.map(h => h.price);
  const minPrice = Math.min(...prices) * 0.95; // 5% padding
  const maxPrice = Math.max(...prices) * 1.05; // 5% padding
  const priceRange = maxPrice - minPrice || 1;
  
  const width = 260;
  const height = 80;
  const paddingX = 15;
  const paddingY = 10;
  
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  
  // Compute coordinates
  const points = history.map((item, idx) => {
    const x = paddingX + (idx / (history.length - 1 || 1)) * chartWidth;
    const y = height - paddingY - ((item.price - minPrice) / priceRange) * chartHeight;
    return { x, y, price: item.price, date: item.date };
  });
  
  const pathData = points.reduce((acc, p, idx) => {
    return acc + (idx === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`);
  }, '');
  
  const areaData = pathData + ` L ${points[points.length-1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;
  
  return (
    <div className="price-chart-container" style={{ marginTop: '0.75rem', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textAlign: 'center' }}>
        Price History (based on your searches)
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0"/>
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.03)" strokeDasharray="2,2" />
        <line x1={paddingX} y1={height/2} x2={width - paddingX} y2={height/2} stroke="rgba(255,255,255,0.03)" strokeDasharray="2,2" />
        <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(255,255,255,0.03)" strokeDasharray="2,2" />
        
        {/* Glow Area under the line */}
        <path d={areaData} fill="url(#chartGlow)" />
        
        {/* Line */}
        <path d={pathData} fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Interactive Dots */}
        {points.map((p, idx) => (
          <g key={idx} className="chart-dot-group">
            <circle cx={p.x} cy={p.y} r="3" fill="var(--bg-primary)" stroke="var(--accent-primary)" strokeWidth="1.5" />
            <title>{`${p.date}: ₹${p.price}`}</title>
          </g>
        ))}
      </svg>
      <div className="chart-labels">
        <span>{history[0].date}</span>
        <span>{history[history.length - 1].date}</span>
      </div>
    </div>
  );
}

// Isolated clock component — only this re-renders every second, not the entire App tree
const LiveClock = React.memo(function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <strong>{time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>;
});

function App() {
  const { session, user, signOut, profile, preferences, loading } = useAuth();
  const { activePerksCount } = useProfile();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [savedProducts, setSavedProducts] = useState([]);
  const [showCharts, setShowCharts] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scraperHealth, setScraperHealth] = useState(null);
  const [headerSearchVal, setHeaderSearchVal] = useState('');
  const [cartCount, setCartCount] = useState(0);

  // Landing page CTA handler — opens auth modal in specific mode
  const handleLandingAuth = useCallback((mode) => {
    setAuthModalOpen(true);
    // Dispatch a custom event so AuthModal can switch to the correct tab
    window.dispatchEvent(new CustomEvent('auth-mode-request', { detail: mode }));
  }, []);

  // Sync Cart count from localStorage
  useEffect(() => {
    const updateCartCount = () => {
      const saved = localStorage.getItem('optimize_cart_items');
      if (saved) {
        try { setCartCount(JSON.parse(saved).length); } catch(e) { setCartCount(0); }
      } else {
        setCartCount(0);
      }
    };
    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    window.addEventListener('cart-updated', updateCartCount);
    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cart-updated', updateCartCount);
    };
  }, []);

  // Apply user saved theme if available
  useEffect(() => {
    if (preferences?.theme) {
      setTheme(preferences.theme);
    }
  }, [preferences]);

  // Toast notification system
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const getAuthHeaders = useCallback((customHeaders = {}) => {
    const headers = { ...customHeaders };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  }, [session]);

  // Apply theme class to document body
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.className = `theme-${theme}`;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };


  // Listen for login/auth triggers from Dashboard and Extension redirects
  useEffect(() => {
    const handleTriggerLogin = () => setAuthModalOpen(true);
    window.addEventListener('trigger-login-modal', handleTriggerLogin);

    const params = new URLSearchParams(window.location.search);
    if (params.get('triggerAuth') === 'true') {
      setAuthModalOpen(true);
      // Clean query params from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => window.removeEventListener('trigger-login-modal', handleTriggerLogin);
  }, []);
  // Add item to Cart Optimizer list in localStorage
  const handleAddToCart = useCallback((itemName) => {
    try {
      const saved = localStorage.getItem('optimize_cart_items');
      let currentItems = saved ? JSON.parse(saved) : [];
      const cleaned = itemName.trim();
      if (!cleaned) return;
      
      const isDuplicate = currentItems.some(i => i.toLowerCase() === cleaned.toLowerCase());
      
      if (!isDuplicate) {
        currentItems.push(cleaned);
        localStorage.setItem('optimize_cart_items', JSON.stringify(currentItems));
        window.dispatchEvent(new Event('cart-updated'));
        addToast(`"${cleaned}" added to Cart Optimizer ✓`, 'success');
      } else {
        addToast(`"${cleaned}" is already in Cart Optimizer`, 'info');
      }
    } catch (e) {
      console.error(e);
      addToast('Failed to add item to Cart', 'error');
    }
  }, [addToast]);

  // Fetch saved products from Express backend
  const fetchSavedProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await fetch('/api/products', {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setSavedProducts(data);
      } else {
        console.error('Failed to fetch saved products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchSavedProducts();
  }, [session]); // Refetch when auth session changes

  useEffect(() => {
    // Scraper Health check
    
    // Scraper Health check
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/health/scrapers');
        if (res.ok) setScraperHealth(await res.json());
      } catch (err) {
        console.error('Failed to fetch health');
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Save scraped products to backend db (batch)
  const handleSaveProducts = async (products, silent = false) => {
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ products })
      });
      if (response.ok) {
        const result = await response.json();
        if (!silent) {
          addToast(`Saved ${result.savedCount} products ✓`, 'success');
          fetchSavedProducts(); // Refresh list only on explicit saves
        }
        return result;
      }
      if (!silent) {
        addToast('Failed to save products', 'error');
      }
      return null;
    } catch (error) {
      console.error('Error saving products:', error);
      if (!silent) {
        addToast('Error saving products', 'error');
      }
      return null;
    }
  };

  // Delete saved product from backend db
  const handleDeleteProduct = async (id) => {
    try {
      const response = await fetch(`/api/products/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (response.ok) {
        setSavedProducts(prev => prev.filter(p => p.id !== id));
        addToast('Product removed from library', 'info');
        return true;
      }
      addToast('Failed to remove product', 'error');
      return false;
    } catch (error) {
      console.error('Error deleting product:', error);
      addToast('Error removing product', 'error');
      return false;
    }
  };

  // Clear all products
  const handleClearAll = async () => {
    try {
      const response = await fetch('/api/products', { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (response.ok) {
        setSavedProducts([]);
        addToast('All products cleared', 'info');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error clearing products:', error);
      return false;
    }
  };

  const metAlertsCount = savedProducts.reduce((count, p) => {
    if (p.targetPrice && p.price <= p.targetPrice) {
      return count + 1;
    }
    return count;
  }, 0);

  // ── Show landing page for unauthenticated visitors ──
  if (!loading && !user) {
    return (
      <>
        <LandingPage onOpenAuth={handleLandingAuth} />
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} addToast={addToast} />
      </>
    );
  }

  // ── Loading state while checking auth ──
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0f', color: '#f0f0f5', fontFamily: 'Outfit, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <SymbioteLogo size={48} />
          <p style={{ marginTop: '1rem', opacity: 0.6 }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <LocationProvider>
      <LocationContext.Consumer>
        {({ location }) => (
          <>
            {/* CYART Cyber Interactive Node Network Canvas & Telemetry HUD */}
            <CyberBackgroundCanvas interactive={true} opacity={0.85} showTelemetry={true} />
            
            {/* CYART Cyber Reticle & Cursor Pointer Glow */}
            <CyberCursor />

            <div className="app-container">
            {/* Amazon Double-Decker Header */}
            <header className="amazon-header">
              {/* Row 1: Upper Header */}
              <div className="amazon-header-top">
                {/* Logo */}
                <div className="amazon-logo-wrap" onClick={() => setCurrentView('dashboard')}>
                  <SymbioteLogo size={24} style={{ marginRight: '6px' }} />
                  <span className="amazon-logo-text">symbiote</span>
                </div>

                {/* Delivery Location Indicator */}
                <div className="amazon-location-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.7rem' }}>Delivering to</span>
                    <strong style={{ fontSize: '0.8rem' }}>{location?.displayLabel || 'India'}</strong>
                  </div>
                </div>

                {/* Amazon-style Central Search Input */}
                <div className="amazon-search-bar-wrap">
                  <input 
                    type="text" 
                    className="amazon-search-input" 
                    placeholder="Search Symbiote prices, deals, models..." 
                    value={headerSearchVal}
                    onChange={(e) => setHeaderSearchVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setCurrentView('dashboard');
                        window.dispatchEvent(new CustomEvent('header-search', { detail: headerSearchVal }));
                      }
                    }}
                  />
                  <button 
                    className="amazon-search-btn"
                    onClick={() => {
                      setCurrentView('dashboard');
                      window.dispatchEvent(new CustomEvent('header-search', { detail: headerSearchVal }));
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </button>
                </div>

                {/* Account Details Box */}
                <div className="amazon-account-box" onClick={() => user ? null : setAuthModalOpen(true)}>
                  <span style={{ color: '#ccc' }}>Hello, {user ? (profile?.full_name || user.email.split('@')[0]) : 'Sign In'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <strong>Account & Lists</strong>
                    {user && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          signOut();
                          addToast('Logged out successfully', 'info');
                        }}
                        style={{ background: 'none', border: 'none', color: '#ff9900', fontSize: '0.72rem', cursor: 'pointer', marginLeft: '6px', fontWeight: 'bold', padding: 0 }}
                      >
                        (Sign Out)
                      </button>
                    )}
                  </div>
                </div>

                {/* Cart Box */}
                <div className="amazon-cart-box" onClick={() => setCurrentView('cart')}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', marginLeft: '6px' }}>
                    <circle cx="9" cy="21" r="1"/>
                    <circle cx="20" cy="21" r="1"/>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                  </svg>
                  <span style={{ marginTop: '8px' }}>Cart</span>
                </div>

                {/* Profiles & Perks Box */}
                <div className="amazon-cart-box" onClick={() => setCurrentView('profile')} style={{ minWidth: 'auto', padding: '0 12px' }} title="Connected Profiles & Perks">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span style={{ marginTop: '8px' }}>Profile</span>
                </div>

                {/* Theme Toggle Button */}
                <div className="amazon-cart-box" onClick={toggleTheme} style={{ minWidth: 'auto', padding: '0 12px' }} title="Toggle Theme">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {theme === 'dark' ? (
                      <path d="M12 3a6.364 6.364 0 0 0 9 9 9 9 0 1 1-9-9z"/>
                    ) : (
                      <g><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></g>
                    )}
                  </svg>
                  <span style={{ marginTop: '8px' }}>Theme</span>
                </div>
              </div>

              {/* Row 2: Navigation Links Bar */}
              <div className="amazon-header-bottom">
                <div 
                  className={`amazon-nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setCurrentView('dashboard')}
                >
                  Today's Deals
                </div>
                <div 
                  className={`amazon-nav-item ${currentView === 'scraper' ? 'active' : ''}`}
                  onClick={() => setCurrentView('scraper')}
                >
                  Console Scraper
                </div>
                <div 
                  className={`amazon-nav-item ${currentView === 'cart' ? 'active' : ''}`}
                  onClick={() => setCurrentView('cart')}
                >
                  Cart Optimizer
                </div>
                <div 
                  className={`amazon-nav-item ${currentView === 'cab' ? 'active' : ''}`}
                  onClick={() => setCurrentView('cab')}
                >
                  Cab Compare
                </div>
                <div 
                  className={`amazon-nav-item ${currentView === 'archive' ? 'active' : ''}`}
                  onClick={() => setCurrentView('archive')}
                >
                  Saved Products
                  {metAlertsCount > 0 && (
                    <span style={{ width: '6px', height: '6px', background: 'red', borderRadius: '50%', display: 'inline-block', marginLeft: '6px', boxShadow: '0 0 5px red' }} />
                  )}
                </div>
                <div 
                  className={`amazon-nav-item ${currentView === 'insights' ? 'active' : ''}`}
                  onClick={() => setCurrentView('insights')}
                >
                  Analytics
                </div>
                <div 
                  className={`amazon-nav-item ${currentView === 'orderrelay' ? 'active' : ''}`}
                  onClick={() => setCurrentView('orderrelay')}
                >
                  🤖 Order Relay
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: '#ccc' }}>
                  {/* My Perks Button */}
                  <button
                    className="my-perks-btn"
                    onClick={() => setProfileModalOpen(true)}
                    title="Connected Profiles & Membership Perks"
                  >
                    👑 My Perks
                    {activePerksCount > 0 && (
                      <span className="my-perks-badge">{activePerksCount}</span>
                    )}
                  </button>
                  <span>|</span>
                  <span>Live clock: <LiveClock /></span>
                  <span>|</span>
                  {(() => {
                    if (!scraperHealth) return <span style={{ color: 'grey' }}>● Checking...</span>;
                    const stores = Object.values(scraperHealth);
                    if (stores.length === 0 || stores.every(s => s.status === 'dead')) {
                      return <span style={{ color: '#ef4444' }}>● Demo mode</span>;
                    }
                    if (stores.some(s => s.status === 'degraded' || s.status === 'dead')) {
                      return <span style={{ color: '#f59e0b' }}>● Degraded Data</span>;
                    }
                    return <span style={{ color: '#10b981' }}>● Live Scrapers</span>;
                  })()}
                </div>
              </div>
            </header>

            {/* Toast Notifications */}
            <div className="toast-container">
              {toasts.map(toast => (
                <div key={toast.id} className={`toast toast-${toast.type}`}>
                  <span className="toast-icon" aria-hidden="true">
                    {toast.type === 'success' && '✓'}
                    {toast.type === 'error' && '✕'}
                    {toast.type === 'warning' && '⚠'}
                    {toast.type === 'info' && 'ℹ'}
                  </span>
                  <span className="toast-message">{toast.message}</span>
                </div>
              ))}
            </div>

      {/* Main Panel Content */}
      <main className="main-content">
        <LocationBar />
        
        <Suspense fallback={<SuspenseLoader height="500px" label="Loading requested module..." />}>
          {currentView === 'dashboard' && (
            <Dashboard 
              savedProducts={savedProducts} 
              onSaveProducts={handleSaveProducts} 
              onNavigateToScraper={() => setCurrentView('scraper')}
              addToast={addToast}
              onAddToCart={handleAddToCart}
            />
          )}
          
          {currentView === 'scraper' && (
            <ScrapeConsole 
              savedProducts={savedProducts}
              onSaveProducts={handleSaveProducts}
              addToast={addToast}
              onAddToCart={handleAddToCart}
            />
          )}

          {currentView === 'archive' && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div className="view-header">
                <div className="view-title">
                  <h1>
                    Saved Products
                    {savedProducts.length > 0 && (
                      <span className="header-count-badge">{savedProducts.length} products</span>
                    )}
                  </h1>
                  <p>Browse through your collection of saved e-commerce & grocery products</p>
                </div>
                {savedProducts.length > 0 && (
                  <div className="btn-group">
                    <a href="/api/export/csv" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                      📄 Export CSV
                    </a>
                    <a href="/api/export/excel" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                      📊 Export Excel
                    </a>
                    <button className="btn btn-outline" style={{ color: 'var(--danger)' }} onClick={handleClearAll}>
                      Clear All
                    </button>
                  </div>
                )}
              </div>
              
              {loadingProducts ? (
                <SkeletonCard count={3} height="180px" />
              ) : savedProducts.length === 0 ? (
                <div className="glass-card empty-state">
                  <Archive />
                  <h3>No products saved yet</h3>
                  <p>Scrape products and save them to build your collection.</p>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => setCurrentView('scraper')}
                    style={{ marginTop: '1rem' }}
                  >
                    Start Scraping
                  </button>
                </div>
              ) : (
                <div className="grid-cards">
                  {savedProducts.map((product, index) => (
                    <div 
                      key={product.dbId || product.id || `saved-${product.source || 'prod'}-${index}`} 
                      className="glass-card product-card stagger-in" 
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      <div className="card-img-wrapper">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl.startsWith('http') && !product.imageUrl.includes('unsplash.com') ? `/api/proxy-image?url=${encodeURIComponent(product.imageUrl)}` : product.imageUrl} 
                            alt={product.name} 
                            className="card-img" 
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';
                            }} 
                            loading="lazy"
                          />
                        ) : (
                          <ShoppingCart size={40} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                        )}
                        {product.discount && (
                          <span className="discount-badge">{product.discountFormatted}</span>
                        )}
                      </div>
                      <div className="card-content">
                        <h3 className="card-title">{product.name}</h3>
                        
                        <div className="price-row">
                          <span className="price-current">{product.priceFormatted || 'N/A'}</span>
                          {product.originalPriceFormatted && (
                            <span className="price-original">{product.originalPriceFormatted}</span>
                          )}
                        </div>

                        {/* Alert Met Banner */}
                        {product.targetPrice && product.price <= product.targetPrice && (
                          <div className="price-alert-met-banner">
                            🔥 Price Alert Met! Target: ₹{product.targetPrice}
                          </div>
                        )}

                        {/* Alert Config and Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                          {product.targetPrice && product.price > product.targetPrice && (
                            <div className="price-alert-pill">
                              <Bell size={10} /> Target: ₹{product.targetPrice}
                            </div>
                          )}
                          <div className="target-price-input-container">
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>Alert: ₹</span>
                            <input 
                              type="number" 
                              placeholder="Set target" 
                              className="target-price-input" 
                              style={{ width: '70px', height: '24px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', padding: '0 4px', fontSize: '0.75rem' }}
                              defaultValue={product.targetPrice || ''}
                              onBlur={async (e) => {
                                const val = e.target.value ? parseFloat(e.target.value) : null;
                                try {
                                  const response = await fetch(`/api/products/${product.id}/alert`, {
                                    method: 'PUT',
                                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                                    body: JSON.stringify({ targetPrice: val })
                                  });
                                  if (response.ok) {
                                    addToast('Target price updated', 'success');
                                    setSavedProducts(prev => prev.map(pp => 
                                      pp.id === product.id ? { ...pp, targetPrice: val } : pp
                                    ));
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                            />
                          </div>
                        </div>

                        {product.rating && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <span className={`star-rating-badge ${product.rating >= 4 ? 'high' : product.rating >= 3 ? 'medium' : 'low'}`}>
                              {product.rating} ★
                            </span>
                            {product.ratingsCount && (
                              <span className="review-count">
                                ({product.ratingsCount.toLocaleString()} ratings)
                              </span>
                            )}
                          </div>
                        )}

                        {/* Line Chart */}
                        {showCharts[product.id] && (
                          <ProductHistoryChart productId={product.id} currentPrice={product.price} />
                        )}

                        <div className="card-footer">
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {product.searchQuery}
                          </span>
                          <div className="card-actions">
                            <button 
                              className="btn-icon" 
                              style={{ color: showCharts[product.id] ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                              onClick={() => setShowCharts(prev => ({ ...prev, [product.id]: !prev[product.id] }))}
                              title="Toggle Price History Chart"
                            >
                              <LineChart size={18} />
                            </button>
                            <button 
                              className="btn-icon" 
                              style={{ color: 'var(--accent-blue)' }}
                              onClick={() => handleAddToCart(product.searchQuery || product.query || product.name)}
                              title="Add to Cart Optimizer"
                            >
                              <ShoppingCart size={18} />
                            </button>
                            {product.productLink && (
                              <a 
                                href={product.productUrl || product.productLink} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="btn-icon" 
                                title={product.isExactProductUrl ? `View exact product on ${product.source || 'store'}` : `Search on ${product.source || 'store'}`}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                              </a>
                            )}
                            <button 
                              className="btn-icon" 
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleDeleteProduct(product.id)}
                              title="Remove"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentView === 'cart' && (
            <CartOptimizer addToast={addToast} />
          )}

          {currentView === 'cab' && (
            <CabCompare />
          )}
          {currentView === 'orderrelay' && (
            <OrderRelay
              authToken={session?.access_token}
              addToast={addToast}
            />
          )}

          {currentView === 'insights' && (
            <InsightHub savedProducts={savedProducts} />
          )}

          {currentView === 'profile' && (
            <UserProfile addToast={addToast} />
          )}
        </Suspense>
      </main>

      {/* AI Chatbot Widget */}
      <AIChatbot currentView={currentView} addToast={addToast} />

      {/* Auth Signup/Login Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} addToast={addToast} />
    </div>
          </>
        )}
      </LocationContext.Consumer>
    </LocationProvider>
  );
}

function AppWithProviders() {
  return (
    <ProfileProvider>
      <App />
    </ProfileProvider>
  );
}

export default AppWithProviders;
