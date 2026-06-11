/**
 * Space Shooter - Parallax Background System
 *
 * 3-layer procedural background with neon gradients, drift and stars.
 * Designed to remain lightweight while staying visually rich.
 *
 * @module games/engines/spaceshooter/parallax
 */

'use strict';

const SpaceParallax = {
  /**
   * Create parallax system
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} ctx
   * @returns {Object} Parallax manager
   */
  create(canvas, ctx) {
    const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals || null;

    const layers = [
      { speed: 0.18, items: [], color: '#ffffff', count: 220 }, // stars
      { speed: 0.49, items: [], color: '#38bdf8', count: 8 }, // nebula
      { speed: 1.03, items: [], color: '#a78bfa', count: 16 }, // debris
    ];

    function makeStar() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 0.5 + Math.random() * 1.8,
        speedScale: 0.5 + Math.random(),
      };
    }

    function makeNebula() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 46 + Math.random() * 84,
        alpha: 0.12 + Math.random() * 0.2,
        pulseSpeed: 0.0005 + Math.random() * 0.001,
      };
    }

    function makeDebris() {
      const verts = 6 + Math.floor(Math.random() * 4);
      const points = [];
      for (let v = 0; v < verts; v++) {
        const angle = (v / verts) * Math.PI * 2;
        const dist = 10 + Math.random() * 18;
        points.push({
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
        });
      }
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        points,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0.002 + Math.random() * 0.005,
        drift: (Math.random() - 0.5) * 0.5,
        glow: 0.13 + Math.random() * 0.2,
      };
    }

    function generate() {
      layers[0].items = [];
      layers[1].items = [];
      layers[2].items = [];
      for (let i = 0; i < layers[0].count; i++) layers[0].items.push(makeStar());
      for (let i = 0; i < layers[1].count; i++) layers[1].items.push(makeNebula());
      for (let i = 0; i < layers[2].count; i++) layers[2].items.push(makeDebris());
    }

    generate();

    let scrollY = 0;
    let lastTime = performance.now();

    return {
      /**
       * Update parallax scroll
       * @param {number} dt - Delta time (normalized)
       */
      update(dt) {
        scrollY = (scrollY + 76 * dt) % (canvas.height || 1);
      },

      /**
       * Draw parallax layers
       */
      draw() {
        const now = performance.now();
        const dt = Math.max(0.001, (now - lastTime) / 16.666);
        lastTime = now;
        scrollY = (scrollY + dt * 76) % (canvas.height || 1);

        if (visuals) {
          const theme = visuals.theme
            ? visuals.theme('racer')
            : visuals.getTheme
              ? visuals.getTheme('racer')
              : null;
          visuals.drawGrid(ctx, canvas.width, canvas.height, {
            gap: 44,
            spacing: 0.11,
            width: 1,
            color: theme.grid,
            offsetY: -0.4 * dt,
            angle: 0.02,
          });
          visuals.drawScanlines(ctx, canvas.width, canvas.height, {
            density: 2.1,
            alpha: 0.05,
            color: 'rgba(241,245,249,0.2)',
          });
        }

        // Stars
        for (const star of layers[0].items) {
          const offset = (scrollY * layers[0].speed * star.speedScale) % canvas.height;
          const y = (star.y - offset + canvas.height) % canvas.height;
          const x = (star.x + Math.sin((now * 0.001 + y) * 0.5) * 1.2) % canvas.width;
          const pulse = 0.45 + Math.sin(now * 0.002 + y + x) * 0.3;
          const palette = ['#ffffff', '#22d3ee', '#f8fafc', '#fbbf24'];
          ctx.fillStyle = palette[Math.floor((x + now * 0.01) % palette.length)];
          ctx.globalAlpha = Math.max(0.18, Math.min(1, pulse));
          ctx.beginPath();
          ctx.arc(x, y, star.size * (1 + star.speedScale * 0.55), 0, Math.PI * 2);
          ctx.fill();
          if (star.size > 1.2) {
            ctx.fillRect(x - 6, y, 12 * (0.18 + star.speedScale * 0.18), 0.3 + star.size * 0.08);
          }
        }
        ctx.globalAlpha = 1;

        // Nebula
        for (const nebula of layers[1].items) {
          const offset = (scrollY * layers[1].speed) % canvas.height;
          const y = (nebula.y - offset + canvas.height) % canvas.height;
          const drift = Math.sin(now * nebula.pulseSpeed + y * 0.01) * 12;
          const grad = ctx.createRadialGradient(
            nebula.x + drift,
            y,
            0,
            nebula.x + drift,
            y,
            nebula.radius
          );
          grad.addColorStop(0, `rgba(56,189,248,${Math.min(0.35, nebula.alpha)})`);
          grad.addColorStop(0.4, `rgba(56,189,248,${nebula.alpha * 0.35})`);
          grad.addColorStop(1, 'rgba(56,189,248,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(nebula.x + drift, y, nebula.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Debris
        ctx.lineWidth = 1;
        for (const ast of layers[2].items) {
          const offset = (scrollY * layers[2].speed) % canvas.height;
          const y = (ast.y - offset + canvas.height) % canvas.height;
          const driftX = Math.sin(now * 0.0006 + ast.drift * 14) * 7;
          const px = (ast.x + driftX + canvas.width) % canvas.width;
          const orbit = (now * 0.001) % (Math.PI * 2);
          ctx.save();
          ctx.translate(px, y);
          ast.rotation += ast.rotationSpeed * dt;
          ctx.rotate(ast.rotation + orbit * 0.12);
          ctx.strokeStyle = 'rgba(167,139,250,0.52)';
          ctx.shadowColor = 'rgba(167,139,250,0.55)';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(ast.points[0].x, ast.points[0].y);
          for (let i = 1; i < ast.points.length; i++) {
            ctx.lineTo(ast.points[i].x, ast.points[i].y);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.fillStyle = `rgba(191,219,254,${ast.glow})`;
          ctx.fill();
          ctx.shadowBlur = 0;

          if (visuals) {
            visuals.drawPulseRing(ctx, 0, 0, 12, 'racer', 19, 0.06);
          }
          ctx.restore();
        }
      },

      /**
       * Reset parallax
       */
      reset() {
        scrollY = 0;
        generate();
      },

      /**
       * Resize parallax on canvas resize
       * @param {number} w
       * @param {number} h
       */
      resize(w, h) {
        canvas.width = w;
        canvas.height = h;
        generate();
      },
    };
  },
};

if (typeof window !== 'undefined') {
  window.SpaceParallax = SpaceParallax;
}
