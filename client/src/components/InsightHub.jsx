import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  ShoppingCart, 
  Star, 
  Tag, 
  TrendingUp,
  Percent,
  TrendingDown
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

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analytics');
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
    fetchAnalytics();
  }, [savedProducts]);

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
        <div className="insights-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
          
          {/* Store Catalog Distribution */}
          <div className="glass-card" style={{ gridColumn: 'span 2' }}>
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
          <div className="glass-card" style={{ gridColumn: 'span 2' }}>
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
    </div>
  );
}

export default InsightHub;
