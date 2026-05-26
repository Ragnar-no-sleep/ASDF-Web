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
      if (!ctx) return () => {};

      const DEFAULT_ICONS = ['🐕', '🔥', '💀', '💎', '🚀'];
      const icons = customIcons || DEFAULT_ICONS;

      // Particle Color Palette (Juice)
      const COLORS = [
        '#ffffff', // 0: White
        '#fbbf24', // 1: Amber
        '#ef4444', // 2: Red
        '#3b82f6', // 3: Blue
        '#a855f7', // 4: Purple
        '#22c55e', // 5: Green
      ];

      return function (world, alpha) {
        if (!world) return;

        const query = world.createQuery(['Position', 'Renderable']);
        const posComp = world.componentRegistry.get('Position');
        const rendComp = world.componentRegistry.get('Renderable');

        if (!posComp || !rendComp) return;

        const posProps = posComp.props;
        const rendProps = rendComp.props;

        const velComp = world.componentRegistry.get('Velocity');
        const velProps = velComp ? velComp.props : null;

        // Particle System check (Optional component)
        const partComp = world.componentRegistry.get('Particle');
        const partProps = partComp ? partComp.props : null;

        let currentAlpha = 1.0;
        ctx.globalAlpha = 1.0;

        query.forEach(entityId => {
          const index = entityId & 0xffffff;

          // 1. Interpolation
          let x = posProps.x[index];
          let y = posProps.y[index];
          if (velProps) {
            x += velProps.vx[index] * alpha;
            y += velProps.vy[index] * alpha;
          }

          const iconIdx = rendProps.iconIndex[index];
          const size = rendProps.size[index] || 24;

          // 2. Alpha defaulting (Standard ECS 0-initialization fix)
          const a = rendProps.alpha[index];
          const entityAlpha = a === 0 ? 1.0 : a;

          if (entityAlpha !== currentAlpha) {
            ctx.globalAlpha = entityAlpha;
            currentAlpha = entityAlpha;
          }

          try {
            // 3. High-Quality Rendering
            if (iconIdx === 255 && partProps) {
              const colorIdx = partProps.colorIndex[index] || 0;
              const color = COLORS[colorIdx] || COLORS[0];

              // Use 'lighter' for glow effect
              ctx.globalCompositeOperation = 'lighter';
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(x, y, size, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalCompositeOperation = 'source-over';
            } else {
              const iconStr = icons[iconIdx] || icons[0] || '❓';
              if (typeof SpriteCache !== 'undefined') {
                SpriteCache.draw(ctx, iconStr, x, y, size);
              } else {
                ctx.font = `${size}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(iconStr, x, y);
              }
            }
          } catch (e) {
            // Silently fail per entity to keep loop alive
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
