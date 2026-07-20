import React, { useEffect, useRef, useState } from 'react';

/**
 * CyberBackgroundCanvas Component
 * Recreates the CYART interactive network particle animation from the video recording:
 * - Dynamic node constellation with glowing vector lines
 * - Animated data packet pulses along connections
 * - Central & cursor pulse shockwaves
 * - Interactive mouse physics (magnetic push/attraction & click ripples)
 * - HUD telemetry overlay indicators
 */
export default function CyberBackgroundCanvas({ 
  interactive = true, 
  particleCount = 65, 
  accentColor = '#ff5500', // CYART Neon Orange
  cyanColor = '#00f0ff',   // Neon Cyan
  greenColor = '#10b981',  // Emerald Green
  showTelemetry = true,
  opacity = 0.85
}) {
  const canvasRef = useRef(null);
  const [telemetry, setTelemetry] = useState({
    latency: '0.64ms',
    nodesSynced: '4,945',
    encryption: 'ACTIVE',
    stability: '100%',
    fps: 60
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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

    window.addEventListener('resize', handleResize);

    // Mouse tracking
    const mouse = {
      x: width * 0.5,
      y: height * 0.4,
      targetX: width * 0.5,
      targetY: height * 0.4,
      radius: 180,
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
      shockwaves.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        maxRadius: 220,
        speed: 4,
        opacity: 1
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleMouseClick);

    // Nodes & Data Packets
    let nodes = [];
    let pulses = [];

    const initNodes = () => {
      nodes = [];
      const numNodes = Math.min(particleCount, Math.floor((width * height) / 18000));
      
      for (let i = 0; i < numNodes; i++) {
        const type = Math.random() < 0.2 ? 'orange' : Math.random() < 0.35 ? 'cyan' : Math.random() < 0.5 ? 'green' : 'dim';
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          baseRadius: Math.random() * 2.5 + 1.2,
          radius: Math.random() * 2.5 + 1.2,
          type: type,
          color: type === 'orange' ? accentColor : type === 'cyan' ? cyanColor : type === 'green' ? greenColor : 'rgba(255, 255, 255, 0.4)',
          pulseAngle: Math.random() * Math.PI * 2,
          pulseSpeed: 0.02 + Math.random() * 0.03
        });
      }

      // Add a central core node (CYART central hub feature)
      nodes.push({
        x: width * 0.55,
        y: height * 0.42,
        vx: 0,
        vy: 0,
 baseRadius: 8,
        radius: 8,
        isCore: true,
        type: 'orange',
        color: accentColor,
        pulseAngle: 0,
        pulseSpeed: 0.04
      });
    };

    initNodes();

    // Spawn periodic data pulses travelling along connections
    const pulseInterval = setInterval(() => {
      if (nodes.length < 2) return;
      const startIdx = Math.floor(Math.random() * nodes.length);
      const startNode = nodes[startIdx];

      let nearest = null;
      let minDst = 250;
      nodes.forEach((targetNode, idx) => {
        if (idx === startIdx) return;
        const dx = targetNode.x - startNode.x;
        const dy = targetNode.y - startNode.y;
        const dst = Math.sqrt(dx * dx + dy * dy);
        if (dst < minDst && dst > 20) {
          minDst = dst;
          nearest = targetNode;
        }
      });

      if (nearest) {
        pulses.push({
          startX: startNode.x,
          startY: startNode.y,
          endX: nearest.x,
          endY: nearest.y,
          progress: 0,
          speed: 0.015 + Math.random() * 0.02,
          color: startNode.type === 'cyan' ? cyanColor : accentColor
        });
      }
    }, 400);

    // FPS Telemetry counter
    let lastTime = performance.now();
    let frameCount = 0;

    // Render loop
    const render = (now) => {
      frameCount++;
      if (now - lastTime >= 1000) {
        const currentFps = Math.round((frameCount * 1000) / (now - lastTime));
        setTelemetry(prev => ({
          ...prev,
          fps: currentFps,
          latency: (0.4 + Math.random() * 0.4).toFixed(2) + 'ms',
          nodesSynced: (4900 + Math.floor(Math.random() * 90)).toLocaleString()
        }));
        frameCount = 0;
        lastTime = now;
      }

      // Smooth mouse target lerping
      mouse.x += (mouse.targetX - mouse.x) * 0.1;
      mouse.y += (mouse.targetY - mouse.y) * 0.1;

      ctx.clearRect(0, 0, width, height);

      // Draw subtle cyber grid pattern background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.lineWidth = 1;
      const gridSize = 60;
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

      // Update & render shockwaves
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
        ctx.strokeStyle = `rgba(255, 85, 0, ${sw.opacity * 0.6})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 240, 255, ${sw.opacity * 0.4})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Update core hub pulse waves
      const coreNode = nodes.find(n => n.isCore);
      if (coreNode) {
        coreNode.pulseAngle += coreNode.pulseSpeed;
        const waveRadius = 25 + Math.sin(coreNode.pulseAngle) * 15;
        
        ctx.beginPath();
        ctx.arc(coreNode.x, coreNode.y, waveRadius * 1.8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 85, 0, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(coreNode.x, coreNode.y, waveRadius * 3.2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 85, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Update nodes position & mouse interaction
      nodes.forEach((node) => {
        if (!node.isCore) {
          node.x += node.vx;
          node.y += node.vy;

          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;

          if (interactive && mouse.active) {
            const dx = mouse.x - node.x;
            const dy = mouse.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < mouse.radius) {
              const force = (mouse.radius - dist) / mouse.radius;
              const angle = Math.atan2(dy, dx);
              node.x -= Math.cos(angle) * force * 2;
              node.y -= Math.sin(angle) * force * 2;
            }
          }
        }

        node.pulseAngle += node.pulseSpeed;
        node.radius = node.baseRadius + Math.sin(node.pulseAngle) * 0.8;
      });

      // Draw vector connection lines
      const maxConnectDistance = 150;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectDistance) {
            const alpha = (1 - dist / maxConnectDistance) * 0.45;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);

            if (n1.isCore || n2.isCore) {
              ctx.strokeStyle = `rgba(255, 85, 0, ${alpha * 0.9})`;
              ctx.lineWidth = 1.2;
            } else if (n1.type === 'cyan' || n2.type === 'cyan') {
              ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.7})`;
              ctx.lineWidth = 0.8;
            } else {
              ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.25})`;
              ctx.lineWidth = 0.6;
            }
            ctx.stroke();
          }
        }
      }

      // Draw mouse connections
      if (interactive && mouse.active) {
        nodes.forEach(node => {
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius * 0.9) {
            const alpha = (1 - dist / (mouse.radius * 0.9)) * 0.6;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(node.x, node.y);
            ctx.strokeStyle = `rgba(255, 85, 0, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      }

      // Render data packet pulses
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
        ctx.arc(currX, currY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Render nodes
      nodes.forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        if (node.isCore) {
          ctx.fillStyle = accentColor;
          ctx.shadowColor = accentColor;
          ctx.shadowBlur = 18;
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 2.2, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 85, 0, 0.7)';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.fillStyle = node.color;
          if (node.type === 'orange' || node.type === 'cyan') {
            ctx.shadowColor = node.color;
            ctx.shadowBlur = 8;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

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
            <span className="hud-sub">LATENCY: {telemetry.latency}</span>
          </div>

          <div className="cyber-hud-tag top-right">
            <code>SYS_STABILITY: 100%</code>
            <span className="hud-sub">NODES_SYNCED: {telemetry.nodesSynced}</span>
          </div>

          <div className="cyber-hud-tag bottom-left">
            <code>[ SYSTEM_PROTOCOL_HARDENED ]</code>
          </div>

          <div className="cyber-hud-tag bottom-right">
            <code>FPS: {telemetry.fps}</code>
          </div>
        </>
      )}
    </div>
  );
}
