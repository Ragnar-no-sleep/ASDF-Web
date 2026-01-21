/**
 * Yggdrasil Builder's Cosmos - Main Tree Visualization
 * Fire & Ice themed world tree with Stone Islands
 */

'use strict';

import * as THREE from 'three';
import { CONFIG, CAMERA_STATES, VIEWS, GOLDEN_ANGLE, ECOSYSTEM_PROJECTS } from '../config.js';
import { FireParticles, SnowstormParticles, ConnectionParticles } from './particles.js';
import { CameraController } from './camera.js';
import { SkillNodes } from './skills.js';

/**
 * Main Yggdrasil Cosmos visualization
 */
export const Yggdrasil = {
  // Core Three.js
  renderer: null,
  scene: null,
  camera: null,
  clock: null,

  // Groups
  treeGroup: null,
  islandsGroup: null,

  // Special objects
  burnCore: null,
  fireLight: null,

  // Islands data
  islands: new Map(),

  // Controllers
  cameraController: null,
  skillNodes: null,

  // State
  container: null,
  animationId: null,
  isRunning: false,
  currentView: VIEWS.COSMOS,

  // Raycasting
  raycaster: null,
  mouse: null,
  hoveredIsland: null,
  lastRaycastTime: 0,
  raycastThrottle: 33, // ~30fps

  // Callbacks
  callbacks: {
    onIslandHover: null,
    onIslandClick: null,
    onBurnCoreClick: null,
    onSkillHover: null,
    onSkillClick: null
  },

  /**
   * Initialize the cosmos
   */
  async init(container, options = {}) {
    this.container = container;

    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    this.setupLighting();
    this.setupRaycasting();

    // Build the world
    this.buildYggdrasil();
    this.buildBurnCore();
    this.buildIslands();
    this.buildStars();

    // Initialize particles
    FireParticles.init(this.scene);
    SnowstormParticles.init(this.scene);

    // Initialize skill nodes
    this.skillNodes = SkillNodes;
    this.skillNodes.init(this.scene);
    this.setupSkillCallbacks();

    // Camera controller
    this.cameraController = CameraController;
    this.cameraController.init(this.camera, this.renderer.domElement);

    // Events
    this.setupEvents();

    // Start
    this.clock = new THREE.Clock();
    this.start();

    console.log('[Yggdrasil] Cosmos initialized');
    return this;
  },

  /**
   * Setup renderer
   */
  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });

    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(CONFIG.scene.background);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.container.appendChild(this.renderer.domElement);
  },

  /**
   * Setup scene
   */
  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(
      CONFIG.scene.fog.color,
      CONFIG.scene.fog.near,
      CONFIG.scene.fog.far
    );

    this.treeGroup = new THREE.Group();
    this.islandsGroup = new THREE.Group();
    this.scene.add(this.treeGroup);
    this.scene.add(this.islandsGroup);
  },

  /**
   * Setup camera
   */
  setupCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const { position, fov } = CAMERA_STATES.COSMOS;

    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 500);
    this.camera.position.set(position.x, position.y, position.z);
  },

  /**
   * Setup lighting (Fire & Ice)
   */
  setupLighting() {
    const { lighting } = CONFIG;

    // Ambient - cool blue base
    const ambient = new THREE.AmbientLight(
      lighting.ambient.color,
      lighting.ambient.intensity
    );
    this.scene.add(ambient);

    // Fire light - warm, dynamic
    this.fireLight = new THREE.PointLight(
      lighting.fire.color,
      lighting.fire.intensity,
      lighting.fire.distance
    );
    const fp = lighting.fire.position;
    this.fireLight.position.set(fp.x, fp.y, fp.z);
    this.scene.add(this.fireLight);

    // Ice rim light - cold accent
    const iceLight = new THREE.DirectionalLight(
      lighting.ice.color,
      lighting.ice.intensity
    );
    const ip = lighting.ice.position;
    iceLight.position.set(ip.x, ip.y, ip.z);
    this.scene.add(iceLight);

    // Moon light - subtle fill
    const moonLight = new THREE.DirectionalLight(
      lighting.moon.color,
      lighting.moon.intensity
    );
    const mp = lighting.moon.position;
    moonLight.position.set(mp.x, mp.y, mp.z);
    this.scene.add(moonLight);
  },

  /**
   * Setup raycasting
   */
  setupRaycasting() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  },

  /**
   * Build the Yggdrasil tree
   */
  buildYggdrasil() {
    const { tree } = CONFIG;

    // === TRUNK ===
    const trunkGeometry = new THREE.CylinderGeometry(
      tree.trunk.radiusTop,
      tree.trunk.radiusBottom,
      tree.trunk.height,
      tree.trunk.segments
    );

    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: tree.trunk.color,
      roughness: 0.9,
      metalness: 0.1,
      emissive: 0x1a0800,
      emissiveIntensity: 0.2
    });

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = tree.trunk.height / 2;
    this.treeGroup.add(trunk);

    // === BRANCHES (13, golden angle) ===
    const branchMaterial = new THREE.MeshStandardMaterial({
      color: tree.branches.color,
      roughness: 0.8,
      metalness: 0.1,
      emissive: 0x1a0800,
      emissiveIntensity: 0.15
    });

    for (let i = 0; i < tree.branches.count; i++) {
      const t = i / tree.branches.count;
      const angle = i * GOLDEN_ANGLE;
      const height = tree.branches.baseHeight + t * (tree.trunk.height - tree.branches.baseHeight - 2);
      const length = tree.branches.spread * (0.5 + t * 0.5);

      // Create branch curve
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, height, 0),
        new THREE.Vector3(
          Math.cos(angle) * length * 0.5,
          height + 1,
          Math.sin(angle) * length * 0.5
        ),
        new THREE.Vector3(
          Math.cos(angle) * length,
          height + (Math.random() - 0.5) * 2,
          Math.sin(angle) * length
        )
      );

      const branchGeometry = new THREE.TubeGeometry(
        curve,
        8,
        tree.branches.thickness * (1 - t * 0.5),
        6,
        false
      );

      const branch = new THREE.Mesh(branchGeometry, branchMaterial);
      this.treeGroup.add(branch);
    }

    // === ROOTS ===
    const rootMaterial = new THREE.MeshStandardMaterial({
      color: tree.roots.color,
      roughness: 0.95,
      metalness: 0
    });

    for (let i = 0; i < tree.roots.count; i++) {
      const angle = (i / tree.roots.count) * Math.PI * 2;

      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(
          Math.cos(angle) * tree.roots.spread * 0.5,
          -tree.roots.depth * 0.3,
          Math.sin(angle) * tree.roots.spread * 0.5
        ),
        new THREE.Vector3(
          Math.cos(angle) * tree.roots.spread,
          -tree.roots.depth,
          Math.sin(angle) * tree.roots.spread
        )
      );

      const rootGeometry = new THREE.TubeGeometry(curve, 6, 0.2, 5, false);
      const root = new THREE.Mesh(rootGeometry, rootMaterial);
      this.treeGroup.add(root);
    }

    // === GROUND ===
    const groundGeometry = new THREE.CircleGeometry(25, 32);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a1520,
      roughness: 1,
      metalness: 0
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    this.scene.add(ground);
  },

  /**
   * Build the Burn Core (heart of the tree)
   */
  buildBurnCore() {
    const { burnCore } = CONFIG;

    // Core geometry - icosahedron for crystalline look
    const coreGeometry = new THREE.IcosahedronGeometry(burnCore.radius, 1);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: burnCore.color,
      emissive: burnCore.glowColor,
      emissiveIntensity: 1,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.9
    });

    this.burnCore = new THREE.Mesh(coreGeometry, coreMaterial);
    const pos = burnCore.position;
    this.burnCore.position.set(pos.x, pos.y, pos.z);
    this.burnCore.userData = { type: 'burnCore' };

    // Outer glow
    const glowGeometry = new THREE.IcosahedronGeometry(burnCore.radius * 1.3, 1);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: burnCore.glowColor,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.burnCore.add(glow);

    this.treeGroup.add(this.burnCore);
  },

  /**
   * Build Stone Islands from ecosystem projects
   */
  buildIslands() {
    const { islands: islandConfig } = CONFIG;

    ECOSYSTEM_PROJECTS.forEach((project, index) => {
      const t = index / ECOSYSTEM_PROJECTS.length;
      const angle = index * GOLDEN_ANGLE;

      // Position
      const radius = islandConfig.orbitRadius + (Math.random() - 0.5) * 3;
      const height = islandConfig.orbitHeight.min +
        Math.random() * (islandConfig.orbitHeight.max - islandConfig.orbitHeight.min);

      const position = new THREE.Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );

      // Size based on kScore
      const sizeScale = 0.5 + (project.kScore / 100) * 0.5;
      const size = islandConfig.size.min +
        sizeScale * (islandConfig.size.max - islandConfig.size.min);

      // Create island mesh (rock-like)
      const islandGeometry = new THREE.DodecahedronGeometry(size, 1);
      // Deform for organic look
      const positionAttr = islandGeometry.attributes.position;
      for (let i = 0; i < positionAttr.count; i++) {
        const x = positionAttr.getX(i);
        const y = positionAttr.getY(i);
        const z = positionAttr.getZ(i);
        const noise = 0.8 + Math.random() * 0.4;
        positionAttr.setXYZ(i, x * noise, y * noise, z * noise);
      }
      islandGeometry.computeVertexNormals();

      const trackColor = islandConfig.trackColors[project.track] || 0x888888;

      const islandMaterial = new THREE.MeshStandardMaterial({
        color: islandConfig.rockColor,
        roughness: 0.9,
        metalness: 0.1,
        emissive: trackColor,
        emissiveIntensity: project.status === 'live' ? 0.3 : 0.1
      });

      const island = new THREE.Mesh(islandGeometry, islandMaterial);
      island.position.copy(position);
      island.userData = {
        type: 'island',
        project: project,
        originalEmissive: project.status === 'live' ? 0.3 : 0.1
      };

      // Add glow ring
      const ringGeometry = new THREE.TorusGeometry(size * 1.2, 0.1, 8, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: trackColor,
        transparent: true,
        opacity: project.status === 'live' ? 0.5 : 0.2
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      island.add(ring);

      // Building indicator for non-live
      if (project.status === 'building') {
        island.userData.building = true;
      }

      this.islandsGroup.add(island);
      this.islands.set(project.id, {
        mesh: island,
        project: project,
        position: position,
        baseY: position.y
      });

      // Create connection particles to burn core
      ConnectionParticles.createConnection(
        this.scene,
        position,
        CONFIG.burnCore.position,
        trackColor
      );
    });

    console.log('[Yggdrasil] Created', this.islands.size, 'islands');
  },

  /**
   * Build starfield
   */
  buildStars() {
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 100 + Math.random() * 50;

      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);

      // Mix of white, blue, and slight yellow
      const colorChoice = Math.random();
      if (colorChoice < 0.6) {
        colors[i3] = 1; colors[i3 + 1] = 1; colors[i3 + 2] = 1;
      } else if (colorChoice < 0.8) {
        colors[i3] = 0.8; colors[i3 + 1] = 0.9; colors[i3 + 2] = 1;
      } else {
        colors[i3] = 1; colors[i3 + 1] = 0.95; colors[i3 + 2] = 0.8;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  },

  /**
   * Setup events
   */
  setupEvents() {
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
  },

  /**
   * Handle resize
   */
  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  },

  /**
   * Handle mouse move (throttled raycasting)
   */
  onMouseMove(event) {
    // Always update mouse position for click accuracy
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Throttle raycasting to ~30fps for performance
    const now = performance.now();
    if (now - this.lastRaycastTime < this.raycastThrottle) {
      return;
    }
    this.lastRaycastTime = now;

    // Raycast
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check skill hover first (when in project view)
    if (this.currentView === VIEWS.PROJECT_TREE && this.skillNodes.isVisible) {
      const skill = this.skillNodes.checkHover(this.raycaster);
      if (skill) {
        this.renderer.domElement.style.cursor = 'pointer';
        // Clear island hover
        if (this.hoveredIsland) {
          this.unhoverIsland(this.hoveredIsland);
          this.hoveredIsland = null;
        }
        return;
      }
    }

    const intersects = this.raycaster.intersectObjects([
      ...this.islandsGroup.children,
      this.burnCore
    ]);

    const hit = intersects.length > 0 ? intersects[0].object : null;

    // Handle island hover
    if (hit?.userData?.type === 'island') {
      if (this.hoveredIsland !== hit) {
        // Unhover previous
        if (this.hoveredIsland) {
          this.unhoverIsland(this.hoveredIsland);
        }
        // Hover new
        this.hoverIsland(hit);
        this.hoveredIsland = hit;
        this.renderer.domElement.style.cursor = 'pointer';

        if (this.callbacks.onIslandHover) {
          this.callbacks.onIslandHover(hit.userData.project);
        }
      }
    } else if (hit?.userData?.type === 'burnCore') {
      this.renderer.domElement.style.cursor = 'pointer';
      if (this.hoveredIsland) {
        this.unhoverIsland(this.hoveredIsland);
        this.hoveredIsland = null;
      }
    } else {
      if (this.hoveredIsland) {
        this.unhoverIsland(this.hoveredIsland);
        this.hoveredIsland = null;
        if (this.callbacks.onIslandHover) {
          this.callbacks.onIslandHover(null);
        }
      }
      this.renderer.domElement.style.cursor = 'default';
    }
  },

  /**
   * Hover island effect
   */
  hoverIsland(island) {
    island.scale.setScalar(1.2);
    island.material.emissiveIntensity = 0.6;
  },

  /**
   * Unhover island
   */
  unhoverIsland(island) {
    island.scale.setScalar(1);
    island.material.emissiveIntensity = island.userData.originalEmissive;
  },

  /**
   * Handle click
   */
  onClick(event) {
    // Check skill click first (when in project view)
    if (this.currentView === VIEWS.PROJECT_TREE && this.skillNodes.isVisible) {
      const skill = this.skillNodes.handleClick();
      if (skill) {
        if (this.callbacks.onSkillClick) {
          this.callbacks.onSkillClick(skill, this.skillNodes.currentProject);
        }
        return;
      }
    }

    if (this.hoveredIsland) {
      const project = this.hoveredIsland.userData.project;
      const islandPosition = this.hoveredIsland.position.clone();

      // Zoom to island
      this.cameraController.focusOn(islandPosition, 'project');
      this.currentView = VIEWS.PROJECT_TREE;

      // Show skills after a delay for camera transition
      setTimeout(() => {
        this.skillNodes.showForProject(project, islandPosition);
      }, 800);

      if (this.callbacks.onIslandClick) {
        this.callbacks.onIslandClick(project);
      }
    } else {
      // Check burn core click
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.burnCore);
      if (intersects.length > 0) {
        if (this.callbacks.onBurnCoreClick) {
          this.callbacks.onBurnCoreClick();
        }
      }
    }
  },

  /**
   * Setup skill node callbacks
   */
  setupSkillCallbacks() {
    this.skillNodes.on('skillHover', (skill) => {
      if (this.callbacks.onSkillHover) {
        this.callbacks.onSkillHover(skill);
      }
    });

    this.skillNodes.on('skillClick', (skill, project) => {
      if (this.callbacks.onSkillClick) {
        this.callbacks.onSkillClick(skill, project);
      }
    });
  },

  /**
   * Start render loop
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.render();
  },

  /**
   * Stop render loop
   */
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  },

  /**
   * Main render loop
   */
  render() {
    if (!this.isRunning) return;
    this.animationId = requestAnimationFrame(() => this.render());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Update particles
    FireParticles.update(delta);
    SnowstormParticles.update(delta);
    ConnectionParticles.update(delta);

    // Update skill nodes
    this.skillNodes.update(delta, this.camera);

    // Animate burn core
    if (this.burnCore) {
      const pulse = 1 + Math.sin(time * CONFIG.burnCore.pulseSpeed) * CONFIG.burnCore.pulseIntensity;
      this.burnCore.scale.setScalar(pulse);
      this.burnCore.rotation.y += delta * 0.3;
    }

    // Animate fire light
    if (this.fireLight) {
      this.fireLight.intensity = CONFIG.lighting.fire.intensity *
        (0.8 + Math.sin(time * 3) * 0.2 + Math.sin(time * 7) * 0.1);
    }

    // Float islands
    for (const [id, data] of this.islands) {
      const offset = Math.sin(time * 0.5 + data.position.x) * 0.3;
      data.mesh.position.y = data.baseY + offset;

      // Slow rotation
      data.mesh.rotation.y += delta * 0.1;

      // Building shimmer
      if (data.mesh.userData.building) {
        data.mesh.material.opacity = 0.6 + Math.sin(time * 2) * 0.2;
      }
    }

    // Update camera
    this.cameraController.update(delta);

    // Render
    this.renderer.render(this.scene, this.camera);
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
   * Return to cosmos view
   */
  goHome() {
    // Hide skills first
    this.skillNodes.hide();

    this.cameraController.goHome();
    this.currentView = VIEWS.COSMOS;
  },

  /**
   * Get current view
   */
  getCurrentView() {
    return this.currentView;
  },

  /**
   * Dispose
   */
  dispose() {
    this.stop();

    FireParticles.dispose();
    SnowstormParticles.dispose();
    ConnectionParticles.dispose();
    this.skillNodes.dispose();
    this.cameraController.dispose();

    this.renderer.dispose();

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    console.log('[Yggdrasil] Disposed');
  }
};

export default Yggdrasil;
