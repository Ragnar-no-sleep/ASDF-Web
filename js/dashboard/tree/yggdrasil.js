/**
 * Yggdrasil Builder's Cosmos - Main Tree Visualization
 * Fire & Ice themed world tree with Stone Islands
 *
 * Refactored for SRP compliance:
 * - InputController: handles mouse/touch/raycasting
 * - IslandFactory: creates island meshes and hitboxes
 */

'use strict';

import * as THREE from 'three';
import { CONFIG, CAMERA_STATES, VIEWS, GOLDEN_ANGLE } from '../config.js';
import {
  FireParticles,
  SnowstormParticles,
  EmberParticles,
  ConnectionParticles,
} from './particles.js';
import { CameraController } from './camera.js';
import { SkillNodes } from './skills.js';
import { InputController } from './input-controller.js';
import { IslandFactory } from './island-factory.js';

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
  hitboxes: [], // Invisible spheres for fast raycasting

  // Controllers (extracted for SRP)
  cameraController: null,
  skillNodes: null,
  inputController: null,

  // State
  container: null,
  animationId: null,
  isRunning: false,
  currentView: VIEWS.COSMOS,

  // Callbacks
  callbacks: {
    onIslandHover: null,
    onIslandClick: null,
    onBurnCoreClick: null,
    onSkillHover: null,
    onSkillClick: null,
  },

  /**
   * Initialize the cosmos
   */
  async init(container, _options = {}) {
    this.container = container;

    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    this.setupLighting();

    // Build the world
    this.buildYggdrasil();
    this.buildBurnCore();
    this.buildStars();

    // Build islands via factory (SRP extraction)
    const { islands, hitboxes } = IslandFactory.buildAll(this.scene, this.islandsGroup);
    this.islands = islands;
    this.hitboxes = hitboxes;

    // Initialize particles
    FireParticles.init(this.scene);
    SnowstormParticles.init(this.scene);
    EmberParticles.init(this.scene, CONFIG.burnCore.position);

    // Initialize skill nodes
    this.skillNodes = SkillNodes;
    this.skillNodes.init(this.scene);
    this.setupSkillCallbacks();

    // Camera controller
    this.cameraController = CameraController;
    this.cameraController.init(this.camera, this.renderer.domElement);

    // Input controller (SRP extraction)
    this.inputController = InputController;
    this.inputController.init({
      renderer: this.renderer,
      camera: this.camera,
      scene: this.scene,
      getHitboxes: () => this.hitboxes,
      getBurnCore: () => this.burnCore,
      getSkillNodes: () => this.skillNodes,
      getCameraController: () => this.cameraController,
      getCurrentView: () => this.currentView,
    });
    this.setupInputCallbacks();

    // Resize handling
    window.addEventListener('resize', () => this.onResize());

    // Start
    this.clock = new THREE.Clock();
    this.start();

    return this;
  },

  /**
   * Setup renderer
   */
  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
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
    const ambient = new THREE.AmbientLight(lighting.ambient.color, lighting.ambient.intensity);
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
    const iceLight = new THREE.DirectionalLight(lighting.ice.color, lighting.ice.intensity);
    const ip = lighting.ice.position;
    iceLight.position.set(ip.x, ip.y, ip.z);
    this.scene.add(iceLight);

    // Moon light - subtle fill
    const moonLight = new THREE.DirectionalLight(lighting.moon.color, lighting.moon.intensity);
    const mp = lighting.moon.position;
    moonLight.position.set(mp.x, mp.y, mp.z);
    this.scene.add(moonLight);
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
      emissiveIntensity: 0.2,
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
      emissiveIntensity: 0.15,
    });

    for (let i = 0; i < tree.branches.count; i++) {
      const t = i / tree.branches.count;
      const angle = i * GOLDEN_ANGLE;
      const height =
        tree.branches.baseHeight + t * (tree.trunk.height - tree.branches.baseHeight - 2);
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
      metalness: 0,
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
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    this.scene.add(ground);
  },

  /**
   * Build the Burn Core (heart of the tree) - Dramatic fiery effect
   */
  buildBurnCore() {
    const { burnCore } = CONFIG;
    const pos = burnCore.position;

    // Create core group to hold all layers
    this.burnCore = new THREE.Group();
    this.burnCore.position.set(pos.x, pos.y, pos.z);
    this.burnCore.userData = { type: 'burnCore' };

    // === INNER CORE (white-hot center) ===
    const innerGeometry = new THREE.IcosahedronGeometry(burnCore.radius * 0.4, 2);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: burnCore.innerColor || 0xffffcc,
      transparent: true,
      opacity: 0.95,
    });
    const innerCore = new THREE.Mesh(innerGeometry, innerMaterial);
    innerCore.userData = { layer: 'inner' };
    this.burnCore.add(innerCore);

    // === MAIN CORE (burning) ===
    const coreGeometry = new THREE.IcosahedronGeometry(burnCore.radius, 1);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: burnCore.color,
      emissive: burnCore.glowColor,
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85,
    });
    const mainCore = new THREE.Mesh(coreGeometry, coreMaterial);
    mainCore.userData = { layer: 'main', material: coreMaterial };
    this.burnCore.add(mainCore);

    // === FLAME LAYER 1 (inner glow) ===
    const flame1Geometry = new THREE.IcosahedronGeometry(burnCore.radius * 1.3, 1);
    const flame1Material = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.4,
      side: THREE.BackSide,
    });
    const flame1 = new THREE.Mesh(flame1Geometry, flame1Material);
    flame1.userData = { layer: 'flame1', material: flame1Material };
    this.burnCore.add(flame1);

    // === FLAME LAYER 2 (outer glow) ===
    const flame2Geometry = new THREE.IcosahedronGeometry(burnCore.radius * 1.6, 1);
    const flame2Material = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
    });
    const flame2 = new THREE.Mesh(flame2Geometry, flame2Material);
    flame2.userData = { layer: 'flame2', material: flame2Material };
    this.burnCore.add(flame2);

    // === FLAME LAYER 3 (aura) ===
    const flame3Geometry = new THREE.IcosahedronGeometry(burnCore.radius * 2.2, 1);
    const flame3Material = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
    });
    const flame3 = new THREE.Mesh(flame3Geometry, flame3Material);
    flame3.userData = { layer: 'flame3', material: flame3Material };
    this.burnCore.add(flame3);

    // === OUTER HEAT DISTORTION RING ===
    const ringGeometry = new THREE.TorusGeometry(burnCore.radius * 2.5, 0.15, 8, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.3,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.userData = { layer: 'ring', material: ringMaterial };
    this.burnCore.add(ring);

    this.treeGroup.add(this.burnCore);
  },

  /**
   * Animate the Burn Core with pulsing flames
   */
  animateBurnCore(time, delta) {
    if (!this.burnCore) return;

    const { burnCore } = CONFIG;
    const pulse = Math.sin(time * burnCore.pulseSpeed) * burnCore.pulseIntensity;
    const pulse2 = Math.sin(time * burnCore.pulseSpeed * 1.3 + 1) * burnCore.pulseIntensity * 0.5;
    const pulse3 = Math.sin(time * burnCore.pulseSpeed * 0.7 + 2) * burnCore.pulseIntensity * 0.3;

    this.burnCore.children.forEach(child => {
      const layer = child.userData.layer;

      if (layer === 'inner') {
        // White-hot center pulses subtly
        child.scale.setScalar(1 + pulse * 0.1);
      } else if (layer === 'main') {
        // Main core rotates slowly
        child.rotation.y += delta * 0.3;
        child.rotation.x += delta * 0.1;
        // Emissive intensity varies
        if (child.userData.material) {
          child.userData.material.emissiveIntensity = 1.2 + pulse * 0.5;
        }
      } else if (layer === 'flame1') {
        // Inner flame layer
        child.scale.setScalar(1 + pulse * 0.15);
        child.rotation.y -= delta * 0.5;
        if (child.userData.material) {
          child.userData.material.opacity = 0.35 + pulse * 0.1;
        }
      } else if (layer === 'flame2') {
        // Middle flame layer
        child.scale.setScalar(1 + pulse2 * 0.2);
        child.rotation.y += delta * 0.3;
        if (child.userData.material) {
          child.userData.material.opacity = 0.2 + pulse2 * 0.1;
        }
      } else if (layer === 'flame3') {
        // Outer aura
        child.scale.setScalar(1 + pulse3 * 0.25);
        child.rotation.y -= delta * 0.2;
        if (child.userData.material) {
          child.userData.material.opacity = 0.1 + pulse3 * 0.05;
        }
      } else if (layer === 'ring') {
        // Heat ring pulses
        child.scale.setScalar(1 + pulse * 0.1);
        child.rotation.z += delta * 0.5;
        if (child.userData.material) {
          child.userData.material.opacity = 0.25 + pulse * 0.1;
        }
      }
    });

    // Animate fire light intensity
    if (this.fireLight) {
      this.fireLight.intensity = CONFIG.lighting.fire.intensity * (1 + pulse * 0.3);
    }
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
        colors[i3] = 1;
        colors[i3 + 1] = 1;
        colors[i3 + 2] = 1;
      } else if (colorChoice < 0.8) {
        colors[i3] = 0.8;
        colors[i3 + 1] = 0.9;
        colors[i3 + 2] = 1;
      } else {
        colors[i3] = 1;
        colors[i3 + 1] = 0.95;
        colors[i3 + 2] = 0.8;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  },

  /**
   * Setup input controller callbacks
   * Wires InputController events to Yggdrasil callbacks
   */
  setupInputCallbacks() {
    // Island hover -> forward to registered callback
    this.inputController.on('islandHover', project => {
      if (this.callbacks.onIslandHover) {
        this.callbacks.onIslandHover(project);
      }
    });

    // Island click -> zoom + forward
    this.inputController.on('islandClick', island => {
      const project = island.userData.project;
      const islandPosition = island.position.clone();

      // Click feedback
      this.inputController.pulseIsland(island);

      // Zoom to island
      this.cameraController.focusOn(islandPosition, 'project');
      this.currentView = VIEWS.PROJECT_TREE;

      // Show skills after transition
      setTimeout(() => {
        this.skillNodes.showForProject(project, islandPosition);
      }, 500);

      if (this.callbacks.onIslandClick) {
        this.callbacks.onIslandClick(project);
      }
    });

    // Burn core click
    this.inputController.on('burnCoreClick', () => {
      if (this.callbacks.onBurnCoreClick) {
        this.callbacks.onBurnCoreClick();
      }
    });

    // Skill click
    this.inputController.on('skillClick', (skill, project) => {
      if (this.callbacks.onSkillClick) {
        this.callbacks.onSkillClick(skill, project);
      }
    });
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
   * Setup skill node callbacks
   */
  setupSkillCallbacks() {
    this.skillNodes.on('skillHover', skill => {
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
    EmberParticles.update(delta);
    ConnectionParticles.update(delta);

    // Update skill nodes
    this.skillNodes.update(delta, this.camera);

    // Animate burn core with flame layers
    this.animateBurnCore(time, delta);

    // Animate fire light
    if (this.fireLight) {
      this.fireLight.intensity =
        CONFIG.lighting.fire.intensity *
        (0.8 + Math.sin(time * 3) * 0.2 + Math.sin(time * 7) * 0.1);
    }

    // Float and animate islands
    for (const [_id, data] of this.islands) {
      const offset = Math.sin(time * 0.5 + data.position.x) * 0.3;
      data.mesh.position.y = data.baseY + offset;

      // Sync hitbox position with floating island
      if (data.hitbox) {
        data.hitbox.position.y = data.baseY + offset;
      }

      // Slow rotation
      data.mesh.rotation.y += delta * 0.08;

      // Aura pulse
      if (data.mesh.userData.auraMaterial) {
        const basePulse = data.mesh.userData.project?.status === 'live' ? 0.12 : 0.05;
        const pulse = basePulse + Math.sin(time * 1.5 + data.position.x) * 0.05;
        data.mesh.userData.auraMaterial.opacity = pulse;
      }

      // Ring rotation
      if (data.mesh.userData.ringMaterial) {
        // Find the ring mesh and rotate it
        data.mesh.children.forEach(child => {
          if (child.geometry?.type === 'TorusGeometry') {
            child.rotation.z += delta * 0.3;
          }
        });
      }

      // Building shimmer
      if (data.mesh.userData.building && data.mesh.userData.rockMaterial) {
        data.mesh.userData.rockMaterial.emissiveIntensity = 0.1 + Math.sin(time * 2) * 0.08;
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
    if (Object.prototype.hasOwnProperty.call(this.callbacks, key)) {
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

    // Dispose controllers (SRP modules)
    this.inputController?.dispose();
    this.skillNodes?.dispose();
    this.cameraController?.dispose();

    // Dispose particles
    FireParticles.dispose();
    SnowstormParticles.dispose();
    EmberParticles.dispose();
    ConnectionParticles.dispose();

    // Clean up islands and hitboxes via factory
    IslandFactory.disposeAll(this.islands, this.hitboxes, this.scene);
    this.hitboxes = [];

    this.renderer.dispose();

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  },
};

export default Yggdrasil;
