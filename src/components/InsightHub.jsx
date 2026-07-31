import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  ShoppingCart, 
  Star, 
  Tag, 
  TrendingUp,
  Percent,
  TrendingDown,
  Search,
  Filter
} from 'lucide-react';

function InsightHub({ savedProducts }) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    avgPrice: 0,
    avgRating: 0,
    discountedCount: 0,
    priceRange: { min: 0, max: 0 },
    priceDistribution: [],
    ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    topDiscounts: [],
    avgDiscount: 0,
    storeDistribution: {}
  });
  const [loading, setLoading] = useState(true);
  const [filterProduct, setFilterProduct] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  
  // Product History State
  const [selectedHistoryProductId, setSelectedHistoryProductId] = useState('');
  const [productHistory, setProductHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filterProduct) queryParams.append('product', filterProduct);
      if (filterPlatform && filterPlatform !== 'all') queryParams.append('platform', filterPlatform);
      
      const response = await fetch(`/api/analytics?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchAnalytics();
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [savedProducts, filterProduct, filterPlatform]);

  const handleSelectHistoryProduct = async (productId) => {
    setSelectedHistoryProductId(productId);
    if (!productId) {
      setProductHistory([]);
      return;
    }
    
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/products/${productId}/history`);
      if (response.ok) {
        const data = await response.json();
        // Sort by date ascending if not already
        setProductHistory(data);
      }
    } catch (error) {
      console.error('Error fetching product history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="pulse-spinner"></div>
        <p style={{ color: 'var(--text-secondary)' }}>Calculating store analytics...</p>
      </div>
    );
  }

  const {
    totalProducts,
    avgPrice,
    avgRating,
    priceRange,
    priceDistribution,
    ratingDistribution,
    topDiscounts,
    avgDiscount,
    storeDistribution
  } = stats;

  const ratingCounts = Object.values(ratingDistribution);
  const totalRatings = ratingCounts.reduce((a, b) => a + b, 0);

  const maxPriceCount = priceDistribution.length > 0 
    ? Math.max(...priceDistribution.map(d => d.count), 1) 
    : 1;

  const maxStoreCount = Object.keys(storeDistribution).length > 0
    ? Math.max(...Object.values(storeDistribution), 1)
    : 1;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div className="view-header">
        <div className="view-title">
          <h1>Insight Hub</h1>
          <p>Analytics, store distribution margins, and price comparison statistics of your saved library</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '250px' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Filter by product name (e.g., iPhone 15)" 
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            style={{ 
              flex: 1, 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '0.5rem 1rem', 
              color: 'var(--text-primary)',
              outline: 'none'
            }} 
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '200px' }}>
          <Filter size={18} style={{ color: 'var(--text-muted)' }} />
          <select 
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            style={{ 
              flex: 1, 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '0.5rem 1rem', 
              color: 'var(--text-primary)',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Platforms</option>
            <option value="amazon">Amazon</option>
            <option value="flipkart">Flipkart</option>
            <option value="blinkit">Blinkit</option>
            <option value="zepto">Zepto</option>
            <option value="instamart">Swiggy Instamart</option>
            <option value="croma">Croma</option>
            <option value="reliance">Reliance Digital</option>
            <option value="snapdeal">Snapdeal</option>
          </select>
        </div>
      </div>

      {/* Grid of Key Numerical Stats */}
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--accent-blue-glow)', color: 'var(--accent-blue)' }}>
            <ShoppingCart size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalProducts}</span>
            <span className="stat-label">Saved Products</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>₹</span>
          </div>
          <div className="stat-info">
            <span className="stat-value">₹{avgPrice.toLocaleString('en-IN')}</span>
            <span className="stat-label">Average Price</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon warning">
            <Star size={24} fill="currentColor" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{avgRating} ★</span>
            <span className="stat-label">Avg Rating</span>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-icon positive">
            <Percent size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{avgDiscount}%</span>
            <span className="stat-label">Avg Discount</span>
          </div>
        </div>
      </div>

      {totalProducts === 0 ? (
        <div className="glass-card empty-state">
          <BarChart3 size={48} style={{ opacity: 0.4 }} />
          <h3>No analytical dimensions</h3>
          <p>Scrape and save comparative products to compile analytics metrics.</p>
        </div>
      ) : (
        <div className="insights-row" style={{ marginTop: '1.5rem' }}>
          
          {/* Store Catalog Distribution */}
          <div className="glass-card insights-card-wide">
            <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              Products Saved by Store Source
              <ShoppingCart size={18} style={{ color: 'var(--accent-primary)' }} />
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {Object.keys(storeDistribution).length > 0 ? (
                Object.entries(storeDistribution).map(([store, count]) => {
                  const percentage = Math.round((count / totalProducts) * 100);
                  const barPercentage = Math.round((count / maxStoreCount) * 100);
                  return (
                    <div key={store} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div style={{ width: '120px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {store}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="bar-track" style={{ height: '8px' }}>
                          <div 
                            className={`bar-fill`} 
                            style={{ 
                              width: `${barPercentage}%`, 
                              backgroundColor: `var(--accent-${store}, var(--accent-primary))`,
                              height: '100%'
                            }}
                          ></div>
                        </div>
                      </div>
                      <div style={{ width: '80px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600 }}>
                        {count} ({percentage}%)
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No store distribution data.</p>
              )}
            </div>
          </div>

          {/* Price Distribution */}
          <div className="glass-card">
            <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              Price Range Distribution
              <TrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {priceDistribution.length > 0 ? (
                priceDistribution.map((dist, idx) => {
                  const percentage = Math.round((dist.count / maxPriceCount) * 100);
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{dist.range}</span>
                        <span style={{ fontWeight: 600 }}>{dist.count} {dist.count === 1 ? 'item' : 'items'}</span>
                      </div>
                      <div className="bar-track" style={{ height: '8px' }}>
                        <div 
                          className="bar-fill" 
                          style={{ 
                            width: `${percentage}%`, 
                            backgroundColor: 'var(--accent-blue)',
                            backgroundImage: 'linear-gradient(90deg, var(--accent-blue), var(--info))',
                            height: '100%'
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No price distribution data available.</p>
              )}
            </div>
            {priceRange && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Min: ₹{priceRange.min.toLocaleString('en-IN')}</span>
                <span>Max: ₹{priceRange.max.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* Rating Distribution */}
          <div className="glass-card">
            <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              Rating Distribution
              <Star size={18} fill="var(--warning)" stroke="var(--warning)" />
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {['5', '4', '3', '2', '1'].map((star) => {
                const count = ratingDistribution[star] || 0;
                const percentage = totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0;
                return (
                  <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '45px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {star} <Star size={12} fill="var(--warning)" stroke="var(--warning)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="bar-track" style={{ height: '8px' }}>
                        <div 
                          className="bar-fill" 
                          style={{ 
                            width: `${percentage}%`, 
                            backgroundColor: star >= 4 ? 'var(--success)' : star >= 3 ? 'var(--warning)' : 'var(--danger)',
                            height: '100%'
                          }}
                        ></div>
                      </div>
                    </div>
                    <div style={{ width: '45px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {percentage}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Deals / Best Discounts */}
          <div className="glass-card insights-card-wide">
            <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              Top Saved Discount Deals
              <Tag size={18} style={{ color: 'var(--success)' }} />
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {topDiscounts && topDiscounts.length > 0 ? (
                topDiscounts.map((deal, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem', 
                      padding: '0.6rem', 
                      borderRadius: '8px', 
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ width: '45px', height: '45px', background: 'white', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {deal.imageUrl ? (
                        <img 
                          src={deal.imageUrl.startsWith('http') && !deal.imageUrl.includes('unsplash.com') ? `/api/proxy-image?url=${encodeURIComponent(deal.imageUrl)}` : deal.imageUrl} 
                          alt="" 
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';
                          }}
                        />
                      ) : (
                        <ShoppingCart size={18} style={{ color: '#aaa' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 
                        style={{ 
                          fontSize: '0.85rem', 
                          fontWeight: 500, 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          margin: 0
                        }} 
                        title={deal.name}
                      >
                        {deal.name}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{deal.price}</span>
                        <span className={`store-badge store-badge-${deal.store || 'flipkart'}`} style={{ transform: 'scale(0.85)', transformOrigin: 'left center', margin: 0, padding: '1px 4px', fontSize: '0.65rem' }}>
                          {deal.store || 'flipkart'}
                        </span>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <span className="discount-badge" style={{ position: 'static', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                        {deal.discount}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', gridColumn: 'span 2' }}>
                  No deals with discounts found.
                </p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Product Price History Section */}
      {totalProducts > 0 && (
        <div className="glass-card insights-card-wide" style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            Product Price History (Last 6 Months)
            <TrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
          </h3>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <select 
              value={selectedHistoryProductId}
              onChange={(e) => handleSelectHistoryProduct(e.target.value)}
              style={{ 
                width: '100%', 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                padding: '0.75rem 1rem', 
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Select a saved product to view its price trend --</option>
              {savedProducts && savedProducts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.store}) - ₹{p.price}
                </option>
              ))}
            </select>
          </div>

          {loadingHistory ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div className="pulse-spinner" style={{ margin: '0 auto' }}></div>
            </div>
          ) : productHistory.length > 0 ? (
            <div className="price-history-chart" style={{ height: '240px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingTop: '20px', paddingBottom: '10px' }}>
              {productHistory.map((pt, i) => {
                const prices = productHistory.map(p => p.price);
                const maxPrice = Math.max(...prices);
                const minPrice = Math.min(...prices);
                const range = maxPrice - minPrice || maxPrice;
                const heightPct = 15 + ((pt.price - minPrice) / range) * 85;
                
                return (
                  <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>₹{pt.price.toLocaleString('en-IN')}</div>
                    <div style={{ 
                      width: '100%', 
                      maxWidth: '40px',
                      height: `${heightPct}%`, 
                      background: 'linear-gradient(to top, var(--accent-primary-dim), var(--accent-primary))',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.5s ease'
                    }} title={`₹${pt.price.toLocaleString('en-IN')} on ${pt.date}`}></div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      {pt.date}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : selectedHistoryProductId ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Historical data is being collected. Check back soon for the price trend!
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Select a product from the dropdown above to visualize its price history.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InsightHub;
