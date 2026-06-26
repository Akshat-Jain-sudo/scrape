import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Terminal, 
  Archive, 
  BarChart3, 
  Sparkles,
  Palette,
  ShoppingBag,
  Bell,
  LineChart,
  Trash2,
  Car
} from 'lucide-react';
import SymbioteLogo from './components/SymbioteLogo';
import Dashboard from './components/Dashboard';
import ScrapeConsole from './components/ScrapeConsole';
import InsightHub from './components/InsightHub';
import CartOptimizer from './components/CartOptimizer';
import CabCompare from './components/CabCompare';
import { LocationProvider } from './context/LocationContext';
import LocationBar from './components/LocationBar';

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

  if (loading) return <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>Loading history...</div>;

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

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [savedProducts, setSavedProducts] = useState([]);
  const [showCharts, setShowCharts] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'cyberpunk');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scraperHealth, setScraperHealth] = useState(null);

  // Apply theme class to document body
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.className = `theme-${theme}`;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'cyberpunk') return 'glass-light';
      if (prev === 'glass-light') return 'amoled-black';
      return 'cyberpunk';
    });
  };

  // Live clock – update every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Toast notification system
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // Add item to Cart Optimizer list in localStorage
  const handleAddToCart = useCallback((itemName) => {
    try {
      const saved = localStorage.getItem('optimize_cart_items');
      let currentItems = saved ? JSON.parse(saved) : [];
      const cleaned = itemName.trim();
      if (!cleaned) return;
      
      if (!currentItems.includes(cleaned)) {
        currentItems.push(cleaned);
        localStorage.setItem('optimize_cart_items', JSON.stringify(currentItems));
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
      const response = await fetch('/api/products');
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
  const handleSaveProducts = async (products) => {
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products })
      });
      if (response.ok) {
        const result = await response.json();
        addToast(`Saved ${result.savedCount} products ✓`, 'success');
        fetchSavedProducts(); // Refresh list
        return result;
      }
      addToast('Failed to save products', 'error');
      return null;
    } catch (error) {
      console.error('Error saving products:', error);
      addToast('Error saving products', 'error');
      return null;
    }
  };

  // Delete saved product from backend db
  const handleDeleteProduct = async (id) => {
    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
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
      const response = await fetch('/api/products', { method: 'DELETE' });
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

  const formattedTime = currentTime.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const metAlertsCount = savedProducts.reduce((count, p) => {
    if (p.targetPrice && p.price <= p.targetPrice) {
      return count + 1;
    }
    return count;
  }, 0);

  return (
    <LocationProvider>
    <div className="app-container">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <button 
          className="menu-toggle-btn" 
          onClick={() => setSidebarOpen(true)} 
          aria-label="Toggle Sidebar"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="12" x2="20" y2="12"></line>
            <line x1="4" y1="6" x2="20" y2="6"></line>
            <line x1="4" y1="18" x2="20" y2="18"></line>
          </svg>
        </button>
        <div className="mobile-logo">
          <SymbioteLogo size={28} />
          <span className="logo-text" style={{ fontSize: '1.15rem' }}>Symbiote</span>
        </div>
        <button className="theme-toggle-btn" onClick={toggleTheme} title="Switch Theme">
          <Palette size={16} />
        </button>
      </header>

      {/* Sidebar Backdrop Overlay */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✕'}
              {toast.type === 'warning' && '⚠'}
              {toast.type === 'info' && 'ℹ'}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="logo-section">
          <SymbioteLogo size={38} />
          <div className="logo-text">Symbiote</div>
        </div>

        <ul className="nav-links">
          <li 
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setCurrentView('dashboard'); setSidebarOpen(false); }}
          >
            <LayoutDashboard />
            <span>Dashboard</span>
          </li>
          <li 
            className={`nav-item ${currentView === 'scraper' ? 'active' : ''}`}
            onClick={() => { setCurrentView('scraper'); setSidebarOpen(false); }}
          >
            <Terminal />
            <span>Scrape Console</span>
          </li>
          <li 
            className={`nav-item ${currentView === 'cart' ? 'active' : ''}`}
            onClick={() => { setCurrentView('cart'); setSidebarOpen(false); }}
          >
            <ShoppingBag />
            <span>Cart Optimizer</span>
          </li>
          <li 
            className={`nav-item ${currentView === 'cab' ? 'active' : ''}`}
            onClick={() => { setCurrentView('cab'); setSidebarOpen(false); }}
          >
            <Car />
            <span>Cab Compare</span>
          </li>
          <li 
            className={`nav-item ${currentView === 'archive' ? 'active' : ''}`}
            onClick={() => { setCurrentView('archive'); setSidebarOpen(false); }}
          >
            <Archive />
            <span>Saved Products</span>
            {savedProducts.length > 0 && (
              <span className="nav-badge" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                {savedProducts.length}
                {metAlertsCount > 0 && (
                  <span style={{ width: '6px', height: '6px', background: 'var(--danger)', borderRadius: '50%', display: 'inline-block', animation: 'pulseMet 1s infinite alternate' }} title={`${metAlertsCount} price alert(s) met!`}></span>
                )}
              </span>
            )}
          </li>
          <li 
            className={`nav-item ${currentView === 'insights' ? 'active' : ''}`}
            onClick={() => { setCurrentView('insights'); setSidebarOpen(false); }}
          >
            <BarChart3 />
            <span>Analytics</span>
          </li>
        </ul>

        <div className="sidebar-footer">
          <div className="sidebar-clock" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="clock-time">{formattedTime}</span>
            </div>
            <button className="theme-toggle-btn" onClick={toggleTheme} title="Switch Theme (Cyberpunk / Light / AMOLED)">
              <Palette size={14} />
            </button>
          </div>
          <p>© 2026 Symbiote v1.0</p>
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {(() => {
              if (!scraperHealth) return <><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'grey' }}/> Checking health...</>;
              const stores = Object.values(scraperHealth);
              if (stores.length === 0 || stores.every(s => s.status === 'dead')) {
                return <><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 5px var(--danger)' }}/> Demo mode</>;
              }
              if (stores.some(s => s.status === 'degraded' || s.status === 'dead')) {
                return <><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)', boxShadow: '0 0 5px var(--warning)' }}/> Partial live data</>;
              }
              return <><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 5px var(--success)' }}/> Live data</>;
            })()}
          </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        <LocationBar />
        
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
              <div className="spinner-container">
                <div className="pulse-spinner"></div>
                <p style={{ color: 'var(--text-secondary)' }}>Loading saved products...</p>
              </div>
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
                    key={product.id} 
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
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ targetPrice: val })
                                });
                                if (response.ok) {
                                  addToast('Target price updated', 'success');
                                  fetchSavedProducts();
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
                            onClick={() => handleAddToCart(product.name)}
                            title="Add to Cart Optimizer"
                          >
                            <ShoppingCart size={18} />
                          </button>
                          {product.productLink && (
                            <a 
                              href={product.productLink} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="btn-icon" 
                              title="View on Store"
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

        {currentView === 'insights' && (
          <InsightHub savedProducts={savedProducts} />
        )}
      </main>
    </div>
    </LocationProvider>
  );
}

export default App;
