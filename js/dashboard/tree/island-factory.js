/**
 * IslandFactory - Creates floating stone islands
 * Extracted from Yggdrasil God Object for SRP compliance
 */

'use strict';

import * as THREE from 'three';
import { CONFIG, GOLDEN_ANGLE, ECOSYSTEM_PROJECTS } from '../config.js';
import { ConnectionParticles } from './particles.js';

/**
 * Island Factory - Pure creation logic
 * Single Responsibility: Create island meshes and hitboxes
 */
export const IslandFactory = {
  /**
   * Build all islands from ecosystem projects
   * Phi-harmonic distribution along branches by track
   *
   * @param {THREE.Scene} scene - Scene to add hitboxes to
   * @param {THREE.Group} islandsGroup - Group to add islands to
   * @returns {Object} { islands: Map, hitboxes: Array }
   */
  buildAll(scene, islandsGroup) {
    const islands = new Map();
    const hitboxes = [];
    const { islands: islandConfig } = CONFIG;
    const PHI_INV = 0.618033988749895;

    // Group projects by track
    const tracks = { dev: [], games: [], content: [] };
    ECOSYSTEM_PROJECTS.forEach(p => {
      if (tracks[p.track]) tracks[p.track].push(p);
    });

    // Track configurations
    const trackConfig = {
      dev: {
        baseAngle: -Math.PI / 6,
        spread: Math.PI * 0.55,
        radiusMin: 10,
        radiusMax: 22,
        heightMin: 7,
        heightMax: 15,
      },
      games: {
        baseAngle: (Math.PI * 2) / 3,
        spread: Math.PI * 0.4,
        radiusMin: 11,
        radiusMax: 18,
        heightMin: 5,
        heightMax: 13,
      },
      content: {
        baseAngle: (Math.PI * 4) / 3,
        spread: Math.PI * 0.45,
        radiusMin: 10,
        radiusMax: 20,
        heightMin: 6,
        heightMax: 14,
      },
    };

    // Process each track
    Object.entries(tracks).forEach(([trackId, projects]) => {
      const cfg = trackConfig[trackId];
      const n = projects.length;

      projects.forEach((project, i) => {
        const position = this._calculatePosition(i, n, cfg, PHI_INV);
        const size = this._calculateSize(project, islandConfig);
        const trackColor = islandConfig.trackColors[project.track] || 0x888888;

        const { island, hitbox } = this._createIsland(
          scene,
          project,
          position,
          size,
          trackColor,
          islandConfig
        );

        islandsGroup.add(island);
        hitboxes.push(hitbox);
        islands.set(project.id, {
          mesh: island,
          project: project,
          position: position,
          baseY: position.y,
          hitbox: hitbox,
        });
      });
    });

    return { islands, hitboxes };
  },

  /**
   * Calculate island position using phi-spiral distribution
   */
  _calculatePosition(index, total, cfg, PHI_INV) {
    const t = total > 1 ? index / (total - 1) : 0.5;

    // Spiral angle with golden offset
    const goldenOffset = (index * GOLDEN_ANGLE * 0.1) % 0.3;
    const angle = cfg.baseAngle + (t - 0.5) * cfg.spread + goldenOffset;

    // Radius with layer offset
    const layerOffset = (index % 2) * 2 - 1;
    const baseRadius = cfg.radiusMin + t * (cfg.radiusMax - cfg.radiusMin);
    const radius = baseRadius + layerOffset * 1.5;

    // Height with phi-wave modulation
    const phiWave = Math.sin(t * Math.PI * 2 * PHI_INV) * 0.3;
    const height = cfg.heightMin + (t + phiWave) * (cfg.heightMax - cfg.heightMin);

    return new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.max(cfg.heightMin, Math.min(cfg.heightMax, height)),
      Math.sin(angle) * radius
    );
  },

  /**
   * Calculate island size based on kScore
   */
  _calculateSize(project, islandConfig) {
    const kScoreNorm = project.kScore / 100;
    const sizeScale = 0.4 + kScoreNorm * 0.6;
    return islandConfig.size.min + sizeScale * (islandConfig.size.max - islandConfig.size.min);
  },

  /**
   * Create a single floating island with hitbox
   */
  _createIsland(scene, project, position, size, trackColor, _islandConfig) {
    const island = new THREE.Group();

    // === MAIN ROCK ===
    const rockGeometry = new THREE.IcosahedronGeometry(size, 2);
    const positionAttr = rockGeometry.attributes.position;
    for (let i = 0; i < positionAttr.count; i++) {
      const x = positionAttr.getX(i);
      const y = positionAttr.getY(i);
      const z = positionAttr.getZ(i);
      const bottomFactor = y < 0 ? 1.3 : 1.0;
      const noise = 0.85 + Math.random() * 0.3;
      positionAttr.setXYZ(i, x * noise, y * noise * bottomFactor, z * noise);
    }
    rockGeometry.computeVertexNormals();

    const rockMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a35,
      roughness: 0.85,
      metalness: 0.1,
      emissive: trackColor,
      emissiveIntensity: project.status === 'live' ? 0.2 : 0.08,
    });

    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    island.add(rock);

    // === AURA ===
    const auraGeometry = new THREE.SphereGeometry(size * 1.4, 16, 16);
    const auraMaterial = new THREE.MeshBasicMaterial({
      color: trackColor,
      transparent: true,
      opacity: project.status === 'live' ? 0.12 : 0.05,
      side: THREE.BackSide,
    });
    const aura = new THREE.Mesh(auraGeometry, auraMaterial);
    island.add(aura);

    // === RUNE RING ===
    const ringGeometry = new THREE.TorusGeometry(size * 1.1, 0.05, 8, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: trackColor,
      transparent: true,
      opacity: project.status === 'live' ? 0.6 : 0.25,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = size * 0.3;
    island.add(ring);

    // === ORBITING PARTICLES ===
    const particleCount = 8;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const pAngle = (i / particleCount) * Math.PI * 2;
      const pRadius = size * 1.3;
      particlePos[i * 3] = Math.cos(pAngle) * pRadius;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * size;
      particlePos[i * 3 + 2] = Math.sin(pAngle) * pRadius;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: trackColor,
      size: 0.12,
      transparent: true,
      opacity: 0.7,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    island.add(particles);

    // Position
    island.position.copy(position);

    // Metadata
    island.userData = {
      type: 'island',
      project: project,
      originalEmissive: project.status === 'live' ? 0.2 : 0.08,
      rockMaterial: rockMaterial,
      auraMaterial: auraMaterial,
      ringMaterial: ringMaterial,
      particles: particles,
      building: project.status === 'building',
    };

    // === HITBOX ===
    const hitboxGeometry = new THREE.SphereGeometry(size * 1.5, 8, 6);
    const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    hitbox.position.copy(position);
    hitbox.userData = {
      type: 'islandHitbox',
      island: island,
      project: project,
    };
    scene.add(hitbox);

    // Connection particles to burn core
    ConnectionParticles.createConnection(scene, position, CONFIG.burnCore.position, trackColor);

    return { island, hitbox };
  },

  /**
   * Dispose island resources
   */
  disposeIsland(islandData) {
    const { mesh, hitbox } = islandData;

    // Dispose hitbox
    if (hitbox) {
      hitbox.geometry.dispose();
      hitbox.material.dispose();
    }

    // Dispose island meshes
    mesh.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  },

  /**
   * Dispose all islands
   */
  disposeAll(islands, hitboxes, scene) {
    // Remove hitboxes from scene
    hitboxes.forEach(hitbox => {
      hitbox.geometry.dispose();
      hitbox.material.dispose();
      scene.remove(hitbox);
    });

    // Dispose island data
    islands.forEach(data => {
      this.disposeIsland(data);
    });

    islands.clear();
  },
};

export default IslandFactory;
