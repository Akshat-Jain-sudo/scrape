import React, { useEffect, useRef, useState } from 'react';

/**
 * CyberCursor Component (Ultra-Performance Optimized)
 * Uses direct DOM ref transforms (zero React re-renders on mousemove)
 * GPU-accelerated translate3d for silky smooth 120+ FPS cursor tracking
 */
export default function CyberCursor() {
  const dotRef = useRef(null);
  const haloRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check dark mode state from document body class
    const checkTheme = () => {
      const isDark = document.body.classList.contains('theme-dark') || 
                     document.body.className.includes('dark');
      setIsDarkMode(isDark);
      
      if (isDark) {
        document.body.classList.add('custom-cyber-cursor-active');
      } else {
        document.body.classList.remove('custom-cyber-cursor-active');
      }
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    let animFrame;
    let targetX = -100;
    let targetY = -100;
    let followerX = -100;
    let followerY = -100;
    let isVisible = false;

    const onMouseMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;

      if (!isVisible) {
        isVisible = true;
        if (dotRef.current) dotRef.current.style.opacity = '1';
        if (haloRef.current) haloRef.current.style.opacity = '1';
      }

      // Fast direct DOM update for core dot (Zero React re-render)
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      }

      // Check if mouse is hovering interactive element
      const target = e.target;
      const isInteractive = target && (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.closest('button') ||
        target.closest('a') ||
        target.getAttribute('role') === 'button' ||
        target.classList.contains('interactive')
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
      isVisible = false;
      if (dotRef.current) dotRef.current.style.opacity = '0';
      if (haloRef.current) haloRef.current.style.opacity = '0';
    };

    const onMouseEnter = () => {
      isVisible = true;
      if (dotRef.current) dotRef.current.style.opacity = '1';
      if (haloRef.current) haloRef.current.style.opacity = '1';
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    // Ultra smooth lerping loop using GPU translate3d (No React re-renders!)
    const animateFollower = () => {
      followerX += (targetX - followerX) * 0.22;
      followerY += (targetY - followerY) * 0.22;

      if (haloRef.current) {
        haloRef.current.style.transform = `translate3d(${followerX}px, ${followerY}px, 0)`;
      }

      animFrame = requestAnimationFrame(animateFollower);
    };

    animFrame = requestAnimationFrame(animateFollower);

    return () => {
      observer.disconnect();
      document.body.classList.remove('custom-cyber-cursor-active');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      cancelAnimationFrame(animFrame);
    };
  }, []);

  if (!isDarkMode) return null;

  return (
    <div className="cyber-cursor-wrapper" style={{ pointerEvents: 'none', position: 'fixed', inset: 0, zIndex: 999999 }}>
      {/* Soft Trailing Glow Aura Halo Dot */}
      <div ref={haloRef} className="cyber-cursor-halo" />

      {/* Sharp Precision Central Glowing Neon Dot */}
      <div ref={dotRef} className="cyber-cursor-dot" />
    </div>
  );
}
