import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Bookmark, 
  Star, 
  ArrowRight, 
  MapPin, 
  ChevronDown, 
  ShoppingBag, 
  Utensils, 
  Search, 
  Sparkles, 
  TrendingUp, 
  ShoppingCart, 
  RefreshCw 
} from 'lucide-react';

const STORE_NAMES = {
  amazon: 'Amazon',
  flipkart: 'Flipkart',
  meesho: 'Meesho',
  snapdeal: 'Snapdeal',
  jiomart: 'JioMart',
  tatacliq: 'Tata CLiQ',
  shopclues: 'ShopClues',
  indiamart: 'IndiaMART',
  myntra: 'Myntra',
  ajio: 'AJIO',
  nykaa: 'Nykaa',
  nykaafashion: 'Nykaa Fashion',
  firstcry: 'FirstCry',
  pepperfry: 'Pepperfry',
  bookswagon: 'Bookswagon',
  ebay: 'eBay',
  etsy: 'Etsy',
  alibaba: 'Alibaba',
  aliexpress: 'AliExpress',
  walmart: 'Walmart',
  croma: 'Croma',
  blinkit: 'Blinkit',
  zepto: 'Zepto',
  instamart: 'Swiggy Instamart',
  bbnow: 'BB Now',
  fkminutes: 'FK Minutes',
  amazonfresh: 'Amazon Fresh',
  jiomartexpress: 'JioMart Express',
  bbdaily: 'BB Daily',
  dunzo: 'Dunzo',
  countrydelight: 'Country Delight',
  zomato: 'Zomato',
  swiggy: 'Swiggy'
};

function SpeedCostMatrix({ comparisonData }) {
  if (!comparisonData || !comparisonData.comparison) return null;
  
  const stores = Object.entries(comparisonData.comparison)
    .filter(([_, details]) => details.deliveryTime && details.price)
    .map(([store, details]) => {
      const timeMatch = details.deliveryTime.match(/(\d+)\s*mins?/i);
      const timeVal = timeMatch ? parseInt(timeMatch[1], 10) : 60;
      return {
        store,
        price: details.price,
        time: timeVal,
        label: STORE_NAMES[store] || store,
        deliveryTimeText: details.deliveryTime
      };
    });

  if (stores.length < 2) return null;

  const prices = stores.map(s => s.price);
  const times = stores.map(s => s.time);

  const minPrice = Math.min(...prices) * 0.95;
  const maxPrice = Math.max(...prices) * 1.05;
  const priceRange = maxPrice - minPrice || 1;

  const minTime = Math.min(...times) * 0.8;
  const maxTime = Math.max(...times) * 1.2;
  const timeRange = maxTime - minTime || 1;

  const width = 360;
  const height = 180;
  const paddingX = 40;
  const paddingY = 30;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = stores.map(s => {
    const x = paddingX + ((s.time - minTime) / timeRange) * chartWidth;
    const y = height - paddingY - ((s.price - minPrice) / priceRange) * chartHeight;
    return { ...s, x, y };
  });

  return (
    <div className="speed-cost-matrix-card" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', padding: '0.75rem', marginTop: '1rem', width: '100%' }}>
      <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)' }}>
        <Zap size={12} color="var(--accent-primary)" /> Speed vs. Cost Tradeoff
      </h4>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={width} height={height} style={{ maxWidth: '100%' }}>
          <text x={width / 2} y={height - 5} fill="var(--text-muted)" fontSize="8" textAnchor="middle">⏳ Delivery Time (Faster →)</text>
          <text x={10} y={height / 2} fill="var(--text-muted)" fontSize="8" textAnchor="middle" transform={`rotate(-90 10 ${height/2})`}>₹ Cost (Cheaper ↑)</text>
          
          <rect x={paddingX} y={paddingY} width={chartWidth} height={chartHeight} fill="none" stroke="rgba(255,255,255,0.05)" />
          
          <line x1={paddingX + chartWidth/2} y1={paddingY} x2={paddingX + chartWidth/2} y2={height - paddingY} stroke="rgba(255,255,255,0.02)" strokeDasharray="2,2" />
          <line x1={paddingX} y1={paddingY + chartHeight/2} x2={width - paddingX} y2={paddingY + chartHeight/2} stroke="rgba(255,255,255,0.02)" strokeDasharray="2,2" />

          {points.map((p, idx) => {
            const isCheapest = p.price === Math.min(...prices);
            const isFastest = p.time === Math.min(...times);
            const dotColor = p.store === 'zomato' ? '#cb202d' : 
                             p.store === 'swiggy' ? '#fc8019' : 
                             p.store === 'blinkit' ? '#dca306' : 
                             p.store === 'zepto' ? '#40186b' : 
                             p.store === 'instamart' ? '#c25303' : 'var(--accent-primary)';
            
            return (
              <g key={idx} className="matrix-node">
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r={isCheapest || isFastest ? "6" : "4.5"} 
                  fill={dotColor} 
                  stroke={isCheapest ? "var(--success)" : isFastest ? "var(--info)" : "rgba(255,255,255,0.2)"}
                  strokeWidth={isCheapest || isFastest ? "2" : "1"} 
                />
                <text 
                  x={p.x} 
                  y={p.y - 8} 
                  fill="var(--text-primary)" 
                  fontSize="7" 
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {p.label.split(' ')[0]}
                </text>
                <text 
                  x={p.x} 
                  y={p.y + 12} 
                  fill="var(--text-muted)" 
                  fontSize="6.5" 
                  textAnchor="middle"
                >
                  ₹{p.price} ({p.deliveryTimeText})
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// Sub-component to manage real-time comparison for a single product card in the feed
function ComparisonFeedCard({ item, category, onSaveComparison, savedProducts, userLocation }) {
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
        body: JSON.stringify({ query: item.query, category, location: userLocation })
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
  }, [item.id, category, userLocation]);

  const handleSave = () => {
    if (!compData) return;
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
      deliveryTime: details.deliveryTime,
      deliveryFee: details.deliveryFee,
      packagingFee: details.packagingFee,
      distance: details.distance,
      restaurantName: details.restaurantName,
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
          src={
            compData?.imageUrl && compData.imageUrl.startsWith('http') && !compData.imageUrl.includes('unsplash.com') 
              ? `/api/proxy-image?url=${encodeURIComponent(compData.imageUrl)}` 
              : (compData?.imageUrl || item.image)
          } 
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
          <>
            <div className="comp-stores-table">
              {Object.entries(compData.comparison).map(([store, details]) => {
                const isBest = store === compData.bestPriceStore;
                return (
                  <div key={store} className={`comp-store-row ${isBest ? 'is-best' : ''}`}>
                    <div>
                      <span className={getStoreBadgeClass(store)}>
                        {store}
                      </span>
                      {details.restaurantName && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>
                          🏪 {details.restaurantName}
                        </div>
                      )}
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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        {details.rating && (
                          <>
                            <Star size={12} fill="var(--warning)" stroke="var(--warning)" />
                            <span>{details.rating}</span>
                          </>
                        )}
                        {details.deliveryTime && (
                          <span style={{ color: 'var(--info)', fontWeight: 500, fontSize: '0.75rem', marginLeft: '0.25rem' }}>
                            🚚 {details.deliveryTime}
                          </span>
                        )}
                      </div>
                      {details.distance && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          📍 Distance: {details.distance}
                        </div>
                      )}
                      {(details.deliveryFee !== null || details.packagingFee !== null) && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {details.deliveryFee !== null && `Del: ₹${details.deliveryFee}`}
                          {details.deliveryFee !== null && details.packagingFee !== null && ' | '}
                          {details.packagingFee !== null && `Pack: ₹${details.packagingFee}`}
                        </div>
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
            
            <SpeedCostMatrix comparisonData={compData} />
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
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

function Dashboard({ 
  savedProducts, 
  onSaveProducts, 
  onNavigateToScraper, 
  addToast, 
  userLocation, 
  setUserLocation, 
  detectLocation
}) {
  const [activeCategory, setActiveCategory] = useState('ecommerce');
  const [trendingDeals, setTrendingDeals] = useState(null);
  const [loadingTrending, setLoadingTrending] = useState(true);

  // Custom search states
  const [searchQuery, setSearchQuery] = useState('');
  const [customComp, setCustomComp] = useState(null);
  const [searching, setSearching] = useState(false);
  const [showLocationMenu, setShowLocationMenu] = useState(false);

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
        body: JSON.stringify({ query: searchQuery.trim(), category: activeCategory, location: userLocation })
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

        {/* Geolocation selector widget */}
        <div className="location-widget-container">
          <div className="location-widget" onClick={() => setShowLocationMenu(!showLocationMenu)}>
            <span className="location-pin-icon">
              <MapPin size={14} />
            </span>
            <span>Deliver to: <strong>{userLocation}</strong></span>
            <ChevronDown size={14} style={{ opacity: 0.7, transform: showLocationMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>
          
          {showLocationMenu && (
            <div className="location-menu-dropdown">
              <div 
                className={`location-dropdown-item ${userLocation === 'Mumbai' ? 'active' : ''}`}
                onClick={() => { setUserLocation('Mumbai'); setShowLocationMenu(false); addToast('Location set to Mumbai', 'success'); }}
              >
                <span>Mumbai</span>
                {userLocation === 'Mumbai' && <span>✓</span>}
              </div>
              <div 
                className={`location-dropdown-item ${userLocation === 'Delhi' ? 'active' : ''}`}
                onClick={() => { setUserLocation('Delhi'); setShowLocationMenu(false); addToast('Location set to Delhi', 'success'); }}
              >
                <span>Delhi</span>
                {userLocation === 'Delhi' && <span>✓</span>}
              </div>
              <div 
                className={`location-dropdown-item ${userLocation === 'Bangalore' ? 'active' : ''}`}
                onClick={() => { setUserLocation('Bangalore'); setShowLocationMenu(false); addToast('Location set to Bangalore', 'success'); }}
              >
                <span>Bangalore</span>
                {userLocation === 'Bangalore' && <span>✓</span>}
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '0.35rem' }}>
                <button className="location-btn-detect" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { detectLocation(); setShowLocationMenu(false); }}>
                  ⚡ Auto-Detect GPS
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Navigation Tabs */}
      <div className="category-tabs">
        <button 
          className={`category-tab ${activeCategory === 'ecommerce' ? 'active' : ''}`}
          onClick={() => { setActiveCategory('ecommerce'); setCustomComp(null); }}
        >
          <ShoppingBag size={16} />
          <span>E-Commerce (Amazon, Flipkart, Meesho, AJIO, Walmart, Nykaa & more)</span>
        </button>
        <button 
          className={`category-tab ${activeCategory === 'quickcommerce' ? 'active' : ''}`}
          onClick={() => { setActiveCategory('quickcommerce'); setCustomComp(null); }}
        >
          <Zap size={16} />
          <span>Quick Commerce (Blinkit, Zepto, Swiggy Instamart, BigBasket, Dunzo & more)</span>
        </button>
        <button 
          className={`category-tab ${activeCategory === 'food' ? 'active' : ''}`}
          onClick={() => { setActiveCategory('food'); setCustomComp(null); }}
        >
          <Utensils size={16} />
          <span>Food Delivery (Zomato & Swiggy)</span>
        </button>
      </div>

      {/* Custom Search Box */}
      <div className="glass-card search-hero" style={{ marginBottom: '2rem' }}>
        <h2>🔍 Search & Compare Any Product</h2>
        <p>
          Compare price indicators in real-time on: 
          {activeCategory === 'ecommerce' && <strong style={{ color: 'var(--accent-primary)' }}> Amazon, Flipkart, Meesho, Snapdeal, JioMart, Tata CLiQ, Myntra, AJIO, Nykaa, Nykaa Fashion, FirstCry, Pepperfry, Bookswagon, eBay, Etsy, Alibaba, AliExpress, Walmart, Croma</strong>}
          {activeCategory === 'quickcommerce' && <strong style={{ color: 'var(--accent-primary)' }}> Blinkit, Zepto, Swiggy Instamart, BigBasket Now, Flipkart Minutes, Amazon Fresh, JioMart Express, BB Daily, Dunzo, Country Delight</strong>}
          {activeCategory === 'food' && <strong style={{ color: 'var(--accent-primary)' }}> Zomato, Swiggy</strong>}
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
            userLocation={userLocation}
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
                userLocation={userLocation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
