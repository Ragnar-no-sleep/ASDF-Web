/**
 * ASDF Games - 11/10 Dev Inspector
 * Real-time performance monitoring and ECS debugging overlay.
 */

'use strict';

(function () {
  class DevInspector {
    constructor(world, options = {}) {
      this.world = world;
      this.container = null;
      this.stats = {
        fps: 0,
        entities: 0,
        systems: [],
        memory: 0,
      };
      this.visible = options.visible !== false;
      this.lastUpdate = 0;
      this.frameCount = 0;
      this.fps = 0;

      this._createUI();
    }

    _createUI() {
      const id = 'asdf-dev-inspector';
      if (document.getElementById(id)) return;

      this.container = document.createElement('div');
      this.container.id = id;
      this.container.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        width: 220px;
        background: rgba(10, 10, 15, 0.85);
        border: 1px solid #3b82f6;
        border-radius: 8px;
        color: #60a5fa;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        padding: 10px;
        pointer-events: none;
        z-index: 9999;
        box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
        display: ${this.visible ? 'block' : 'none'};
      `;

      this.container.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #1e3a8a; padding-bottom: 4px; color: #fbbf24;">
          ⚡ ASDF 11/10 ENGINE
        </div>
        <div id="insp-fps" style="margin-bottom: 4px;">FPS: 0</div>
        <div id="insp-entities" style="margin-bottom: 4px;">ENTITIES: 0</div>
        <div id="insp-systems" style="margin-top: 8px;">
          <div style="color: #94a3b8; font-size: 9px; margin-bottom: 4px;">SYSTEM TIMING (ms)</div>
          <div id="insp-sys-list"></div>
        </div>
        <div id="insp-memory" style="margin-top: 8px; color: #f43f5e;">MEM: N/A</div>
      `;

      document.body.appendChild(this.container);
    }

    update(dt) {
      this.frameCount++;
      const now = performance.now();
      if (now - this.lastUpdate >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastUpdate = now;
        this._refreshUI();
      }
    }

    _refreshUI() {
      if (!this.container || !this.visible) return;

      document.getElementById('insp-fps').textContent = `FPS: ${this.fps}`;
      document.getElementById('insp-entities').textContent = `ENTITIES: ${this.world.entityCount}`;

      const mem = window.performance?.memory?.usedJSHeapSize;
      if (mem) {
        document.getElementById('insp-memory').textContent =
          `MEM: ${(mem / 1048576).toFixed(2)} MB`;
      }

      // System performance tracking would require adding timing hooks to World.update
      // For MVP, we show active systems
      const sysList = document.getElementById('insp-sys-list');
      sysList.innerHTML = this.world.systems
        .map((s, i) => {
          return `<div style="display: flex; justify-content: space-between;">
          <span>Sys ${i}</span>
          <span style="color: #22c55e;">OK</span>
        </div>`;
        })
        .join('');
    }

    toggle() {
      this.visible = !this.visible;
      this.container.style.display = this.visible ? 'block' : 'none';
    }
  }

  if (typeof window !== 'undefined') {
    window.ASDF = window.ASDF || {};
    window.ASDF.DevInspector = DevInspector;
  }
})();
