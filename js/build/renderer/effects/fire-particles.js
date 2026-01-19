/**
 * Build V2 - Fire Particles Effect
 * GPU-efficient fire particle system for Yggdrasil burn effect
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// FIRE PARTICLE CONFIGURATION
// ============================================

const FIRE_CONFIG = {
  // Particle counts by performance tier
  counts: {
    desktop: 2000,
    mobile: 500
  },
  // Particle behavior
  particle: {
    minSize: 0.1,
    maxSize: 0.4,
    minLife: 0.5,
    maxLife: 2.0,
    minSpeed: 0.5,
    maxSpeed: 2.0
  },
  // Emission area
  emission: {
    radius: 3,
    height: 8,
    spread: 0.3
  },
  // Colors (gradient from core to edge)
  colors: {
    core: 0xffffff,      // White hot center
    mid: 0xff6b35,       // Orange
    outer: 0xff4400,     // Red-orange
    smoke: 0x331100      // Dark smoke
  }
};

// ============================================
// FIRE PARTICLE SYSTEM
// ============================================

class FireParticles {
  /**
   * Create fire particle system
   * @param {Object} THREE - Three.js library reference
   * @param {Object} options - Configuration options
   */
  constructor(THREE, options = {}) {
    this.THREE = THREE;
    this.options = { ...FIRE_CONFIG, ...options };

    // Particle state
    this.particles = null;
    this.positions = null;
    this.velocities = null;
    this.colors = null;
    this.sizes = null;
    this.lifetimes = null;
    this.maxLifetimes = null;

    // Performance
    this.particleCount = this.getParticleCount();
    this.time = 0;

    // Group to hold particles
    this.group = new THREE.Group();
    this.group.name = 'FireParticles';
  }

  /**
   * Get particle count based on device capability
   * @returns {number}
   */
  getParticleCount() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;

    return isMobile ? this.options.counts.mobile : this.options.counts.desktop;
  }

  /**
   * Initialize the particle system
   * @param {THREE.Vector3} position - Center position
   */
  init(position = new this.THREE.Vector3(0, 0, 0)) {
    const { THREE } = this;
    const count = this.particleCount;

    // Create geometry
    const geometry = new THREE.BufferGeometry();

    // Initialize arrays
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.lifetimes = new Float32Array(count);
    this.maxLifetimes = new Float32Array(count);

    // Initialize particles with random positions and velocities
    for (let i = 0; i < count; i++) {
      this.resetParticle(i);
    }

    // Set geometry attributes
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Create shader material for fire effect
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pixelRatio: { value: window.devicePixelRatio }
      },
      vertexShader: this.getVertexShader(),
      fragmentShader: this.getFragmentShader(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true
    });

    // Create points
    this.particles = new THREE.Points(geometry, material);
    this.particles.position.copy(position);
    this.particles.frustumCulled = false;

    this.group.add(this.particles);

    return this.group;
  }

  /**
   * Reset a single particle to initial state
   * @param {number} index - Particle index
   */
  resetParticle(index) {
    const { emission, particle, colors } = this.options;
    const i3 = index * 3;

    // Random angle for circular distribution
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * emission.radius;

    // Position (cylindrical distribution at base)
    this.positions[i3] = Math.cos(angle) * radius;
    this.positions[i3 + 1] = 0; // Start at base
    this.positions[i3 + 2] = Math.sin(angle) * radius;

    // Velocity (upward with some spread)
    const speed = particle.minSpeed + Math.random() * (particle.maxSpeed - particle.minSpeed);
    this.velocities[i3] = (Math.random() - 0.5) * emission.spread;
    this.velocities[i3 + 1] = speed;
    this.velocities[i3 + 2] = (Math.random() - 0.5) * emission.spread;

    // Color (start with core color)
    const coreColor = new this.THREE.Color(colors.core);
    this.colors[i3] = coreColor.r;
    this.colors[i3 + 1] = coreColor.g;
    this.colors[i3 + 2] = coreColor.b;

    // Size
    this.sizes[index] = particle.minSize + Math.random() * (particle.maxSize - particle.minSize);

    // Lifetime
    this.maxLifetimes[index] = particle.minLife + Math.random() * (particle.maxLife - particle.minLife);
    this.lifetimes[index] = Math.random() * this.maxLifetimes[index]; // Stagger start
  }

  /**
   * Update particle system
   * @param {number} deltaTime - Time since last update
   * @param {number} intensity - Burn intensity (0-1)
   */
  update(deltaTime, intensity = 1.0) {
    if (!this.particles) return;

    const { colors, emission } = this.options;
    this.time += deltaTime;

    // Update shader uniform
    this.particles.material.uniforms.time.value = this.time;

    // Color instances for interpolation
    const coreColor = new this.THREE.Color(colors.core);
    const midColor = new this.THREE.Color(colors.mid);
    const outerColor = new this.THREE.Color(colors.outer);
    const smokeColor = new this.THREE.Color(colors.smoke);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      // Update lifetime
      this.lifetimes[i] += deltaTime;
      const lifeRatio = this.lifetimes[i] / this.maxLifetimes[i];

      // Reset if dead
      if (lifeRatio >= 1.0) {
        this.resetParticle(i);
        continue;
      }

      // Update position
      this.positions[i3] += this.velocities[i3] * deltaTime * intensity;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime * intensity;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * deltaTime * intensity;

      // Add turbulence
      const turbulence = 0.1 * intensity;
      this.positions[i3] += (Math.random() - 0.5) * turbulence;
      this.positions[i3 + 2] += (Math.random() - 0.5) * turbulence;

      // Update color based on lifetime (core -> mid -> outer -> smoke)
      let color;
      if (lifeRatio < 0.2) {
        color = coreColor.clone().lerp(midColor, lifeRatio / 0.2);
      } else if (lifeRatio < 0.5) {
        color = midColor.clone().lerp(outerColor, (lifeRatio - 0.2) / 0.3);
      } else {
        color = outerColor.clone().lerp(smokeColor, (lifeRatio - 0.5) / 0.5);
      }

      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;

      // Update size (shrink as particle ages)
      const baseSizeRatio = 1.0 - (lifeRatio * 0.5);
      this.sizes[i] = this.options.particle.maxSize * baseSizeRatio * intensity;
    }

    // Update geometry attributes
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
    this.particles.geometry.attributes.size.needsUpdate = true;
  }

  /**
   * Set intensity of fire effect
   * @param {number} intensity - 0 to 1
   */
  setIntensity(intensity) {
    if (this.particles) {
      this.particles.material.opacity = intensity;
    }
  }

  /**
   * Get vertex shader code
   * @returns {string}
   */
  getVertexShader() {
    return `
      attribute float size;
      varying vec3 vColor;
      uniform float pixelRatio;

      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
  }

  /**
   * Get fragment shader code
   * @returns {string}
   */
  getFragmentShader() {
    return `
      varying vec3 vColor;

      void main() {
        // Soft circular particle
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);

        // Soft edge with glow
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        alpha = pow(alpha, 1.5);

        // Inner glow
        float glow = 1.0 - smoothstep(0.0, 0.3, dist);
        vec3 color = mix(vColor, vec3(1.0), glow * 0.3);

        gl_FragColor = vec4(color, alpha);
      }
    `;
  }

  /**
   * Get the particle group
   * @returns {THREE.Group}
   */
  getGroup() {
    return this.group;
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    if (this.particles) {
      this.particles.geometry.dispose();
      this.particles.material.dispose();
      this.group.remove(this.particles);
    }

    this.positions = null;
    this.velocities = null;
    this.colors = null;
    this.sizes = null;
    this.lifetimes = null;
    this.maxLifetimes = null;
    this.particles = null;
  }
}

// ============================================
// EXPORTS
// ============================================

export { FireParticles, FIRE_CONFIG };
export default FireParticles;
