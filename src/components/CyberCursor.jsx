import React, { useEffect, useState } from 'react';

/**
 * CyberCursor Component
 * Renders a precision glowing neon dot cursor in dark mode.
 * Hides default browser cursor in dark mode for a seamless cyberpunk aesthetic.
 */
export default function CyberCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [followerPos, setFollowerPos] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    let animFrame;

    // Check dark mode state from document body class or observer
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

    // Observe body class changes (when user toggles light/dark mode)
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    const onMouseMove = (e) => {
      setPos({ x: e.clientX, y: e.clientY });
      setIsVisible(true);

      // Detect interactive target elements
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
      setIsHovered(!!isInteractive);
    };

    const onMouseDown = () => setIsClicked(true);
    const onMouseUp = () => setIsClicked(false);
    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    // Smooth follower dot lerp loop
    let currentX = -100;
    let currentY = -100;

    const animateFollower = () => {
      setPos(p => {
        currentX += (p.x - currentX) * 0.18;
        currentY += (p.y - currentY) * 0.18;
        setFollowerPos({ x: currentX, y: currentY });
        return p;
      });
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

  if (!isVisible || !isDarkMode) return null;

  return (
    <div className="cyber-cursor-wrapper" style={{ pointerEvents: 'none', position: 'fixed', inset: 0, zIndex: 999999 }}>
      {/* Soft Trailing Glow Aura Dot */}
      <div 
        className={`cyber-cursor-halo ${isClicked ? 'clicked' : ''} ${isHovered ? 'hovered' : ''}`}
        style={{
          left: `${followerPos.x}px`,
          top: `${followerPos.y}px`
        }}
      />

      {/* Sharp Precision Central Glowing Neon Dot */}
      <div 
        className={`cyber-cursor-dot ${isClicked ? 'clicked' : ''} ${isHovered ? 'hovered' : ''}`}
        style={{
          left: `${pos.x}px`,
          top: `${pos.y}px`
        }}
      />
    </div>
  );
}
