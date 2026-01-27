/**
 * Build V2 - Skill Node
 * Interactive skill nodes arranged in phi-spiral for Project Tree view
 *
 * @version 1.0.0
 * @created 2026-01-21
 */

'use strict';

import { PHI, GOLDEN_ANGLE } from '../../utils/phi.js';

// ============================================
// SKILL NODE CONFIGURATION
// ============================================

const SKILL_NODE_CONFIG = {
  // Geometry
  geometry: {
    radius: 0.8,
    detail: 1  // Icosahedron detail level
  },
  // State colors
  stateColors: {
    locked: 0x333344,
    available: 0x4488ff,
    inProgress: 0xffaa00,
    completed: 0x00ff88
  },
  // Emissive intensities
  emissive: {
    locked: 0.1,
    available: 0.3,
    inProgress: 0.5,
    completed: 0.6
  },
  // Animation
  animation: {
    floatAmplitude: 0.15,
    floatSpeed: 1.5,
    pulseSpeed: 2.0,
    hoverScale: 1.2
  },
  // Phi-spiral positioning
  spiral: {
    centerRadius: 3,   // Distance from center to first node
    maxRadius: 12,     // Maximum spiral radius
    verticalSpread: 2  // Y-axis variation
  }
};

// ============================================
// SKILL NODE STATES
// ============================================

const SKILL_STATES = {
  LOCKED: 'locked',
  AVAILABLE: 'available',
  IN_PROGRESS: 'inProgress',
  COMPLETED: 'completed'
};

// ============================================
// SKILL NODE CLASS
// ============================================

class SkillNode {
  /**
   * Create a skill node
   * @param {Object} THREE - Three.js library reference
   * @param {Object} skill - Skill data
   * @param {Object} options - Configuration options
   */
  constructor(THREE, skill, options = {}) {
    this.THREE = THREE;
    this.skill = skill;
    this.options = { ...SKILL_NODE_CONFIG, ...options };

    // Group for node
    this.group = new THREE.Group();
    this.group.name = `SkillNode_${skill.id}`;
    this.group.userData = {
      type: 'skillNode',
      skillId: skill.id,
      skill: skill
    };

    // References
    this.coreMesh = null;
    this.glowMesh = null;
    this.ringMesh = null;
    this.labelSprite = null;

    // Animation state
    this.time = Math.random() * Math.PI * 2;
    this.basePosition = new THREE.Vector3();

    // Interaction state
    this.state = skill.state || SKILL_STATES.LOCKED;
    this.isHovered = false;
    this.isSelected = false;
  }

  /**
   * Initialize and build the skill node
   * @param {THREE.Vector3} position - Initial position
   * @returns {THREE.Group}
   */
  init(position = new this.THREE.Vector3(0, 0, 0)) {
    this.basePosition.copy(position);
    this.group.position.copy(position);

    this.createCore();
    this.createGlow();
    this.createRing();

    this.updateStateVisuals();

    return this.group;
  }

  /**
   * Create the core geometry
   */
  createCore() {
    const { THREE } = this;
    const { geometry } = this.options;

    // Icosahedron for crystal-like appearance
    const geo = new THREE.IcosahedronGeometry(geometry.radius, geometry.detail);

    const material = new THREE.MeshPhongMaterial({
      color: this.options.stateColors[this.state],
      emissive: this.options.stateColors[this.state],
      emissiveIntensity: this.options.emissive[this.state],
      transparent: true,
      opacity: 0.9,
      shininess: 100,
      flatShading: true
    });

    this.coreMesh = new THREE.Mesh(geo, material);
    this.coreMesh.userData = { type: 'skillCore', skillId: this.skill.id };

    this.group.add(this.coreMesh);
  }

  /**
   * Create glow effect
   */
  createGlow() {
    const { THREE } = this;

    const spriteMaterial = new THREE.SpriteMaterial({
      color: this.options.stateColors[this.state],
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending
    });

    this.glowMesh = new THREE.Sprite(spriteMaterial);
    this.glowMesh.scale.set(2.5, 2.5, 1);

    this.group.add(this.glowMesh);
  }

  /**
   * Create progress ring (for in-progress state)
   */
  createRing() {
    const { THREE } = this;

    const ringGeo = new THREE.RingGeometry(1.0, 1.15, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.options.stateColors.inProgress,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });

    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.rotation.x = -Math.PI / 2;

    this.group.add(this.ringMesh);
  }

  /**
   * Update visuals based on current state
   */
  updateStateVisuals() {
    const color = this.options.stateColors[this.state];
    const emissiveIntensity = this.options.emissive[this.state];

    if (this.coreMesh) {
      this.coreMesh.material.color.setHex(color);
      this.coreMesh.material.emissive.setHex(color);
      this.coreMesh.material.emissiveIntensity = emissiveIntensity;
      this.coreMesh.material.opacity = this.state === SKILL_STATES.LOCKED ? 0.5 : 0.9;
    }

    if (this.glowMesh) {
      this.glowMesh.material.color.setHex(color);
      this.glowMesh.material.opacity = this.state === SKILL_STATES.LOCKED ? 0.1 : 0.25;
    }

    // Show ring only for in-progress
    if (this.ringMesh) {
      this.ringMesh.material.opacity = this.state === SKILL_STATES.IN_PROGRESS ? 0.6 : 0;
    }
  }

  /**
   * Set skill state
   * @param {string} newState - New state
   */
  setState(newState) {
    if (SKILL_STATES[newState.toUpperCase()] || Object.values(SKILL_STATES).includes(newState)) {
      this.state = newState;
      this.updateStateVisuals();
    }
  }

  /**
   * Update animation
   * @param {number} deltaTime
   */
  update(deltaTime) {
    const { animation } = this.options;
    this.time += deltaTime;

    // Skip animation for locked nodes
    if (this.state === SKILL_STATES.LOCKED) return;

    // Float animation
    const floatOffset = Math.sin(this.time * animation.floatSpeed) * animation.floatAmplitude;
    this.group.position.y = this.basePosition.y + floatOffset;

    // Core rotation
    if (this.coreMesh) {
      this.coreMesh.rotation.y += deltaTime * 0.3;
      this.coreMesh.rotation.x += deltaTime * 0.1;
    }

    // Pulse glow
    if (this.glowMesh && this.state !== SKILL_STATES.LOCKED) {
      const pulse = 0.2 + Math.sin(this.time * animation.pulseSpeed) * 0.1;
      this.glowMesh.material.opacity = pulse;
    }

    // Rotate ring for in-progress
    if (this.ringMesh && this.state === SKILL_STATES.IN_PROGRESS) {
      this.ringMesh.rotation.z += deltaTime * 0.5;
    }
  }

  /**
   * Set hover state
   * @param {boolean} hovered
   */
  setHovered(hovered) {
    this.isHovered = hovered;
    const { animation } = this.options;

    const scale = hovered ? animation.hoverScale : 1.0;
    this.group.scale.setScalar(scale);

    if (this.coreMesh && this.state !== SKILL_STATES.LOCKED) {
      this.coreMesh.material.emissiveIntensity = hovered
        ? this.options.emissive[this.state] + 0.3
        : this.options.emissive[this.state];
    }
  }

  /**
   * Set selected state
   * @param {boolean} selected
   */
  setSelected(selected) {
    this.isSelected = selected;

    if (this.coreMesh) {
      if (selected) {
        this.coreMesh.material.emissive.setHex(0xffffff);
        this.coreMesh.material.emissiveIntensity = 0.7;
      } else {
        this.coreMesh.material.emissive.setHex(this.options.stateColors[this.state]);
        this.coreMesh.material.emissiveIntensity = this.options.emissive[this.state];
      }
    }
  }

  /**
   * Get raycast target
   * @returns {THREE.Mesh}
   */
  getRaycastTarget() {
    return this.coreMesh;
  }

  /**
   * Get position
   * @returns {THREE.Vector3}
   */
  getPosition() {
    return this.group.position.clone();
  }

  /**
   * Get skill ID
   * @returns {string}
   */
  getSkillId() {
    return this.skill.id;
  }

  /**
   * Get the node group
   * @returns {THREE.Group}
   */
  getGroup() {
    return this.group;
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    if (this.coreMesh) {
      this.coreMesh.geometry.dispose();
      this.coreMesh.material.dispose();
    }

    if (this.glowMesh) {
      this.glowMesh.material.dispose();
    }

    if (this.ringMesh) {
      this.ringMesh.geometry.dispose();
      this.ringMesh.material.dispose();
    }

    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
  }
}

// ============================================
// PHI-SPIRAL POSITIONING
// ============================================

/**
 * Calculate phi-spiral positions for skill nodes
 * @param {Array} skills - Array of skill data
 * @param {Object} config - Spiral configuration
 * @returns {Array} - Array of { skill, position } objects
 */
function calculatePhiSpiralPositions(skills, config = {}) {
  const {
    centerRadius = SKILL_NODE_CONFIG.spiral.centerRadius,
    maxRadius = SKILL_NODE_CONFIG.spiral.maxRadius,
    verticalSpread = SKILL_NODE_CONFIG.spiral.verticalSpread
  } = config;

  return skills.map((skill, i) => {
    // Fermat spiral: r = a * sqrt(n)
    const t = i / Math.max(skills.length - 1, 1);
    const r = centerRadius + (maxRadius - centerRadius) * Math.sqrt(t);

    // Golden angle for even distribution
    const theta = i * GOLDEN_ANGLE;

    // Add vertical variation based on phi
    const y = Math.sin(theta * PHI) * verticalSpread * t;

    return {
      skill,
      position: {
        x: Math.cos(theta) * r,
        y: y,
        z: Math.sin(theta) * r
      },
      order: i
    };
  });
}

// ============================================
// SKILL NODE FACTORY
// ============================================

const SkillNodeFactory = {
  /**
   * Create skill nodes for a project
   * @param {Object} THREE - Three.js reference
   * @param {Array} skills - Skill data array
   * @param {Object} spiralConfig - Spiral positioning config
   * @returns {Array<SkillNode>}
   */
  createNodes(THREE, skills, spiralConfig = {}) {
    const positions = calculatePhiSpiralPositions(skills, spiralConfig);

    return positions.map(({ skill, position }) => {
      const node = new SkillNode(THREE, skill);
      node.init(new THREE.Vector3(position.x, position.y, position.z));
      return node;
    });
  },

  /**
   * Create a single skill node
   * @param {Object} THREE - Three.js reference
   * @param {Object} skill - Skill data
   * @param {THREE.Vector3} position - Position
   * @returns {SkillNode}
   */
  createNode(THREE, skill, position) {
    const node = new SkillNode(THREE, skill);
    node.init(position);
    return node;
  }
};

// ============================================
// EXPORTS
// ============================================

export {
  SkillNode,
  SkillNodeFactory,
  SKILL_NODE_CONFIG,
  SKILL_STATES,
  calculatePhiSpiralPositions
};
export default SkillNodeFactory;
