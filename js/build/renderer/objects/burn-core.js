/**
 * Build V2 - Burn Core Effect
 * Pulsating center core for Yggdrasil heart
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// BURN CORE CONFIGURATION
// ============================================

const BURN_CORE_CONFIG = {
  // Core sphere
  core: {
    radius: 3,
    segments: 32,
    color: 0xff6b35,
    emissiveIntensity: 0.8
  },
  // Outer shell
  shell: {
    radius: 4,
    segments: 24,
    color: 0xff4400,
    opacity: 0.3
  },
  // Inner glow
  innerGlow: {
    color: 0xffffff,
    intensity: 2,
    distance: 20
  },
  // Outer glow
  outerGlow: {
    color: 0xff6b35,
    intensity: 1.5,
    distance: 50
  },
  // Rings
  rings: {
    count: 3,
    baseRadius: 5,
    tubeRadius: 0.2,
    color: 0xff8844,
    opacity: 0.4
  },
  // Animation
  animation: {
    pulseSpeed: 1.5,
    pulseAmplitude: 0.2,
    rotationSpeed: 0.3
  }
};

// ============================================
// BURN CORE CLASS
// ============================================

class BurnCore {
  /**
   * Create burn core
   * @param {Object} THREE - Three.js library reference
   * @param {Object} options - Configuration options
   */
  constructor(THREE, options = {}) {
    this.THREE = THREE;
    this.options = { ...BURN_CORE_CONFIG, ...options };

    // Group for core elements
    this.group = new THREE.Group();
    this.group.name = 'BurnCore';
    this.group.userData = { type: 'center', id: 'burn-engine' };

    // References
    this.coreMesh = null;
    this.shellMesh = null;
    this.innerLight = null;
    this.outerLight = null;
    this.rings = [];
    this.glowSprite = null;

    // Animation state
    this.time = 0;
    this.intensity = 1.0;
  }

  /**
   * Initialize and build the core
   * @param {THREE.Vector3} position - Initial position
   * @returns {THREE.Group}
   */
  init(position = new this.THREE.Vector3(0, 0, 0)) {
    this.group.position.copy(position);

    this.createCore();
    this.createShell();
    this.createLights();
    this.createRings();
    this.createGlow();

    return this.group;
  }

  /**
   * Create the main core sphere
   */
  createCore() {
    const { THREE } = this;
    const { core } = this.options;

    // Icosahedron for more interesting shape
    const geometry = new THREE.IcosahedronGeometry(core.radius, 2);

    const material = new THREE.MeshPhongMaterial({
      color: core.color,
      emissive: core.color,
      emissiveIntensity: core.emissiveIntensity,
      transparent: true,
      opacity: 0.95,
      shininess: 50
    });

    this.coreMesh = new THREE.Mesh(geometry, material);
    this.coreMesh.userData = { type: 'center', id: 'burn-engine' };

    this.group.add(this.coreMesh);
  }

  /**
   * Create outer translucent shell
   */
  createShell() {
    const { THREE } = this;
    const { shell } = this.options;

    const geometry = new THREE.IcosahedronGeometry(shell.radius, 1);

    const material = new THREE.MeshPhongMaterial({
      color: shell.color,
      emissive: shell.color,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: shell.opacity,
      wireframe: true,
      side: THREE.DoubleSide
    });

    this.shellMesh = new THREE.Mesh(geometry, material);
    this.group.add(this.shellMesh);
  }

  /**
   * Create light sources
   */
  createLights() {
    const { THREE } = this;
    const { innerGlow, outerGlow } = this.options;

    // Inner bright light
    this.innerLight = new THREE.PointLight(
      innerGlow.color,
      innerGlow.intensity,
      innerGlow.distance
    );
    this.innerLight.castShadow = false;

    // Outer colored light
    this.outerLight = new THREE.PointLight(
      outerGlow.color,
      outerGlow.intensity,
      outerGlow.distance
    );
    this.outerLight.castShadow = false;

    this.group.add(this.innerLight);
    this.group.add(this.outerLight);
  }

  /**
   * Create orbital rings
   */
  createRings() {
    const { THREE } = this;
    const { rings } = this.options;

    for (let i = 0; i < rings.count; i++) {
      const radius = rings.baseRadius + i * 1.5;

      const geometry = new THREE.TorusGeometry(
        radius,
        rings.tubeRadius,
        8,
        64
      );

      const material = new THREE.MeshBasicMaterial({
        color: rings.color,
        transparent: true,
        opacity: rings.opacity - i * 0.1,
        side: THREE.DoubleSide
      });

      const ring = new THREE.Mesh(geometry, material);

      // Random initial rotation
      ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      ring.rotation.y = Math.random() * Math.PI;

      ring.userData = {
        rotationSpeed: (0.2 + Math.random() * 0.3) * (i % 2 === 0 ? 1 : -1),
        wobblePhase: Math.random() * Math.PI * 2
      };

      this.rings.push(ring);
      this.group.add(ring);
    }
  }

  /**
   * Create glow sprite
   */
  createGlow() {
    const { THREE } = this;

    // Create glow texture using canvas
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Radial gradient
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 107, 53, 0.8)');
    gradient.addColorStop(0.3, 'rgba(255, 68, 0, 0.4)');
    gradient.addColorStop(0.7, 'rgba(255, 68, 0, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 68, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.glowSprite = new THREE.Sprite(material);
    this.glowSprite.scale.set(20, 20, 1);

    this.group.add(this.glowSprite);
  }

  /**
   * Update animation
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    const { animation } = this.options;
    this.time += deltaTime;

    // Core pulse
    const pulse = 1 + Math.sin(this.time * animation.pulseSpeed) * animation.pulseAmplitude;
    const scaledPulse = pulse * this.intensity;

    if (this.coreMesh) {
      this.coreMesh.scale.setScalar(scaledPulse);
      this.coreMesh.material.emissiveIntensity = 0.5 + pulse * 0.3;
      this.coreMesh.rotation.y += deltaTime * animation.rotationSpeed;
    }

    // Shell counter-rotation
    if (this.shellMesh) {
      this.shellMesh.rotation.y -= deltaTime * animation.rotationSpeed * 0.5;
      this.shellMesh.rotation.x += deltaTime * animation.rotationSpeed * 0.3;
    }

    // Light intensity pulse
    if (this.innerLight) {
      this.innerLight.intensity = (1.5 + pulse * 0.5) * this.intensity;
    }

    if (this.outerLight) {
      this.outerLight.intensity = (1.0 + pulse * 0.3) * this.intensity;
    }

    // Ring rotation
    this.rings.forEach((ring) => {
      const { rotationSpeed, wobblePhase } = ring.userData;
      ring.rotation.z += deltaTime * rotationSpeed;
      ring.rotation.x = Math.PI / 2 + Math.sin(this.time + wobblePhase) * 0.1;
    });

    // Glow pulse
    if (this.glowSprite) {
      const glowScale = 18 + pulse * 4;
      this.glowSprite.scale.set(glowScale, glowScale, 1);
      this.glowSprite.material.opacity = 0.5 + pulse * 0.2;
    }
  }

  /**
   * Set burn intensity
   * @param {number} intensity - 0 to 1
   */
  setIntensity(intensity) {
    this.intensity = Math.max(0, Math.min(1, intensity));

    // Update colors based on intensity
    if (this.coreMesh) {
      const baseIntensity = 0.5 + intensity * 0.5;
      this.coreMesh.material.emissiveIntensity = baseIntensity;
    }

    // Update light intensity
    if (this.outerLight) {
      this.outerLight.intensity = 1.0 + intensity * 0.5;
    }
  }

  /**
   * Set hover state
   * @param {boolean} hovered
   */
  setHovered(hovered) {
    if (this.coreMesh) {
      this.coreMesh.material.emissiveIntensity = hovered ? 1.0 : 0.8;
    }
  }

  /**
   * Get the core group
   * @returns {THREE.Group}
   */
  getGroup() {
    return this.group;
  }

  /**
   * Get raycast target
   * @returns {THREE.Mesh}
   */
  getRaycastTarget() {
    return this.coreMesh;
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    if (this.coreMesh) {
      this.coreMesh.geometry.dispose();
      this.coreMesh.material.dispose();
    }

    if (this.shellMesh) {
      this.shellMesh.geometry.dispose();
      this.shellMesh.material.dispose();
    }

    this.rings.forEach(ring => {
      ring.geometry.dispose();
      ring.material.dispose();
    });

    if (this.glowSprite) {
      this.glowSprite.material.map?.dispose();
      this.glowSprite.material.dispose();
    }

    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    this.rings = [];
  }
}

// ============================================
// EXPORTS
// ============================================

export { BurnCore, BURN_CORE_CONFIG };
export default BurnCore;
