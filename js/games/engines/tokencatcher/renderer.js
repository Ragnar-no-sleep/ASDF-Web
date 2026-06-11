/**
 * ASDF Games - TokenCatcher Renderer
 */

'use strict';

(function () {
  const Renderer = {
    draw(ctx, w, h, state, engine) {
      engine.drawBackdrop(ctx, w, h, state);
      engine.drawLanes(ctx, w, h, state);
      engine.drawEntities(ctx, state);
      engine.drawHUD(ctx, w, h, state);
    },

    drawDrone(ctx, x, y, size, state) {
      const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;
      const jumpY = state.visualYOffset || 0;

      ctx.save();
      ctx.translate(x, y + jumpY);
      if (visuals) {
        visuals.drawPlayerShip(ctx, 0, 0, size, {
          color: '#38bdf8',
          glow: '#0ea5e9',
          withThruster: true,
        });
      } else {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-size / 2, -size / 2, size, size);
      }
      ctx.restore();
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.TokenCatcherRenderer = Renderer;
})();
