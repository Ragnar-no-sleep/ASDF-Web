'use strict';

const SpaceRenderer = {
  shakeIntensity: 0,
  flashIntensity: 0,
  colors: {
    accent: '#ea4e33',
    gold: '#f59e0b',
    success: '#4ade80',
    dark: '#0a0a0a',
    shipColor: '#4ade80',
    bulletColor: '#ffff00',
    enemyColor: '#ea4e33',
    bossColor: '#ff00ff',
    shieldColor: '#00ffff',
  },

  /**
   * Main draw call
   */
  draw(state, parallax, particles, canvas, ctx) {
    if (!state || !canvas || !ctx) return;

    ctx.save();
    if (this.shakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      ctx.translate(shakeX, shakeY);
      this.shakeIntensity *= 0.9;
    }

    ctx.fillStyle = this.colors.dark;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (parallax) parallax.draw(canvas, ctx);

    // Draw power-ups (Pool)
    ctx.fillStyle = this.colors.gold;
    if (state.powerUpPool) {
      state.powerUpPool.forEach((i, data, offset) => {
        // x, y, vy, width, height, life, typeInt
        ctx.fillRect(
          data[offset + 0] - data[offset + 3] / 2,
          data[offset + 1] - data[offset + 4] / 2,
          data[offset + 3],
          data[offset + 4]
        );
      });
    } else {
      for (const pu of state.powerUps) {
        ctx.fillRect(pu.x - pu.width / 2, pu.y - pu.height / 2, pu.width, pu.height);
      }
    }

    // Draw bullets (Pool)
    ctx.fillStyle = this.colors.bulletColor;
    if (state.bulletPool) {
      state.bulletPool.forEach((i, data, offset) => {
        // x, y, vx, vy, width, height, damage
        ctx.fillRect(
          data[offset + 0] - data[offset + 4] / 2,
          data[offset + 1] - data[offset + 5] / 2,
          data[offset + 4],
          data[offset + 5]
        );
      });
    } else {
      for (const b of state.bullets) {
        ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
      }
    }

    // Draw enemy bullets (Pool)
    ctx.fillStyle = '#ff0000'; // red for enemy bullets
    if (state.enemyBulletPool) {
      state.enemyBulletPool.forEach((i, data, offset) => {
        // x, y, vx, vy, width, height, damage
        ctx.fillRect(
          data[offset + 0] - data[offset + 4] / 2,
          data[offset + 1] - data[offset + 5] / 2,
          data[offset + 4],
          data[offset + 5]
        );
      });
    } else {
      for (const b of state.enemyBullets || []) {
        ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
      }
    }

    // Draw enemies (Pool)
    ctx.fillStyle = this.colors.enemyColor;
    if (state.enemyPool) {
      state.enemyPool.forEach((i, data, offset) => {
        // x, y, vx, vy, width, height, typeInt, hp, points, timer
        const w = data[offset + 4];
        const h = data[offset + 5];
        const x = data[offset + 0] - w / 2;
        const y = data[offset + 1] - h / 2;

        ctx.fillRect(x, y, w, h);

        // hp bar if damaged
        // Ideally we would need maxHp in the pool or assume based on type, using a static max for simplicity if not tracked
        // Assuming simple HP bar based on current HP > 1 (simplification for missing maxHp in pool schema)
        if (data[offset + 7] > 1) {
          ctx.fillStyle = '#555';
          ctx.fillRect(x, y - 6, w, 3);
          ctx.fillStyle = this.colors.success;
          ctx.fillRect(x, y - 6, w * 0.5, 3); // Simplified HP bar
          ctx.fillStyle = this.colors.enemyColor; // Reset for next enemy
        }
      });
    } else {
      for (const e of state.enemies) {
        ctx.fillRect(e.x - e.width / 2, e.y - e.height / 2, e.width, e.height);
        if (e.hp < e.maxHp) {
          ctx.fillStyle = '#555';
          ctx.fillRect(e.x - e.width / 2, e.y - e.height / 2 - 6, e.width, 3);
          ctx.fillStyle = this.colors.success;
          ctx.fillRect(e.x - e.width / 2, e.y - e.height / 2 - 6, (e.width * e.hp) / e.maxHp, 3);
        }
      }
    }

    const ship = state.ship;
    if (ship) {
      ctx.fillStyle =
        ship.invincibleTimer > 0 && Math.floor(ship.invincibleTimer * 0.1) % 2 === 0
          ? 'rgba(74, 222, 128, 0.5)'
          : this.colors.shipColor;
      ctx.fillRect(ship.x - ship.width / 2, ship.y - ship.height / 2, ship.width, ship.height);

      if (ship.shield > 0) {
        ctx.strokeStyle = this.colors.shieldColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, ship.width * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (particles) particles.draw(ctx);

    if (this.flashIntensity > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashIntensity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      this.flashIntensity *= 0.8;
    }

    ctx.restore();
    this.drawHUD(state, canvas, ctx);
    this.drawOverlay(state, canvas, ctx);
  },

  /**
   * Draw HUD
   */
  drawHUD(state, canvas, ctx) {
    if (!state || !state.ship) return;
    const ship = state.ship;

    ctx.save();
    ctx.fillStyle = this.colors.gold;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${state.score}`, 20, 30);
    ctx.fillText(`WAVE: ${state.wave}`, 20, 55);

    const hpBarW = 150;
    ctx.fillStyle = '#555';
    ctx.fillRect(20, 80, hpBarW, 10);
    ctx.fillStyle = this.colors.success;
    ctx.fillRect(20, 80, (hpBarW * ship.hp) / ship.maxHp, 10);

    if (ship.nukeCharges > 0) {
      ctx.fillStyle = this.colors.accent;
      ctx.textAlign = 'right';
      ctx.fillText(`NUKE: ${ship.nukeCharges} [N]`, canvas.width - 20, 30);
    }
    ctx.restore();
  },

  /**
   * Draw overlays
   */
  drawOverlay(state, canvas, ctx) {
    if (state.phase === 'upgrading' && typeof SpaceUpgrades !== 'undefined') {
      SpaceUpgrades.renderUpgradeScreen(ctx, canvas, state);
    }

    if (state.gameOver) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = this.colors.accent;
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
      ctx.fillStyle = this.colors.gold;
      ctx.font = '24px Arial';
      ctx.fillText(`Final Score: ${state.score}`, canvas.width / 2, canvas.height / 2 + 20);
      ctx.restore();
    }
  },

  /**
   * Trigger effects
   */
  shake(intensity) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  },
  flash(intensity) {
    this.flashIntensity = Math.max(this.flashIntensity, intensity);
  },
};

if (typeof window !== 'undefined') {
  window.SpaceRenderer = SpaceRenderer;
}
