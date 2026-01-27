/**
 * Yggdrasil Builder's Cosmos - Camera Controller
 * Smooth transitions between view levels
 * Supports mouse + touch input
 */

'use strict';

import { CONFIG, CAMERA_STATES, VIEWS } from '../config.js';

/**
 * Easing functions
 */
const Easing = {
  easeInOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutCubic: t => 1 - Math.pow(1 - t, 3),
  easeInOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  'power2.inOut': t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

/**
 * Camera controller for multi-level navigation
 */
export const CameraController = {
  camera: null,
  domElement: null,

  // Current state
  currentView: VIEWS.COSMOS,
  viewStack: [],

  // Orbit state
  orbit: {
    enabled: true,
    target: { x: 0, y: 10, z: 0 },
    spherical: { radius: 50, phi: Math.PI / 3, theta: 0 },
    autoRotate: true,
    autoRotateSpeed: 0.08,
    damping: 0.05,
  },

  // Transition
  transition: {
    active: false,
    startTime: 0,
    duration: 1500,
    from: { position: null, target: null, fov: null },
    to: { position: null, target: null, fov: null },
  },

  // Input
  input: {
    isMouseDown: false,
    isTouching: false,
    lastX: 0,
    lastY: 0,
    pinchDistance: 0,
  },

  // Event handler references (for cleanup)
  _handlers: {
    mousedown: null,
    mouseup: null,
    mousemove: null,
    wheel: null,
    dblclick: null,
    touchstart: null,
    touchmove: null,
    touchend: null,
  },

  /**
   * Initialize
   */
  init(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Set initial state from COSMOS
    const cosmos = CAMERA_STATES.COSMOS;
    this.orbit.target = { ...cosmos.target };
    this.updateSphericalFromCamera();

    this.setupEvents();
  },

  /**
   * Setup events with proper cleanup references
   */
  setupEvents() {
    // === MOUSE EVENTS ===

    this._handlers.mousedown = e => {
      if (e.button === 0) {
        this.input.isMouseDown = true;
        this.input.lastX = e.clientX;
        this.input.lastY = e.clientY;
        this.orbit.autoRotate = false;
      }
    };

    this._handlers.mouseup = () => {
      this.input.isMouseDown = false;
    };

    this._handlers.mousemove = e => {
      if (!this.input.isMouseDown || this.transition.active) return;

      const deltaX = e.clientX - this.input.lastX;
      const deltaY = e.clientY - this.input.lastY;

      this.orbit.spherical.theta -= deltaX * 0.005;
      this.orbit.spherical.phi = Math.max(
        0.2,
        Math.min(Math.PI - 0.2, this.orbit.spherical.phi + deltaY * 0.005)
      );

      this.input.lastX = e.clientX;
      this.input.lastY = e.clientY;
    };

    this._handlers.wheel = e => {
      e.preventDefault();
      if (this.transition.active) return;

      const zoomSpeed = 0.1;
      this.orbit.spherical.radius *= 1 + e.deltaY * zoomSpeed * 0.01;
      this.orbit.spherical.radius = Math.max(10, Math.min(80, this.orbit.spherical.radius));
    };

    this._handlers.dblclick = () => {
      this.goHome();
    };

    // === TOUCH EVENTS (Mobile Support) ===

    this._handlers.touchstart = e => {
      e.preventDefault();
      this.orbit.autoRotate = false;

      if (e.touches.length === 1) {
        // Single finger - rotate
        this.input.isTouching = true;
        this.input.lastX = e.touches[0].clientX;
        this.input.lastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        // Two fingers - pinch zoom
        this.input.pinchDistance = this.getTouchDistance(e.touches);
      }
    };

    this._handlers.touchmove = e => {
      e.preventDefault();
      if (this.transition.active) return;

      if (e.touches.length === 1 && this.input.isTouching) {
        // Rotate
        const deltaX = e.touches[0].clientX - this.input.lastX;
        const deltaY = e.touches[0].clientY - this.input.lastY;

        // Increased sensitivity for touch
        this.orbit.spherical.theta -= deltaX * 0.008;
        this.orbit.spherical.phi = Math.max(
          0.2,
          Math.min(Math.PI - 0.2, this.orbit.spherical.phi + deltaY * 0.008)
        );

        this.input.lastX = e.touches[0].clientX;
        this.input.lastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        // Pinch zoom
        const newDistance = this.getTouchDistance(e.touches);
        const delta = this.input.pinchDistance - newDistance;

        this.orbit.spherical.radius *= 1 + delta * 0.005;
        this.orbit.spherical.radius = Math.max(10, Math.min(80, this.orbit.spherical.radius));

        this.input.pinchDistance = newDistance;
      }
    };

    this._handlers.touchend = e => {
      if (e.touches.length === 0) {
        this.input.isTouching = false;
      }
    };

    // === ATTACH LISTENERS ===

    // Mouse
    this.domElement.addEventListener('mousedown', this._handlers.mousedown);
    window.addEventListener('mouseup', this._handlers.mouseup);
    window.addEventListener('mousemove', this._handlers.mousemove);
    this.domElement.addEventListener('wheel', this._handlers.wheel, { passive: false });
    this.domElement.addEventListener('dblclick', this._handlers.dblclick);

    // Touch
    this.domElement.addEventListener('touchstart', this._handlers.touchstart, { passive: false });
    this.domElement.addEventListener('touchmove', this._handlers.touchmove, { passive: false });
    this.domElement.addEventListener('touchend', this._handlers.touchend);
  },

  /**
   * Get distance between two touch points
   */
  getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * Update spherical from camera
   */
  updateSphericalFromCamera() {
    const dx = this.camera.position.x - this.orbit.target.x;
    const dy = this.camera.position.y - this.orbit.target.y;
    const dz = this.camera.position.z - this.orbit.target.z;

    this.orbit.spherical.radius = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this.orbit.spherical.phi = Math.acos(dy / this.orbit.spherical.radius);
    this.orbit.spherical.theta = Math.atan2(dz, dx);
  },

  /**
   * Focus on a position (island/node)
   */
  focusOn(position, viewType = 'project') {
    const state = CAMERA_STATES[viewType.toUpperCase()] || CAMERA_STATES.PROJECT;

    // Calculate camera position from offset
    const offset = state.offset || { x: 5, y: 3, z: 10 };
    const cameraPosition = {
      x: position.x + offset.x,
      y: position.y + offset.y,
      z: position.z + offset.z,
    };

    const targetPosition = {
      x: position.x,
      y: position.y,
      z: position.z,
    };

    // Save current state for back navigation
    this.viewStack.push({
      view: this.currentView,
      target: { ...this.orbit.target },
      spherical: { ...this.orbit.spherical },
      fov: this.camera.fov,
    });

    // Disable auto-rotate during focus
    this.orbit.autoRotate = false;

    this.currentView = viewType;
    this.startTransition(cameraPosition, targetPosition, state.fov || 45);
  },

  /**
   * Go back one level
   */
  goBack() {
    if (this.viewStack.length === 0) {
      this.goHome();
      return;
    }

    const prev = this.viewStack.pop();
    this.currentView = prev.view;

    const pos = this.sphericalToCartesian(prev.spherical, prev.target);
    this.startTransition(pos, prev.target, prev.fov);

    // Re-enable auto-rotate if returning to cosmos
    if (prev.view === VIEWS.COSMOS) {
      this.orbit.autoRotate = true;
    }
  },

  /**
   * Return to cosmos view
   */
  goHome() {
    const cosmos = CAMERA_STATES.COSMOS;

    this.startTransition(cosmos.position, cosmos.target, cosmos.fov);

    this.viewStack = [];
    this.currentView = VIEWS.COSMOS;
    this.orbit.autoRotate = true;
  },

  /**
   * Start transition
   */
  startTransition(toPosition, toTarget, toFov) {
    this.transition.active = true;
    this.transition.startTime = performance.now();
    this.transition.duration = CONFIG.animation.cameraTransition * 1000;

    this.transition.from = {
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
      },
      target: { ...this.orbit.target },
      fov: this.camera.fov,
    };

    this.transition.to = {
      position: toPosition,
      target: toTarget,
      fov: toFov,
    };
  },

  /**
   * Spherical to cartesian
   */
  sphericalToCartesian(spherical, center) {
    return {
      x: center.x + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta),
      y: center.y + spherical.radius * Math.cos(spherical.phi),
      z: center.z + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta),
    };
  },

  /**
   * Update (call each frame)
   */
  update(delta) {
    if (this.transition.active) {
      this.updateTransition();
    } else {
      this.updateOrbit(delta);
    }

    this.camera.lookAt(this.orbit.target.x, this.orbit.target.y, this.orbit.target.z);
  },

  /**
   * Update transition
   */
  updateTransition() {
    const elapsed = performance.now() - this.transition.startTime;
    let t = elapsed / this.transition.duration;

    if (t >= 1) {
      t = 1;
      this.transition.active = false;
      this.orbit.target = { ...this.transition.to.target };
      this.updateSphericalFromCamera();
    }

    const easing = Easing[CONFIG.animation.easing] || Easing.easeInOutCubic;
    const eased = easing(t);

    // Interpolate
    this.camera.position.x = this.lerp(
      this.transition.from.position.x,
      this.transition.to.position.x,
      eased
    );
    this.camera.position.y = this.lerp(
      this.transition.from.position.y,
      this.transition.to.position.y,
      eased
    );
    this.camera.position.z = this.lerp(
      this.transition.from.position.z,
      this.transition.to.position.z,
      eased
    );

    this.orbit.target.x = this.lerp(
      this.transition.from.target.x,
      this.transition.to.target.x,
      eased
    );
    this.orbit.target.y = this.lerp(
      this.transition.from.target.y,
      this.transition.to.target.y,
      eased
    );
    this.orbit.target.z = this.lerp(
      this.transition.from.target.z,
      this.transition.to.target.z,
      eased
    );

    // FOV
    if (this.transition.to.fov) {
      this.camera.fov = this.lerp(this.transition.from.fov, this.transition.to.fov, eased);
      this.camera.updateProjectionMatrix();
    }
  },

  /**
   * Update orbit
   */
  updateOrbit(delta) {
    if (this.orbit.autoRotate) {
      this.orbit.spherical.theta += this.orbit.autoRotateSpeed * delta;
    }

    const pos = this.sphericalToCartesian(this.orbit.spherical, this.orbit.target);

    this.camera.position.x += (pos.x - this.camera.position.x) * this.orbit.damping;
    this.camera.position.y += (pos.y - this.camera.position.y) * this.orbit.damping;
    this.camera.position.z += (pos.z - this.camera.position.z) * this.orbit.damping;
  },

  /**
   * Lerp
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  /**
   * Get current view
   */
  getCurrentView() {
    return this.currentView;
  },

  /**
   * Dispose - CRITICAL: Clean up all event listeners
   */
  dispose() {
    // Remove mouse listeners
    if (this.domElement) {
      this.domElement.removeEventListener('mousedown', this._handlers.mousedown);
      this.domElement.removeEventListener('wheel', this._handlers.wheel);
      this.domElement.removeEventListener('dblclick', this._handlers.dblclick);
      this.domElement.removeEventListener('touchstart', this._handlers.touchstart);
      this.domElement.removeEventListener('touchmove', this._handlers.touchmove);
      this.domElement.removeEventListener('touchend', this._handlers.touchend);
    }

    // Remove window listeners
    window.removeEventListener('mouseup', this._handlers.mouseup);
    window.removeEventListener('mousemove', this._handlers.mousemove);

    // Clear references
    this._handlers = {
      mousedown: null,
      mouseup: null,
      mousemove: null,
      wheel: null,
      dblclick: null,
      touchstart: null,
      touchmove: null,
      touchend: null,
    };

    this.camera = null;
    this.domElement = null;
    this.viewStack = [];
  },
};

export default CameraController;
