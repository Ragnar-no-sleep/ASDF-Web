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

        // Optional components for 11/10 visuals
        const velComp = world.componentRegistry.get('Velocity');
        const velProps = velComp ? velComp.props : null;

        const rotComp = world.componentRegistry.get('Rotation');
        const rotProps = rotComp ? rotComp.props : null;

        const scaleComp = world.componentRegistry.get('Scale');
        const scaleProps = scaleComp ? scaleComp.props : null;

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
          if (velProps && alpha < 1.0) {
            x += velProps.vx[index] * alpha;
            y += velProps.vy[index] * alpha;
          }

          const iconIdx = rendProps.iconIndex[index];
          const size = rendProps.size[index] || 24;

          // 2. Alpha & Effects
          const a = rendProps.alpha[index];
          const entityAlpha = a === 0 && rendProps.alpha[index] === 0 ? 1.0 : a;

          if (entityAlpha !== currentAlpha) {
            ctx.globalAlpha = entityAlpha;
            currentAlpha = entityAlpha;
          }

          try {
            ctx.save();
            ctx.translate(x, y);

            // Apply Rotation
            if (rotProps) {
              ctx.rotate(rotProps.angle[index] || 0);
            }

            // Apply Scale (Squash & Stretch)
            if (scaleProps) {
              ctx.scale(scaleProps.x[index] || 1, scaleProps.y[index] || 1);
            }

            // 3. High-Quality Rendering
            if (iconIdx === 255 && partProps) {
              const colorIdx = partProps.colorIndex[index] || 0;
              const color = COLORS[colorIdx] || COLORS[0];

              // Use 'lighter' for glow effect
              ctx.globalCompositeOperation = 'lighter';
              ctx.fillStyle = color;
              ctx.shadowColor = color;
              ctx.shadowBlur = size * 0.5;
              ctx.beginPath();
              ctx.arc(0, 0, size, 0, Math.PI * 2);
              ctx.fill();
            } else {
              const iconStr = icons[iconIdx] || icons[0] || '❓';

              // Personality: Subtle Glow for important entities
              if (entityId & 0x01) {
                // Pseudo-random check for flair
                ctx.shadowColor = 'rgba(255,255,255,0.2)';
                ctx.shadowBlur = 5;
              }

              if (typeof SpriteCache !== 'undefined') {
                SpriteCache.draw(ctx, iconStr, 0, 0, size);
              } else {
                ctx.font = `${size}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(iconStr, 0, 0);
              }
            }
            ctx.restore();
          } catch (e) {
            ctx.restore();
          }
        });

        if (currentAlpha !== 1.0) ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
      };
    },
  };

  if (typeof window !== 'undefined') {
    window.ASDF = window.ASDF || {};
    window.ASDF.RenderSystem = RenderSystem;
  }
})();
