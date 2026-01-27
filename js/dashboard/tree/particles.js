/**
 * Yggdrasil Builder's Cosmos - Particle Systems
 * Fire particles around tree + Snowstorm ambient
 */

'use strict';

import * as THREE from 'three';
import { CONFIG } from '../config.js';

/**
 * Fire Particle System
 * Creates rising fire particles around the tree
 */
export const FireParticles = {
  particles: null,
  positions: null,
  velocities: null,
  lifetimes: null,
  colors: null,
  geometry: null,
  material: null,

  init(scene) {
    const { fire } = CONFIG;

    // Initialize arrays
    const count = fire.count;
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.lifetimes = new Float32Array(count);
    this.colors = new Float32Array(count * 3);

    // Initialize particles
    for (let i = 0; i < count; i++) {
      this.resetParticle(i);
    }

    // Create geometry
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    // Create material
    this.material = new THREE.PointsMaterial({
      size: fire.size,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Create points
    this.particles = new THREE.Points(this.geometry, this.material);
    scene.add(this.particles);
  },

  resetParticle(i) {
    const { fire, tree } = CONFIG;
    const i3 = i * 3;

    // Position: around the trunk
    const angle = Math.random() * Math.PI * 2;
    const radius = tree.trunk.radiusBottom + Math.random() * fire.spread;
    const height = Math.random() * tree.trunk.height * 0.8;

    this.positions[i3] = Math.cos(angle) * radius;
    this.positions[i3 + 1] = height;
    this.positions[i3 + 2] = Math.sin(angle) * radius;

    // Velocity: upward with slight outward drift
    this.velocities[i3] = (Math.random() - 0.5) * 0.5;
    this.velocities[i3 + 1] = fire.speed * (0.5 + Math.random() * 0.5);
    this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;

    // Lifetime
    this.lifetimes[i] = fire.lifetime * (0.5 + Math.random() * 0.5);

    // Color: pick from fire colors
    const colorIndex = Math.floor(Math.random() * fire.colors.length);
    const color = new THREE.Color(fire.colors[colorIndex]);
    this.colors[i3] = color.r;
    this.colors[i3 + 1] = color.g;
    this.colors[i3 + 2] = color.b;
  },

  update(delta) {
    const { fire, tree } = CONFIG;
    const count = fire.count;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Update lifetime
      this.lifetimes[i] -= delta;

      if (this.lifetimes[i] <= 0) {
        this.resetParticle(i);
        continue;
      }

      // Update position
      this.positions[i3] += this.velocities[i3] * delta;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * delta;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * delta;

      // Fade color based on lifetime
      const lifeFactor = this.lifetimes[i] / fire.lifetime;
      // Particles get darker/redder as they age
      this.colors[i3] *= 0.999;
      this.colors[i3 + 1] *= 0.995;
      this.colors[i3 + 2] *= 0.99;
    }

    // Update buffers
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  },

  dispose() {
    if (this.particles) {
      this.geometry.dispose();
      this.material.dispose();
    }
  },
};

/**
 * Snowstorm Particle System
 * Creates intense Nordic blizzard with multiple layers
 */
export const SnowstormParticles = {
  // Main snow layer
  particles: null,
  positions: null,
  velocities: null,
  geometry: null,
  material: null,
  // Large flakes layer
  largeParticles: null,
  largePositions: null,
  largeVelocities: null,
  largeGeometry: null,
  largeMaterial: null,
  // Animation
  time: 0,
  windPhase: 0,
  gustTimer: 0,
  currentGust: { x: 0, z: 0 },

  init(scene) {
    const { snowstorm } = CONFIG;

    // === MAIN SNOW LAYER ===
    const count = snowstorm.count;
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.resetParticle(i, true);
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.material = new THREE.PointsMaterial({
      size: snowstorm.size,
      color: snowstorm.color,
      transparent: true,
      opacity: snowstorm.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    scene.add(this.particles);

    // === LARGE FLAKES LAYER ===
    if (snowstorm.largeFlakes) {
      const largeCount = snowstorm.largeFlakes.count;
      this.largePositions = new Float32Array(largeCount * 3);
      this.largeVelocities = new Float32Array(largeCount * 3);

      for (let i = 0; i < largeCount; i++) {
        this.resetLargeParticle(i, true);
      }

      this.largeGeometry = new THREE.BufferGeometry();
      this.largeGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(this.largePositions, 3)
      );

      this.largeMaterial = new THREE.PointsMaterial({
        size: snowstorm.largeFlakes.size,
        color: 0xffffff,
        transparent: true,
        opacity: snowstorm.largeFlakes.opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      this.largeParticles = new THREE.Points(this.largeGeometry, this.largeMaterial);
      scene.add(this.largeParticles);
    }
  },

  resetParticle(i, randomY = false) {
    const { snowstorm } = CONFIG;
    const i3 = i * 3;
    const spread = snowstorm.spread;

    this.positions[i3] = (Math.random() - 0.5) * spread;
    this.positions[i3 + 1] = randomY
      ? Math.random() * spread * 0.6
      : spread * 0.3 + Math.random() * 10;
    this.positions[i3 + 2] = (Math.random() - 0.5) * spread;

    // Base velocity with variation
    this.velocities[i3] = (Math.random() - 0.5) * snowstorm.windSpeed * 0.5;
    this.velocities[i3 + 1] = -snowstorm.speed * (0.3 + Math.random() * 0.7);
    this.velocities[i3 + 2] = (Math.random() - 0.5) * snowstorm.windSpeed * 0.5;
  },

  resetLargeParticle(i, randomY = false) {
    const { snowstorm } = CONFIG;
    const i3 = i * 3;
    const spread = snowstorm.spread * 0.8;

    this.largePositions[i3] = (Math.random() - 0.5) * spread;
    this.largePositions[i3 + 1] = randomY
      ? Math.random() * spread * 0.4
      : spread * 0.2 + Math.random() * 8;
    this.largePositions[i3 + 2] = (Math.random() - 0.5) * spread;

    this.largeVelocities[i3] = (Math.random() - 0.5) * snowstorm.windSpeed * 0.3;
    this.largeVelocities[i3 + 1] = -snowstorm.largeFlakes.speed * (0.5 + Math.random() * 0.5);
    this.largeVelocities[i3 + 2] = (Math.random() - 0.5) * snowstorm.windSpeed * 0.3;
  },

  update(delta) {
    const { snowstorm } = CONFIG;
    const count = snowstorm.count;

    this.time += delta;
    this.windPhase += delta * 0.7;
    this.gustTimer += delta;

    // Random gusts
    if (this.gustTimer > 2 + Math.random() * 3) {
      this.gustTimer = 0;
      this.currentGust = {
        x: (Math.random() - 0.5) * snowstorm.windSpeed * 2,
        z: (Math.random() - 0.5) * snowstorm.windSpeed * 2,
      };
    }

    // Smooth wind variation with gusts
    const windVariation = snowstorm.windVariation || 1;
    const windX =
      Math.sin(this.windPhase) * snowstorm.windSpeed * windVariation +
      Math.sin(this.windPhase * 2.3) * snowstorm.windSpeed * 0.3 +
      this.currentGust.x * Math.exp(-this.gustTimer * 0.5);
    const windZ =
      Math.cos(this.windPhase * 0.7) * snowstorm.windSpeed * windVariation +
      Math.cos(this.windPhase * 1.7) * snowstorm.windSpeed * 0.3 +
      this.currentGust.z * Math.exp(-this.gustTimer * 0.5);

    // === UPDATE MAIN SNOW ===
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      this.positions[i3] += (this.velocities[i3] + windX) * delta;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * delta;
      this.positions[i3 + 2] += (this.velocities[i3 + 2] + windZ) * delta;

      if (this.positions[i3 + 1] < -5) {
        this.resetParticle(i);
      }

      // Wrap around
      const halfSpread = snowstorm.spread / 2;
      if (this.positions[i3] > halfSpread) this.positions[i3] -= snowstorm.spread;
      if (this.positions[i3] < -halfSpread) this.positions[i3] += snowstorm.spread;
      if (this.positions[i3 + 2] > halfSpread) this.positions[i3 + 2] -= snowstorm.spread;
      if (this.positions[i3 + 2] < -halfSpread) this.positions[i3 + 2] += snowstorm.spread;
    }

    this.geometry.attributes.position.needsUpdate = true;

    // === UPDATE LARGE FLAKES ===
    if (this.largeParticles && snowstorm.largeFlakes) {
      const largeCount = snowstorm.largeFlakes.count;
      // Large flakes affected less by wind, more floaty
      const largeWindX = windX * 0.4;
      const largeWindZ = windZ * 0.4;

      for (let i = 0; i < largeCount; i++) {
        const i3 = i * 3;

        // Add slight wobble for floaty effect
        const wobble = Math.sin(this.time * 2 + i) * 0.3;

        this.largePositions[i3] += (this.largeVelocities[i3] + largeWindX + wobble) * delta;
        this.largePositions[i3 + 1] += this.largeVelocities[i3 + 1] * delta;
        this.largePositions[i3 + 2] += (this.largeVelocities[i3 + 2] + largeWindZ) * delta;

        if (this.largePositions[i3 + 1] < -3) {
          this.resetLargeParticle(i);
        }

        const halfSpread = snowstorm.spread * 0.4;
        if (this.largePositions[i3] > halfSpread) {
          this.largePositions[i3] -= halfSpread * 2;
        }
        if (this.largePositions[i3] < -halfSpread) {
          this.largePositions[i3] += halfSpread * 2;
        }
        if (this.largePositions[i3 + 2] > halfSpread) {
          this.largePositions[i3 + 2] -= halfSpread * 2;
        }
        if (this.largePositions[i3 + 2] < -halfSpread) {
          this.largePositions[i3 + 2] += halfSpread * 2;
        }
      }

      this.largeGeometry.attributes.position.needsUpdate = true;
    }
  },

  dispose() {
    if (this.particles) {
      this.geometry.dispose();
      this.material.dispose();
    }
    if (this.largeParticles) {
      this.largeGeometry.dispose();
      this.largeMaterial.dispose();
    }
  },
};

/**
 * Ember Particles System
 * Rising embers from the Burn Core - the heart of Yggdrasil
 */
export const EmberParticles = {
  particles: null,
  positions: null,
  velocities: null,
  lifetimes: null,
  colors: null,
  sizes: null,
  geometry: null,
  material: null,
  corePosition: null,
  time: 0,

  init(scene, corePosition) {
    const { burnCore } = CONFIG;
    const embers = burnCore.embers;

    this.corePosition = corePosition || burnCore.position;
    const count = embers.count;

    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.lifetimes = new Float32Array(count);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);

    // Initialize all particles
    for (let i = 0; i < count; i++) {
      this.resetParticle(i);
    }

    // Create geometry with size attribute
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Custom shader material for varying sizes
    this.material = new THREE.PointsMaterial({
      size: embers.size,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    scene.add(this.particles);
  },

  resetParticle(i) {
    const { burnCore } = CONFIG;
    const embers = burnCore.embers;
    const i3 = i * 3;

    // Start position: within the core with some randomness
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * embers.spread;
    const heightOffset = (Math.random() - 0.5) * burnCore.radius;

    this.positions[i3] = this.corePosition.x + Math.cos(angle) * radius;
    this.positions[i3 + 1] = this.corePosition.y + heightOffset;
    this.positions[i3 + 2] = this.corePosition.z + Math.sin(angle) * radius;

    // Velocity: spiral upward
    const spiralSpeed = 0.5 + Math.random() * 0.5;
    this.velocities[i3] = Math.cos(angle + Math.PI / 2) * spiralSpeed;
    this.velocities[i3 + 1] = embers.speed * (0.5 + Math.random() * 0.5);
    this.velocities[i3 + 2] = Math.sin(angle + Math.PI / 2) * spiralSpeed;

    // Lifetime
    this.lifetimes[i] = embers.lifetime * (0.5 + Math.random() * 0.5);

    // Color: hot colors
    const colorIndex = Math.floor(Math.random() * embers.colors.length);
    const color = new THREE.Color(embers.colors[colorIndex]);
    this.colors[i3] = color.r;
    this.colors[i3 + 1] = color.g;
    this.colors[i3 + 2] = color.b;

    // Size variation
    this.sizes[i] = embers.size * (0.5 + Math.random());
  },

  update(delta) {
    const { burnCore } = CONFIG;
    const embers = burnCore.embers;
    const count = embers.count;

    this.time += delta;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Update lifetime
      this.lifetimes[i] -= delta;

      if (this.lifetimes[i] <= 0) {
        this.resetParticle(i);
        continue;
      }

      // Spiral motion with acceleration upward
      const angle = Math.atan2(
        this.positions[i3 + 2] - this.corePosition.z,
        this.positions[i3] - this.corePosition.x
      );

      // Add spiral drift
      this.velocities[i3] += Math.cos(angle + Math.PI / 2) * delta * 0.5;
      this.velocities[i3 + 2] += Math.sin(angle + Math.PI / 2) * delta * 0.5;

      // Decelerate horizontal, maintain vertical
      this.velocities[i3] *= 0.99;
      this.velocities[i3 + 2] *= 0.99;

      // Update position
      this.positions[i3] += this.velocities[i3] * delta;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * delta;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * delta;

      // Fade out: darken colors as they age
      const lifeFactor = this.lifetimes[i] / embers.lifetime;
      const fadeRate = 0.99 + lifeFactor * 0.01;

      this.colors[i3] *= fadeRate;
      this.colors[i3 + 1] *= fadeRate * 0.98;
      this.colors[i3 + 2] *= fadeRate * 0.95;

      // Shrink as they age
      this.sizes[i] = embers.size * lifeFactor * (0.5 + Math.random() * 0.5);
    }

    // Update buffers
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  },

  dispose() {
    if (this.particles) {
      this.geometry.dispose();
      this.material.dispose();
    }
  },
};

/**
 * Connection Particles
 * Particles flowing from islands to burn core
 */
export const ConnectionParticles = {
  systems: new Map(),

  createConnection(scene, fromPosition, toPosition, color) {
    const count = 50;

    const positions = new Float32Array(count * 3);
    const progress = new Float32Array(count);

    // Initialize along the path
    for (let i = 0; i < count; i++) {
      progress[i] = Math.random();
      this.updateParticlePosition(positions, i, fromPosition, toPosition, progress[i]);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      color: color,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const id = Math.random().toString(36).substr(2, 9);
    this.systems.set(id, {
      particles,
      geometry,
      material,
      positions,
      progress,
      from: fromPosition,
      to: toPosition,
      count,
    });

    return id;
  },

  updateParticlePosition(positions, i, from, to, t) {
    const i3 = i * 3;
    // Curved path with some randomness
    const curve = Math.sin(t * Math.PI) * 2;

    positions[i3] = from.x + (to.x - from.x) * t + (Math.random() - 0.5) * 0.5;
    positions[i3 + 1] = from.y + (to.y - from.y) * t + curve;
    positions[i3 + 2] = from.z + (to.z - from.z) * t + (Math.random() - 0.5) * 0.5;
  },

  update(delta) {
    for (const [id, system] of this.systems) {
      const { positions, progress, from, to, count, geometry } = system;
      const speed = 0.3;

      for (let i = 0; i < count; i++) {
        progress[i] += delta * speed;
        if (progress[i] > 1) progress[i] = 0;
        this.updateParticlePosition(positions, i, from, to, progress[i]);
      }

      geometry.attributes.position.needsUpdate = true;
    }
  },

  removeConnection(id) {
    const system = this.systems.get(id);
    if (system) {
      system.geometry.dispose();
      system.material.dispose();
      if (system.particles.parent) {
        system.particles.parent.remove(system.particles);
      }
      this.systems.delete(id);
    }
  },

  dispose() {
    for (const [id] of this.systems) {
      this.removeConnection(id);
    }
  },
};

export default { FireParticles, SnowstormParticles, EmberParticles, ConnectionParticles };
