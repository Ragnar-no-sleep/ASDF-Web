/**
 * Space Shooter - Render Pipeline
 *
 * Draw order: clear → parallax → entities → particles → HUD → overlays
 * Colors cached from CSS vars, no emoji
 *
 * @module games/engines/spaceshooter/renderer
 */

'use strict';

const SpaceRenderer = {
  /**
   * Create renderer
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} ctx
   * @returns {Object}
   */
  create(canvas, ctx) {
    // Cache colors from CSS computed style
    const style = getComputedStyle(document.documentElement);
    const colors = {
      accent: style.getPropertyValue('--asdf-orange') || '#ea4e33',
      gold: style.getPropertyValue('--asdf-gold') || '#f59e0b',
      success: style.getPropertyValue('--asdf-green') || '#4ade80',
      dark: style.getPropertyValue('--asdf-dark') || '#0a0a0a',
      shipColor: '#4ade80',
      bulletColor: '#ffff00',
      enemyColor: '#ea4e33',
      bossColor: '#ff00ff',
      shieldColor: '#00ffff',
    };

    let shakeIntensity = 0;
    let flashIntensity = 0;

    return {
      /**
       * Main draw call
       * @param {Object} state
       * @param {Object} parallax
       * @param {Object} particles
       */
      draw(state, parallax, particles) {
        // Apply screen shake
        ctx.save();
        if (shakeIntensity > 0) {
          const shakeX = (Math.random() - 0.5) * shakeIntensity * 2;
          const shakeY = (Math.random() - 0.5) * shakeIntensity * 2;
          ctx.translate(shakeX, shakeY);
          shakeIntensity *= 0.9;
        }

        // Clear
        ctx.fillStyle = colors.dark;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Parallax
        parallax.draw();

        // Power-ups
        ctx.fillStyle = colors.gold;
        for (const pu of state.powerUps) {
          ctx.fillRect(pu.x - pu.width / 2, pu.y - pu.height / 2, pu.width, pu.height);
        }

        // Bullets
        ctx.fillStyle = colors.bulletColor;
        for (const b of state.bullets) {
          ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
        }

        // Enemies
        ctx.fillStyle = colors.enemyColor;
        for (const e of state.enemies) {
          ctx.fillRect(e.x - e.width / 2, e.y - e.height / 2, e.width, e.height);
          // Health bar
          if (e.hp < e.maxHp) {
            ctx.fillStyle = '#555';
            ctx.fillRect(e.x - e.width / 2, e.y - e.height / 2 - 6, e.width, 3);
            ctx.fillStyle = colors.success;
            ctx.fillRect(e.x - e.width / 2, e.y - e.height / 2 - 6, (e.width * e.hp) / e.maxHp, 3);
          }
        }

        // Boss
        if (state.boss) {
          const b = state.boss;
          ctx.fillStyle = colors.bossColor;
          ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
          // Boss health bar (large)
          ctx.fillStyle = '#555';
          ctx.fillRect(20, 30, canvas.width - 40, 10);
          ctx.fillStyle = colors.success;
          ctx.fillRect(20, 30, ((canvas.width - 40) * b.hp) / b.maxHp, 10);
          ctx.fillStyle = colors.gold;
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`BOSS - Phase ${b.phase}`, canvas.width / 2, 45);
        }

        // Ship
        const ship = state.ship;
        ctx.fillStyle =
          ship.invincibleTimer > 0 && Math.floor(ship.invincibleTimer * 10) % 2 === 0
            ? 'rgba(74, 222, 128, 0.5)'
            : colors.shipColor;
        ctx.fillRect(ship.x - ship.width / 2, ship.y - ship.height / 2, ship.width, ship.height);

        // Shield indicator
        if (ship.shield > 0) {
          ctx.strokeStyle = colors.shieldColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ship.x, ship.y, ship.width * 0.6, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Particles
        particles.draw();

        // Flash effect
        if (flashIntensity > 0) {
          ctx.fillStyle = `rgba(255,255,255,${flashIntensity})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          flashIntensity *= 0.8;
        }

        ctx.restore();

        // HUD
        this.drawHUD(state);

        // Overlays
        this.drawOverlay(state);
      },

      /**
       * Draw HUD
       * @param {Object} state
       */
      drawHUD(state) {
        const ship = state.ship;

        ctx.save();
        ctx.fillStyle = colors.gold;
        ctx.font = 'bold 16px JetBrains Mono';
        ctx.textAlign = 'left';

        // Score
        ctx.fillText(`SCORE: ${state.score}`, 20, 30);

        // Wave
        ctx.fillText(`WAVE: ${state.wave}`, 20, 55);

        // HP bar (left)
        const hpBarX = 20;
        const hpBarY = 80;
        const hpBarW = 150;
        const hpBarH = 10;

        ctx.fillStyle = '#555';
        ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
        ctx.fillStyle = colors.success;
        ctx.fillRect(hpBarX, hpBarY, (hpBarW * ship.hp) / ship.maxHp, hpBarH);
        ctx.fillStyle = colors.gold;
        ctx.font = '11px JetBrains Mono';
        ctx.fillText(`HP: ${Math.ceil(ship.hp)}/${ship.maxHp}`, hpBarX + 5, hpBarY + 7);

        // Shield bar (right)
        if (ship.maxShield > 0) {
          const shieldBarX = canvas.width - 170;
          const shieldBarY = 80;
          const shieldBarW = 150;
          const shieldBarH = 10;

          ctx.fillStyle = '#555';
          ctx.fillRect(shieldBarX, shieldBarY, shieldBarW, shieldBarH);
          if (ship.shield > 0) {
            ctx.fillStyle = colors.shieldColor;
            ctx.fillRect(
              shieldBarX,
              shieldBarY,
              (shieldBarW * ship.shield) / ship.maxShield,
              shieldBarH
            );
          }
          ctx.fillStyle = colors.gold;
          ctx.fillText(`SHIELD: ${Math.ceil(ship.shield)}`, shieldBarX + 5, shieldBarY + 7);
        }

        // Nuke charges
        if (ship.nukeCharges > 0) {
          ctx.fillStyle = colors.accent;
          ctx.font = 'bold 14px JetBrains Mono';
          ctx.textAlign = 'right';
          ctx.fillText(`NUKE: ${ship.nukeCharges} [N]`, canvas.width - 20, 30);
        }

        ctx.restore();
      },

      /**
       * Draw overlays (upgrade screen, game-over, wave banner)
       * @param {Object} state
       */
      drawOverlay(state) {
        if (state.phase === 'upgrading') {
          SpaceUpgrades.renderUpgradeScreen(ctx, canvas, state);
        }

        if (state.gameOver) {
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.fillStyle = colors.accent;
          ctx.font = 'bold 48px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);

          ctx.fillStyle = colors.gold;
          ctx.font = '24px Arial';
          ctx.fillText(`Final Score: ${state.score}`, canvas.width / 2, canvas.height / 2 + 20);
          ctx.fillText(`Wave: ${state.wave}`, canvas.width / 2, canvas.height / 2 + 50);

          ctx.fillStyle = '#aaa';
          ctx.font = '14px Arial';
          ctx.fillText('Press START GAME to continue', canvas.width / 2, canvas.height / 2 + 90);

          ctx.restore();
        }
      },

      /**
       * Trigger screen shake
       * @param {number} intensity
       */
      shake(intensity) {
        shakeIntensity = Math.max(shakeIntensity, intensity);
      },

      /**
       * Trigger screen flash
       * @param {number} intensity
       */
      flash(intensity) {
        flashIntensity = Math.max(flashIntensity, intensity);
      },
    };
  },
};

if (typeof window !== 'undefined') {
  window.SpaceRenderer = SpaceRenderer;
}
