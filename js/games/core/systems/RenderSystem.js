/**
 * ASDF Games - 11/10 Render System
 * High-performance canvas rendering for ECS entities.
 * Features: Sprite Batching (via SpriteCache) and Visual Interpolation.
 */

'use strict';

(function () {
  const RenderSystem = {
    /**
     * Create a Render System
     * @param {CanvasRenderingContext2D} ctx
     */
    create(ctx) {
      // Icons mapping - matches SpriteCache usage
      const ICONS = ['🐕', '🔥', '💀', '💎', '🚀'];

      return function (world, alpha) {
        // Query for things that can be rendered
        const query = world.createQuery(['Position', 'Renderable']);
        const posProps = world.componentRegistry.get('Position').props;
        const rendProps = world.componentRegistry.get('Renderable').props;

        // Optional Velocity for interpolation
        const velComp = world.componentRegistry.get('Velocity');
        const velProps = velComp ? velComp.props : null;

        let currentAlpha = 1.0;
        ctx.globalAlpha = 1.0;

        query.forEach(entityId => {
          const index = world.getIndex(entityId);

          // 1. Interpolation (11/10 Smoothness)
          // We render at: PreviousPosition + (CurrentVelocity * alpha)
          let x = posProps.x[index];
          let y = posProps.y[index];

          if (velProps) {
            x += velProps.vx[index] * alpha;
            y += velProps.vy[index] * alpha;
          }

          const iconIdx = rendProps.iconIndex[index];
          const size = rendProps.size[index] || 20;
          const entityAlpha = rendProps.alpha[index] ?? 1;

          // 2. Alpha optimization: Only change context if necessary
          if (entityAlpha !== currentAlpha) {
            ctx.globalAlpha = entityAlpha;
            currentAlpha = entityAlpha;
          }

          // 3. SpriteCache Drawing (100x faster than fillText)
          const iconStr = ICONS[iconIdx] || '❓';

          if (typeof SpriteCache !== 'undefined') {
            SpriteCache.draw(ctx, iconStr, x, y, size);
          } else {
            // Fallback if SpriteCache is missing (should not happen in 2026)
            ctx.font = `${size}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(iconStr, x, y);
          }
        });

        // Reset context state
        if (currentAlpha !== 1.0) ctx.globalAlpha = 1.0;
      };
    },
  };

  if (typeof window !== 'undefined') {
    window.ASDF = window.ASDF || {};
    window.ASDF.RenderSystem = RenderSystem;
  }
})();
