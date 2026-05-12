/**
 * Space Shooter - Parallax Background System
 *
 * 3-layer scrolling background: stars, nebula, asteroids
 * Each layer has different scroll speed for depth effect
 *
 * @module games/engines/spaceshooter/parallax
 */

'use strict';

const SpaceParallax = {
  /**
   * Create parallax system
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} ctx
   * @returns {Object} Parallax manager
   */
  create(canvas, ctx) {
    const layers = [
      { speed: 0.2, items: [], color: '#aaa' }, // stars
      { speed: 0.5, items: [], color: 'rgba(138,43,226,0.2)' }, // nebula (purple)
      { speed: 1.0, items: [], color: '#555' }, // asteroids
    ];

    function generateStars() {
      const count = 200;
      for (let i = 0; i < count; i++) {
        layers[0].items.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5,
        });
      }
    }

    function generateNebula() {
      const count = 6;
      for (let i = 0; i < count; i++) {
        layers[1].items.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: 40 + Math.random() * 80,
          alpha: 0.1 + Math.random() * 0.2,
        });
      }
    }

    function generateAsteroids() {
      const count = 10;
      for (let i = 0; i < count; i++) {
        const verts = 7 + Math.floor(Math.random() * 3);
        const points = [];
        for (let v = 0; v < verts; v++) {
          const angle = (v / verts) * Math.PI * 2;
          const dist = 15 + Math.random() * 15;
          points.push({
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
          });
        }
        layers[2].items.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          points,
          rotation: Math.random() * Math.PI * 2,
        });
      }
    }

    generateStars();
    generateNebula();
    generateAsteroids();

    let scrollY = 0;

    return {
      /**
       * Update parallax scroll
       * @param {number} dt - Delta time
       */
      update(dt) {
        scrollY += 80 * dt; // Base scroll speed
      },

      /**
       * Draw parallax layers
       */
      draw() {
        ctx.save();

        // Layer 0: Stars
        ctx.fillStyle = layers[0].color;
        for (const star of layers[0].items) {
          const offset = (scrollY * layers[0].speed) % canvas.height;
          const y = (star.y - offset + canvas.height) % canvas.height;
          ctx.beginPath();
          ctx.arc(star.x, y, star.size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Layer 1: Nebula
        for (const nebula of layers[1].items) {
          const offset = (scrollY * layers[1].speed) % canvas.height;
          const y = (nebula.y - offset + canvas.height) % canvas.height;
          const grad = ctx.createRadialGradient(nebula.x, y, 0, nebula.x, y, nebula.radius);
          grad.addColorStop(0, `rgba(138,43,226,${nebula.alpha})`);
          grad.addColorStop(1, 'rgba(138,43,226,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(nebula.x, y, nebula.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Layer 2: Asteroids
        ctx.strokeStyle = layers[2].color;
        ctx.lineWidth = 1;
        for (const ast of layers[2].items) {
          const offset = (scrollY * layers[2].speed) % canvas.height;
          const y = (ast.y - offset + canvas.height) % canvas.height;
          ctx.save();
          ctx.translate(ast.x, y);
          ctx.rotate(ast.rotation);
          ctx.beginPath();
          ctx.moveTo(ast.points[0].x, ast.points[0].y);
          for (let i = 1; i < ast.points.length; i++) {
            ctx.lineTo(ast.points[i].x, ast.points[i].y);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }

        ctx.restore();
      },

      /**
       * Reset parallax
       */
      reset() {
        scrollY = 0;
      },

      /**
       * Resize parallax on canvas resize
       * @param {number} w
       * @param {number} h
       */
      resize(w, h) {
        // Regenerate with new canvas size
        layers[0].items = [];
        layers[1].items = [];
        layers[2].items = [];
        generateStars();
        generateNebula();
        generateAsteroids();
      },
    };
  },
};

if (typeof window !== 'undefined') {
  window.SpaceParallax = SpaceParallax;
}
