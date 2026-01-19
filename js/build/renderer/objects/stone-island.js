/**
 * Build V2 - Stone Island Factory
 * Floating stone islands for project nodes
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// STONE ISLAND CONFIGURATION
// ============================================

const ISLAND_CONFIG = {
  // Island base
  base: {
    radiusTop: 2.5,
    radiusBottom: 1.5,
    height: 2,
    radialSegments: 8,
    heightSegments: 3
  },
  // Crystal on top
  crystal: {
    radius: 0.4,
    height: 1.2,
    segments: 6
  },
  // Floating debris
  debris: {
    count: 4,
    minSize: 0.2,
    maxSize: 0.5,
    orbitRadius: 3
  },
  // Status colors
  statusColors: {
    live: 0x00ff88,
    building: 0xffaa00,
    planned: 0x8855cc,
    default: 0x666688
  },
  // Stone colors
  stoneColors: {
    base: 0x4a4a5a,
    highlight: 0x6a6a7a,
    moss: 0x3d5a3d
  },
  // Animation
  animation: {
    floatAmplitude: 0.3,
    floatSpeed: 1.0,
    rotationSpeed: 0.2
  }
};

// ============================================
// STONE ISLAND CLASS
// ============================================

class StoneIsland {
  /**
   * Create a stone island
   * @param {Object} THREE - Three.js library reference
   * @param {Object} project - Project data
   * @param {Object} options - Configuration options
   */
  constructor(THREE, project, options = {}) {
    this.THREE = THREE;
    this.project = project;
    this.options = { ...ISLAND_CONFIG, ...options };

    // Group for island
    this.group = new THREE.Group();
    this.group.name = `Island_${project.id}`;
    this.group.userData = {
      type: 'island',
      projectId: project.id,
      project: project
    };

    // References
    this.baseMesh = null;
    this.crystalMesh = null;
    this.crystalLight = null;
    this.debrisMeshes = [];
    this.glowMesh = null;

    // Animation state
    this.baseY = 0;
    this.time = Math.random() * Math.PI * 2; // Random phase

    // Status
    this.status = project.status || 'planned';
    this.statusColor = this.options.statusColors[this.status] || this.options.statusColors.default;
  }

  /**
   * Initialize and build the island
   * @param {THREE.Vector3} position - Initial position
   * @returns {THREE.Group}
   */
  init(position = new this.THREE.Vector3(0, 0, 0)) {
    this.group.position.copy(position);
    this.baseY = position.y;

    this.createBase();
    this.createCrystal();
    this.createGlow();
    this.createDebris();

    return this.group;
  }

  /**
   * Create the stone base
   */
  createBase() {
    const { THREE } = this;
    const { base, stoneColors } = this.options;

    // Create irregular stone shape using dodecahedron
    const geometry = new THREE.DodecahedronGeometry(base.radiusTop, 1);

    // Distort for organic look
    const positionAttribute = geometry.getAttribute('position');
    const positions = positionAttribute.array;

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];

      // Add noise
      const noise = (Math.random() - 0.5) * 0.3;
      positions[i * 3] = x * (1 + noise);
      positions[i * 3 + 1] = y * (1 + noise) * 0.6; // Flatten vertically
      positions[i * 3 + 2] = z * (1 + noise);
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();

    // Material with vertex colors
    const material = new THREE.MeshPhongMaterial({
      color: stoneColors.base,
      flatShading: true,
      shininess: 10
    });

    // Add vertex color variation
    const baseColor = new THREE.Color(stoneColors.base);
    const highlightColor = new THREE.Color(stoneColors.highlight);
    const mossColor = new THREE.Color(stoneColors.moss);
    const vertexColors = [];

    for (let i = 0; i < positionAttribute.count; i++) {
      const y = positions[i * 3 + 1];
      const rand = Math.random();

      let color;
      if (y > 0.5 && rand < 0.3) {
        // Moss on top
        color = mossColor.clone().lerp(baseColor, rand);
      } else if (rand < 0.2) {
        color = highlightColor.clone();
      } else {
        color = baseColor.clone().lerp(highlightColor, rand * 0.3);
      }

      vertexColors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
    material.vertexColors = true;

    this.baseMesh = new THREE.Mesh(geometry, material);
    this.baseMesh.castShadow = true;
    this.baseMesh.receiveShadow = true;
    this.baseMesh.userData = { type: 'islandBase', projectId: this.project.id };

    this.group.add(this.baseMesh);
  }

  /**
   * Create the status crystal on top
   */
  createCrystal() {
    const { THREE } = this;
    const { crystal } = this.options;

    // Crystal geometry
    const geometry = new THREE.OctahedronGeometry(crystal.radius, 0);

    // Scale to elongate
    geometry.scale(1, crystal.height / crystal.radius, 1);

    // Crystal material (emissive based on status)
    const material = new THREE.MeshPhongMaterial({
      color: this.statusColor,
      emissive: this.statusColor,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9,
      shininess: 100
    });

    this.crystalMesh = new THREE.Mesh(geometry, material);
    this.crystalMesh.position.y = 1.5;
    this.crystalMesh.userData = { type: 'crystal', projectId: this.project.id };

    // Point light inside crystal
    this.crystalLight = new THREE.PointLight(this.statusColor, 0.5, 5);
    this.crystalLight.position.copy(this.crystalMesh.position);

    this.group.add(this.crystalMesh);
    this.group.add(this.crystalLight);
  }

  /**
   * Create glow effect around crystal
   */
  createGlow() {
    const { THREE } = this;

    // Sprite for glow effect
    const spriteMaterial = new THREE.SpriteMaterial({
      color: this.statusColor,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });

    this.glowMesh = new THREE.Sprite(spriteMaterial);
    this.glowMesh.scale.set(3, 3, 1);
    this.glowMesh.position.y = 1.5;

    this.group.add(this.glowMesh);
  }

  /**
   * Create orbiting debris
   */
  createDebris() {
    const { THREE } = this;
    const { debris, stoneColors } = this.options;

    const geometry = new THREE.TetrahedronGeometry(1, 0);
    const material = new THREE.MeshPhongMaterial({
      color: stoneColors.highlight,
      flatShading: true
    });

    for (let i = 0; i < debris.count; i++) {
      const size = debris.minSize + Math.random() * (debris.maxSize - debris.minSize);
      const mesh = new THREE.Mesh(geometry.clone(), material.clone());

      mesh.scale.setScalar(size);
      mesh.userData = {
        orbitAngle: (i / debris.count) * Math.PI * 2,
        orbitRadius: debris.orbitRadius + Math.random(),
        orbitSpeed: 0.3 + Math.random() * 0.2,
        floatOffset: Math.random() * Math.PI * 2
      };

      this.debrisMeshes.push(mesh);
      this.group.add(mesh);
    }
  }

  /**
   * Update island animation
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    const { animation, debris } = this.options;
    this.time += deltaTime;

    // Float animation
    const floatOffset = Math.sin(this.time * animation.floatSpeed) * animation.floatAmplitude;
    this.group.position.y = this.baseY + floatOffset;

    // Crystal rotation and pulse
    if (this.crystalMesh) {
      this.crystalMesh.rotation.y += deltaTime * animation.rotationSpeed;

      // Pulse emissive
      const pulse = 0.3 + Math.sin(this.time * 2) * 0.2;
      this.crystalMesh.material.emissiveIntensity = pulse;
    }

    // Glow pulse
    if (this.glowMesh) {
      const glowPulse = 0.2 + Math.sin(this.time * 1.5) * 0.1;
      this.glowMesh.material.opacity = glowPulse;
    }

    // Debris orbit
    this.debrisMeshes.forEach((mesh) => {
      const data = mesh.userData;
      data.orbitAngle += deltaTime * data.orbitSpeed;

      mesh.position.x = Math.cos(data.orbitAngle) * data.orbitRadius;
      mesh.position.z = Math.sin(data.orbitAngle) * data.orbitRadius;
      mesh.position.y = 0.5 + Math.sin(this.time + data.floatOffset) * 0.3;

      mesh.rotation.x += deltaTime * 0.5;
      mesh.rotation.y += deltaTime * 0.3;
    });
  }

  /**
   * Set hover state
   * @param {boolean} hovered
   */
  setHovered(hovered) {
    const scale = hovered ? 1.15 : 1.0;
    this.group.scale.setScalar(scale);

    if (this.crystalMesh) {
      this.crystalMesh.material.emissiveIntensity = hovered ? 0.8 : 0.5;
    }

    if (this.crystalLight) {
      this.crystalLight.intensity = hovered ? 1.0 : 0.5;
    }
  }

  /**
   * Set selected state
   * @param {boolean} selected
   */
  setSelected(selected) {
    if (this.crystalMesh) {
      if (selected) {
        this.crystalMesh.material.emissive.setHex(0xffffff);
        this.crystalMesh.material.emissiveIntensity = 0.6;
      } else {
        this.crystalMesh.material.emissive.setHex(this.statusColor);
        this.crystalMesh.material.emissiveIntensity = 0.5;
      }
    }
  }

  /**
   * Get raycast target
   * @returns {THREE.Mesh}
   */
  getRaycastTarget() {
    return this.baseMesh;
  }

  /**
   * Get position
   * @returns {THREE.Vector3}
   */
  getPosition() {
    return this.group.position.clone();
  }

  /**
   * Get project ID
   * @returns {string}
   */
  getProjectId() {
    return this.project.id;
  }

  /**
   * Get the island group
   * @returns {THREE.Group}
   */
  getGroup() {
    return this.group;
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    if (this.baseMesh) {
      this.baseMesh.geometry.dispose();
      this.baseMesh.material.dispose();
    }

    if (this.crystalMesh) {
      this.crystalMesh.geometry.dispose();
      this.crystalMesh.material.dispose();
    }

    if (this.glowMesh) {
      this.glowMesh.material.dispose();
    }

    this.debrisMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });

    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    this.debrisMeshes = [];
  }
}

// ============================================
// STONE ISLAND FACTORY
// ============================================

const StoneIslandFactory = {
  /**
   * Create multiple islands for projects
   * @param {Object} THREE - Three.js reference
   * @param {Array} projects - Project data array
   * @param {Array} positions - Position array for each island
   * @returns {Array<StoneIsland>}
   */
  createIslands(THREE, projects, positions) {
    return projects.map((project, index) => {
      const island = new StoneIsland(THREE, project);
      const pos = positions[index] || new THREE.Vector3(0, 0, 0);
      island.init(pos);
      return island;
    });
  },

  /**
   * Create a single island
   * @param {Object} THREE - Three.js reference
   * @param {Object} project - Project data
   * @param {THREE.Vector3} position - Position
   * @returns {StoneIsland}
   */
  createIsland(THREE, project, position) {
    const island = new StoneIsland(THREE, project);
    island.init(position);
    return island;
  }
};

// ============================================
// EXPORTS
// ============================================

export { StoneIsland, StoneIslandFactory, ISLAND_CONFIG };
export default StoneIslandFactory;
