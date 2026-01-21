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
      depthWrite: false
    });

    // Create points
    this.particles = new THREE.Points(this.geometry, this.material);
    scene.add(this.particles);

    console.log('[FireParticles] Initialized with', count, 'particles');
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
  }
};

/**
 * Snowstorm Particle System
 * Creates ambient snow/ice particles falling and drifting
 */
export const SnowstormParticles = {
  particles: null,
  positions: null,
  velocities: null,
  geometry: null,
  material: null,
  time: 0,

  init(scene) {
    const { snowstorm } = CONFIG;

    const count = snowstorm.count;
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);

    // Initialize particles spread across the scene
    for (let i = 0; i < count; i++) {
      this.resetParticle(i, true);
    }

    // Create geometry
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    // Create material
    this.material = new THREE.PointsMaterial({
      size: snowstorm.size,
      color: snowstorm.color,
      transparent: true,
      opacity: snowstorm.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // Create points
    this.particles = new THREE.Points(this.geometry, this.material);
    scene.add(this.particles);

    console.log('[SnowstormParticles] Initialized with', count, 'particles');
  },

  resetParticle(i, randomY = false) {
    const { snowstorm } = CONFIG;
    const i3 = i * 3;
    const spread = snowstorm.spread;

    // Position: random within cube, reset at top
    this.positions[i3] = (Math.random() - 0.5) * spread;
    this.positions[i3 + 1] = randomY
      ? Math.random() * spread * 0.5
      : spread * 0.25 + Math.random() * 5;
    this.positions[i3 + 2] = (Math.random() - 0.5) * spread;

    // Velocity: falling with wind
    this.velocities[i3] = (Math.random() - 0.5) * snowstorm.windSpeed;
    this.velocities[i3 + 1] = -snowstorm.speed * (0.5 + Math.random() * 0.5);
    this.velocities[i3 + 2] = (Math.random() - 0.5) * snowstorm.windSpeed;
  },

  update(delta) {
    const { snowstorm } = CONFIG;
    const count = snowstorm.count;

    this.time += delta;

    // Wind variation
    const windX = Math.sin(this.time * 0.5) * snowstorm.windSpeed * 0.5;
    const windZ = Math.cos(this.time * 0.3) * snowstorm.windSpeed * 0.5;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Update position with wind influence
      this.positions[i3] += (this.velocities[i3] + windX) * delta;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * delta;
      this.positions[i3 + 2] += (this.velocities[i3 + 2] + windZ) * delta;

      // Reset if below ground
      if (this.positions[i3 + 1] < -5) {
        this.resetParticle(i);
      }

      // Wrap around horizontally
      const halfSpread = snowstorm.spread / 2;
      if (this.positions[i3] > halfSpread) this.positions[i3] -= snowstorm.spread;
      if (this.positions[i3] < -halfSpread) this.positions[i3] += snowstorm.spread;
      if (this.positions[i3 + 2] > halfSpread) this.positions[i3 + 2] -= snowstorm.spread;
      if (this.positions[i3 + 2] < -halfSpread) this.positions[i3 + 2] += snowstorm.spread;
    }

    // Update buffer
    this.geometry.attributes.position.needsUpdate = true;
  },

  dispose() {
    if (this.particles) {
      this.geometry.dispose();
      this.material.dispose();
    }
  }
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
      depthWrite: false
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
      count
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
  }
};

export default { FireParticles, SnowstormParticles, ConnectionParticles };
