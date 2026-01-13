'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ============================================
// TYPES & DATA
// ============================================

interface TreeNode {
  id: string;
  name: string;
  description: string;
  status: 'live' | 'building' | 'planned';
  position: THREE.Vector3;
  link?: string;
}

const NODES_DATA: Omit<TreeNode, 'position'>[] = [
  {
    id: 'daemon',
    name: 'Burn Daemon',
    description: 'The heart. Automated 24/7 burn mechanism.',
    status: 'live',
  },
  {
    id: 'burns',
    name: 'Burn Tracker',
    description: 'Real-time burn monitoring dashboard.',
    status: 'live',
    link: '/burns',
  },
  {
    id: 'holdex',
    name: 'HolDex',
    description: 'Portfolio analytics & position tracking.',
    status: 'live',
    link: '/holdex',
  },
  {
    id: 'forecast',
    name: 'ASDForecast',
    description: 'Community-driven price predictions.',
    status: 'live',
    link: '/asdforecast',
  },
  {
    id: 'ignition',
    name: 'Ignition',
    description: 'Gamified ecosystem experience.',
    status: 'live',
    link: '/ignition',
  },
  {
    id: 'sdk',
    name: 'ASDF SDK',
    description: 'Developer toolkit for builders.',
    status: 'building',
  },
  {
    id: 'mobile',
    name: 'Mobile App',
    description: 'iOS & Android companion app.',
    status: 'planned',
  },
];

// ============================================
// COMPONENT
// ============================================

export default function YggdrasilScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    nodes: Map<string, THREE.Group>;
    animationId: number;
    coreMaterial: THREE.MeshBasicMaterial;
    leafParticles: THREE.Points;
    fireParticles: THREE.Points;
    iceParticles: THREE.Points;
  } | null>(null);

  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [isGuidedTour, setIsGuidedTour] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // ========== SCENE ==========
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030308);
    scene.fog = new THREE.FogExp2(0x030308, 0.006);

    // ========== CAMERA ==========
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 15, 50);

    // ========== RENDERER ==========
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    container.appendChild(renderer.domElement);

    // ========== CONTROLS ==========
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.minDistance = 25;
    controls.maxDistance = 100;
    controls.target.set(0, 12, 0);

    // ========== LIGHTING ==========
    const ambient = new THREE.AmbientLight(0x201020, 0.5);
    scene.add(ambient);

    // Golden core light
    const coreLight = new THREE.PointLight(0xffcc44, 6, 60);
    coreLight.position.set(0, 12, 0);
    scene.add(coreLight);

    // Fire uplighting
    const fireLight = new THREE.PointLight(0xff4400, 4, 50);
    fireLight.position.set(0, 0, 0);
    scene.add(fireLight);

    // Ice rim light
    const iceLight = new THREE.PointLight(0x4488ff, 2, 80);
    iceLight.position.set(0, 30, 0);
    scene.add(iceLight);

    // ========== YGGDRASIL TREE ==========
    const treeGroup = new THREE.Group();

    // === GLOWING GOLDEN CORE (Heart) ===
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdd66,
      transparent: true,
      opacity: 0.95,
    });
    const coreGeo = new THREE.SphereGeometry(2.5, 32, 32);
    const core = new THREE.Mesh(coreGeo, coreMaterial);
    core.position.y = 12;
    treeGroup.add(core);

    // Core glow layers
    for (let i = 1; i <= 4; i++) {
      const glowGeo = new THREE.SphereGeometry(2.5 + i * 1.5, 32, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color: i < 3 ? 0xffaa22 : 0xff6600,
        transparent: true,
        opacity: 0.12 / i,
        side: THREE.BackSide,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.y = 12;
      treeGroup.add(glow);
    }

    // === TRUNK - Massive and organic ===
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a0805,
      roughness: 0.85,
      metalness: 0.1,
      emissive: 0xff3300,
      emissiveIntensity: 0.15,
    });

    const createTrunk = () => {
      // Main trunk
      const trunkGeo = new THREE.CylinderGeometry(2, 4, 20, 24, 15);
      const pos = trunkGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const angle = Math.atan2(pos.getZ(i), pos.getX(i));
        const twist = Math.sin(y * 0.3 + angle * 2) * 0.4;
        const bulge = Math.sin(y * 0.5) * 0.3;
        pos.setX(i, pos.getX(i) * (1 + bulge) + Math.cos(angle) * twist);
        pos.setZ(i, pos.getZ(i) * (1 + bulge) + Math.sin(angle) * twist);
      }
      trunkGeo.computeVertexNormals();
      const trunk = new THREE.Mesh(trunkGeo, trunkMaterial);
      trunk.position.y = 2;
      return trunk;
    };
    treeGroup.add(createTrunk());

    // === ROOTS - Spreading veins ===
    const rootMaterial = new THREE.MeshStandardMaterial({
      color: 0x120503,
      roughness: 0.9,
      metalness: 0.05,
      emissive: 0x661100,
      emissiveIntensity: 0.2,
    });

    const createRoot = (angle: number, length: number, thickness: number) => {
      const segments = 20;
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const spread = Math.pow(t, 0.6);
        const dip = Math.sin(t * Math.PI) * 2 + t * t * 4;
        const x = Math.cos(angle) * length * spread;
        const y = -dip;
        const z = Math.sin(angle) * length * spread;
        points.push(new THREE.Vector3(x, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const geo = new THREE.TubeGeometry(curve, 20, thickness * (1 - 0.5 * 0.6), 8, false);
      return new THREE.Mesh(geo, rootMaterial);
    };

    // 10 main roots
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const root = createRoot(angle, 15 + Math.random() * 8, 0.8 + Math.random() * 0.4);
      root.position.y = -8;
      treeGroup.add(root);
    }

    // === MAIN BRANCHES - Extending outward for nodes ===
    const branchMaterial = new THREE.MeshStandardMaterial({
      color: 0x180604,
      roughness: 0.8,
      metalness: 0.15,
      emissive: 0xff4400,
      emissiveIntensity: 0.2,
    });

    // Branch positions - these will hold the nodes at their tips
    const branchEndpoints: THREE.Vector3[] = [
      new THREE.Vector3(0, 28, 0), // daemon - top crown
      new THREE.Vector3(-14, 18, 8), // burns - left front
      new THREE.Vector3(-12, 14, -10), // holdex - left back
      new THREE.Vector3(14, 17, 6), // forecast - right front
      new THREE.Vector3(13, 13, -8), // ignition - right back
      new THREE.Vector3(-8, 22, -4), // sdk - upper left
      new THREE.Vector3(9, 23, 3), // mobile - upper right
    ];

    const createBranch = (endPoint: THREE.Vector3, thickness: number) => {
      const startY = 10 + Math.random() * 4;
      const midPoint1 = new THREE.Vector3(endPoint.x * 0.25, startY + 3, endPoint.z * 0.25);
      const midPoint2 = new THREE.Vector3(endPoint.x * 0.6, endPoint.y * 0.7, endPoint.z * 0.6);

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, startY, 0),
        midPoint1,
        midPoint2,
        endPoint.clone().multiplyScalar(0.85),
      ]);

      const geo = new THREE.TubeGeometry(curve, 20, thickness, 8, false);
      return new THREE.Mesh(geo, branchMaterial);
    };

    // Create branches for each node
    branchEndpoints.forEach((endpoint, i) => {
      if (i === 0) return; // Skip daemon (at top)
      const branch = createBranch(endpoint, 0.5 + Math.random() * 0.3);
      treeGroup.add(branch);
    });

    // === SECONDARY BRANCHES (visual fill) ===
    const smallBranchEnds = [
      new THREE.Vector3(10, 20, 10),
      new THREE.Vector3(-11, 19, 9),
      new THREE.Vector3(8, 21, -8),
      new THREE.Vector3(-9, 20, -7),
      new THREE.Vector3(6, 24, 2),
      new THREE.Vector3(-7, 23, -1),
      new THREE.Vector3(12, 16, 0),
      new THREE.Vector3(-12, 15, 2),
    ];

    smallBranchEnds.forEach(endpoint => {
      const branch = createBranch(endpoint, 0.25 + Math.random() * 0.15);
      treeGroup.add(branch);
    });

    scene.add(treeGroup);

    // ========== LEAF PARTICLES (Ember-like foliage) ==========
    const leafCount = 3000;
    const leafPositions = new Float32Array(leafCount * 3);
    const leafColors = new Float32Array(leafCount * 3);
    const leafData: {
      baseX: number;
      baseY: number;
      baseZ: number;
      phase: number;
      amplitude: number;
    }[] = [];

    for (let i = 0; i < leafCount; i++) {
      // Distribute around branches and crown area
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.6;
      const radius = 8 + Math.random() * 12;

      const x = Math.sin(phi) * Math.cos(theta) * radius;
      const y = 14 + Math.cos(phi) * radius * 0.6 + Math.random() * 6;
      const z = Math.sin(phi) * Math.sin(theta) * radius;

      leafPositions[i * 3] = x;
      leafPositions[i * 3 + 1] = y;
      leafPositions[i * 3 + 2] = z;

      // Fire colors: from golden to orange to red
      const t = Math.random();
      if (t < 0.3) {
        // Golden
        leafColors[i * 3] = 1;
        leafColors[i * 3 + 1] = 0.85;
        leafColors[i * 3 + 2] = 0.3;
      } else if (t < 0.6) {
        // Orange
        leafColors[i * 3] = 1;
        leafColors[i * 3 + 1] = 0.55;
        leafColors[i * 3 + 2] = 0.1;
      } else if (t < 0.85) {
        // Red-orange
        leafColors[i * 3] = 1;
        leafColors[i * 3 + 1] = 0.3;
        leafColors[i * 3 + 2] = 0.05;
      } else {
        // Deep red
        leafColors[i * 3] = 0.9;
        leafColors[i * 3 + 1] = 0.15;
        leafColors[i * 3 + 2] = 0.05;
      }

      leafData.push({
        baseX: x,
        baseY: y,
        baseZ: z,
        phase: Math.random() * Math.PI * 2,
        amplitude: 0.5 + Math.random() * 1,
      });
    }

    const leafGeo = new THREE.BufferGeometry();
    leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPositions, 3));
    leafGeo.setAttribute('color', new THREE.BufferAttribute(leafColors, 3));

    const leafMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const leafParticles = new THREE.Points(leafGeo, leafMat);
    scene.add(leafParticles);

    // ========== FIRE PARTICLES (Rising from below) ==========
    const fireCount = 1500;
    const firePositions = new Float32Array(fireCount * 3);
    const fireColors = new Float32Array(fireCount * 3);
    const fireData: { speed: number; radius: number; angle: number; startY: number }[] = [];

    for (let i = 0; i < fireCount; i++) {
      const radius = Math.random() * 6;
      const angle = Math.random() * Math.PI * 2;
      const startY = -8 + Math.random() * 8;

      firePositions[i * 3] = Math.cos(angle) * radius;
      firePositions[i * 3 + 1] = startY;
      firePositions[i * 3 + 2] = Math.sin(angle) * radius;

      // Fire gradient
      const t = Math.random();
      if (t < 0.4) {
        fireColors[i * 3] = 1;
        fireColors[i * 3 + 1] = 0.3;
        fireColors[i * 3 + 2] = 0;
      } else if (t < 0.7) {
        fireColors[i * 3] = 1;
        fireColors[i * 3 + 1] = 0.55;
        fireColors[i * 3 + 2] = 0;
      } else {
        fireColors[i * 3] = 1;
        fireColors[i * 3 + 1] = 0.8;
        fireColors[i * 3 + 2] = 0.2;
      }

      fireData.push({ speed: 0.04 + Math.random() * 0.06, radius, angle, startY });
    }

    const fireGeo = new THREE.BufferGeometry();
    fireGeo.setAttribute('position', new THREE.BufferAttribute(firePositions, 3));
    fireGeo.setAttribute('color', new THREE.BufferAttribute(fireColors, 3));

    const fireMat = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const fireParticles = new THREE.Points(fireGeo, fireMat);
    scene.add(fireParticles);

    // ========== ICE STORM (Outer ring) ==========
    const iceCount = 2000;
    const icePositions = new Float32Array(iceCount * 3);
    const iceColors = new Float32Array(iceCount * 3);
    const iceData: {
      radius: number;
      angle: number;
      y: number;
      speed: number;
      fallSpeed: number;
    }[] = [];

    for (let i = 0; i < iceCount; i++) {
      const radius = 25 + Math.random() * 25;
      const angle = Math.random() * Math.PI * 2;
      const y = Math.random() * 60 - 10;

      icePositions[i * 3] = Math.cos(angle) * radius;
      icePositions[i * 3 + 1] = y;
      icePositions[i * 3 + 2] = Math.sin(angle) * radius;

      // Ice blue-white
      const t = Math.random();
      if (t < 0.6) {
        iceColors[i * 3] = 0.85;
        iceColors[i * 3 + 1] = 0.92;
        iceColors[i * 3 + 2] = 1;
      } else {
        iceColors[i * 3] = 0.5;
        iceColors[i * 3 + 1] = 0.75;
        iceColors[i * 3 + 2] = 1;
      }

      iceData.push({
        radius,
        angle,
        y,
        speed: 0.15 + Math.random() * 0.25,
        fallSpeed: 0.02 + Math.random() * 0.03,
      });
    }

    const iceGeo = new THREE.BufferGeometry();
    iceGeo.setAttribute('position', new THREE.BufferAttribute(icePositions, 3));
    iceGeo.setAttribute('color', new THREE.BufferAttribute(iceColors, 3));

    const iceMat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const iceParticles = new THREE.Points(iceGeo, iceMat);
    scene.add(iceParticles);

    // ========== STONE NODES (Prominent with fire+ice fusion) ==========
    const nodes = new Map<string, THREE.Group>();

    NODES_DATA.forEach((nodeData, i) => {
      const position = branchEndpoints[i];
      const isLive = nodeData.status === 'live';
      const isBuilding = nodeData.status === 'building';
      const nodeGroup = new THREE.Group();
      nodeGroup.position.copy(position);

      // Large stone core
      const size = isLive ? 2.2 : isBuilding ? 1.8 : 1.5;
      const coreGeo = new THREE.DodecahedronGeometry(size, 1);

      // Deform for organic stone look
      const corePos = coreGeo.attributes.position;
      for (let j = 0; j < corePos.count; j++) {
        const px = corePos.getX(j);
        const py = corePos.getY(j);
        const pz = corePos.getZ(j);
        const noise = Math.sin(px * 2) * Math.cos(pz * 2) * 0.15;
        corePos.setX(j, px * (1 + noise));
        corePos.setY(j, py * (1 + noise * 0.5));
        corePos.setZ(j, pz * (1 + noise));
      }
      coreGeo.computeVertexNormals();

      const stoneMat = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.5,
        metalness: 0.5,
        emissive: isLive ? 0x883311 : isBuilding ? 0x886622 : 0x224488,
        emissiveIntensity: 0.5,
      });
      const stone = new THREE.Mesh(coreGeo, stoneMat);
      nodeGroup.add(stone);

      // Inner fire glow
      const fireGlowGeo = new THREE.SphereGeometry(size * 1.3, 32, 32);
      const fireGlowMat = new THREE.MeshBasicMaterial({
        color: isLive ? 0xff4400 : isBuilding ? 0xffaa00 : 0x4466ff,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide,
      });
      nodeGroup.add(new THREE.Mesh(fireGlowGeo, fireGlowMat));

      // Outer ice glow
      const iceGlowGeo = new THREE.SphereGeometry(size * 1.8, 32, 32);
      const iceGlowMat = new THREE.MeshBasicMaterial({
        color: isLive ? 0x6699ff : isBuilding ? 0x88aaff : 0x4488ff,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
      });
      nodeGroup.add(new THREE.Mesh(iceGlowGeo, iceGlowMat));

      // Fire ring
      const fireRingGeo = new THREE.TorusGeometry(size * 1.6, 0.12, 16, 64);
      const fireRingMat = new THREE.MeshBasicMaterial({
        color: isLive ? 0xff5500 : isBuilding ? 0xffcc00 : 0x88aaff,
        transparent: true,
        opacity: 0.8,
      });
      const fireRing = new THREE.Mesh(fireRingGeo, fireRingMat);
      fireRing.rotation.x = Math.PI / 2;
      fireRing.userData.rotateSpeed = 0.5;
      nodeGroup.add(fireRing);

      // Ice ring (perpendicular)
      const iceRingGeo = new THREE.TorusGeometry(size * 2, 0.08, 16, 64);
      const iceRingMat = new THREE.MeshBasicMaterial({
        color: 0x66aaff,
        transparent: true,
        opacity: 0.6,
      });
      const iceRing = new THREE.Mesh(iceRingGeo, iceRingMat);
      iceRing.rotation.y = Math.PI / 2;
      iceRing.userData.rotateSpeed = -0.3;
      nodeGroup.add(iceRing);

      // Point light
      const light = new THREE.PointLight(
        isLive ? 0xff7744 : isBuilding ? 0xffcc44 : 0x6699ff,
        isLive ? 3 : 2,
        25
      );
      nodeGroup.add(light);

      nodeGroup.userData = { ...nodeData, position };
      nodes.set(nodeData.id, nodeGroup);
      scene.add(nodeGroup);
    });

    // ========== VOLCANIC GROUND ==========
    const groundGeo = new THREE.CircleGeometry(70, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x050202,
      roughness: 1,
      metalness: 0,
      emissive: 0x220800,
      emissiveIntensity: 0.15,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -14;
    scene.add(ground);

    // Lava veins
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const crackGeo = new THREE.PlaneGeometry(0.5, 20 + Math.random() * 15);
      const crackMat = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.5,
      });
      const crack = new THREE.Mesh(crackGeo, crackMat);
      crack.rotation.x = -Math.PI / 2;
      crack.rotation.z = angle + (Math.random() - 0.5) * 0.4;
      crack.position.set(Math.cos(angle) * 18, -13.9, Math.sin(angle) * 18);
      scene.add(crack);
    }

    // ========== RAYCASTER ==========
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      for (const group of nodes.values()) {
        const intersects = raycaster.intersectObjects(group.children, true);
        if (intersects.length > 0) {
          const data = group.userData as TreeNode;
          setSelectedNode(data);

          const targetPos = data.position.clone();
          const camTarget = targetPos.clone().add(new THREE.Vector3(10, 5, 12));
          const startPos = camera.position.clone();
          const startTarget = controls.target.clone();
          let progress = 0;

          const fly = () => {
            progress += 0.025;
            if (progress < 1) {
              const e = 1 - Math.pow(1 - progress, 3);
              camera.position.lerpVectors(startPos, camTarget, e);
              controls.target.lerpVectors(startTarget, targetPos, e);
              requestAnimationFrame(fly);
            }
          };
          fly();
          return;
        }
      }
    };

    container.addEventListener('click', onMouseClick);

    // ========== ANIMATION ==========
    const clock = new THREE.Clock();

    const animate = () => {
      const t = clock.getElapsedTime();

      // Leaf particle gentle sway
      const lPos = leafGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < leafCount; i++) {
        const d = leafData[i];
        lPos[i * 3] = d.baseX + Math.sin(t * 0.8 + d.phase) * d.amplitude;
        lPos[i * 3 + 1] = d.baseY + Math.sin(t * 0.5 + d.phase * 2) * d.amplitude * 0.5;
        lPos[i * 3 + 2] = d.baseZ + Math.cos(t * 0.6 + d.phase) * d.amplitude;
      }
      leafGeo.attributes.position.needsUpdate = true;

      // Fire particles rising
      const fPos = fireGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < fireCount; i++) {
        const d = fireData[i];
        fPos[i * 3 + 1] += d.speed;
        if (fPos[i * 3 + 1] > 30) {
          fPos[i * 3 + 1] = d.startY;
          d.angle = Math.random() * Math.PI * 2;
          d.radius = Math.random() * 6;
        }
        d.angle += 0.005;
        fPos[i * 3] = Math.cos(d.angle) * d.radius;
        fPos[i * 3 + 2] = Math.sin(d.angle) * d.radius;
      }
      fireGeo.attributes.position.needsUpdate = true;

      // Ice storm swirl
      const iPos = iceGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < iceCount; i++) {
        const d = iceData[i];
        d.y -= d.fallSpeed;
        if (d.y < -10) d.y = 50;
        d.angle += d.speed * 0.008;
        iPos[i * 3] = Math.cos(d.angle) * d.radius;
        iPos[i * 3 + 1] = d.y;
        iPos[i * 3 + 2] = Math.sin(d.angle) * d.radius;
      }
      iceGeo.attributes.position.needsUpdate = true;

      // Core pulse
      coreMaterial.opacity = 0.9 + Math.sin(t * 2) * 0.08;
      coreLight.intensity = 6 + Math.sin(t * 2.5) * 1.5;

      // Fire light flicker
      fireLight.intensity = 4 + Math.sin(t * 3) * 1 + Math.sin(t * 7) * 0.5;

      // Node animations
      nodes.forEach(group => {
        const baseY = (group.userData as TreeNode).position.y;
        group.position.y = baseY + Math.sin(t * 1.2 + group.position.x * 0.3) * 0.3;

        group.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.TorusGeometry) {
            const speed = child.userData.rotateSpeed || 0.3;
            child.rotation.z += speed * 0.02;
          }
        });
      });

      controls.update();
      renderer.render(scene, camera);
      sceneRef.current!.animationId = requestAnimationFrame(animate);
    };

    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      nodes,
      animationId: 0,
      coreMaterial,
      leafParticles,
      fireParticles,
      iceParticles,
    };
    animate();

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('click', onMouseClick);
      if (sceneRef.current) cancelAnimationFrame(sceneRef.current.animationId);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Guided tour
  useEffect(() => {
    if (!isGuidedTour || !sceneRef.current) return;
    const { camera, controls, nodes } = sceneRef.current;
    const ids = ['daemon', 'burns', 'holdex', 'ignition', 'forecast'];
    let idx = 0;

    const interval = setInterval(() => {
      const group = nodes.get(ids[idx]);
      if (group) {
        const pos = (group.userData as TreeNode).position.clone();
        setSelectedNode(group.userData as TreeNode);
        const startPos = camera.position.clone();
        const startTarget = controls.target.clone();
        const camTarget = pos.clone().add(new THREE.Vector3(12, 6, 14));
        let p = 0;
        const fly = () => {
          p += 0.015;
          if (p < 1) {
            const e = 1 - Math.pow(1 - p, 3);
            camera.position.lerpVectors(startPos, camTarget, e);
            controls.target.lerpVectors(startTarget, pos, e);
            requestAnimationFrame(fly);
          }
        };
        fly();
      }
      idx = (idx + 1) % ids.length;
      if (idx === 0) setIsGuidedTour(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [isGuidedTour]);

  return (
    <div className="relative w-full h-[750px] bg-[#030308] rounded-2xl overflow-hidden">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute top-6 left-6 z-10">
        <h1 className="text-5xl font-bold tracking-tight mb-3">
          <span className="bg-gradient-to-r from-[#ff4400] via-[#ffaa00] to-[#4488ff] bg-clip-text text-transparent">
            Yggdrasil
          </span>
        </h1>
        <p className="text-[#8888aa] text-sm max-w-[300px] leading-relaxed">
          The World Tree burns eternal. Fire and ice converge at each stone realm.
        </p>
      </div>

      <div className="absolute top-6 right-6 z-10 flex gap-3">
        <button
          onClick={() => setIsGuidedTour(true)}
          disabled={isGuidedTour}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg ${
            isGuidedTour
              ? 'bg-[#ff4400]/30 text-[#ff8844] cursor-not-allowed'
              : 'bg-gradient-to-r from-[#ff4400] to-[#ff6622] text-white hover:from-[#ff5500] hover:to-[#ff7733]'
          }`}
        >
          {isGuidedTour ? 'Exploring...' : 'Guided Tour'}
        </button>
        <button
          onClick={() => {
            if (sceneRef.current) {
              sceneRef.current.camera.position.set(0, 15, 50);
              sceneRef.current.controls.target.set(0, 12, 0);
              setSelectedNode(null);
            }
          }}
          className="px-5 py-2.5 bg-[#0a0a15] border border-[#333355] rounded-xl text-sm text-[#aaaacc] hover:bg-[#15152a] transition-all"
        >
          Reset View
        </button>
      </div>

      {selectedNode && (
        <div className="absolute bottom-6 left-6 right-6 z-10">
          <div className="max-w-lg mx-auto p-6 bg-gradient-to-br from-[#0a0508]/95 to-[#050812]/95 backdrop-blur-md border border-[#ff4400]/20 rounded-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">{selectedNode.name}</h3>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    selectedNode.status === 'live'
                      ? 'bg-gradient-to-r from-[#ff4400]/30 to-[#4488ff]/30 text-[#ffaa44]'
                      : selectedNode.status === 'building'
                        ? 'bg-[#ffaa00]/20 text-[#ffcc44]'
                        : 'bg-[#4488ff]/20 text-[#66aaff]'
                  }`}
                >
                  {selectedNode.status === 'live'
                    ? 'Petrified'
                    : selectedNode.status === 'building'
                      ? 'Forging'
                      : 'Frozen'}
                </span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#ffffff10] text-[#666] hover:text-white"
              >
                ×
              </button>
            </div>
            <p className="text-[#9999bb] text-sm mb-5">{selectedNode.description}</p>
            {selectedNode.link && (
              <a
                href={selectedNode.link}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#ff4400]/20 to-[#4488ff]/20 border border-[#ff4400]/40 rounded-xl text-[#ffaa44] text-sm font-semibold hover:from-[#ff4400]/30 hover:to-[#4488ff]/30 transition-all"
              >
                Enter Realm <span className="text-lg">→</span>
              </a>
            )}
          </div>
        </div>
      )}

      <div className="absolute bottom-6 right-6 z-10 flex gap-5 text-xs font-medium">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#ff4400] to-[#4488ff]" />
          <span className="text-[#6666aa]">Petrified</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ffaa00]" />
          <span className="text-[#6666aa]">Forging</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#4488ff]" />
          <span className="text-[#6666aa]">Frozen</span>
        </div>
      </div>
    </div>
  );
}
