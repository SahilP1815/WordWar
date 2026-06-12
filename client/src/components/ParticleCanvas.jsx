import React, { useEffect, useRef } from 'react';

/**
 * ParticleCanvas — Star-particle network background with mouse interaction.
 * Adapted from QuantumShield's particle system for the Think & Type game.
 * Renders a fullscreen <canvas> behind all content with pointer-events: none.
 */
export default function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    /* ── Color Palette (indigo/violet gaming theme) ── */
    const PAL = {
      particle: [96, 165, 250],   // blue-400
      line:     [99, 102, 241],   // indigo-500
      mouse:   [139, 92, 246],    // violet-500
    };

    const rgba = (rgb, a) =>
      `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a.toFixed(3)})`;

    /* ── Particle ── */
    class Particle {
      constructor(w, h) { this.reset(w, h); }

      reset(w, h) {
        const speed = Math.random() * 0.35 + 0.08;
        const angle = Math.random() * Math.PI * 2;
        this.x   = Math.random() * w;
        this.y   = Math.random() * h;
        this.vx  = Math.cos(angle) * speed;
        this.vy  = Math.sin(angle) * speed;
        this.r   = Math.random() * 1.8 + 0.8;
        this.op  = Math.random() * 0.4 + 0.4;
        this.opD = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.006 + 0.003);
      }

      update(w, h) {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < -10) this.x = w + 10;
        if (this.x > w + 10) this.x = -10;
        if (this.y < -10) this.y = h + 10;
        if (this.y > h + 10) this.y = -10;
        this.op += this.opD;
        if (this.op > 0.85 || this.op < 0.25) this.opD *= -1;
      }
    }

    /* ── State ── */
    let W, H;
    let particles = [];
    const mouse = { x: -9999, y: -9999 };
    let raf;

    const resize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      spawn();
    };

    const spawn = () => {
      const count = Math.max(50, Math.min(120, Math.floor((W * H) / 12000)));
      particles = [];
      for (let i = 0; i < count; i++) particles.push(new Particle(W, H));
    };

    /* ── Render Loop ── */
    const MAX_DIST   = 140;
    const MOUSE_DIST = 200;
    const MAX_D2     = MAX_DIST * MAX_DIST;
    const MOUSE_D2   = MOUSE_DIST * MOUSE_DIST;

    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      const n  = particles.length;
      const mx = mouse.x;
      const my = mouse.y;

      // Lines (behind dots)
      for (let i = 0; i < n; i++) {
        const pi = particles[i];
        pi.update(W, H);

        // Particle–particle lines
        for (let j = i + 1; j < n; j++) {
          const pj = particles[j];
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < MAX_D2) {
            const t  = 1 - Math.sqrt(d2) / MAX_DIST;
            const lw = t * 1.4;
            const la = t * 0.55 * ((pi.op + pj.op) / 2);
            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            ctx.lineWidth   = lw;
            ctx.strokeStyle = rgba(PAL.line, la);
            ctx.stroke();
          }
        }

        // Particle–mouse lines
        const mdx = pi.x - mx;
        const mdy = pi.y - my;
        const md2 = mdx * mdx + mdy * mdy;
        if (md2 < MOUSE_D2) {
          const mt  = 1 - Math.sqrt(md2) / MOUSE_DIST;
          const mlw = mt * 1.8;
          const mla = mt * 0.75;
          ctx.beginPath();
          ctx.moveTo(pi.x, pi.y);
          ctx.lineTo(mx, my);
          ctx.lineWidth   = mlw;
          ctx.strokeStyle = rgba(PAL.mouse, mla);
          ctx.stroke();
        }
      }

      // Dots
      for (let k = 0; k < n; k++) {
        const pk = particles[k];
        const hkdx = pk.x - mx;
        const hkdy = pk.y - my;
        const hkd2 = hkdx * hkdx + hkdy * hkdy;
        const boost = hkd2 < MOUSE_D2 ? 1 + (1 - Math.sqrt(hkd2) / MOUSE_DIST) * 1.5 : 1;

        ctx.beginPath();
        ctx.arc(pk.x, pk.y, pk.r * boost, 0, Math.PI * 2);
        ctx.fillStyle = rgba(PAL.particle, Math.min(1, pk.op * boost));
        ctx.fill();
      }

      // Mouse cursor node
      if (mx > -100) {
        ctx.beginPath();
        ctx.arc(mx, my, 6, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(PAL.mouse, 0.5);
        ctx.lineWidth   = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = rgba(PAL.mouse, 0.9);
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };

    /* ── Events ── */
    const onResize = () => resize();
    const onMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onMouseLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    const onTouchMove = (e) => {
      if (e.touches.length) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
      }
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    resize();
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
}
