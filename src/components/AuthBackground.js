// src/components/AuthBackground.js
"use client";

import { useEffect, useRef } from "react";

export default function AuthBackground({ darkMode = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes = [];
    let rafId = null;

    const NODE_COUNT = 110;
    const MAX_DIST = 160;
    const SPEED = 0.22;

    const lineColor = darkMode ? "16, 185, 129" : "5, 150, 105";
    const dotColor = darkMode ? "52, 211, 153" : "16, 185, 129";

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initNodes() {
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * SPEED,
        vy: (Math.random() - 0.5) * SPEED,
        r: Math.random() * 1.2 + 0.8,
      }));
    }

    function step() {
      ctx.clearRect(0, 0, width, height);

      // Merkeze doğru yayılan soluk dalga halkaları
      const t = Date.now() / 1000;
      const centerX = width / 2;
      const centerY = height * 0.35;
      for (let i = 0; i < 3; i++) {
        const phase = (t * 0.15 + i / 3) % 1;
        const radius = phase * Math.max(width, height) * 0.5;
        const opacity = (1 - phase) * 0.12;
        ctx.strokeStyle = darkMode
          ? `rgba(52, 211, 153, ${opacity})`
          : `rgba(16, 185, 129, ${opacity})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Node hareketi
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }

      // Node'lar arası bağlantı çizgileri
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const opacity = (1 - dist / MAX_DIST) * 0.55;
            ctx.strokeStyle = `rgba(${lineColor}, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Node noktaları
      for (const n of nodes) {
        ctx.fillStyle = `rgba(${dotColor}, 0.75)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(step);
    }

    resize();
    initNodes();

    if (!prefersReducedMotion) {
      step();
    } else {
      step();
      if (rafId) cancelAnimationFrame(rafId);
    }

    const handleResize = () => {
      resize();
      initNodes();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [darkMode]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="h-full w-full opacity-90" />
    </div>
  );
}