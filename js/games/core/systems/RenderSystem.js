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
     * @param {string[]} customIcons - Optional mapping for iconIndex
     */
    create(ctx, customIcons = null) {
      // Default fallback icons
      const DEFAULT_ICONS = ['🐕', '🔥', '💀', '💎', '🚀'];
      const icons = customIcons || DEFAULT_ICONS;

      return function (world, alpha) {
        // Query for things that can be rendered
        const query = world.createQuery(['Position', 'Renderable']);
        const posComp = world.componentRegistry.get('Position');
        const rendComp = world.componentRegistry.get('Renderable');

        if (!posComp || !rendComp) return;

        const posProps = posComp.props;
        const rendProps = rendComp.props;

        const velComp = world.componentRegistry.get('Velocity');
        const velProps = velComp ? velComp.props : null;

        let currentAlpha = 1.0;
        ctx.globalAlpha = 1.0;

        query.forEach(entityId => {
          const index = world.getIndex(entityId);

          let x = posProps.x[index];
          let y = posProps.y[index];
          if (velProps) {
            x += velProps.vx[index] * alpha;
            y += velProps.vy[index] * alpha;
          }

          const iconIdx = rendProps.iconIndex[index];
          const size = rendProps.size[index] || 20;
          const entityAlpha = rendProps.alpha[index] ?? 1;

          if (entityAlpha !== currentAlpha) {
            ctx.globalAlpha = entityAlpha;
            currentAlpha = entityAlpha;
          }

          try {
            // Support both numeric index and direct emoji string
            const iconStr = typeof iconIdx === 'string' ? iconIdx : icons[iconIdx] || '❓';

            if (typeof SpriteCache !== 'undefined') {
              SpriteCache.draw(ctx, iconStr, x, y, size);
            } else {
              ctx.font = `${size}px serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(iconStr, x, y);
            }
          } catch (e) {
            console.warn('[RenderSystem] Draw failed:', e);
          }
        });

        if (currentAlpha !== 1.0) ctx.globalAlpha = 1.0;
      };
    },
  };

  if (typeof window !== 'undefined') {
    window.ASDF = window.ASDF || {};
    window.ASDF.RenderSystem = RenderSystem;
  }
})();
