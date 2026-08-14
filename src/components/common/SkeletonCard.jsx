import React from 'react';

/**
 * SkeletonCard — Reusable shimmer skeleton card for products, history charts,
 * and list loading states. Eliminates layout pops.
 */
export default function SkeletonCard({ height = '200px', count = 1 }) {
  const cards = Array.from({ length: count });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {cards.map((_, idx) => (
        <div 
          key={idx} 
          className="skeleton" 
          style={{ 
            height, 
            width: '100%', 
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)'
          }} 
        />
      ))}
    </div>
  );
}
