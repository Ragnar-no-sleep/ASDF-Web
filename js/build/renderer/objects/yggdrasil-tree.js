/**
 * Build V2 - Yggdrasil Tree 3D Geometry
 * Procedurally generated World Tree with branches
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// YGGDRASIL CONFIGURATION
// ============================================

const YGGDRASIL_CONFIG = {
  // Tree dimensions
  trunk: {
    baseRadius: 2.0,
    topRadius: 0.8,
    height: 30,
    segments: 8,
    radialSegments: 12
  },
  // Branch settings
  branches: {
    count: 13,           // Number of main branches (for projects)
    minRadius: 0.3,
    maxRadius: 0.6,
    minLength: 8,
    maxLength: 15,
    curve: 0.3,          // Branch curve factor
    segments: 6
  },
  // Root settings
  roots: {
    count: 5,
    radius: 0.5,
    length: 8,
    spread: 1.5
  },
  // Colors
  colors: {
    bark: 0x4a3728,       // Brown bark
    barkHighlight: 0x6b4d3a,
    moss: 0x2d5a27,       // Green moss
    root: 0x3d2817        // Dark root
  }
};

// ============================================
// YGGDRASIL TREE CLASS
// ============================================

class YggdrasilTree {
  /**
   * Create Yggdrasil tree
   * @param {Object} THREE - Three.js library reference
   * @param {Object} options - Configuration options
   */
  constructor(THREE, options = {}) {
    this.THREE = THREE;
    this.options = { ...YGGDRASIL_CONFIG, ...options };

    // Group to hold all tree parts
    this.group = new THREE.Group();
    this.group.name = 'YggdrasilTree';

    // References
    this.trunk = null;
    this.branches = [];
    this.roots = [];
    this.branchEndpoints = []; // For attaching project islands
  }

  /**
   * Initialize and build the tree
   * @returns {THREE.Group}
   */
  init() {
    this.createTrunk();
    this.createBranches();
    this.createRoots();
    this.addMossDetails();

    return this.group;
  }

  /**
   * Create the main trunk
   */
  createTrunk() {
    const { THREE } = this;
    const { trunk, colors } = this.options;

    // Create trunk geometry using LatheGeometry for organic shape
    const points = [];
    const segments = 10;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = t * trunk.height;
      // Organic radius variation
      const baseR = THREE.MathUtils.lerp(trunk.baseRadius, trunk.topRadius, t);
      const variation = Math.sin(t * Math.PI * 3) * 0.2 + Math.sin(t * Math.PI * 7) * 0.05;
      const radius = baseR + variation * baseR;

      points.push(new THREE.Vector2(radius, y - trunk.height / 2));
    }

    const geometry = new THREE.LatheGeometry(points, trunk.radialSegments);

    // Create bark material with vertex colors for variation
    const material = new THREE.MeshPhongMaterial({
      color: colors.bark,
      flatShading: true,
      shininess: 5
    });

    // Add vertex color variation for organic look
    const colorAttribute = geometry.getAttribute('position');
    const vertexColors = [];
    const barkColor = new THREE.Color(colors.bark);
    const highlightColor = new THREE.Color(colors.barkHighlight);

    for (let i = 0; i < colorAttribute.count; i++) {
      const blend = Math.random() * 0.3;
      const color = barkColor.clone().lerp(highlightColor, blend);
      vertexColors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
    material.vertexColors = true;

    this.trunk = new THREE.Mesh(geometry, material);
    this.trunk.castShadow = true;
    this.trunk.receiveShadow = true;

    this.group.add(this.trunk);
  }

  /**
   * Create branches emanating from trunk
   */
  createBranches() {
    const { THREE } = this;
    const { trunk, branches, colors } = this.options;
    const goldenAngle = 137.5 * (Math.PI / 180); // Golden angle in radians

    for (let i = 0; i < branches.count; i++) {
      // Distribute branches using golden angle
      const angle = i * goldenAngle;

      // Height position (distribute along trunk with phi ratio)
      const heightRatio = 0.3 + (i / branches.count) * 0.6;
      const height = (heightRatio * trunk.height) - trunk.height / 2;

      // Branch properties
      const length = branches.minLength + Math.random() * (branches.maxLength - branches.minLength);
      const radius = branches.minRadius + Math.random() * (branches.maxRadius - branches.minRadius);

      // Upward angle (higher branches point more up)
      const upAngle = -0.2 + heightRatio * 0.6;

      // Create branch
      const branch = this.createBranch(length, radius, angle, upAngle);
      branch.position.y = height;

      // Calculate and store endpoint for island attachment
      const endX = Math.cos(angle) * length * Math.cos(upAngle);
      const endY = height + length * Math.sin(upAngle);
      const endZ = Math.sin(angle) * length * Math.cos(upAngle);

      this.branchEndpoints.push({
        position: new THREE.Vector3(endX, endY, endZ),
        angle: angle,
        index: i
      });

      this.branches.push(branch);
      this.group.add(branch);
    }
  }

  /**
   * Create a single branch
   * @param {number} length - Branch length
   * @param {number} radius - Branch radius
   * @param {number} angle - Horizontal angle
   * @param {number} upAngle - Vertical angle
   * @returns {THREE.Mesh}
   */
  createBranch(length, radius, angle, upAngle) {
    const { THREE } = this;
    const { branches, colors } = this.options;

    // Create curved branch using TubeGeometry
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(length * 0.3, length * 0.1, 0),
      new THREE.Vector3(length * 0.6, length * 0.15, 0),
      new THREE.Vector3(length, length * upAngle, 0)
    ]);

    const geometry = new THREE.TubeGeometry(
      curve,
      branches.segments,
      radius,
      8,
      false
    );

    // Taper the branch
    const positionAttribute = geometry.getAttribute('position');
    const positions = positionAttribute.array;

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positions[i * 3];
      const taper = 1 - (x / length) * 0.7;
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];

      // Apply taper to y and z (radial components)
      positions[i * 3 + 1] = y * taper;
      positions[i * 3 + 2] = z * taper;
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      color: colors.bark,
      flatShading: true,
      shininess: 5
    });

    const branch = new THREE.Mesh(geometry, material);
    branch.rotation.y = angle;
    branch.castShadow = true;

    return branch;
  }

  /**
   * Create roots at the base
   */
  createRoots() {
    const { THREE } = this;
    const { trunk, roots, colors } = this.options;

    for (let i = 0; i < roots.count; i++) {
      const angle = (i / roots.count) * Math.PI * 2 + Math.random() * 0.3;
      const length = roots.length + Math.random() * 4;

      // Root curve going down and outward
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(trunk.baseRadius * 0.8, 0, 0),
        new THREE.Vector3(length * 0.4, -2, 0),
        new THREE.Vector3(length * 0.7, -4, 0),
        new THREE.Vector3(length * roots.spread, -6, 0)
      ]);

      const geometry = new THREE.TubeGeometry(
        curve,
        8,
        roots.radius,
        6,
        false
      );

      const material = new THREE.MeshPhongMaterial({
        color: colors.root,
        flatShading: true,
        shininess: 3
      });

      const root = new THREE.Mesh(geometry, material);
      root.rotation.y = angle;
      root.position.y = -trunk.height / 2;
      root.castShadow = true;

      this.roots.push(root);
      this.group.add(root);
    }
  }

  /**
   * Add moss and detail elements
   */
  addMossDetails() {
    const { THREE } = this;
    const { trunk, colors } = this.options;

    // Add moss patches on trunk
    const mossCount = 20;
    const mossGeometry = new THREE.SphereGeometry(0.3, 6, 4);
    const mossMaterial = new THREE.MeshPhongMaterial({
      color: colors.moss,
      flatShading: true
    });

    for (let i = 0; i < mossCount; i++) {
      const moss = new THREE.Mesh(mossGeometry.clone(), mossMaterial);

      // Position on trunk surface
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() * 0.7 - 0.2) * trunk.height;
      const radiusAtHeight = THREE.MathUtils.lerp(
        trunk.baseRadius,
        trunk.topRadius,
        (height + trunk.height / 2) / trunk.height
      );

      moss.position.x = Math.cos(angle) * radiusAtHeight;
      moss.position.y = height;
      moss.position.z = Math.sin(angle) * radiusAtHeight;

      // Random scale
      const scale = 0.5 + Math.random() * 1.0;
      moss.scale.set(scale, scale * 0.5, scale);

      // Face outward
      moss.lookAt(moss.position.clone().multiplyScalar(2));

      this.group.add(moss);
    }
  }

  /**
   * Get branch endpoints for island placement
   * @returns {Array}
   */
  getBranchEndpoints() {
    return this.branchEndpoints;
  }

  /**
   * Get the tree group
   * @returns {THREE.Group}
   */
  getGroup() {
    return this.group;
  }

  /**
   * Animate tree (subtle sway)
   * @param {number} time - Animation time
   * @param {number} windStrength - Wind intensity 0-1
   */
  animate(time, windStrength = 0.1) {
    // Subtle branch sway
    this.branches.forEach((branch, i) => {
      const phase = i * 0.5;
      branch.rotation.z = Math.sin(time + phase) * windStrength * 0.1;
      branch.rotation.x = Math.cos(time * 0.7 + phase) * windStrength * 0.05;
    });
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    // Dispose trunk
    if (this.trunk) {
      this.trunk.geometry.dispose();
      this.trunk.material.dispose();
    }

    // Dispose branches
    this.branches.forEach(branch => {
      branch.geometry.dispose();
      branch.material.dispose();
    });

    // Dispose roots
    this.roots.forEach(root => {
      root.geometry.dispose();
      root.material.dispose();
    });

    // Clear group
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }

    this.branches = [];
    this.roots = [];
    this.branchEndpoints = [];
  }
}

// ============================================
// EXPORTS
// ============================================

export { YggdrasilTree, YGGDRASIL_CONFIG };
export default YggdrasilTree;
