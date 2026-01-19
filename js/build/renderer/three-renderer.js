/**
 * Build V2 - Three.js Renderer
 * 3D Yggdrasil visualization with WebGL
 *
 * @version 1.0.0
 */

'use strict';

import { BuildState } from '../state.js';
import { DataAdapter } from '../data/adapter.js';
import { PHI, GOLDEN_ANGLE, calculatePhiPositions } from '../utils/phi.js';

// ============================================
// CONFIGURATION
// ============================================

const THREE_CONFIG = {
  // Camera settings
  camera: {
    fov: 60,
    near: 0.1,
    far: 1000,
    position: { x: 0, y: 0, z: 50 }
  },
  // Scene settings
  scene: {
    backgroundColor: 0x0a0a0f,
    fogColor: 0x0a0a0f,
    fogNear: 30,
    fogFar: 100
  },
  // Lighting
  lights: {
    ambient: { color: 0x404060, intensity: 0.4 },
    center: { color: 0xff6b35, intensity: 2, distance: 50 },
    accent: { color: 0x00d9ff, intensity: 0.5, distance: 30 }
  },
  // Node geometries
  nodes: {
    radius: 2,
    segments: 8,
    orbitRadius: 20,
    levelSpacing: 8
  },
  // Animation
  animation: {
    rotationSpeed: 0.0005,
    pulseSpeed: 0.002,
    hoverScale: 1.2
  },
  // Performance
  performance: {
    antialias: true,
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    shadowMapEnabled: false
  }
};

// Status colors
const STATUS_COLORS = {
  live: 0x00ff88,
  building: 0xffaa00,
  planned: 0x666688,
  default: 0x444466
};

// ============================================
// THREE.JS RENDERER STATE
// ============================================

let container = null;
let scene = null;
let camera = null;
let renderer = null;
let raycaster = null;
let mouse = null;
let animationFrameId = null;
let isInitialized = false;
let isPaused = false;

// Scene objects
let centerLight = null;
let projectNodes = new Map();
let skillParticles = [];
let hoveredNode = null;
let selectedNode = null;

// Animation state
let time = 0;
let burnIntensity = 0.5;

// ============================================
// THREE.JS RENDERER
// ============================================

const ThreeRenderer = {
  /**
   * Renderer type identifier
   */
  type: 'three',

  /**
   * Three.js library reference (loaded dynamically)
   */
  THREE: null,

  /**
   * Initialize Three.js renderer
   * @param {HTMLElement} containerEl - Container element
   * @param {Object} options - Configuration options
   */
  async init(containerEl, options = {}) {
    if (isInitialized) {
      console.warn('[ThreeRenderer] Already initialized');
      return;
    }

    container = containerEl;

    // Dynamically import Three.js
    try {
      this.THREE = await this.loadThreeJS();
    } catch (error) {
      console.error('[ThreeRenderer] Failed to load Three.js:', error);
      throw error;
    }

    // Setup scene
    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupLights();
    this.setupRaycaster();

    // Create Yggdrasil
    await this.createYggdrasil();

    // Bind events
    this.bindEvents();

    // Start render loop
    this.startLoop();

    isInitialized = true;
    console.log('[ThreeRenderer] Initialized');

    return this;
  },

  /**
   * Load Three.js library dynamically
   * @returns {Promise<Object>}
   */
  async loadThreeJS() {
    // Try to use existing global THREE
    if (window.THREE) {
      return window.THREE;
    }

    // Dynamic import from CDN
    const THREE = await import('https://unpkg.com/three@0.160.0/build/three.module.js');
    return THREE;
  },

  /**
   * Setup Three.js scene
   */
  setupScene() {
    const { THREE } = this;
    const { scene: sceneConfig } = THREE_CONFIG;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(sceneConfig.backgroundColor);
    scene.fog = new THREE.Fog(
      sceneConfig.fogColor,
      sceneConfig.fogNear,
      sceneConfig.fogFar
    );
  },

  /**
   * Setup camera
   */
  setupCamera() {
    const { THREE } = this;
    const { camera: camConfig } = THREE_CONFIG;

    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(
      camConfig.fov,
      aspect,
      camConfig.near,
      camConfig.far
    );
    camera.position.set(
      camConfig.position.x,
      camConfig.position.y,
      camConfig.position.z
    );
    camera.lookAt(0, 0, 0);
  },

  /**
   * Setup WebGL renderer
   */
  setupRenderer() {
    const { THREE } = this;
    const { performance: perfConfig } = THREE_CONFIG;

    renderer = new THREE.WebGLRenderer({
      antialias: perfConfig.antialias,
      alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(perfConfig.pixelRatio);
    renderer.shadowMap.enabled = perfConfig.shadowMapEnabled;

    // Clear container and add canvas
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Style canvas
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
  },

  /**
   * Setup scene lighting
   */
  setupLights() {
    const { THREE } = this;
    const { lights } = THREE_CONFIG;

    // Ambient light
    const ambient = new THREE.AmbientLight(
      lights.ambient.color,
      lights.ambient.intensity
    );
    scene.add(ambient);

    // Center point light (burn engine)
    centerLight = new THREE.PointLight(
      lights.center.color,
      lights.center.intensity,
      lights.center.distance
    );
    centerLight.position.set(0, 0, 0);
    scene.add(centerLight);

    // Accent light
    const accent = new THREE.PointLight(
      lights.accent.color,
      lights.accent.intensity,
      lights.accent.distance
    );
    accent.position.set(15, 10, 10);
    scene.add(accent);
  },

  /**
   * Setup raycaster for mouse interactions
   */
  setupRaycaster() {
    const { THREE } = this;

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
  },

  /**
   * Create Yggdrasil tree structure
   */
  async createYggdrasil() {
    const { THREE } = this;

    // Create center (burn engine)
    this.createBurnCenter();

    // Load project data
    const projects = await DataAdapter.getProjects();

    // Position projects in phi spiral
    const positions = calculatePhiPositions(
      projects,
      0, 0,
      THREE_CONFIG.nodes.orbitRadius,
      THREE_CONFIG.nodes.levelSpacing
    );

    // Create project nodes
    positions.forEach(({ x, y, item: project }) => {
      this.createProjectNode(project, x, y);
    });

    console.log(`[ThreeRenderer] Created ${projects.length} project nodes`);
  },

  /**
   * Create center burn engine visualization
   */
  createBurnCenter() {
    const { THREE } = this;

    // Core sphere
    const geometry = new THREE.IcosahedronGeometry(3, 1);
    const material = new THREE.MeshPhongMaterial({
      color: 0xff6b35,
      emissive: 0xff4400,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9
    });
    const core = new THREE.Mesh(geometry, material);
    core.userData = { type: 'center', id: 'burn-engine' };
    scene.add(core);

    // Outer glow ring
    const ringGeometry = new THREE.TorusGeometry(4, 0.3, 8, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8844,
      transparent: true,
      opacity: 0.3
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    // Store reference
    projectNodes.set('burn-engine', { mesh: core, ring, type: 'center' });
  },

  /**
   * Create a project node
   * @param {Object} project
   * @param {number} x
   * @param {number} y
   */
  createProjectNode(project, x, y) {
    const { THREE } = this;

    // Get color based on status
    const color = STATUS_COLORS[project.status] || STATUS_COLORS.default;

    // Create dodecahedron for stone island effect
    const geometry = new THREE.DodecahedronGeometry(
      THREE_CONFIG.nodes.radius,
      0
    );

    const material = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.1,
      flatShading: true
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 0);

    // Random rotation for natural look
    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;

    // Store project data
    mesh.userData = {
      type: 'project',
      id: project.id,
      project: project,
      originalColor: color,
      baseY: y
    };

    scene.add(mesh);
    projectNodes.set(project.id, { mesh, project });

    // Create skill orbiters if project has skills
    if (project.skills && project.skills.length > 0) {
      this.createSkillOrbiters(mesh, project.skills);
    }
  },

  /**
   * Create orbiting skill particles around a node
   * @param {THREE.Mesh} parentMesh
   * @param {Array} skills
   */
  createSkillOrbiters(parentMesh, skills) {
    const { THREE } = this;

    const group = new THREE.Group();
    const orbitRadius = THREE_CONFIG.nodes.radius * 1.8;

    skills.slice(0, 5).forEach((skill, index) => {
      const angle = index * GOLDEN_ANGLE;
      const geometry = new THREE.SphereGeometry(0.2, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00d9ff,
        transparent: true,
        opacity: 0.7
      });

      const particle = new THREE.Mesh(geometry, material);
      particle.position.set(
        Math.cos(angle) * orbitRadius,
        Math.sin(angle) * orbitRadius,
        0
      );

      particle.userData = {
        type: 'skill',
        skill: skill,
        angle: angle,
        orbitRadius: orbitRadius,
        speed: 0.5 + Math.random() * 0.5
      };

      group.add(particle);
      skillParticles.push(particle);
    });

    group.position.copy(parentMesh.position);
    scene.add(group);
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Mouse move for raycasting
    renderer.domElement.addEventListener('mousemove', (e) => {
      this.onMouseMove(e);
    });

    // Click for selection
    renderer.domElement.addEventListener('click', (e) => {
      this.onClick(e);
    });

    // Resize handler
    window.addEventListener('resize', () => {
      this.resize();
    });

    // Visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  },

  /**
   * Handle mouse move
   * @param {MouseEvent} e
   */
  onMouseMove(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(
      Array.from(projectNodes.values()).map(n => n.mesh)
    );

    if (intersects.length > 0) {
      const node = intersects[0].object;
      if (node !== hoveredNode) {
        this.onNodeHover(node);
      }
    } else if (hoveredNode) {
      this.onNodeUnhover();
    }
  },

  /**
   * Handle node hover
   * @param {THREE.Mesh} node
   */
  onNodeHover(node) {
    // Reset previous
    if (hoveredNode) {
      this.onNodeUnhover();
    }

    hoveredNode = node;
    renderer.domElement.style.cursor = 'pointer';

    // Scale up
    node.scale.setScalar(THREE_CONFIG.animation.hoverScale);

    // Brighten emissive
    if (node.material.emissiveIntensity !== undefined) {
      node.material.emissiveIntensity = 0.5;
    }

    // Emit event
    if (node.userData.id) {
      BuildState.emit('renderer:nodeHover', {
        projectId: node.userData.id,
        position: this.getNodeScreenPosition(node)
      });
    }
  },

  /**
   * Handle node unhover
   */
  onNodeUnhover() {
    if (!hoveredNode) return;

    renderer.domElement.style.cursor = 'default';

    // Reset scale
    hoveredNode.scale.setScalar(1);

    // Reset emissive
    if (hoveredNode.material.emissiveIntensity !== undefined) {
      hoveredNode.material.emissiveIntensity = 0.1;
    }

    hoveredNode = null;

    BuildState.emit('renderer:nodeUnhover', {});
  },

  /**
   * Handle click
   * @param {MouseEvent} e
   */
  onClick(e) {
    if (hoveredNode && hoveredNode.userData.id) {
      this.selectProject(hoveredNode.userData.id);

      BuildState.emit('renderer:nodeClick', {
        projectId: hoveredNode.userData.id,
        project: hoveredNode.userData.project
      });
    }
  },

  /**
   * Get node position in screen coordinates
   * @param {THREE.Mesh} node
   * @returns {Object}
   */
  getNodeScreenPosition(node) {
    const { THREE } = this;
    const vector = new THREE.Vector3();

    node.getWorldPosition(vector);
    vector.project(camera);

    const rect = renderer.domElement.getBoundingClientRect();

    return {
      x: (vector.x * 0.5 + 0.5) * rect.width + rect.left,
      y: (-vector.y * 0.5 + 0.5) * rect.height + rect.top
    };
  },

  /**
   * Update renderer
   * @param {Object} data
   */
  update(data = {}) {
    if (!isInitialized) return;

    if (data.selectedProject) {
      this.selectProject(data.selectedProject);
    }

    if (typeof data.burnIntensity === 'number') {
      this.updateBurnIntensity(data.burnIntensity);
    }

    if (data.filter) {
      this.applyFilter(data.filter);
    }
  },

  /**
   * Select a project
   * @param {string} projectId
   */
  selectProject(projectId) {
    const { THREE } = this;

    // Reset previous selection
    if (selectedNode) {
      const data = projectNodes.get(selectedNode.userData.id);
      if (data) {
        selectedNode.material.emissive.setHex(data.mesh.userData.originalColor);
        selectedNode.material.emissiveIntensity = 0.1;
      }
    }

    // Select new
    const nodeData = projectNodes.get(projectId);
    if (nodeData) {
      selectedNode = nodeData.mesh;
      selectedNode.material.emissive.setHex(0xffffff);
      selectedNode.material.emissiveIntensity = 0.3;
    }

    BuildState.emit('renderer:nodeSelected', { projectId });
  },

  /**
   * Update burn intensity
   * @param {number} intensity - 0 to 1
   */
  updateBurnIntensity(intensity) {
    burnIntensity = intensity;

    if (centerLight) {
      // Map intensity to light strength
      centerLight.intensity = 1 + intensity * 3;

      // Update color temperature (more orange when intense)
      const r = 1;
      const g = 0.4 + (1 - intensity) * 0.2;
      const b = 0.2 + (1 - intensity) * 0.15;
      centerLight.color.setRGB(r, g, b);
    }
  },

  /**
   * Apply status filter
   * @param {string} status
   */
  applyFilter(status) {
    projectNodes.forEach((data, id) => {
      if (id === 'burn-engine') return;

      const { mesh, project } = data;
      const visible = status === 'all' || project?.status === status;

      mesh.visible = visible;
      mesh.material.opacity = visible ? 1 : 0.2;
    });
  },

  /**
   * Focus camera on node
   * @param {string} projectId
   * @param {Object} options
   */
  focusOnNode(projectId, options = {}) {
    const nodeData = projectNodes.get(projectId);
    if (!nodeData) return;

    const targetPos = nodeData.mesh.position.clone();

    // Animate camera (simple lerp for now)
    const duration = options.instant ? 0 : 1000;
    const startPos = camera.position.clone();
    const endPos = targetPos.clone();
    endPos.z += 20; // Pull back a bit

    if (duration > 0) {
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = t * (2 - t); // ease-out

        camera.position.lerpVectors(startPos, endPos, eased);
        camera.lookAt(targetPos);

        if (t < 1) {
          requestAnimationFrame(animate);
        }
      };
      animate();
    } else {
      camera.position.copy(endPos);
      camera.lookAt(targetPos);
    }

    this.selectProject(projectId);
  },

  /**
   * Get node position
   * @param {string} projectId
   * @returns {Object|null}
   */
  getNodePosition(projectId) {
    const nodeData = projectNodes.get(projectId);
    if (!nodeData) return null;

    return this.getNodeScreenPosition(nodeData.mesh);
  },

  /**
   * Start render loop
   */
  startLoop() {
    if (animationFrameId) return;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (isPaused) return;

      time += 0.016; // ~60fps

      // Rotate scene slightly
      scene.rotation.y += THREE_CONFIG.animation.rotationSpeed;

      // Animate center pulse
      const centerData = projectNodes.get('burn-engine');
      if (centerData) {
        const pulseScale = 1 + Math.sin(time * THREE_CONFIG.animation.pulseSpeed * 1000 * burnIntensity) * 0.1;
        centerData.mesh.scale.setScalar(pulseScale);
      }

      // Animate skill particles
      skillParticles.forEach(particle => {
        const { angle, orbitRadius, speed } = particle.userData;
        const newAngle = angle + time * speed;
        particle.position.x = Math.cos(newAngle) * orbitRadius;
        particle.position.y = Math.sin(newAngle) * orbitRadius;
      });

      // Gentle float on nodes
      projectNodes.forEach((data, id) => {
        if (id === 'burn-engine') return;
        if (data.mesh && data.mesh.userData.baseY !== undefined) {
          data.mesh.position.y = data.mesh.userData.baseY + Math.sin(time + data.mesh.position.x) * 0.3;
        }
      });

      renderer.render(scene, camera);
    };

    animate();
    console.log('[ThreeRenderer] Render loop started');
  },

  /**
   * Stop render loop
   */
  stopLoop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  },

  /**
   * Pause rendering
   */
  pause() {
    isPaused = true;
    console.log('[ThreeRenderer] Paused');
  },

  /**
   * Resume rendering
   */
  resume() {
    isPaused = false;
    console.log('[ThreeRenderer] Resumed');
  },

  /**
   * Handle resize
   */
  resize() {
    if (!container || !camera || !renderer) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);

    BuildState.emit('renderer:resize', { width, height });
  },

  /**
   * Check if initialized
   * @returns {boolean}
   */
  isReady() {
    return isInitialized;
  },

  /**
   * Get renderer info
   * @returns {Object}
   */
  getInfo() {
    return {
      type: 'three',
      initialized: isInitialized,
      nodeCount: projectNodes.size,
      particleCount: skillParticles.length
    };
  },

  /**
   * Dispose renderer and clean up
   */
  dispose() {
    this.stopLoop();

    // Dispose geometries and materials
    projectNodes.forEach(data => {
      if (data.mesh) {
        data.mesh.geometry?.dispose();
        data.mesh.material?.dispose();
      }
    });

    skillParticles.forEach(p => {
      p.geometry?.dispose();
      p.material?.dispose();
    });

    // Clear collections
    projectNodes.clear();
    skillParticles = [];

    // Dispose renderer
    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
    }

    // Reset state
    scene = null;
    camera = null;
    renderer = null;
    container = null;
    isInitialized = false;
    isPaused = false;

    console.log('[ThreeRenderer] Disposed');
  }
};

// ============================================
// EXPORTS
// ============================================

export { ThreeRenderer };
export default ThreeRenderer;

// Global export for browser
if (typeof window !== 'undefined') {
  window.ThreeRenderer = ThreeRenderer;
}
