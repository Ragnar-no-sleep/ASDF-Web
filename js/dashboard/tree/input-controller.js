/**
 * InputController - Handles mouse/touch input and raycasting
 * Extracted from Yggdrasil God Object for SRP compliance
 */

'use strict';

import * as THREE from 'three';
import { VIEWS } from '../config.js';

/**
 * Input Controller for Yggdrasil scene
 * Single Responsibility: Handle user input and raycasting
 */
export const InputController = {
  // Dependencies (injected)
  renderer: null,
  camera: null,
  scene: null,

  // Raycasting
  raycaster: null,
  mouse: null,
  lastRaycastTime: 0,
  raycastThrottle: 33, // ~30fps

  // Drag detection
  dragState: {
    startX: 0,
    startY: 0,
    isDragging: false,
    threshold: 5,
  },

  // State references (injected)
  getHitboxes: null,
  getBurnCore: null,
  getSkillNodes: null,
  getCameraController: null,
  getCurrentView: null,

  // Event handlers (injected)
  _handlers: {
    onIslandHover: null,
    onIslandClick: null,
    onBurnCoreClick: null,
    onSkillHover: null,
    onSkillClick: null,
  },

  // Internal state
  hoveredIsland: null,
  _boundHandlers: null,

  /**
   * Initialize input controller
   * @param {Object} deps - Dependencies
   * @param {THREE.WebGLRenderer} deps.renderer
   * @param {THREE.Camera} deps.camera
   * @param {Function} deps.getHitboxes - Returns hitbox array
   * @param {Function} deps.getBurnCore - Returns burn core group
   * @param {Function} deps.getSkillNodes - Returns skill nodes controller
   * @param {Function} deps.getCameraController - Returns camera controller
   * @param {Function} deps.getCurrentView - Returns current view
   */
  init(deps) {
    this.renderer = deps.renderer;
    this.camera = deps.camera;
    this.scene = deps.scene;

    // Inject getters for dynamic state
    this.getHitboxes = deps.getHitboxes;
    this.getBurnCore = deps.getBurnCore;
    this.getSkillNodes = deps.getSkillNodes;
    this.getCameraController = deps.getCameraController;
    this.getCurrentView = deps.getCurrentView;

    // Setup raycasting
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Bind event handlers (store for cleanup)
    this._boundHandlers = {
      resize: () => this._onResize(),
      mousemove: e => this._onMouseMove(e),
      click: e => this._onClick(e),
      mousedown: e => this._onMouseDown(e),
      mousemoveDrag: e => this._onMouseMoveDrag(e),
      touchend: e => this._onTouchEnd(e),
    };

    this._setupEvents();

    return this;
  },

  /**
   * Register event handler
   */
  on(event, callback) {
    const key = `on${event.charAt(0).toUpperCase() + event.slice(1)}`;
    if (Object.prototype.hasOwnProperty.call(this._handlers, key)) {
      this._handlers[key] = callback;
    }
  },

  /**
   * Setup event listeners
   */
  _setupEvents() {
    const canvas = this.renderer.domElement;

    window.addEventListener('resize', this._boundHandlers.resize);
    canvas.addEventListener('mousemove', this._boundHandlers.mousemove);
    canvas.addEventListener('click', this._boundHandlers.click);
    canvas.addEventListener('mousedown', this._boundHandlers.mousedown);
    canvas.addEventListener('mousemove', this._boundHandlers.mousemoveDrag);
    canvas.addEventListener('touchend', this._boundHandlers.touchend, { passive: true });
  },

  /**
   * Handle resize
   */
  _onResize() {
    // Emit event - Yggdrasil handles actual resize
    if (this._handlers.onResize) {
      this._handlers.onResize();
    }
  },

  /**
   * Handle mousedown - start drag tracking
   */
  _onMouseDown(e) {
    this.dragState.startX = e.clientX;
    this.dragState.startY = e.clientY;
    this.dragState.isDragging = false;
  },

  /**
   * Handle mousemove for drag detection
   */
  _onMouseMoveDrag(e) {
    if (e.buttons === 1) {
      const dx = e.clientX - this.dragState.startX;
      const dy = e.clientY - this.dragState.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > this.dragState.threshold) {
        this.dragState.isDragging = true;
      }
    }
  },

  /**
   * Handle mouse move - raycasting and hover
   */
  _onMouseMove(event) {
    // Update mouse position
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Throttle raycasting
    const now = performance.now();
    if (now - this.lastRaycastTime < this.raycastThrottle) {
      return;
    }
    this.lastRaycastTime = now;

    // Raycast
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const currentView = this.getCurrentView();
    const skillNodes = this.getSkillNodes();

    // In PROJECT_TREE view: only check skill hover
    if (currentView === VIEWS.PROJECT_TREE) {
      this._handleProjectViewHover(skillNodes);
      return;
    }

    // COSMOS view: raycast islands and burn core
    this._handleCosmosViewHover();
  },

  /**
   * Handle hover in project tree view (skills only)
   */
  _handleProjectViewHover(skillNodes) {
    // Clear island hover
    if (this.hoveredIsland) {
      this._unhoverIsland(this.hoveredIsland);
      this.hoveredIsland = null;
      if (this._handlers.onIslandHover) {
        this._handlers.onIslandHover(null);
      }
    }
    this.renderer.domElement.style.cursor = 'default';

    // Check skills
    if (skillNodes?.isVisible) {
      const skill = skillNodes.checkHover(this.raycaster);
      if (skill) {
        this.renderer.domElement.style.cursor = 'pointer';
      }
    }
  },

  /**
   * Handle hover in cosmos view (islands + burn core)
   */
  _handleCosmosViewHover() {
    const hitboxes = this.getHitboxes();
    const burnCore = this.getBurnCore();

    const intersects = this.raycaster.intersectObjects([...hitboxes, burnCore], true);

    const { island: hitIsland, burnCore: hitBurnCore } = this._parseIntersects(intersects);

    // Handle island hover
    if (hitIsland) {
      if (this.hoveredIsland !== hitIsland) {
        if (this.hoveredIsland) {
          this._unhoverIsland(this.hoveredIsland);
        }
        this._hoverIsland(hitIsland);
        this.hoveredIsland = hitIsland;
        this.renderer.domElement.style.cursor = 'pointer';

        if (this._handlers.onIslandHover) {
          this._handlers.onIslandHover(hitIsland.userData.project);
        }
      }
    } else if (hitBurnCore) {
      this.renderer.domElement.style.cursor = 'pointer';
      if (this.hoveredIsland) {
        this._unhoverIsland(this.hoveredIsland);
        this.hoveredIsland = null;
      }
    } else {
      if (this.hoveredIsland) {
        this._unhoverIsland(this.hoveredIsland);
        this.hoveredIsland = null;
        if (this._handlers.onIslandHover) {
          this._handlers.onIslandHover(null);
        }
      }
      this.renderer.domElement.style.cursor = 'default';
    }
  },

  /**
   * Handle click
   */
  _onClick(_event) {
    // Ignore drags
    if (this.dragState.isDragging) {
      this.dragState.isDragging = false;
      return;
    }

    // Ignore during camera transitions
    const cameraController = this.getCameraController();
    if (cameraController?.transition?.active) {
      return;
    }

    const currentView = this.getCurrentView();
    const skillNodes = this.getSkillNodes();

    // Check skill click in project view
    if (currentView === VIEWS.PROJECT_TREE && skillNodes?.isVisible) {
      const skill = skillNodes.handleClick();
      if (skill) {
        if (this._handlers.onSkillClick) {
          this._handlers.onSkillClick(skill, skillNodes.currentProject);
        }
        return;
      }
    }

    // Raycast for islands/burn core
    const hitboxes = this.getHitboxes();
    const burnCore = this.getBurnCore();

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects([...hitboxes, burnCore], true);

    const { island: clickedIsland, burnCore: clickedBurnCore } = this._parseIntersects(intersects);

    if (clickedIsland) {
      if (this._handlers.onIslandClick) {
        this._handlers.onIslandClick(clickedIsland);
      }
    } else if (clickedBurnCore) {
      if (this._handlers.onBurnCoreClick) {
        this._handlers.onBurnCoreClick();
      }
    }
  },

  /**
   * Handle touch end (mobile tap)
   */
  _onTouchEnd(e) {
    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      this._onClick(e);
    }
  },

  /**
   * Parse raycast intersects to find island or burn core
   */
  _parseIntersects(intersects) {
    let island = null;
    let burnCore = false;

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      if (hit.userData?.type === 'islandHitbox') {
        island = hit.userData.island;
      } else {
        let obj = hit;
        while (obj) {
          if (obj.userData?.type === 'burnCore') {
            burnCore = true;
            break;
          }
          obj = obj.parent;
        }
      }
    }

    return { island, burnCore };
  },

  /**
   * Hover island visual effect
   */
  _hoverIsland(island) {
    island.scale.setScalar(1.2);
    if (island.userData.rockMaterial) {
      island.userData.rockMaterial.emissiveIntensity = 0.5;
    }
    if (island.userData.auraMaterial) {
      island.userData.auraMaterial.opacity = 0.25;
    }
    if (island.userData.ringMaterial) {
      island.userData.ringMaterial.opacity = 0.9;
    }
  },

  /**
   * Unhover island visual effect
   */
  _unhoverIsland(island) {
    island.scale.setScalar(1);
    if (island.userData.rockMaterial) {
      island.userData.rockMaterial.emissiveIntensity = island.userData.originalEmissive;
    }
    if (island.userData.auraMaterial) {
      const isLive = island.userData.project?.status === 'live';
      island.userData.auraMaterial.opacity = isLive ? 0.12 : 0.05;
    }
    if (island.userData.ringMaterial) {
      const isLive = island.userData.project?.status === 'live';
      island.userData.ringMaterial.opacity = isLive ? 0.6 : 0.25;
    }
  },

  /**
   * Pulse island animation (click feedback)
   */
  pulseIsland(island) {
    const startScale = island.scale.x;
    const pulseScale = 1.4;
    const duration = 200;
    const startTime = performance.now();

    if (island.userData.rockMaterial) {
      island.userData.rockMaterial.emissiveIntensity = 1.0;
    }
    if (island.userData.ringMaterial) {
      island.userData.ringMaterial.opacity = 1.0;
    }

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);

      if (t < 0.5) {
        const upT = t * 2;
        island.scale.setScalar(startScale + (pulseScale - startScale) * upT);
      } else {
        const downT = (t - 0.5) * 2;
        island.scale.setScalar(pulseScale - (pulseScale - 1.2) * downT);
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        island.scale.setScalar(1.2);
      }
    };

    requestAnimationFrame(animate);
  },

  /**
   * Get current hovered island
   */
  getHoveredIsland() {
    return this.hoveredIsland;
  },

  /**
   * Clear hover state
   */
  clearHover() {
    if (this.hoveredIsland) {
      this._unhoverIsland(this.hoveredIsland);
      this.hoveredIsland = null;
    }
  },

  /**
   * Dispose
   */
  dispose() {
    const canvas = this.renderer?.domElement;

    if (canvas) {
      canvas.removeEventListener('mousemove', this._boundHandlers.mousemove);
      canvas.removeEventListener('click', this._boundHandlers.click);
      canvas.removeEventListener('mousedown', this._boundHandlers.mousedown);
      canvas.removeEventListener('mousemove', this._boundHandlers.mousemoveDrag);
      canvas.removeEventListener('touchend', this._boundHandlers.touchend);
    }

    window.removeEventListener('resize', this._boundHandlers.resize);

    this._boundHandlers = null;
    this.hoveredIsland = null;
    this.raycaster = null;
    this.mouse = null;
  },
};

export default InputController;
