import React from 'react';

/**
 * SuspenseLoader — Layout-preserving skeleton fallback for lazy-loaded views.
 * Prevents layout shifts and provides a smooth shimmer transition.
 */
export default function SuspenseLoader({ height = '400px', label = 'Loading view...' }) {
  return (
    <div 
      className="skeleton-card" 
      style={{ 
        minHeight: height, 
        width: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div style={{ textCenter: 'center', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div 
          className="pulse-spinner" 
          style={{ 
            width: '32px', 
            height: '32px', 
            margin: '0 auto 0.75rem', 
            borderColor: 'var(--accent-primary) transparent transparent transparent' 
          }} 
        />
        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{label}</span>
      </div>
    </div>
  );
}
