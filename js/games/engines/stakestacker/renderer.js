/**
 * StakeStacker Renderer — Draw pipeline for game visuals
 * @module games/engines/stakestacker/renderer
 */

'use strict';

const StakeStackerRenderer = {
  /**
   * Main render pipeline
   */
  render(ctx, state, cameraOffset) {
    const canvas = ctx.canvas || { width: 800, height: 600 };

    // Clear background (dark)
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw game area background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, canvas.height - 400 - cameraOffset, canvas.width, 400);

    // Apply camera transform
    ctx.save();
    ctx.translate(0, -cameraOffset);

    // Draw ground
    ctx.fillStyle = '#333';
    ctx.fillRect(0, canvas.height - 400, canvas.width, 20);

    // Draw stack blocks
    for (const block of state.stack) {
      this.drawBlock(ctx, block);
    }

    // Draw current falling block
    if (state.currentBlock) {
      this.drawBlock(ctx, state.currentBlock, true);
    }

    // Draw particles (Zero-Allocation Pool)
    if (state.particlePool) {
      const pool = state.particlePool;
      pool.forEach((i, data, offset) => {
        // itemSize 7: x, y, vx, vy, life, maxLife, colorInt
        const alpha = data[offset + 4] / data[offset + 5];
        ctx.fillStyle = '#' + data[offset + 6].toString(16).padStart(6, '0');
        ctx.globalAlpha = alpha;
        ctx.fillRect(data[offset + 0], data[offset + 1], 4, 4); // Fixed w/h 4
      });
      ctx.globalAlpha = 1;
    } else {
      // Legacy particles
      for (const particle of state.particles) {
        this.drawParticle(ctx, particle);
      }
    }

    ctx.restore();

    // Draw UI (HUD above camera transform)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${state.score}`, 20, 40);
    ctx.fillText(`Level: ${state.level}`, 20, 75);
    ctx.fillText(`Streak: ${state.perfectStreak}`, 20, 110);

    // Game over overlay
    if (state.gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
      ctx.font = '20px Arial';
      ctx.fillText(`Final Score: ${state.score}`, canvas.width / 2, canvas.height / 2 + 50);
    }
  },

  /**
   * Draw single block with wobble rotation
   */
  drawBlock(ctx, block, isFalling = false) {
    ctx.save();

    // Translate to block center
    ctx.translate(block.x + block.w / 2, block.y + block.h / 2);

    // Apply wobble rotation
    if (block.angle !== 0) {
      ctx.rotate(block.angle);
    }

    // Draw block based on pattern
    switch (block.pattern) {
      case 'gradient':
        this.drawGradientBlock(ctx, -block.w / 2, -block.h / 2, block.w, block.h, block.level);
        break;
      case 'striped':
        this.drawStripedBlock(ctx, -block.w / 2, -block.h / 2, block.w, block.h);
        break;
      case 'glow':
        this.drawGlowBlock(ctx, -block.w / 2, -block.h / 2, block.w, block.h, block.level);
        break;
      default: // solid
        this.drawSolidBlock(ctx, -block.w / 2, -block.h / 2, block.w, block.h, block.level);
    }

    // Draw border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-block.w / 2, -block.h / 2, block.w, block.h);

    // Falling block has shadow
    if (isFalling) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(-block.w / 2, -block.h / 2, block.w, block.h);
    }

    ctx.restore();
  },

  /**
   * Solid color block (level-based color)
   */
  drawSolidBlock(ctx, x, y, w, h, level) {
    const hue = (level * 30) % 360;
    ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
    ctx.fillRect(x, y, w, h);
  },

  /**
   * Gradient block (level progression visual)
   */
  drawGradientBlock(ctx, x, y, w, h, level) {
    const gradient = ctx.createLinearGradient(x, y, x + w, y);
    const hue = (level * 30) % 360;
    gradient.addColorStop(0, `hsl(${hue}, 80%, 60%)`);
    gradient.addColorStop(1, `hsl(${hue}, 80%, 40%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
  },

  /**
   * Striped block pattern
   */
  drawStripedBlock(ctx, x, y, w, h) {
    const stripeWidth = 4;
    ctx.fillStyle = '#ea4e33';
    for (let i = 0; i < w; i += stripeWidth * 2) {
      ctx.fillRect(x + i, y, stripeWidth, h);
    }
  },

  /**
   * Glow block (higher levels)
   */
  drawGlowBlock(ctx, x, y, w, h, level) {
    const hue = (level * 30) % 360;
    ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
    ctx.fillRect(x, y, w, h);

    // Glow effect
    ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
    ctx.shadowBlur = 10 + level * 2;
    ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  },

  /**
   * Draw particle
   */
  drawParticle(ctx, particle) {
    const alpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(particle.x, particle.y, particle.w, particle.h);
    ctx.globalAlpha = 1;
  },

  /**
   * Draw precision feedback text
   */
  drawPrecisionFeedback(ctx, precision, x, y) {
    const messages = {
      perfect: 'PERFECT!',
      great: 'GREAT!',
      good: 'GOOD',
      miss: 'MISS',
    };
    const colors = {
      perfect: '#4ade80',
      great: '#f59e0b',
      good: '#60a5fa',
      miss: '#ef4444',
    };

    ctx.fillStyle = colors[precision] || '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(messages[precision] || 'HIT', x, y);
  },
};

if (typeof window !== 'undefined') {
  window.StakeStackerRenderer = StakeStackerRenderer;
}
