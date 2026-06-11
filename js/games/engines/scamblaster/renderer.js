/**
 * ASDF Games - ScamBlaster Renderer
 */

'use strict';

(function () {
  const Renderer = {
    draw(engine) {
      const ctx = engine.instance.ctx;
      const w = engine.instance.canvas.width;
      const h = engine.instance.canvas.height;
      const state = engine.instance.world.getResource('GameState');

      engine.drawAtmosphere(ctx, w, h, state);
      engine.drawThreats(ctx);
      engine.drawThreatBars(ctx, w, h, state);
      engine.drawPopBars();
    },

    drawThreat(ctx, x, y, size, type, label, threatData = {}, engine) {
      const THREAT_THEMES = window.ASDF.ScamBlasterThemes;
      const CONFIG = window.ASDF.ScamBlasterConfig;
      const theme = THREAT_THEMES[type % THREAT_THEMES.length];
      const enemy = engine.enemyTypes[type % engine.enemyTypes.length];
      const radius = Math.max(CONFIG.minThreatRadius, size);
      const pulse =
        1 +
        Math.sin((performance.now() + x * 1.4) / 280) * 0.018 +
        (threatData.intensity || 1) * 0.003;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(0, radius * 0.42, radius * 0.58, radius * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      this.drawSimpleScamSprite(ctx, radius, enemy.sprite, theme, enemy.icon);
      ctx.restore();
    },

    drawSimpleScamSprite(ctx, radius, sprite, theme, _icon) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const palette = {
        badge: ['#ffcc00', '#ff6b35', '#3b120b'],
        tile: ['#ff6b35', '#ff2d95', '#2a0718'],
        gem: ['#f97316', '#fbbf24', '#311006'],
        chip: ['#f43f5e', '#fb7185', '#3a0714'],
        trap: ['#a855f7', '#ff2d95', '#1f0b38'],
      };
      const colors = palette[sprite] || [theme.primary, theme.accent, theme.secondary];
      ctx.fillStyle = colors[0];
      ctx.strokeStyle = '#fff2b3';
      ctx.lineWidth = Math.max(2, radius * 0.05);
      ctx.beginPath();
      if (sprite === 'tile') {
        this.roundRect(ctx, -radius * 0.5, -radius * 0.38, radius, radius * 0.76, 7);
      } else if (sprite === 'gem') {
        ctx.moveTo(0, -radius * 0.6);
        ctx.lineTo(radius * 0.58, 0);
        ctx.lineTo(0, radius * 0.58);
        ctx.lineTo(-radius * 0.58, 0);
        ctx.closePath();
      } else if (sprite === 'chip') {
        this.roundRect(ctx, -radius * 0.46, -radius * 0.46, radius * 0.92, radius * 0.92, 5);
      } else if (sprite === 'trap') {
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI * 2) / 10;
          const r = i % 2 === 0 ? radius * 0.58 : radius * 0.31;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
      } else {
        ctx.arc(0, 0, radius * 0.58, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = colors[1];
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.arc(-radius * 0.14, -radius * 0.16, radius * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = colors[2];
      ctx.lineWidth = Math.max(2, radius * 0.06);
      ctx.beginPath();
      ctx.moveTo(-radius * 0.36, radius * 0.34);
      ctx.lineTo(radius * 0.36, -radius * 0.34);
      ctx.stroke();
      ctx.strokeStyle = '#fff7ed';
      ctx.fillStyle = '#fff7ed';
      ctx.lineWidth = Math.max(2, radius * 0.055);
      if (sprite === 'badge') {
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.08, 0, Math.PI * 2);
        ctx.fill();
      } else if (sprite === 'tile') {
        this.roundRect(ctx, -radius * 0.2, -radius * 0.21, radius * 0.4, radius * 0.18, 3);
        ctx.fill();
        this.roundRect(ctx, -radius * 0.3, radius * 0.06, radius * 0.6, radius * 0.14, 3);
        ctx.fill();
      }
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
  window.ASDF.ScamBlasterRenderer = Renderer;
})();
