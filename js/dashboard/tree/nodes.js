/**
 * Yggdrasil Dashboard - Node Manager
 * Handles project, module, and task nodes on the tree
 */

'use strict';

import { DASHBOARD_CONFIG, PHI } from '../config.js';

let THREE = null;

/**
 * Node type definitions
 */
const NODE_TYPES = {
  PROJECT: 'project',
  MODULE: 'module',
  TASK: 'task',
};

/**
 * Manages all interactive nodes on the tree
 */
export const NodeManager = {
  // Scene reference
  scene: null,

  // Node collections
  nodes: new Map(),
  interactiveNodes: [],

  // Animation state
  animations: [],

  /**
   * Geometry factories by node type - Strategy pattern
   * Maps node types to geometry constructors. Add new types here.
   * @type {Object.<string, (size: number) => THREE.BufferGeometry>}
   */
  geometryFactories: {
    [NODE_TYPES.PROJECT]: size => new THREE.IcosahedronGeometry(size, 1),
    [NODE_TYPES.MODULE]: size => new THREE.OctahedronGeometry(size, 0),
    [NODE_TYPES.TASK]: size => new THREE.TetrahedronGeometry(size, 0),
    default: size => new THREE.SphereGeometry(size, 16, 16),
  },

  /**
   * Initialize the node manager
   */
  init(scene, threeInstance) {
    this.scene = scene;
    THREE = threeInstance;
  },

  /**
   * Create nodes from data
   * @param {Array} projects - Project data array
   */
  createFromData(projects) {
    if (!projects || !Array.isArray(projects)) return;

    const { tree } = DASHBOARD_CONFIG;
    const projectCount = projects.length;

    projects.forEach((project, index) => {
      // Calculate position on tree (spiral pattern)
      const angle = (index / projectCount) * Math.PI * 2;
      const height = 6 + (index % 4) * 2;
      const radius = 4 + Math.random() * 2;

      const position = {
        x: Math.cos(angle) * radius,
        y: height,
        z: Math.sin(angle) * radius,
      };

      // Create project node
      const projectNode = this.createNode({
        id: project.id,
        type: NODE_TYPES.PROJECT,
        name: project.name,
        data: project,
        position,
      });

      // Create module nodes if project has modules
      if (project.modules && Array.isArray(project.modules)) {
        this.createModuleNodes(projectNode, project.modules);
      }
    });
  },

  /**
   * Create a single node
   */
  createNode({ id, type, name, data, position }) {
    const config = DASHBOARD_CONFIG.tree.nodes[type];

    // Create geometry based on type using strategy pattern
    const factory = this.geometryFactories[type] || this.geometryFactories.default;
    const geometry = factory(config.size);

    // Create material with glow effect
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      emissive: config.color,
      emissiveIntensity: config.glowIntensity,
      roughness: 0.3,
      metalness: 0.7,
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);

    // Store node data
    mesh.userData = {
      nodeId: id,
      nodeType: type,
      nodeData: {
        id,
        type,
        name,
        ...data,
      },
    };

    // Add to scene
    this.scene.add(mesh);

    // Track node
    this.nodes.set(id, {
      mesh,
      type,
      data,
      originalScale: mesh.scale.clone(),
      originalEmissive: config.glowIntensity,
    });

    this.interactiveNodes.push(mesh);

    // Add floating animation
    this.animations.push({
      mesh,
      baseY: position.y,
      phase: Math.random() * Math.PI * 2,
      amplitude: 0.1 + Math.random() * 0.1,
      speed: 0.5 + Math.random() * 0.5,
    });

    return mesh;
  },

  /**
   * Create module nodes around a project
   */
  createModuleNodes(projectNode, modules) {
    const projectPos = projectNode.position;
    const moduleCount = modules.length;

    modules.forEach((module, index) => {
      const angle = (index / moduleCount) * Math.PI * 2;
      const distance = 1.5;

      const position = {
        x: projectPos.x + Math.cos(angle) * distance,
        y: projectPos.y + (Math.random() - 0.5) * 1,
        z: projectPos.z + Math.sin(angle) * distance,
      };

      this.createNode({
        id: module.id,
        type: NODE_TYPES.MODULE,
        name: module.name,
        data: module,
        position,
      });
    });
  },

  /**
   * Get all interactive nodes for raycasting
   */
  getInteractiveNodes() {
    return this.interactiveNodes;
  },

  /**
   * Hover effect on node
   */
  hover(mesh) {
    const node = this.nodes.get(mesh.userData.nodeId);
    if (!node) return;

    // Scale up
    mesh.scale.setScalar(1.3);

    // Increase glow
    mesh.material.emissiveIntensity = node.originalEmissive * 2;
  },

  /**
   * Remove hover effect
   */
  unhover(mesh) {
    const node = this.nodes.get(mesh.userData.nodeId);
    if (!node) return;

    // Reset scale
    mesh.scale.copy(node.originalScale);

    // Reset glow
    mesh.material.emissiveIntensity = node.originalEmissive;
  },

  /**
   * Update animations
   */
  update(delta) {
    const time = performance.now() * 0.001;

    for (const anim of this.animations) {
      const y = anim.baseY + Math.sin(time * anim.speed + anim.phase) * anim.amplitude;
      anim.mesh.position.y = y;

      // Gentle rotation
      anim.mesh.rotation.y += delta * 0.2;
    }
  },

  /**
   * Get node by ID
   */
  getNode(id) {
    return this.nodes.get(id);
  },

  /**
   * Clear all nodes
   */
  clear() {
    for (const [id, node] of this.nodes) {
      this.scene.remove(node.mesh);
      node.mesh.geometry.dispose();
      node.mesh.material.dispose();
    }

    this.nodes.clear();
    this.interactiveNodes = [];
    this.animations = [];
  },

  /**
   * Dispose
   */
  dispose() {
    this.clear();
    this.scene = null;
  },
};

export { NODE_TYPES };
export default NodeManager;
