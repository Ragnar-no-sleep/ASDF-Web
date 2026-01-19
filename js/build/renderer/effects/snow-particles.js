/**
 * Build V2 - Snow/Ice Particles Effect
 * GPU-efficient snowstorm particle system for Yggdrasil atmosphere
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// SNOW PARTICLE CONFIGURATION
// ============================================

const SNOW_CONFIG = {
  // Particle counts by performance tier
  counts: {
    desktop: 10000,
    mobile: 2500
  },
  // Particle behavior
  particle: {
    minSize: 0.05,
    maxSize: 0.2,
    minSpeed: 0.3,
    maxSpeed: 1.0,
    drift: 0.5,       // Horizontal drift
    turbulence: 0.2   // Wind turbulence
  },
  // Spawn area
  area: {
    width: 100,
    height: 80,
    depth: 100
  },
  // Colors
  colors: {
    snow: 0xe8f4ff,    // Light blue-white
    ice: 0xb0e0ff,     // Ice blue
    frost: 0x88ccff    // Frost highlight
  },
  // Wind
  wind: {
    baseX: -0.3,
    baseZ: 0.1,
    gustStrength: 0.5,
    gustFrequency: 0.1
  }
};

// ============================================
// SNOW PARTICLE SYSTEM
// ============================================

class SnowParticles {
  /**
   * Create snow particle system
   * @param {Object} THREE - Three.js library reference
   * @param {Object} options - Configuration options
   */
  constructor(THREE, options = {}) {
    this.THREE = THREE;
    this.options = { ...SNOW_CONFIG, ...options };

    // Particle state
    this.particles = null;
    this.positions = null;
    this.velocities = null;
    this.sizes = null;
    this.alphas = null;

    // Performance
    this.particleCount = this.getParticleCount();
    this.time = 0;

    // Group to hold particles
    this.group = new THREE.Group();
    this.group.name = 'SnowParticles';
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
   */
  init() {
    const { THREE } = this;
    const count = this.particleCount;
    const { area, particle, colors } = this.options;

    // Create geometry
    const geometry = new THREE.BufferGeometry();

    // Initialize arrays
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.alphas = new Float32Array(count);

    // Color array (pre-computed)
    const colorArray = new Float32Array(count * 3);
    const snowColor = new THREE.Color(colors.snow);
    const iceColor = new THREE.Color(colors.ice);
    const frostColor = new THREE.Color(colors.frost);

    // Initialize particles
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Random position in spawn volume
      this.positions[i3] = (Math.random() - 0.5) * area.width;
      this.positions[i3 + 1] = Math.random() * area.height;
      this.positions[i3 + 2] = (Math.random() - 0.5) * area.depth;

      // Falling velocity with slight variation
      const speed = particle.minSpeed + Math.random() * (particle.maxSpeed - particle.minSpeed);
      this.velocities[i3] = (Math.random() - 0.5) * particle.drift;
      this.velocities[i3 + 1] = -speed;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * particle.drift;

      // Random size
      this.sizes[i] = particle.minSize + Math.random() * (particle.maxSize - particle.minSize);

      // Random alpha
      this.alphas[i] = 0.3 + Math.random() * 0.7;

      // Random color between snow, ice, and frost
      const colorChoice = Math.random();
      let color;
      if (colorChoice < 0.7) {
        color = snowColor;
      } else if (colorChoice < 0.9) {
        color = iceColor;
      } else {
        color = frostColor;
      }
      colorArray[i3] = color.r;
      colorArray[i3 + 1] = color.g;
      colorArray[i3 + 2] = color.b;
    }

    // Set geometry attributes
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));

    // Create shader material
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
    this.particles.frustumCulled = false;

    this.group.add(this.particles);

    return this.group;
  }

  /**
   * Update particle system
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (!this.particles) return;

    const { area, particle, wind } = this.options;
    this.time += deltaTime;

    // Update shader time
    this.particles.material.uniforms.time.value = this.time;

    // Wind gust calculation
    const gustX = Math.sin(this.time * wind.gustFrequency) * wind.gustStrength;
    const gustZ = Math.cos(this.time * wind.gustFrequency * 0.7) * wind.gustStrength * 0.5;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      // Update position with velocity
      this.positions[i3] += (this.velocities[i3] + wind.baseX + gustX) * deltaTime;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime;
      this.positions[i3 + 2] += (this.velocities[i3 + 2] + wind.baseZ + gustZ) * deltaTime;

      // Add turbulence
      this.positions[i3] += (Math.random() - 0.5) * particle.turbulence * deltaTime;
      this.positions[i3 + 2] += (Math.random() - 0.5) * particle.turbulence * deltaTime;

      // Wrap around when particle goes below or outside
      if (this.positions[i3 + 1] < -5) {
        this.positions[i3 + 1] = area.height;
        this.positions[i3] = (Math.random() - 0.5) * area.width;
        this.positions[i3 + 2] = (Math.random() - 0.5) * area.depth;
      }

      // Wrap horizontal bounds
      if (Math.abs(this.positions[i3]) > area.width / 2) {
        this.positions[i3] = -Math.sign(this.positions[i3]) * area.width / 2;
      }
      if (Math.abs(this.positions[i3 + 2]) > area.depth / 2) {
        this.positions[i3 + 2] = -Math.sign(this.positions[i3 + 2]) * area.depth / 2;
      }
    }

    // Update geometry
    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Set visibility of snow
   * @param {boolean} visible
   */
  setVisible(visible) {
    this.group.visible = visible;
  }

  /**
   * Set intensity of snowstorm
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
      attribute float alpha;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float time;
      uniform float pixelRatio;

      void main() {
        vColor = color;
        vAlpha = alpha;

        // Add subtle flutter
        vec3 pos = position;
        pos.x += sin(time * 2.0 + position.y * 0.5) * 0.1;
        pos.z += cos(time * 1.5 + position.y * 0.3) * 0.1;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * pixelRatio * (200.0 / -mvPosition.z);
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
      varying float vAlpha;

      void main() {
        // Soft circular snowflake
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);

        // Soft edge
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        alpha *= vAlpha;

        // Slight sparkle
        float sparkle = max(0.0, 1.0 - dist * 3.0) * 0.5;
        vec3 color = vColor + vec3(sparkle);

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
    this.sizes = null;
    this.alphas = null;
    this.particles = null;
  }
}

// ============================================
// EXPORTS
// ============================================

export { SnowParticles, SNOW_CONFIG };
export default SnowParticles;
