/**
 * Build V2 - Camera Controller
 * Smooth camera controls with zoom-to-node and orbit functionality
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// CAMERA CONTROLLER CONFIGURATION
// ============================================

const CAMERA_CONFIG = {
  // Default positions
  defaults: {
    position: { x: 0, y: 10, z: 60 },
    target: { x: 0, y: 0, z: 0 },
    fov: 60
  },
  // Orbit controls
  orbit: {
    enabled: true,
    autoRotate: true,
    autoRotateSpeed: 0.2,
    dampingFactor: 0.05,
    rotateSpeed: 0.5,
    zoomSpeed: 1.0,
    minDistance: 20,
    maxDistance: 100,
    minPolarAngle: Math.PI * 0.1,
    maxPolarAngle: Math.PI * 0.7
  },
  // Zoom to node
  zoom: {
    distance: 15,
    duration: 1000,
    easing: 'easeInOutCubic'
  },
  // Pan limits
  pan: {
    enabled: true,
    maxX: 50,
    maxY: 30,
    maxZ: 50
  }
};

// ============================================
// EASING FUNCTIONS
// ============================================

const Easing = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
};

// ============================================
// CAMERA CONTROLLER CLASS
// ============================================

class CameraController {
  /**
   * Create camera controller
   * @param {Object} THREE - Three.js library reference
   * @param {THREE.Camera} camera - Camera to control
   * @param {HTMLElement} domElement - DOM element for events
   * @param {Object} options - Configuration options
   */
  constructor(THREE, camera, domElement, options = {}) {
    this.THREE = THREE;
    this.camera = camera;
    this.domElement = domElement;
    this.options = { ...CAMERA_CONFIG, ...options };

    // State
    this.target = new THREE.Vector3();
    this.spherical = new THREE.Spherical();
    this.sphericalDelta = new THREE.Spherical();

    // Mouse state
    this.isPointerDown = false;
    this.pointerStart = new THREE.Vector2();
    this.pointerCurrent = new THREE.Vector2();

    // Animation state
    this.isAnimating = false;
    this.animationStart = null;
    this.animationDuration = 0;
    this.startPosition = new THREE.Vector3();
    this.endPosition = new THREE.Vector3();
    this.startTarget = new THREE.Vector3();
    this.endTarget = new THREE.Vector3();
    this.easingFn = Easing.easeInOutCubic;

    // Auto-rotate
    this.autoRotateAngle = 0;

    // Initialize
    this.init();
  }

  /**
   * Initialize controller
   */
  init() {
    const { defaults } = this.options;

    // Set initial position and target
    this.camera.position.set(defaults.position.x, defaults.position.y, defaults.position.z);
    this.target.set(defaults.target.x, defaults.target.y, defaults.target.z);
    this.camera.lookAt(this.target);

    // Calculate initial spherical coordinates
    this.updateSpherical();

    // Bind events
    this.bindEvents();
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
    this.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
    this.domElement.addEventListener('pointercancel', this.onPointerUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    // Touch events for mobile
    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  /**
   * Update spherical coordinates from camera position
   */
  updateSpherical() {
    const offset = this.camera.position.clone().sub(this.target);
    this.spherical.setFromVector3(offset);
  }

  /**
   * Apply spherical coordinates to camera position
   */
  applySpherical() {
    const { orbit } = this.options;

    // Clamp values
    this.spherical.radius = Math.max(orbit.minDistance, Math.min(orbit.maxDistance, this.spherical.radius));
    this.spherical.phi = Math.max(orbit.minPolarAngle, Math.min(orbit.maxPolarAngle, this.spherical.phi));

    // Apply to camera
    const offset = new this.THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  /**
   * Handle pointer down
   * @param {PointerEvent} event
   */
  onPointerDown(event) {
    if (!this.options.orbit.enabled) return;

    this.isPointerDown = true;
    this.pointerStart.set(event.clientX, event.clientY);
    this.pointerCurrent.copy(this.pointerStart);

    // Stop auto-rotate when user interacts
    this.options.orbit.autoRotate = false;
  }

  /**
   * Handle pointer move
   * @param {PointerEvent} event
   */
  onPointerMove(event) {
    if (!this.isPointerDown || !this.options.orbit.enabled) return;

    this.pointerCurrent.set(event.clientX, event.clientY);

    const deltaX = this.pointerCurrent.x - this.pointerStart.x;
    const deltaY = this.pointerCurrent.y - this.pointerStart.y;

    // Rotate
    const { rotateSpeed } = this.options.orbit;
    this.spherical.theta -= deltaX * rotateSpeed * 0.01;
    this.spherical.phi -= deltaY * rotateSpeed * 0.01;

    this.applySpherical();

    this.pointerStart.copy(this.pointerCurrent);
  }

  /**
   * Handle pointer up
   */
  onPointerUp() {
    this.isPointerDown = false;
  }

  /**
   * Handle wheel zoom
   * @param {WheelEvent} event
   */
  onWheel(event) {
    if (!this.options.orbit.enabled) return;

    event.preventDefault();

    const { zoomSpeed, minDistance, maxDistance } = this.options.orbit;
    const delta = event.deltaY > 0 ? 1.1 : 0.9;

    this.spherical.radius *= delta;
    this.spherical.radius = Math.max(minDistance, Math.min(maxDistance, this.spherical.radius));

    this.applySpherical();
  }

  /**
   * Handle touch start
   * @param {TouchEvent} event
   */
  onTouchStart(event) {
    if (event.touches.length === 1 && this.options.orbit.enabled) {
      this.isPointerDown = true;
      this.pointerStart.set(event.touches[0].clientX, event.touches[0].clientY);
      this.pointerCurrent.copy(this.pointerStart);
      this.options.orbit.autoRotate = false;
    }
  }

  /**
   * Handle touch move
   * @param {TouchEvent} event
   */
  onTouchMove(event) {
    if (event.touches.length === 1 && this.isPointerDown) {
      event.preventDefault();
      this.pointerCurrent.set(event.touches[0].clientX, event.touches[0].clientY);

      const deltaX = this.pointerCurrent.x - this.pointerStart.x;
      const deltaY = this.pointerCurrent.y - this.pointerStart.y;

      const { rotateSpeed } = this.options.orbit;
      this.spherical.theta -= deltaX * rotateSpeed * 0.01;
      this.spherical.phi -= deltaY * rotateSpeed * 0.01;

      this.applySpherical();

      this.pointerStart.copy(this.pointerCurrent);
    } else if (event.touches.length === 2) {
      // Pinch zoom
      event.preventDefault();
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (this.lastPinchDistance) {
        const delta = this.lastPinchDistance / distance;
        this.spherical.radius *= delta;
        this.spherical.radius = Math.max(
          this.options.orbit.minDistance,
          Math.min(this.options.orbit.maxDistance, this.spherical.radius)
        );
        this.applySpherical();
      }

      this.lastPinchDistance = distance;
    }
  }

  /**
   * Handle touch end
   */
  onTouchEnd() {
    this.isPointerDown = false;
    this.lastPinchDistance = null;
  }

  /**
   * Zoom to a specific node/position
   * @param {THREE.Vector3} targetPosition - Target to zoom to
   * @param {Object} options - Animation options
   */
  zoomToNode(targetPosition, options = {}) {
    const { zoom } = this.options;
    const duration = options.duration || zoom.duration;
    const distance = options.distance || zoom.distance;
    const easing = options.easing || zoom.easing;

    // Calculate end position (offset from target)
    const direction = this.camera.position.clone().sub(targetPosition).normalize();
    const endPos = targetPosition.clone().add(direction.multiplyScalar(distance));

    // Start animation
    this.startAnimation(endPos, targetPosition, duration, easing);
  }

  /**
   * Reset camera to default position
   * @param {Object} options - Animation options
   */
  resetView(options = {}) {
    const { defaults, zoom } = this.options;
    const duration = options.duration || zoom.duration;
    const easing = options.easing || zoom.easing;

    const endPos = new this.THREE.Vector3(
      defaults.position.x,
      defaults.position.y,
      defaults.position.z
    );
    const endTarget = new this.THREE.Vector3(
      defaults.target.x,
      defaults.target.y,
      defaults.target.z
    );

    this.startAnimation(endPos, endTarget, duration, easing);

    // Re-enable auto-rotate
    this.options.orbit.autoRotate = true;
  }

  /**
   * Start camera animation
   * @param {THREE.Vector3} endPosition
   * @param {THREE.Vector3} endTarget
   * @param {number} duration
   * @param {string} easing
   */
  startAnimation(endPosition, endTarget, duration, easing) {
    this.isAnimating = true;
    this.animationStart = performance.now();
    this.animationDuration = duration;

    this.startPosition.copy(this.camera.position);
    this.endPosition.copy(endPosition);
    this.startTarget.copy(this.target);
    this.endTarget.copy(endTarget);

    this.easingFn = Easing[easing] || Easing.easeInOutCubic;
  }

  /**
   * Update controller
   * @param {number} deltaTime - Time since last update (not used directly here)
   */
  update(deltaTime) {
    // Handle animation
    if (this.isAnimating) {
      const elapsed = performance.now() - this.animationStart;
      const progress = Math.min(elapsed / this.animationDuration, 1);
      const eased = this.easingFn(progress);

      // Interpolate position and target
      this.camera.position.lerpVectors(this.startPosition, this.endPosition, eased);
      this.target.lerpVectors(this.startTarget, this.endTarget, eased);
      this.camera.lookAt(this.target);

      // Update spherical
      this.updateSpherical();

      if (progress >= 1) {
        this.isAnimating = false;
      }

      return;
    }

    // Auto-rotate
    if (this.options.orbit.autoRotate && !this.isPointerDown) {
      const { autoRotateSpeed } = this.options.orbit;
      this.spherical.theta += autoRotateSpeed * deltaTime * 0.1;
      this.applySpherical();
    }

    // Apply damping
    if (this.sphericalDelta.theta !== 0 || this.sphericalDelta.phi !== 0) {
      const { dampingFactor } = this.options.orbit;

      this.spherical.theta += this.sphericalDelta.theta;
      this.spherical.phi += this.sphericalDelta.phi;

      this.sphericalDelta.theta *= (1 - dampingFactor);
      this.sphericalDelta.phi *= (1 - dampingFactor);

      this.applySpherical();
    }
  }

  /**
   * Set target position
   * @param {THREE.Vector3} newTarget
   */
  setTarget(newTarget) {
    this.target.copy(newTarget);
    this.camera.lookAt(this.target);
    this.updateSpherical();
  }

  /**
   * Get current target
   * @returns {THREE.Vector3}
   */
  getTarget() {
    return this.target.clone();
  }

  /**
   * Enable/disable orbit
   * @param {boolean} enabled
   */
  setOrbitEnabled(enabled) {
    this.options.orbit.enabled = enabled;
  }

  /**
   * Enable/disable auto-rotate
   * @param {boolean} enabled
   */
  setAutoRotate(enabled) {
    this.options.orbit.autoRotate = enabled;
  }

  /**
   * Check if currently animating
   * @returns {boolean}
   */
  isInAnimation() {
    return this.isAnimating;
  }

  /**
   * Dispose controller
   */
  dispose() {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointercancel', this.onPointerUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.domElement.removeEventListener('touchmove', this.onTouchMove);
    this.domElement.removeEventListener('touchend', this.onTouchEnd);
  }
}

// ============================================
// EXPORTS
// ============================================

export { CameraController, CAMERA_CONFIG, Easing };
export default CameraController;
