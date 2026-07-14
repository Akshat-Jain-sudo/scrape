import React from 'react';
import { Zap } from 'lucide-react';

const STORE_LABELS = {
  zomato: 'Zomato',
  swiggy: 'Swiggy',
  blinkit: 'Blinkit',
  zepto: 'Zepto',
  instamart: 'Instamart',
  bigbasket: 'BigBasket',
  dunzo: 'Dunzo',
  flipkart: 'Flipkart',
  amazon: 'Amazon',
  meesho: 'Meesho'
};

export default function SpeedCostMatrix({ comparisonData }) {
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
        label: STORE_LABELS[store] || store,
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
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="auto" style={{ maxWidth: '100%', display: 'block' }}>
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
