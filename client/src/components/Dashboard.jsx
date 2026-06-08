import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  ShoppingCart, 
  ExternalLink, 
  Star, 
  TrendingUp, 
  Tag, 
  Sparkles,
  Smartphone,
  Shirt,
  Cookie,
  RefreshCw,
  Bookmark,
  ArrowRight
} from 'lucide-react';

// Sub-component to manage real-time comparison for a single product card in the feed
function ComparisonFeedCard({ item, category, onSaveComparison, savedProducts }) {
  const [loading, setLoading] = useState(true);
  const [compData, setCompData] = useState(null);
  const [error, setError] = useState(null);

  const fetchComparison = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: item.query, category })
      });
      if (response.ok) {
        const data = await response.json();
        setCompData(data);
      } else {
        throw new Error('Comparison failed');
      }
    } catch (err) {
      setError('Failed to fetch comparison');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [item.id, category]);

  const handleSave = () => {
    if (!compData) return;
    // Format comparison stores into individual products to save in library
    const productsToSave = Object.entries(compData.comparison).map(([store, details]) => ({
      id: `${compData.id}-${store}`,
      name: compData.productName,
      price: details.price,
      priceFormatted: details.priceFormatted,
      originalPrice: details.originalPrice,
      originalPriceFormatted: details.originalPriceFormatted,
      discount: details.discount,
      discountFormatted: details.discountFormatted,
      rating: details.rating,
      ratingsCount: details.ratingsCount,
      productLink: details.productLink,
      imageUrl: compData.imageUrl || item.image,
      searchQuery: item.query,
      source: store,
      scrapedAt: compData.scrapedAt
    }));

    onSaveComparison(productsToSave);
  };

  const getStoreBadgeClass = (store) => {
    return `store-badge store-badge-${store}`;
  };

  return (
    <div className="glass-card comparison-feed-card stagger-in">
      <div className="comp-img-container">
        <img 
          src={compData?.imageUrl || item.image} 
          alt={item.name} 
          className="comp-img" 
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'; }}
        />
        {compData?.bestPriceStore && !loading && (
          <span 
            className="discount-badge" 
            style={{ 
              position: 'absolute', 
              top: '10px', 
              left: '10px', 
              background: 'var(--success)', 
              fontSize: '0.7rem' 
            }}
          >
            Best Price on {compData.bestPriceStore.toUpperCase()}
          </span>
        )}
      </div>

      <div className="comp-info-container">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <h3 className="comp-title" title={compData?.productName || item.name}>
              {compData?.productName || item.name}
            </h3>
            {!loading && !error && (
              <button 
                className="btn-icon" 
                onClick={handleSave} 
                title="Save comparison to library"
                style={{ color: 'var(--accent-primary)', padding: '0.25rem' }}
              >
                <Bookmark size={18} />
              </button>
            )}
          </div>
          
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', marginTop: '-0.5rem' }}>
            Category: <span style={{ textTransform: 'capitalize' }}>{category}</span>
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
            <div className="skeleton" style={{ height: '35px', borderRadius: '6px' }}></div>
            <div className="skeleton" style={{ height: '35px', borderRadius: '6px' }}></div>
            <div className="skeleton" style={{ height: '35px', borderRadius: '6px' }}></div>
          </div>
        ) : error ? (
          <div style={{ padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{error}</p>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }} onClick={() => fetchComparison(true)}>
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : (
          <div className="comp-stores-table">
            {Object.entries(compData.comparison).map(([store, details]) => {
              const isBest = store === compData.bestPriceStore;
              return (
                <div key={store} className={`comp-store-row ${isBest ? 'is-best' : ''}`}>
                  <div>
                    <span className={getStoreBadgeClass(store)}>
                      {store}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="comp-price-val">{details.priceFormatted}</span>
                    {details.originalPriceFormatted && (
                      <span className="comp-price-orig">{details.originalPriceFormatted}</span>
                    )}
                    {details.discountFormatted && (
                      <span style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600 }}>
                        ({details.discountFormatted})
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {details.rating && (
                      <>
                        <Star size={12} fill="var(--warning)" stroke="var(--warning)" />
                        <span>{details.rating}</span>
                      </>
                    )}
                    {details.deliveryTime && (
                      <span style={{ color: 'var(--info)', fontWeight: 500, fontSize: '0.75rem' }}>
                        🚚 {details.deliveryTime}
                      </span>
                    )}
                  </div>

                  <div>
                    <a 
                      href={details.productLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn-store-go"
                    >
                      Buy <ArrowRight size={12} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Real-time price feed</span>
          {!loading && !error && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="pulse-spinner" style={{ width: '6px', height: '6px', margin: 0 }}></span> Live Checked
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ savedProducts, onSaveProducts, addToast }) {
  const [activeCategory, setActiveCategory] = useState('ecommerce');
  const [trendingDeals, setTrendingDeals] = useState(null);
  const [loadingTrending, setLoadingTrending] = useState(true);

  // Custom search states
  const [searchQuery, setSearchQuery] = useState('');
  const [customComp, setCustomComp] = useState(null);
  const [searching, setSearching] = useState(false);

  // Fetch trending products config
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await fetch('/api/trending');
        if (response.ok) {
          const data = await response.json();
          setTrendingDeals(data);
        }
      } catch (error) {
        console.error('Failed to fetch trending deals:', error);
      } finally {
        setLoadingTrending(false);
      }
    };
    fetchTrending();
  }, []);

  const handleCustomSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setCustomComp(null);

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim(), category: activeCategory })
      });

      if (response.ok) {
        const data = await response.json();
        setCustomComp(data);
        addToast(`Found comparisons for "${searchQuery}"`, 'success');
      } else {
        throw new Error('Comparison request failed');
      }
    } catch (error) {
      console.error(error);
      addToast('Failed to compare prices. Please try again.', 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleSaveComparison = async (products) => {
    await onSaveProducts(products);
  };

  const currentTrendingItems = trendingDeals ? trendingDeals[activeCategory] || [] : [];

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div className="view-header">
        <div className="view-title">
          <h1>Compare Dashboard</h1>
          <p>Real-time comparative pricing feed across e-commerce, fashion, and quick-commerce stores</p>
        </div>
      </div>

      {/* Category Navigation Tabs */}
      <div className="category-tabs">
        <button 
          className={`category-tab ${activeCategory === 'ecommerce' ? 'active' : ''}`}
          onClick={() => { setActiveCategory('ecommerce'); setCustomComp(null); }}
        >
          <Smartphone size={16} />
          <span>E-Commerce (Flipkart, Snapdeal, Croma, Myntra, Ajio)</span>
        </button>
        <button 
          className={`category-tab ${activeCategory === 'quickcommerce' ? 'active' : ''}`}
          onClick={() => { setActiveCategory('quickcommerce'); setCustomComp(null); }}
        >
          <Cookie size={16} />
          <span>Quick Commerce (Blinkit, Swiggy Instamart, Zepto)</span>
        </button>
      </div>

      {/* Custom Search Box */}
      <div className="glass-card search-hero" style={{ marginBottom: '2rem' }}>
        <h2>🔍 Search & Compare Any Product</h2>
        <p>
          Compare price indicators in real-time on: 
          {activeCategory === 'ecommerce' && <strong style={{ color: 'var(--accent-primary)' }}> Flipkart, Snapdeal, Croma, Myntra, Ajio</strong>}
          {activeCategory === 'quickcommerce' && <strong style={{ color: 'var(--accent-primary)' }}> Blinkit, Swiggy Instamart, Zepto</strong>}
        </p>
        
        <div className="search-box">
          <input 
            type="text"
            placeholder={`Search and compare in ${activeCategory}...`}
            className="console-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={searching}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
          />
          <button 
            className="btn btn-primary" 
            onClick={handleCustomSearch}
            disabled={searching || !searchQuery.trim()}
          >
            {searching ? (
              <>
                <div className="animate-spin" style={{ width: 16, height: 16, border: '2px solid transparent', borderTopColor: 'white', borderRadius: '50%' }}></div>
                Comparing...
              </>
            ) : (
              <>
                <Search size={16} />
                Compare
              </>
            )}
          </button>
        </div>
      </div>

      {/* Custom Comparison Result Card */}
      {customComp && !searching && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--accent-primary)" /> Custom Search Comparison
          </h2>
          <ComparisonFeedCard 
            item={{ id: 'custom', name: searchQuery, query: searchQuery, image: '' }} 
            category={activeCategory} 
            onSaveComparison={handleSaveComparison}
            savedProducts={savedProducts}
          />
        </div>
      )}

      {/* Search Loading Screen */}
      {searching && (
        <div className="glass-card" style={{ marginBottom: '2rem' }}>
          <div className="spinner-container" style={{ padding: '2.5rem' }}>
            <div className="pulse-spinner"></div>
            <p style={{ color: 'var(--text-secondary)' }}>Comparing prices for "<strong>{searchQuery}</strong>" across stores...</p>
          </div>
        </div>
      )}

      {/* Trending / Scrolldown comparative feed */}
      <div>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={18} color="var(--accent-primary)" /> 
          Trending Deals comparison (Scroll to compare)
        </h2>

        {loadingTrending ? (
          <div className="spinner-container">
            <div className="pulse-spinner"></div>
            <p>Loading trending comparison models...</p>
          </div>
        ) : currentTrendingItems.length === 0 ? (
          <div className="glass-card empty-state">
            <ShoppingCart size={40} />
            <h3>No comparisons configured</h3>
            <p>Select another category tab above to see comparisons.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {currentTrendingItems.map(item => (
              <ComparisonFeedCard 
                key={item.id} 
                item={item} 
                category={activeCategory}
                onSaveComparison={handleSaveComparison}
                savedProducts={savedProducts}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
