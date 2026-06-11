'use strict';

const SpaceRenderer = {
  shakeIntensity: 0,
  flashIntensity: 0,
  colors: {
    accent: '#ea4e33',
    gold: '#ffcc00',
    success: '#ff6b35',
    dark: '#0a0a0a',
    shipColor: '#ff6b35',
    bulletColor: '#ffcc00',
    enemyColor: '#f43f5e',
    bossColor: '#ff2d95',
    shieldColor: '#fff7ed',
  },

  /**
   * Main draw call
   */
  draw(state, parallax, particles, canvas, ctx) {
    if (!state || !canvas || !ctx) return;

    const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;

    ctx.save();
    if (this.shakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      ctx.translate(shakeX, shakeY);
      this.shakeIntensity *= 0.9;
    }

    if (visuals) {
      visuals.drawBackdrop(ctx, canvas.width, canvas.height, {
        theme: 'default',
        seed: state.score,
      });
    } else {
      ctx.fillStyle = this.colors.dark;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    this.drawSimpleSkyMarks(ctx, canvas);

    // Draw power-ups (Pool)
    if (state.powerUpPool) {
      state.powerUpPool.forEach((i, data, offset) => {
        // x, y, vy, width, height, life, typeInt
        this.drawPowerUp(
          ctx,
          data[offset + 0],
          data[offset + 1],
          data[offset + 3],
          data[offset + 4]
        );
      });
    } else {
      for (const pu of state.powerUps) {
        this.drawPowerUp(ctx, pu.x, pu.y, pu.width, pu.height);
      }
    }

    // Draw bullets (Pool)
    if (state.bulletPool) {
      state.bulletPool.forEach((i, data, offset) => {
        // x, y, vx, vy, width, height, damage
        this.drawBullet(
          ctx,
          data[offset + 0],
          data[offset + 1],
          data[offset + 4],
          data[offset + 5],
          false
        );
      });
    } else {
      for (const b of state.bullets) {
        this.drawBullet(ctx, b.x, b.y, b.width, b.height, false);
      }
    }

    // Draw enemy bullets (Pool)
    if (state.enemyBulletPool) {
      state.enemyBulletPool.forEach((i, data, offset) => {
        // x, y, vx, vy, width, height, damage
        this.drawBullet(
          ctx,
          data[offset + 0],
          data[offset + 1],
          data[offset + 4],
          data[offset + 5],
          true
        );
      });
    } else {
      for (const b of state.enemyBullets || []) {
        this.drawBullet(ctx, b.x, b.y, b.width, b.height, true);
      }
    }

    // Draw enemies (Pool)
    if (state.enemyPool) {
      state.enemyPool.forEach((i, data, offset) => {
        // x, y, vx, vy, width, height, typeInt, hp, points, timer
        const w = data[offset + 4];
        const h = data[offset + 5];
        this.drawEnemy(ctx, data[offset + 0], data[offset + 1], w, h, data[offset + 6]);
      });
    } else {
      for (const e of state.enemies) {
        this.drawEnemy(ctx, e.x, e.y, e.width, e.height, e.type || 0);
      }
    }

    const ship = state.ship;
    if (ship) {
      const isInvincible =
        ship.invincibleTimer > 0 && Math.floor(ship.invincibleTimer * 0.1) % 2 === 0;
      this.drawShip(ctx, ship, isInvincible);

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
    return;
  },

  drawSimpleSkyMarks(ctx, canvas) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#fff2b3';
    for (let i = 0; i < 18; i++) {
      const x = (i * 83 + 29) % canvas.width;
      const y = (i * 137 + 41) % canvas.height;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.restore();
  },

  drawPowerUp(ctx, x, y, w, h) {
    const size = Math.max(w, h, 18);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#ffcc00';
    ctx.strokeStyle = '#fff2b3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#12071f';
    ctx.font = '900 11px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', 0, 1);
    ctx.restore();
  },

  drawBullet(ctx, x, y, w, h, enemy) {
    ctx.save();
    ctx.fillStyle = enemy ? '#f43f5e' : '#ffcc00';
    this.roundRect(ctx, x - w / 2, y - h / 2, Math.max(4, w), Math.max(8, h), 4);
    ctx.fill();
    ctx.restore();
  },

  drawEnemy(ctx, x, y, w, h, type) {
    const letters = ['S', 'D', 'F', 'X'];
    const letter = letters[Math.abs(Math.round(type || 0)) % letters.length];
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = type > 2 ? '#ff2d95' : '#f43f5e';
    ctx.strokeStyle = '#fff2b3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(0, h / 2);
    ctx.lineTo(-w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (w > 18 && h > 18) {
      ctx.fillStyle = '#fff7ed';
      ctx.font = '900 10px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, 0, 1);
    }
    ctx.restore();
  },

  drawShip(ctx, ship, isInvincible) {
    const w = ship.width || 26;
    const h = ship.height || 34;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.globalAlpha = isInvincible ? 0.62 : 1;
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 5;
    ctx.fillStyle = this.colors.shipColor;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, h * 0.35);
    ctx.lineTo(w * 0.16, h * 0.22);
    ctx.lineTo(0, h / 2);
    ctx.lineTo(-w * 0.16, h * 0.22);
    ctx.lineTo(-w / 2, h * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff2b3';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(-3, h * 0.08, 6, h * 0.28);
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

  /**
   * Draw overlays
   */
  drawOverlay(state, canvas, ctx) {
    if (state.phase === 'upgrading' && typeof SpaceUpgrades !== 'undefined') {
      SpaceUpgrades.renderUpgradeScreen(ctx, canvas, state);
    }

    if (state.gameOver) {
      const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (visuals) {
        visuals.drawNeonText(
          ctx,
          'GAME OVER',
          canvas.width / 2,
          canvas.height / 2 - 42,
          '#f8fafc',
          '#64748b',
          46,
          'center'
        );
        visuals.drawNeonText(
          ctx,
          `Final Score: ${state.score}`,
          canvas.width / 2,
          canvas.height / 2 + 18,
          '#fde68a',
          '#64748b',
          21,
          'center'
        );
      } else {
        ctx.fillStyle = this.colors.accent;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
        ctx.fillStyle = this.colors.gold;
        ctx.font = '24px Arial';
        ctx.fillText(`Final Score: ${state.score}`, canvas.width / 2, canvas.height / 2 + 20);
      }
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
