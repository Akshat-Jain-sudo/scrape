import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Terminal, 
  Archive, 
  BarChart3, 
  ShoppingCart, 
  Sparkles
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ScrapeConsole from './components/ScrapeConsole';
import InsightHub from './components/InsightHub';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [savedProducts, setSavedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userLocation, setUserLocation] = useState('Mumbai');

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

  // Geolocation detector
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      addToast('Geolocation is not supported by your browser', 'warning');
      return;
    }
    
    addToast('Detecting location...', 'info');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
          if (response.ok) {
            const data = await response.json();
            const city = data.address.city || data.address.town || data.address.suburb || data.address.state || 'Mumbai';
            setUserLocation(city);
            addToast(`Location detected: ${city} ✓`, 'success');
          } else {
            throw new Error();
          }
        } catch (err) {
          let city = 'Mumbai';
          if (latitude > 18.8 && latitude < 19.3 && longitude > 72.7 && longitude < 73.1) city = 'Mumbai';
          else if (latitude > 28.4 && latitude < 28.9 && longitude > 76.9 && longitude < 77.4) city = 'Delhi';
          else if (latitude > 12.8 && latitude < 13.1 && longitude > 77.4 && longitude < 77.9) city = 'Bangalore';
          else city = 'Mumbai';
          
          setUserLocation(city);
          addToast(`Location detected (approx): ${city} ✓`, 'success');
        }
      },
      (error) => {
        console.error(error);
        addToast('Location access denied. Using Mumbai.', 'info');
        setUserLocation('Mumbai');
      },
      { timeout: 5000 }
    );
  }, [addToast]);

  // Detect location on load
  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

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

  return (
    <div className="app-container">
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
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">
            <ShoppingCart size={24} />
          </div>
          <div className="logo-text">FlipScrape</div>
        </div>

        <ul className="nav-links">
          <li 
            className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            <LayoutDashboard />
            <span>Dashboard</span>
          </li>
          <li 
            className={`nav-item ${currentView === 'scraper' ? 'active' : ''}`}
            onClick={() => setCurrentView('scraper')}
          >
            <Terminal />
            <span>Scrape Console</span>
          </li>
          <li 
            className={`nav-item ${currentView === 'archive' ? 'active' : ''}`}
            onClick={() => setCurrentView('archive')}
          >
            <Archive />
            <span>Saved Products</span>
            {savedProducts.length > 0 && (
              <span className="nav-badge">{savedProducts.length}</span>
            )}
          </li>
          <li 
            className={`nav-item ${currentView === 'insights' ? 'active' : ''}`}
            onClick={() => setCurrentView('insights')}
          >
            <BarChart3 />
            <span>Analytics</span>
          </li>
        </ul>

        <div className="sidebar-footer">
          <div className="sidebar-clock">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="clock-time">{formattedTime}</span>
          </div>
          <p>© 2026 FlipScrape v1.0</p>
          <p style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
            <Sparkles size={12} color="#f57224" /> Flipkart Product Scraper
          </p>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        {currentView === 'dashboard' && (
          <Dashboard 
            savedProducts={savedProducts} 
            onSaveProducts={handleSaveProducts} 
            onNavigateToScraper={() => setCurrentView('scraper')}
            addToast={addToast}
            userLocation={userLocation}
            setUserLocation={setUserLocation}
            detectLocation={detectLocation}
          />
        )}
        
        {currentView === 'scraper' && (
          <ScrapeConsole 
            savedProducts={savedProducts}
            onSaveProducts={handleSaveProducts}
            addToast={addToast}
            userLocation={userLocation}
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

                      <div className="card-footer">
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {product.searchQuery}
                        </span>
                        <div className="card-actions">
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

        {currentView === 'insights' && (
          <InsightHub savedProducts={savedProducts} />
        )}
      </main>
    </div>
  );
}

export default App;
