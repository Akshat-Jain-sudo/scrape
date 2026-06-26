import React from 'react';

/**
 * Symbiote custom logo — a stylized lightning bolt + web scraping spider motif
 * inside a rounded square. Features gradient fills for a premium look.
 */
const SymbioteLogo = ({ size = 24, className = '' }) => {
  const id = React.useId?.() || 'fsl';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Symbiote Logo"
    >
      <defs>
        {/* Main gradient — orange to blue (Flipkart vibes) */}
        <linearGradient id={`${id}-grad1`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F57224" />
          <stop offset="50%" stopColor="#E040FB" />
          <stop offset="100%" stopColor="#2874F0" />
        </linearGradient>
        {/* Glow filter */}
        <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Inner shadow */}
        <radialGradient id={`${id}-radial`} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* Background rounded square */}
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="16"
        fill={`url(#${id}-grad1)`}
      />
      {/* Glossy overlay */}
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="16"
        fill={`url(#${id}-radial)`}
      />

      {/* Spider web lines radiating from center — represents web scraping */}
      <g opacity="0.15" stroke="white" strokeWidth="0.8">
        {/* Radial lines */}
        <line x1="32" y1="32" x2="32" y2="8" />
        <line x1="32" y1="32" x2="56" y2="14" />
        <line x1="32" y1="32" x2="56" y2="50" />
        <line x1="32" y1="32" x2="32" y2="56" />
        <line x1="32" y1="32" x2="8" y2="50" />
        <line x1="32" y1="32" x2="8" y2="14" />
        {/* Concentric arcs (simplified as partial paths) */}
        <path d="M 24 14 Q 32 11, 40 14" fill="none" />
        <path d="M 44 18 Q 50 26, 48 36" fill="none" />
        <path d="M 48 40 Q 44 48, 36 50" fill="none" />
        <path d="M 28 50 Q 20 48, 16 40" fill="none" />
        <path d="M 16 36 Q 14 26, 20 18" fill="none" />
        {/* Inner ring */}
        <path d="M 28 22 Q 32 20, 36 22" fill="none" />
        <path d="M 38 24 Q 42 28, 40 34" fill="none" />
        <path d="M 39 36 Q 36 40, 32 40" fill="none" />
        <path d="M 28 40 Q 24 38, 24 34" fill="none" />
        <path d="M 24 30 Q 24 26, 28 24" fill="none" />
      </g>

      {/* Lightning bolt — represents "Flip" speed + scraping power */}
      <g filter={`url(#${id}-glow)`}>
        <path
          d="M 36 10 L 24 33 L 31 33 L 28 54 L 42 28 L 34 28 Z"
          fill="white"
          opacity="0.95"
        />
      </g>

      {/* Small spider icon at bottom-right corner */}
      <g transform="translate(44, 44) scale(0.8)" opacity="0.9">
        {/* Spider body */}
        <ellipse cx="6" cy="5" rx="3.5" ry="4" fill="white" opacity="0.9" />
        <circle cx="6" cy="1.5" r="2" fill="white" opacity="0.9" />
        {/* Spider legs */}
        <g stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.85">
          <path d="M 3 3 Q 0 1, -2 -1" fill="none" />
          <path d="M 3 5 Q -1 5, -3 3" fill="none" />
          <path d="M 3 7 Q 0 9, -2 11" fill="none" />
          <path d="M 9 3 Q 12 1, 14 -1" fill="none" />
          <path d="M 9 5 Q 13 5, 15 3" fill="none" />
          <path d="M 9 7 Q 12 9, 14 11" fill="none" />
        </g>
      </g>
    </svg>
  );
};

export default SymbioteLogo;
