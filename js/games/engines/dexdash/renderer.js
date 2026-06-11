/**
 * ASDF Games - DexDash Renderer
 */

'use strict';

(function () {
  const DexDashRenderer = {
    draw(ctx, w, h, state, layout, engine) {
      if (!engine) return;
      engine.drawWorld(ctx, w, h, state, layout);
      engine.drawEntities(ctx, state, layout);
      engine.drawVignette(ctx, w, h);
    },

    drawRaceCar(ctx, x, y, opts = {}) {
      const {
        width = 54,
        length = 104,
        body = '#dc2626',
        stripe = '#f8fafc',
        glass = '#111827',
        accent = '#facc15',
        steer = 0,
        shadowScale = 1,
        active = false,
      } = opts;
      const w = width;
      const l = length;
      const lean = Math.max(-1, Math.min(1, steer)) * 0.08;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(lean);

      ctx.fillStyle = 'rgba(0,0,0,0.34)';
      ctx.beginPath();
      ctx.ellipse(0, l * 0.3, w * 0.72 * shadowScale, l * 0.12 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#111827';
      const wheelW = w * 0.18;
      const wheelH = l * 0.17;
      for (const side of [-1, 1]) {
        this.roundRect(ctx, side * w * 0.42 - wheelW / 2, -l * 0.32, wheelW, wheelH, 3);
        ctx.fill();
        this.roundRect(ctx, side * w * 0.42 - wheelW / 2, l * 0.12, wheelW, wheelH, 3);
        ctx.fill();
      }

      const bodyGrad = ctx.createLinearGradient(-w * 0.32, -l * 0.46, w * 0.32, l * 0.46);
      bodyGrad.addColorStop(0, active ? '#ef4444' : body);
      bodyGrad.addColorStop(1, body);
      ctx.fillStyle = bodyGrad;
      this.roundRect(ctx, -w * 0.34, -l * 0.46, w * 0.68, l * 0.92, 9);
      ctx.fill();

      ctx.fillStyle = stripe;
      this.roundRect(ctx, -w * 0.055, -l * 0.43, w * 0.11, l * 0.7, 2);
      ctx.fill();

      ctx.fillStyle = glass;
      this.roundRect(ctx, -w * 0.22, -l * 0.19, w * 0.44, l * 0.18, 4);
      ctx.fill();
      this.roundRect(ctx, -w * 0.18, l * 0.08, w * 0.36, l * 0.16, 4);
      ctx.fill();

      ctx.fillStyle = accent;
      this.roundRect(ctx, -w * 0.26, -l * 0.49, w * 0.52, l * 0.05, 2);
      ctx.fill();
      if (active) {
        ctx.fillStyle = 'rgba(248,250,252,0.88)';
        ctx.fillRect(-w * 0.2, -l * 0.48, w * 0.14, l * 0.025);
        ctx.fillRect(w * 0.06, -l * 0.48, w * 0.14, l * 0.025);
      }

      ctx.restore();
    },

    roundRect(ctx, x, y, w, h, r) {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.DexDashRenderer = DexDashRenderer;
})();
