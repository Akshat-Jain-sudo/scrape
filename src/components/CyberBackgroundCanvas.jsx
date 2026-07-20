import React, { useEffect, useRef } from 'react';

/**
 * CyberBackgroundCanvas Component (Ultra High-Performance Engine)
 * Render loop optimized for 60-120 FPS:
 * - Removed expensive canvas shadowBlur calls
 * - Optimized node rendering & vector distance math
 * - Zero React re-renders during animation loop
 */
export default function CyberBackgroundCanvas({ 
  interactive = true, 
  particleCount = 45, 
  accentColor = '#ff5500', 
  cyanColor = '#00f0ff',   
  greenColor = '#10b981',  
  showTelemetry = true,
  opacity = 0.85
}) {
  const canvasRef = useRef(null);
  const latencyRef = useRef(null);
  const nodesSyncedRef = useRef(null);
  const fpsRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initNodes();
    };

    window.addEventListener('resize', handleResize, { passive: true });

    // Mouse tracking
    const mouse = {
      x: width * 0.5,
      y: height * 0.4,
      targetX: width * 0.5,
      targetY: height * 0.4,
      radius: 160,
      active: false
    };

    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    // Shockwaves on click
    const shockwaves = [];
    const handleMouseClick = (e) => {
      if (shockwaves.length > 5) shockwaves.shift();
      shockwaves.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        maxRadius: 200,
        speed: 4.5,
        opacity: 1
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    window.addEventListener('click', handleMouseClick, { passive: true });

    // Nodes & Data Packets
    let nodes = [];
    let pulses = [];

    const initNodes = () => {
      nodes = [];
      const numNodes = Math.min(particleCount, Math.floor((width * height) / 22000));
      
      for (let i = 0; i < numNodes; i++) {
        const type = Math.random() < 0.2 ? 'orange' : Math.random() < 0.35 ? 'cyan' : Math.random() < 0.5 ? 'green' : 'dim';
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          baseRadius: Math.random() * 2 + 1.2,
          radius: Math.random() * 2 + 1.2,
          type: type,
          color: type === 'orange' ? accentColor : type === 'cyan' ? cyanColor : type === 'green' ? greenColor : 'rgba(255, 255, 255, 0.4)',
          pulseAngle: Math.random() * Math.PI * 2,
          pulseSpeed: 0.02 + Math.random() * 0.03
        });
      }

      // Central core hub
      nodes.push({
        x: width * 0.55,
        y: height * 0.42,
        vx: 0,
        vy: 0,
        baseRadius: 7,
        radius: 7,
        isCore: true,
        type: 'orange',
        color: accentColor,
        pulseAngle: 0,
        pulseSpeed: 0.04
      });
    };

    initNodes();

    // Data pulses interval
    const pulseInterval = setInterval(() => {
      if (nodes.length < 2 || pulses.length > 6) return;
      const startIdx = Math.floor(Math.random() * (nodes.length - 1));
      const startNode = nodes[startIdx];

      let nearest = null;
      let minDstSq = 200 * 200;

      for (let i = 0; i < nodes.length; i++) {
        if (i === startIdx) continue;
        const targetNode = nodes[i];
        const dx = targetNode.x - startNode.x;
        const dy = targetNode.y - startNode.y;
        const dstSq = dx * dx + dy * dy;
        if (dstSq < minDstSq && dstSq > 400) {
          minDstSq = dstSq;
          nearest = targetNode;
        }
      }

      if (nearest) {
        pulses.push({
          startX: startNode.x,
          startY: startNode.y,
          endX: nearest.x,
          endY: nearest.y,
          progress: 0,
          speed: 0.02 + Math.random() * 0.02,
          color: startNode.type === 'cyan' ? cyanColor : accentColor
        });
      }
    }, 500);

    // FPS & Telemetry
    let lastTime = performance.now();
    let frameCount = 0;

    // Fast Render Loop
    const render = (now) => {
      frameCount++;
      if (now - lastTime >= 1000) {
        const currentFps = Math.round((frameCount * 1000) / (now - lastTime));
        if (fpsRef.current) fpsRef.current.textContent = currentFps;
        if (latencyRef.current) latencyRef.current.textContent = (0.4 + Math.random() * 0.3).toFixed(2) + 'ms';
        if (nodesSyncedRef.current) nodesSyncedRef.current.textContent = (4900 + Math.floor(Math.random() * 80)).toLocaleString();
        frameCount = 0;
        lastTime = now;
      }

      mouse.x += (mouse.targetX - mouse.x) * 0.1;
      mouse.y += (mouse.targetY - mouse.y) * 0.1;

      ctx.clearRect(0, 0, width, height);

      // Cyber background grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 70;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Render shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += sw.speed;
        sw.opacity = 1 - sw.radius / sw.maxRadius;

        if (sw.opacity <= 0) {
          shockwaves.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 85, 0, ${sw.opacity * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Render core hub pulses
      const coreNode = nodes.find(n => n.isCore);
      if (coreNode) {
        coreNode.pulseAngle += coreNode.pulseSpeed;
        const waveRadius = 25 + Math.sin(coreNode.pulseAngle) * 12;
        
        ctx.beginPath();
        ctx.arc(coreNode.x, coreNode.y, waveRadius * 1.6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 85, 0, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Update nodes position
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (!node.isCore) {
          node.x += node.vx;
          node.y += node.vy;

          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;

          if (interactive && mouse.active) {
            const dx = mouse.x - node.x;
            const dy = mouse.y - node.y;
            const distSq = dx * dx + dy * dy;
            const maxDistSq = mouse.radius * mouse.radius;
            if (distSq < maxDistSq) {
              const dist = Math.sqrt(distSq);
              const force = (mouse.radius - dist) / mouse.radius;
              const angle = Math.atan2(dy, dx);
              node.x -= Math.cos(angle) * force * 1.8;
              node.y -= Math.sin(angle) * force * 1.8;
            }
          }
        }

        node.pulseAngle += node.pulseSpeed;
        node.radius = node.baseRadius + Math.sin(node.pulseAngle) * 0.6;
      }

      // Draw vector connections between nodes
      const maxConnectDistanceSq = 140 * 140;
      const maxConnectDistance = 140;

      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxConnectDistanceSq) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / maxConnectDistance) * 0.4;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);

            if (n1.isCore || n2.isCore) {
              ctx.strokeStyle = `rgba(255, 85, 0, ${alpha * 0.8})`;
              ctx.lineWidth = 1.2;
            } else if (n1.type === 'cyan' || n2.type === 'cyan') {
              ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.6})`;
              ctx.lineWidth = 0.8;
            } else {
              ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.2})`;
              ctx.lineWidth = 0.6;
            }
            ctx.stroke();
          }
        }
      }

      // Mouse connections
      if (interactive && mouse.active) {
        const mouseRadius = mouse.radius * 0.85;
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < mouseRadius * mouseRadius) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / mouseRadius) * 0.5;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(node.x, node.y);
            ctx.strokeStyle = `rgba(255, 85, 0, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Data pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.progress += p.speed;

        if (p.progress >= 1) {
          pulses.splice(i, 1);
          continue;
        }

        const currX = p.startX + (p.endX - p.startX) * p.progress;
        const currY = p.startY + (p.endY - p.startY) * p.progress;

        ctx.beginPath();
        ctx.arc(currX, currY, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      // Render node dots (NO expensive shadowBlur calls)
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        if (node.isCore) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 2, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 85, 0, 0.7)';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(pulseInterval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleMouseClick);
    };
  }, [particleCount, accentColor, cyanColor, greenColor, interactive]);

  return (
    <div 
      className="cyber-canvas-container"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: opacity,
        overflow: 'hidden'
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      {/* Futuristic Telemetry HUD Corner Badges */}
      {showTelemetry && (
        <>
          <div className="cyber-hud-tag top-left">
            <span className="hud-indicator active"></span>
            <code>ENCRYPTION_ACTIVE</code>
            <span className="hud-sub">LATENCY: <span ref={latencyRef}>0.52ms</span></span>
          </div>

          <div className="cyber-hud-tag top-right">
            <code>SYS_STABILITY: 100%</code>
            <span className="hud-sub">NODES_SYNCED: <span ref={nodesSyncedRef}>4,945</span></span>
          </div>

          <div className="cyber-hud-tag bottom-left">
            <code>[ SYSTEM_PROTOCOL_HARDENED ]</code>
          </div>

          <div className="cyber-hud-tag bottom-right">
            <code>FPS: <span ref={fpsRef}>60</span></code>
          </div>
        </>
      )}
    </div>
  );
}
