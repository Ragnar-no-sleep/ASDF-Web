/**
 * Build V2 - Project Tree Scene
 * L1 view: Zoomed project with phi-spiral skill nodes
 *
 * @version 1.0.0
 * @created 2026-01-21
 */

'use strict';

import { BuildState } from '../../state.js';
import { DataAdapter } from '../../data/adapter.js';
import { SkillNode, SkillNodeFactory, calculatePhiSpiralPositions } from '../objects/skill-node.js';
import { PHI, GOLDEN_ANGLE } from '../../utils/phi.js';

// ============================================
// PROJECT TREE CONFIGURATION
// ============================================

const PROJECT_TREE_CONFIG = {
  // Central project display
  project: {
    titleOffset: { x: 0, y: 4, z: 0 },
    iconScale: 2
  },
  // Skill node spiral
  spiral: {
    centerRadius: 4,
    maxRadius: 14,
    verticalSpread: 3
  },
  // Connection lines between skills
  connections: {
    color: 0x4488ff,
    opacity: 0.3,
    lineWidth: 1
  },
  // Animation
  animation: {
    staggerDelay: 100,  // ms between node appearances
    fadeInDuration: 500
  }
};

// ============================================
// PROJECT TREE SCENE CLASS
// ============================================

class ProjectTreeScene {
  /**
   * Create project tree scene
   * @param {Object} THREE - Three.js library reference
   * @param {THREE.Scene} parentScene - Main scene to add objects to
   */
  constructor(THREE, parentScene) {
    this.THREE = THREE;
    this.parentScene = parentScene;

    // Scene group (for easy show/hide)
    this.group = new THREE.Group();
    this.group.name = 'ProjectTreeScene';
    this.group.visible = false;

    // Current project
    this.currentProject = null;
    this.currentProjectId = null;

    // Skill nodes
    this.skillNodes = new Map();
    this.raycastTargets = [];

    // Connections
    this.connectionLines = [];

    // Interaction state
    this.hoveredNode = null;
    this.selectedNode = null;

    // Animation state
    this.isTransitioning = false;
    this.time = 0;

    // Add to parent scene
    this.parentScene.add(this.group);
  }

  /**
   * Load and display a project
   * @param {string} projectId - Project ID to load
   * @param {Object} projectData - Optional project data (if already loaded)
   */
  async loadProject(projectId, projectData = null) {
    // Clear previous project
    this.clear();

    // Get project data
    this.currentProjectId = projectId;
    this.currentProject = projectData || await DataAdapter.getProject(projectId);

    if (!this.currentProject) {
      console.error('[ProjectTreeScene] Project not found:', projectId);
      return;
    }

    // Get modules/skills for this project
    const skills = await this.getProjectSkills(projectId);

    // Create skill nodes in phi-spiral
    this.createSkillNodes(skills);

    // Create connections between skills
    this.createConnections(skills);

    // Create central project indicator
    this.createProjectCenter();

    // Emit event
    BuildState.emit('projectTree:loaded', {
      projectId,
      project: this.currentProject,
      skillCount: skills.length
    });

    console.log(`[ProjectTreeScene] Loaded project: ${projectId} with ${skills.length} skills`);
  }

  /**
   * Get skills/modules for a project
   * @param {string} projectId
   * @returns {Array}
   */
  async getProjectSkills(projectId) {
    // Map project to track for formations
    const projectToTrack = {
      'learn-platform': 'dev',
      'games-platform': 'games',
      'content-factory': 'content',
      // Default: use project miniTree as skills
    };

    const trackId = projectToTrack[projectId];

    if (trackId) {
      // Get modules from formations
      const modules = await DataAdapter.getModules(trackId);
      return modules.map((module, index) => ({
        id: module.id,
        title: module.title,
        description: module.description,
        xp: module.xpReward || 0,
        state: this.getSkillState(module),
        order: index,
        prerequisites: module.prerequisites || []
      }));
    }

    // Fallback: Use project miniTree as skills
    if (this.currentProject.miniTree && this.currentProject.miniTree.length > 0) {
      return this.currentProject.miniTree.map((item, index) => ({
        id: `${projectId}-skill-${index}`,
        title: item,
        description: `Part of ${this.currentProject.title}`,
        xp: 100,
        state: 'available',
        order: index,
        prerequisites: index > 0 ? [`${projectId}-skill-${index - 1}`] : []
      }));
    }

    // Fallback: Generate placeholder skills
    return [
      { id: `${projectId}-overview`, title: 'Overview', state: 'available', order: 0 },
      { id: `${projectId}-setup`, title: 'Setup', state: 'locked', order: 1 },
      { id: `${projectId}-basics`, title: 'Basics', state: 'locked', order: 2 },
      { id: `${projectId}-advanced`, title: 'Advanced', state: 'locked', order: 3 },
      { id: `${projectId}-mastery`, title: 'Mastery', state: 'locked', order: 4 }
    ];
  }

  /**
   * Determine skill state based on user progress
   * @param {Object} module
   * @returns {string}
   */
  getSkillState(module) {
    // TODO: Get actual progress from SolanaClient or localStorage
    // For now, first module is available, rest are locked
    if (module.order === 0) return 'available';
    return 'locked';
  }

  /**
   * Create skill nodes
   * @param {Array} skills
   */
  createSkillNodes(skills) {
    const { THREE } = this;
    const positions = calculatePhiSpiralPositions(skills, PROJECT_TREE_CONFIG.spiral);

    positions.forEach(({ skill, position }, index) => {
      const node = new SkillNode(THREE, skill);
      node.init(new THREE.Vector3(position.x, position.y, position.z));

      // Store reference
      this.skillNodes.set(skill.id, node);
      this.raycastTargets.push(node.getRaycastTarget());

      // Add to scene group
      this.group.add(node.getGroup());

      // Staggered fade-in (optional animation)
      node.getGroup().scale.setScalar(0);
      setTimeout(() => {
        this.animateNodeIn(node);
      }, index * PROJECT_TREE_CONFIG.animation.staggerDelay);
    });
  }

  /**
   * Animate node appearing
   * @param {SkillNode} node
   */
  animateNodeIn(node) {
    // Simple scale animation
    const startScale = 0;
    const endScale = 1;
    const duration = PROJECT_TREE_CONFIG.animation.fadeInDuration;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const scale = startScale + (endScale - startScale) * eased;

      node.getGroup().scale.setScalar(scale);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  /**
   * Create connection lines between skills
   * @param {Array} skills
   */
  createConnections(skills) {
    const { THREE } = this;
    const { connections } = PROJECT_TREE_CONFIG;

    skills.forEach(skill => {
      if (!skill.prerequisites || skill.prerequisites.length === 0) return;

      skill.prerequisites.forEach(prereqId => {
        const fromNode = this.skillNodes.get(prereqId);
        const toNode = this.skillNodes.get(skill.id);

        if (!fromNode || !toNode) return;

        const points = [
          fromNode.getPosition(),
          toNode.getPosition()
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: connections.color,
          transparent: true,
          opacity: connections.opacity
        });

        const line = new THREE.Line(geometry, material);
        this.connectionLines.push(line);
        this.group.add(line);
      });
    });
  }

  /**
   * Create central project indicator
   */
  createProjectCenter() {
    const { THREE } = this;

    // Central glow sphere representing the project
    const geometry = new THREE.SphereGeometry(1.5, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: 0x00d9ff,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.6
    });

    const centerSphere = new THREE.Mesh(geometry, material);
    centerSphere.userData = {
      type: 'projectCenter',
      projectId: this.currentProjectId
    };

    this.group.add(centerSphere);

    // Point light at center
    const light = new THREE.PointLight(0x00d9ff, 0.8, 20);
    this.group.add(light);
  }

  /**
   * Show the scene
   */
  show() {
    this.group.visible = true;
    this.isTransitioning = false;
  }

  /**
   * Hide the scene
   */
  hide() {
    this.group.visible = false;
  }

  /**
   * Check if scene is visible
   * @returns {boolean}
   */
  isVisible() {
    return this.group.visible;
  }

  /**
   * Update scene (call each frame)
   * @param {number} deltaTime
   */
  update(deltaTime) {
    if (!this.group.visible) return;

    this.time += deltaTime;

    // Update all skill nodes
    this.skillNodes.forEach(node => {
      node.update(deltaTime);
    });
  }

  /**
   * Handle mouse move for hover detection
   * @param {THREE.Raycaster} raycaster
   * @returns {SkillNode|null} - Hovered node
   */
  handleMouseMove(raycaster) {
    if (!this.group.visible || this.raycastTargets.length === 0) return null;

    const intersects = raycaster.intersectObjects(this.raycastTargets, false);

    // Clear previous hover
    if (this.hoveredNode) {
      this.hoveredNode.setHovered(false);
      this.hoveredNode = null;
    }

    if (intersects.length > 0) {
      const skillId = intersects[0].object.userData.skillId;
      const node = this.skillNodes.get(skillId);

      if (node && node.state !== 'locked') {
        node.setHovered(true);
        this.hoveredNode = node;
        return node;
      }
    }

    return null;
  }

  /**
   * Handle click
   * @param {THREE.Raycaster} raycaster
   * @returns {SkillNode|null} - Clicked node
   */
  handleClick(raycaster) {
    if (!this.group.visible) return null;

    const intersects = raycaster.intersectObjects(this.raycastTargets, false);

    if (intersects.length > 0) {
      const skillId = intersects[0].object.userData.skillId;
      const node = this.skillNodes.get(skillId);

      if (node && node.state !== 'locked') {
        // Deselect previous
        if (this.selectedNode) {
          this.selectedNode.setSelected(false);
        }

        // Select new
        node.setSelected(true);
        this.selectedNode = node;

        // Emit event
        BuildState.emit('projectTree:skillClick', {
          skillId,
          skill: node.skill,
          projectId: this.currentProjectId
        });

        return node;
      }
    }

    return null;
  }

  /**
   * Get raycast targets
   * @returns {Array}
   */
  getRaycastTargets() {
    return this.raycastTargets;
  }

  /**
   * Clear the scene
   */
  clear() {
    // Dispose skill nodes
    this.skillNodes.forEach(node => {
      this.group.remove(node.getGroup());
      node.dispose();
    });
    this.skillNodes.clear();
    this.raycastTargets = [];

    // Dispose connection lines
    this.connectionLines.forEach(line => {
      this.group.remove(line);
      line.geometry.dispose();
      line.material.dispose();
    });
    this.connectionLines = [];

    // Remove all remaining children
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    this.currentProject = null;
    this.currentProjectId = null;
    this.hoveredNode = null;
    this.selectedNode = null;
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    this.clear();
    this.parentScene.remove(this.group);
  }
}

// ============================================
// EXPORTS
// ============================================

export { ProjectTreeScene, PROJECT_TREE_CONFIG };
export default ProjectTreeScene;
