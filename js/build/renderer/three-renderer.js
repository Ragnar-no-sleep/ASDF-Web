/**
 * Build V2 - Three.js Renderer
 * Immersive 3D Yggdrasil visualization with WebGL
 *
 * @version 2.0.0
 */

'use strict';

import { BuildState } from '../state.js';
import { DataAdapter } from '../data/adapter.js';
import { PHI, GOLDEN_ANGLE, calculatePhiPositions, calculateFermatSpiral } from '../utils/phi.js';

// Import 3D components
import { FireParticles } from './effects/fire-particles.js';
import { SnowParticles } from './effects/snow-particles.js';
import { YggdrasilTree } from './objects/yggdrasil-tree.js';
import { StoneIsland, StoneIslandFactory } from './objects/stone-island.js';
import { BurnCore } from './objects/burn-core.js';
import { CameraController } from './camera/camera-controller.js';
import { PostProcessing } from './effects/post-processing.js';
import { PerformanceManager } from './performance.js';

// ============================================
// CONFIGURATION
// ============================================

const THREE_CONFIG = {
  // Camera settings
  camera: {
    fov: 60,
    near: 0.1,
    far: 500,
    position: { x: 0, y: 15, z: 70 }
  },
  // Scene settings
  scene: {
    backgroundColor: 0x020812,
    fogColor: 0x020812,
    fogNear: 50,
    fogFar: 200
  },
  // Lighting
  lights: {
    ambient: { color: 0x1a1a2e, intensity: 0.3 },
    moon: { color: 0x8888ff, intensity: 0.4, position: { x: 50, y: 80, z: -30 } },
    fill: { color: 0x00d9ff, intensity: 0.2, position: { x: -30, y: 20, z: 40 } }
  },
  // Island distribution
  islands: {
    baseRadius: 25,
    radiusStep: 3,
    verticalSpread: 15
  },
  // Animation
  animation: {
    globalRotationSpeed: 0.0002
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
  planned: 0x8855cc,
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
let clock = null;

// 3D Objects
let yggdrasilTree = null;
let burnCore = null;
let fireParticles = null;
let snowParticles = null;
let cameraController = null;
let islands = new Map();

// Post-processing and performance
let postProcessing = null;
let performanceSettings = null;

// Interaction state
let hoveredIsland = null;
let selectedIsland = null;
let raycastTargets = [];

// Animation state
let time = 0;
let burnIntensity = 0.7;

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
      clock = new this.THREE.Clock();
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

    // Create 3D world
    await this.createWorld();

    // Setup camera controller
    cameraController = new CameraController(
      this.THREE,
      camera,
      renderer.domElement,
      { orbit: { autoRotate: true, autoRotateSpeed: 0.15 } }
    );

    // Initialize performance manager
    performanceSettings = PerformanceManager.init({
      onQualityChange: (data) => this.onQualityChange(data)
    });

    // Initialize post-processing (if enabled)
    if (performanceSettings.postProcessing) {
      try {
        postProcessing = new PostProcessing(this.THREE, renderer, scene, camera, {
          bloom: { strength: performanceSettings.bloom || 0.8 }
        });
        await postProcessing.init();
        console.log('[ThreeRenderer] Post-processing enabled');
      } catch (error) {
        console.warn('[ThreeRenderer] Post-processing failed:', error);
        postProcessing = null;
      }
    }

    // Bind events
    this.bindEvents();

    // Start render loop
    this.startLoop();

    isInitialized = true;
    console.log('[ThreeRenderer] Initialized with immersive 3D');

    return this;
  },

  /**
   * Load Three.js library dynamically
   * @returns {Promise<Object>}
   */
  async loadThreeJS() {
    if (window.THREE) {
      return window.THREE;
    }

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
    scene.fog = new THREE.FogExp2(sceneConfig.fogColor, 0.008);
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
    camera.lookAt(0, 5, 0);
  },

  /**
   * Setup WebGL renderer
   */
  setupRenderer() {
    const { THREE } = this;
    const { performance: perfConfig } = THREE_CONFIG;

    renderer = new THREE.WebGLRenderer({
      antialias: perfConfig.antialias,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(perfConfig.pixelRatio);
    renderer.shadowMap.enabled = perfConfig.shadowMapEnabled;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

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

    // Ambient light (very dim)
    const ambient = new THREE.AmbientLight(
      lights.ambient.color,
      lights.ambient.intensity
    );
    scene.add(ambient);

    // Moonlight (directional)
    const moonLight = new THREE.DirectionalLight(
      lights.moon.color,
      lights.moon.intensity
    );
    moonLight.position.set(
      lights.moon.position.x,
      lights.moon.position.y,
      lights.moon.position.z
    );
    scene.add(moonLight);

    // Fill light (subtle cyan)
    const fillLight = new THREE.PointLight(
      lights.fill.color,
      lights.fill.intensity,
      100
    );
    fillLight.position.set(
      lights.fill.position.x,
      lights.fill.position.y,
      lights.fill.position.z
    );
    scene.add(fillLight);
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
   * Create the 3D world
   */
  async createWorld() {
    const { THREE } = this;

    // Create Yggdrasil Tree
    yggdrasilTree = new YggdrasilTree(THREE);
    const treeGroup = yggdrasilTree.init();
    scene.add(treeGroup);

    // Create Burn Core at center
    burnCore = new BurnCore(THREE);
    const coreGroup = burnCore.init(new THREE.Vector3(0, 5, 0));
    scene.add(coreGroup);
    raycastTargets.push(burnCore.getRaycastTarget());

    // Create Fire Particles around core
    fireParticles = new FireParticles(THREE);
    const fireGroup = fireParticles.init(new THREE.Vector3(0, 2, 0));
    scene.add(fireGroup);

    // Create Snow Particles (environment)
    snowParticles = new SnowParticles(THREE);
    const snowGroup = snowParticles.init();
    scene.add(snowGroup);

    // Load projects and create islands
    const projectsData = await DataAdapter.getProjects();
    const projects = Object.values(projectsData);
    await this.createProjectIslands(projects);

    console.log(`[ThreeRenderer] Created world with ${projects.length} project islands`);
  },

  /**
   * Create floating islands for projects
   * @param {Array} projects
   */
  async createProjectIslands(projects) {
    const { THREE } = this;
    const { islands: islandConfig } = THREE_CONFIG;

    // Calculate positions using Fermat spiral
    const positions = calculateFermatSpiral(
      projects,
      0, 0,
      islandConfig.baseRadius / 5
    );

    // Create islands at calculated positions
    projects.forEach((project, index) => {
      const posData = positions[index];

      // Add vertical variation based on status
      let yOffset = 0;
      if (project.status === 'live') yOffset = 8;
      else if (project.status === 'building') yOffset = 3;
      else yOffset = -2;

      // Add some randomness
      yOffset += (Math.random() - 0.5) * 5;

      const position = new THREE.Vector3(
        posData.x,
        yOffset,
        posData.y // Use y from 2D calculation as z
      );

      // Create island
      const island = new StoneIsland(THREE, project);
      island.init(position);

      // Add to scene and tracking
      scene.add(island.getGroup());
      islands.set(project.id, island);

      // Add to raycast targets
      raycastTargets.push(island.getRaycastTarget());
    });
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
    const intersects = raycaster.intersectObjects(raycastTargets, true);

    if (intersects.length > 0) {
      const intersected = intersects[0].object;
      const projectId = intersected.userData?.projectId;

      if (projectId && projectId !== hoveredIsland?.getProjectId()) {
        this.onIslandHover(projectId);
      }
    } else if (hoveredIsland) {
      this.onIslandUnhover();
    }
  },

  /**
   * Handle island hover
   * @param {string} projectId
   */
  onIslandHover(projectId) {
    // Unhover previous
    if (hoveredIsland) {
      hoveredIsland.setHovered(false);
    }

    // Hover new
    const island = islands.get(projectId);
    if (island) {
      hoveredIsland = island;
      hoveredIsland.setHovered(true);
      renderer.domElement.style.cursor = 'pointer';

      // Emit event
      BuildState.emit('renderer:nodeHover', {
        projectId,
        position: this.getScreenPosition(island.getPosition())
      });
    }
  },

  /**
   * Handle island unhover
   */
  onIslandUnhover() {
    if (!hoveredIsland) return;

    hoveredIsland.setHovered(false);
    hoveredIsland = null;
    renderer.domElement.style.cursor = 'default';

    BuildState.emit('renderer:nodeUnhover', {});
  },

  /**
   * Handle click
   * @param {MouseEvent} e
   */
  onClick(e) {
    if (hoveredIsland) {
      const projectId = hoveredIsland.getProjectId();
      this.selectProject(projectId);

      BuildState.emit('renderer:nodeClick', {
        projectId,
        project: hoveredIsland.project
      });

      // Zoom to island
      cameraController.zoomToNode(hoveredIsland.getPosition(), {
        distance: 20,
        duration: 1200
      });
    } else if (burnCore) {
      // Check if clicking burn core
      raycaster.setFromCamera(mouse, camera);
      const coreIntersect = raycaster.intersectObject(burnCore.getRaycastTarget());

      if (coreIntersect.length > 0) {
        BuildState.emit('renderer:nodeClick', {
          projectId: 'burn-engine',
          project: { id: 'burn-engine', name: 'Burn Engine' }
        });

        cameraController.zoomToNode(burnCore.getGroup().position, {
          distance: 25,
          duration: 1000
        });
      }
    }
  },

  /**
   * Get screen position from 3D position
   * @param {THREE.Vector3} position
   * @returns {Object}
   */
  getScreenPosition(position) {
    const { THREE } = this;
    const vector = position.clone();
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
    // Deselect previous
    if (selectedIsland) {
      selectedIsland.setSelected(false);
    }

    // Select new
    const island = islands.get(projectId);
    if (island) {
      selectedIsland = island;
      selectedIsland.setSelected(true);
    }

    BuildState.emit('renderer:nodeSelected', { projectId });
  },

  /**
   * Update burn intensity
   * @param {number} intensity - 0 to 1
   */
  updateBurnIntensity(intensity) {
    burnIntensity = intensity;

    if (burnCore) {
      burnCore.setIntensity(intensity);
    }
  },

  /**
   * Apply status filter
   * @param {string} status
   */
  applyFilter(status) {
    islands.forEach((island, id) => {
      const project = island.project;
      const visible = status === 'all' || project?.status === status;

      island.getGroup().visible = visible;
    });
  },

  /**
   * Focus camera on node
   * @param {string} projectId
   * @param {Object} options
   */
  focusOnNode(projectId, options = {}) {
    const island = islands.get(projectId);
    if (!island) return;

    cameraController.zoomToNode(island.getPosition(), {
      distance: options.distance || 20,
      duration: options.duration || 1000
    });

    this.selectProject(projectId);
  },

  /**
   * Reset camera to default view
   */
  resetView() {
    if (cameraController) {
      cameraController.resetView({ duration: 1500 });
    }

    // Deselect
    if (selectedIsland) {
      selectedIsland.setSelected(false);
      selectedIsland = null;
    }
  },

  /**
   * Get node position
   * @param {string} projectId
   * @returns {Object|null}
   */
  getNodePosition(projectId) {
    const island = islands.get(projectId);
    if (!island) return null;

    return this.getScreenPosition(island.getPosition());
  },

  /**
   * Start render loop
   */
  startLoop() {
    if (animationFrameId) return;

    const animate = (timestamp) => {
      animationFrameId = requestAnimationFrame(animate);

      if (isPaused) return;

      // Update performance tracking
      PerformanceManager.tick(timestamp);

      const deltaTime = clock.getDelta();
      time += deltaTime;

      // Update camera controller
      if (cameraController) {
        cameraController.update(deltaTime);
      }

      // Update burn core
      if (burnCore) {
        burnCore.update(deltaTime);
      }

      // Update fire particles
      if (fireParticles) {
        fireParticles.update(deltaTime, burnIntensity);
      }

      // Update snow particles
      if (snowParticles) {
        snowParticles.update(deltaTime);
      }

      // Update tree animation
      if (yggdrasilTree) {
        yggdrasilTree.animate(time, 0.15);
      }

      // Update islands
      islands.forEach(island => {
        island.update(deltaTime);
      });

      // Render with or without post-processing
      if (postProcessing && postProcessing.enabled) {
        postProcessing.render(deltaTime);
      } else {
        renderer.render(scene, camera);
      }
    };

    animate(performance.now());
    console.log('[ThreeRenderer] Render loop started');
  },

  /**
   * Handle quality change from performance manager
   * @param {Object} data
   */
  onQualityChange(data) {
    const { newPreset, settings } = data;
    console.log(`[ThreeRenderer] Quality changed to: ${newPreset}`);

    // Update post-processing
    if (postProcessing) {
      if (settings.postProcessing) {
        postProcessing.setEnabled(true);
        postProcessing.setBloomStrength(settings.bloom || 0.5);
      } else {
        postProcessing.setEnabled(false);
      }
    }

    // Update particle counts (would require recreating particles)
    // For now, just log the change
    BuildState.emit('renderer:qualityChange', {
      preset: newPreset,
      settings
    });
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
    clock.getDelta(); // Reset delta
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
      islandCount: islands.size,
      hasTree: !!yggdrasilTree,
      hasParticles: !!(fireParticles && snowParticles)
    };
  },

  /**
   * Dispose renderer and clean up
   */
  dispose() {
    this.stopLoop();

    // Dispose 3D objects
    if (yggdrasilTree) {
      yggdrasilTree.dispose();
      yggdrasilTree = null;
    }

    if (burnCore) {
      burnCore.dispose();
      burnCore = null;
    }

    if (fireParticles) {
      fireParticles.dispose();
      fireParticles = null;
    }

    if (snowParticles) {
      snowParticles.dispose();
      snowParticles = null;
    }

    islands.forEach(island => island.dispose());
    islands.clear();

    // Dispose camera controller
    if (cameraController) {
      cameraController.dispose();
      cameraController = null;
    }

    // Dispose post-processing
    if (postProcessing) {
      postProcessing.dispose();
      postProcessing = null;
    }

    // Dispose renderer
    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
    }

    // Clear arrays
    raycastTargets = [];

    // Reset state
    scene = null;
    camera = null;
    renderer = null;
    container = null;
    isInitialized = false;
    isPaused = false;
    hoveredIsland = null;
    selectedIsland = null;

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
