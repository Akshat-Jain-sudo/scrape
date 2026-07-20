import React, { useEffect, useRef } from 'react';

/**
 * CyberCursor Component (Bulletproof Visibility & Performance)
 * Ensures cursor is ALWAYS visible and silky-smooth across both Light and Dark modes.
 */
export default function CyberCursor() {
  const dotRef = useRef(null);
  const haloRef = useRef(null);

  useEffect(() => {
    // Enable custom cursor mode on document body
    document.body.classList.add('custom-cyber-cursor-active');

    let animFrame;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let followerX = window.innerWidth / 2;
    let followerY = window.innerHeight / 2;

    // Set initial position
    if (dotRef.current) {
      dotRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      dotRef.current.style.opacity = '1';
    }
    if (haloRef.current) {
      haloRef.current.style.transform = `translate3d(${followerX}px, ${followerY}px, 0)`;
      haloRef.current.style.opacity = '1';
    }

    const onMouseMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;

      // Ensure cursor elements are visible
      if (dotRef.current && dotRef.current.style.opacity !== '1') {
        dotRef.current.style.opacity = '1';
      }
      if (haloRef.current && haloRef.current.style.opacity !== '1') {
        haloRef.current.style.opacity = '1';
      }

      // Instant hardware-accelerated positioning for central dot
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      }

      // Check hover state on interactive targets
      const target = e.target;
      const isInteractive = target && (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.closest('button') ||
        target.closest('a') ||
        target.getAttribute('role') === 'button' ||
        target.classList.contains('interactive') ||
        target.classList.contains('amazon-nav-item')
      );

      if (dotRef.current && haloRef.current) {
        if (isInteractive) {
          dotRef.current.classList.add('hovered');
          haloRef.current.classList.add('hovered');
        } else {
          dotRef.current.classList.remove('hovered');
          haloRef.current.classList.remove('hovered');
        }
      }
    };

    const onMouseDown = () => {
      if (dotRef.current) dotRef.current.classList.add('clicked');
      if (haloRef.current) haloRef.current.classList.add('clicked');
    };

    const onMouseUp = () => {
      if (dotRef.current) dotRef.current.classList.remove('clicked');
      if (haloRef.current) haloRef.current.classList.remove('clicked');
    };

    const onMouseLeave = () => {
      if (dotRef.current) dotRef.current.style.opacity = '0';
      if (haloRef.current) haloRef.current.style.opacity = '0';
    };

    const onMouseEnter = () => {
      if (dotRef.current) dotRef.current.style.opacity = '1';
      if (haloRef.current) haloRef.current.style.opacity = '1';
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    // Smooth lerping loop for trailing halo
    const animateFollower = () => {
      followerX += (targetX - followerX) * 0.25;
      followerY += (targetY - followerY) * 0.25;

      if (haloRef.current) {
        haloRef.current.style.transform = `translate3d(${followerX}px, ${followerY}px, 0)`;
      }

      animFrame = requestAnimationFrame(animateFollower);
    };

    animFrame = requestAnimationFrame(animateFollower);

    return () => {
      document.body.classList.remove('custom-cyber-cursor-active');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      cancelAnimationFrame(animFrame);
    };
  }, []);

  return (
    <div 
      className="cyber-cursor-wrapper" 
      style={{ 
        pointerEvents: 'none', 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        zIndex: 999999,
        overflow: 'hidden'
      }}
    >
      {/* Trailing Halo Aura */}
      <div 
        ref={haloRef} 
        className="cyber-cursor-halo" 
        style={{ opacity: 1, willChange: 'transform' }} 
      />

      {/* Central Precision Glowing Dot */}
      <div 
        ref={dotRef} 
        className="cyber-cursor-dot" 
        style={{ opacity: 1, willChange: 'transform' }} 
      />
    </div>
  );
}
