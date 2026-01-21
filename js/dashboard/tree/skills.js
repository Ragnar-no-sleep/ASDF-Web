/**
 * Yggdrasil Builder's Cosmos - Skill Nodes
 * Cyberpunk holographic skill visualization
 * Apple-clean aesthetic with ice/neon contrast
 */

'use strict';

import * as THREE from 'three';
import { SKILLS, GOLDEN_ANGLE, PHI } from '../config.js';

/**
 * Cyberpunk color palette - ice/neon for contrast
 */
const CYBER_COLORS = {
  // Core colors - ice white/cyan for visibility
  core: 0x00ffff,      // Cyan
  glow: 0x88ffff,      // Light cyan
  ring: 0x00ddff,      // Electric blue

  // Accent by difficulty
  easy: 0x00ff88,      // Mint green
  medium: 0x00ccff,    // Sky blue
  hard: 0xff00ff,      // Magenta

  // Connection
  line: 0x4488aa,
  lineActive: 0x00ffff
};

/**
 * Skill Nodes System - Holographic Cyberpunk Style
 */
export const SkillNodes = {
  group: null,
  nodes: new Map(),
  connections: [],
  rings: [],
  scene: null,
  isVisible: false,
  currentProject: null,
  centerPosition: null,

  // Animation state
  animating: false,
  animationProgress: 0,
  showAnimation: true,
  time: 0,

  // Hover state
  hoveredNode: null,
  raycaster: null,
  mouse: null,

  // Callbacks
  callbacks: {
    onSkillHover: null,
    onSkillClick: null
  },

  /**
   * Initialize
   */
  init(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    console.log('[SkillNodes] Initialized - Cyberpunk mode');
    return this;
  },

  /**
   * Show skills for a project
   */
  showForProject(project, position) {
    if (!project?.skills?.length) return;

    this.currentProject = project;
    this.centerPosition = position.clone ? position.clone() : new THREE.Vector3(position.x, position.y, position.z);

    // Clear existing
    this.clear();

    // Create skill nodes in orbital pattern
    this.createSkillNodes(project);

    // Create orbital ring
    this.createOrbitalRing();

    // Create connections
    this.createConnections();

    // Show with animation
    this.group.visible = true;
    this.isVisible = true;
    this.animating = true;
    this.animationProgress = 0;
    this.showAnimation = true;

    console.log('[SkillNodes] Showing', project.skills.length, 'skills for', project.name);
  },

  /**
   * Create skill nodes - holographic gems
   */
  createSkillNodes(project) {
    const skills = project.skills;
    const orbitRadius = 4.5; // Larger orbit for visibility
    const verticalSpread = 1.5;

    skills.forEach((skillId, index) => {
      const skill = SKILLS[skillId];
      if (!skill) return;

      // Circular orbit with slight vertical wave
      const angle = (index / skills.length) * Math.PI * 2;
      const height = Math.sin(angle * 2) * verticalSpread * 0.3;

      const localPos = new THREE.Vector3(
        Math.cos(angle) * orbitRadius,
        height + 1, // Slightly above island center
        Math.sin(angle) * orbitRadius
      );

      // World position
      const worldPos = localPos.clone().add(this.centerPosition);

      // Create holographic node
      const node = this.createHolographicNode(skill, index);
      node.position.copy(worldPos);
      node.userData = {
        type: 'skill',
        skill: skill,
        skillId: skillId,
        localPosition: localPos,
        targetScale: 1,
        index: index,
        baseY: worldPos.y
      };

      // Start scaled down
      node.scale.setScalar(0.01);

      this.group.add(node);
      this.nodes.set(skillId, {
        mesh: node,
        skill: skill,
        localPos: localPos,
        worldPos: worldPos,
        index: index,
        angle: angle
      });
    });
  },

  /**
   * Create a holographic skill node
   */
  createHolographicNode(skill, index) {
    const group = new THREE.Group();

    // Size based on difficulty
    const baseSize = 0.35;
    const size = baseSize + skill.difficulty * 0.08;

    // Get color based on difficulty
    const coreColor = skill.difficulty === 1 ? CYBER_COLORS.easy :
                      skill.difficulty === 2 ? CYBER_COLORS.medium :
                      CYBER_COLORS.hard;

    // === CORE GEM (Icosahedron) ===
    const coreGeo = new THREE.IcosahedronGeometry(size, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x112233,
      emissive: coreColor,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.9
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // === OUTER GLOW SPHERE ===
    const glowGeo = new THREE.SphereGeometry(size * 1.8, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: coreColor,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    // === NEON RING ===
    const ringGeo = new THREE.TorusGeometry(size * 1.4, 0.03, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: coreColor,
      transparent: true,
      opacity: 0.8
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // === ICON LABEL (Always visible) ===
    const label = this.createCleanLabel(skill.icon, skill.name, coreColor);
    label.position.y = size + 0.8;
    group.add(label);

    // Store references for animation
    group.userData.core = core;
    group.userData.glow = glow;
    group.userData.ring = ring;
    group.userData.label = label;
    group.userData.coreColor = coreColor;

    return group;
  },

  /**
   * Create clean Apple-style label
   */
  createCleanLabel(icon, name, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');

    // Clean dark background with subtle border
    ctx.fillStyle = 'rgba(8, 12, 20, 0.9)';
    ctx.strokeStyle = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.5)`;
    ctx.lineWidth = 2;

    // Rounded rect
    const radius = 12;
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 64, radius);
    ctx.fill();
    ctx.stroke();

    // Icon
    ctx.font = '28px serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(icon, 24, 50);

    // Name - clean sans-serif
    ctx.font = '500 16px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name, 60, 48);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.5, 0.8, 1);

    return sprite;
  },

  /**
   * Create orbital ring around the island
   */
  createOrbitalRing() {
    const orbitRadius = 4.5;

    // Main orbit ring
    const ringGeo = new THREE.TorusGeometry(orbitRadius, 0.02, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: CYBER_COLORS.ring,
      transparent: true,
      opacity: 0.3
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(this.centerPosition);
    ring.position.y += 1;
    ring.rotation.x = Math.PI / 2;

    this.group.add(ring);
    this.rings.push(ring);

    // Dotted outer ring
    const points = [];
    const segments = 48;
    for (let i = 0; i < segments; i++) {
      if (i % 3 === 0) { // Skip every 3rd point for dotted effect
        const angle = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(angle) * (orbitRadius + 0.5),
          0,
          Math.sin(angle) * (orbitRadius + 0.5)
        ));
      }
    }

    const dotsGeo = new THREE.BufferGeometry().setFromPoints(points);
    const dotsMat = new THREE.PointsMaterial({
      color: CYBER_COLORS.core,
      size: 0.08,
      transparent: true,
      opacity: 0.5
    });
    const dots = new THREE.Points(dotsGeo, dotsMat);
    dots.position.copy(this.centerPosition);
    dots.position.y += 1;

    this.group.add(dots);
    this.rings.push(dots);
  },

  /**
   * Create connection lines
   */
  createConnections() {
    for (const [skillId, data] of this.nodes) {
      // Create curved connection
      const start = this.centerPosition.clone();
      start.y += 0.5;
      const end = data.worldPos.clone();

      // Control point for curve
      const mid = start.clone().lerp(end, 0.5);
      mid.y += 1;

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(20);

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: CYBER_COLORS.line,
        transparent: true,
        opacity: 0.2
      });

      const line = new THREE.Line(geometry, material);
      line.userData = { skillId: skillId };

      this.group.add(line);
      this.connections.push(line);
    }
  },

  /**
   * Hide skills
   */
  hide() {
    if (!this.isVisible) return;

    this.animating = true;
    this.animationProgress = 0;
    this.showAnimation = false;

    console.log('[SkillNodes] Hiding skills');
  },

  /**
   * Dispose a single object
   */
  disposeObject(obj) {
    if (obj.children) {
      while (obj.children.length > 0) {
        this.disposeObject(obj.children[0]);
        obj.remove(obj.children[0]);
      }
    }

    if (obj.geometry) {
      obj.geometry.dispose();
    }

    if (obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of materials) {
        if (mat.map) mat.map.dispose();
        if (mat.lightMap) mat.lightMap.dispose();
        if (mat.bumpMap) mat.bumpMap.dispose();
        if (mat.normalMap) mat.normalMap.dispose();
        if (mat.specularMap) mat.specularMap.dispose();
        if (mat.envMap) mat.envMap.dispose();
        if (mat.emissiveMap) mat.emissiveMap.dispose();
        mat.dispose();
      }
    }
  },

  /**
   * Clear all nodes
   */
  clear() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.disposeObject(child);
      this.group.remove(child);
    }

    this.nodes.clear();
    this.connections = [];
    this.rings = [];
    this.currentProject = null;
    this.hoveredNode = null;
  },

  /**
   * Update (call each frame)
   */
  update(delta, camera) {
    if (!this.isVisible && !this.animating) return;

    this.time += delta;

    // Handle show/hide animation
    if (this.animating) {
      this.animationProgress += delta * 2.5;

      if (this.showAnimation) {
        // Showing - scale up with stagger
        for (const [skillId, data] of this.nodes) {
          const delay = data.index * 0.08;
          const t = Math.max(0, Math.min(1, this.animationProgress - delay));
          const eased = this.easeOutBack(t);
          data.mesh.scale.setScalar(eased);
        }

        // Fade in rings
        this.rings.forEach((ring, i) => {
          const t = Math.max(0, Math.min(1, this.animationProgress - 0.2));
          if (ring.material) {
            ring.material.opacity = t * (ring.material.userData?.baseOpacity || 0.3);
          }
        });

        // Fade in connections
        this.connections.forEach((line, i) => {
          const delay = i * 0.05;
          const t = Math.max(0, Math.min(1, this.animationProgress - delay));
          line.material.opacity = t * 0.2;
        });

        if (this.animationProgress > 1 + this.nodes.size * 0.08) {
          this.animating = false;
        }
      } else {
        // Hiding
        const t = Math.min(1, this.animationProgress);
        const scale = 1 - this.easeInBack(t);

        for (const [skillId, data] of this.nodes) {
          data.mesh.scale.setScalar(Math.max(0.01, scale));
        }

        this.connections.forEach(line => {
          line.material.opacity = (1 - t) * 0.2;
        });

        this.rings.forEach(ring => {
          if (ring.material) {
            ring.material.opacity = (1 - t) * 0.3;
          }
        });

        if (this.animationProgress >= 1) {
          this.animating = false;
          this.isVisible = false;
          this.group.visible = false;
          this.clear();
        }
      }
    }

    // Animate nodes
    for (const [skillId, data] of this.nodes) {
      const mesh = data.mesh;

      // Gentle rotation
      if (mesh.userData.core) {
        mesh.userData.core.rotation.y += delta * 0.3;
        mesh.userData.core.rotation.x = Math.sin(this.time + data.index) * 0.1;
      }

      // Ring rotation
      if (mesh.userData.ring) {
        mesh.userData.ring.rotation.z += delta * 0.5;
      }

      // Floating motion
      const floatOffset = Math.sin(this.time * 1.5 + data.index * 0.5) * 0.15;
      mesh.position.y = mesh.userData.baseY + floatOffset;

      // Pulse glow
      if (mesh.userData.glow) {
        const pulse = 0.12 + Math.sin(this.time * 2 + data.index) * 0.05;
        mesh.userData.glow.material.opacity = pulse;
      }
    }

    // Rotate orbital rings
    this.rings.forEach((ring, i) => {
      ring.rotation.z += delta * 0.1 * (i % 2 === 0 ? 1 : -1);
    });
  },

  /**
   * Check for hover
   */
  checkHover(raycaster) {
    if (!this.isVisible || this.animating) return null;

    // Get all core meshes for intersection
    const meshes = [];
    for (const [skillId, data] of this.nodes) {
      if (data.mesh.userData.core) {
        meshes.push(data.mesh.userData.core);
        data.mesh.userData.core.userData.parentGroup = data.mesh;
        data.mesh.userData.core.userData.skill = data.skill;
      }
    }

    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const parentGroup = hit.userData.parentGroup;

      if (parentGroup && parentGroup.userData?.type === 'skill') {
        if (this.hoveredNode !== parentGroup) {
          if (this.hoveredNode) {
            this.unhoverNode(this.hoveredNode);
          }
          this.hoverNode(parentGroup);
          this.hoveredNode = parentGroup;
        }
        return parentGroup.userData.skill;
      }
    } else if (this.hoveredNode) {
      this.unhoverNode(this.hoveredNode);
      this.hoveredNode = null;
    }

    return null;
  },

  /**
   * Hover effect - glow up
   */
  hoverNode(node) {
    // Scale up
    node.scale.setScalar(1.25);

    // Intensify glow
    if (node.userData.core) {
      node.userData.core.material.emissiveIntensity = 1.2;
    }
    if (node.userData.glow) {
      node.userData.glow.material.opacity = 0.3;
    }
    if (node.userData.ring) {
      node.userData.ring.material.opacity = 1;
    }

    // Brighten connection
    const connection = this.connections.find(c => c.userData.skillId === node.userData.skillId);
    if (connection) {
      connection.material.opacity = 0.6;
      connection.material.color.setHex(CYBER_COLORS.lineActive);
    }

    if (this.callbacks.onSkillHover) {
      this.callbacks.onSkillHover(node.userData.skill);
    }
  },

  /**
   * Unhover effect
   */
  unhoverNode(node) {
    node.scale.setScalar(1);

    if (node.userData.core) {
      node.userData.core.material.emissiveIntensity = 0.8;
    }
    if (node.userData.glow) {
      node.userData.glow.material.opacity = 0.15;
    }
    if (node.userData.ring) {
      node.userData.ring.material.opacity = 0.8;
    }

    const connection = this.connections.find(c => c.userData.skillId === node.userData.skillId);
    if (connection) {
      connection.material.opacity = 0.2;
      connection.material.color.setHex(CYBER_COLORS.line);
    }

    if (this.callbacks.onSkillHover) {
      this.callbacks.onSkillHover(null);
    }
  },

  /**
   * Handle click
   */
  handleClick() {
    if (this.hoveredNode) {
      const skill = this.hoveredNode.userData.skill;
      if (this.callbacks.onSkillClick) {
        this.callbacks.onSkillClick(skill, this.currentProject);
      }
      return skill;
    }
    return null;
  },

  /**
   * Set callbacks
   */
  on(event, callback) {
    const key = `on${event.charAt(0).toUpperCase() + event.slice(1)}`;
    if (this.callbacks.hasOwnProperty(key)) {
      this.callbacks[key] = callback;
    }
  },

  /**
   * Easing functions
   */
  easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  easeInBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },

  /**
   * Dispose
   */
  dispose() {
    this.clear();
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
};

export default SkillNodes;
