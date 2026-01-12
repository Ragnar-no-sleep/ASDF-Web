'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// ============================================
// TYPES
// ============================================

interface TreeNode {
  id: string
  name: string
  description: string
  status: 'live' | 'building' | 'planned'
  position: THREE.Vector3
  link?: string
}

// ============================================
// DATA
// ============================================

const NODES_DATA: Omit<TreeNode, 'position'>[] = [
  { id: 'daemon', name: 'Burn Daemon', description: 'The heart. Automated 24/7 burn mechanism.', status: 'live' },
  { id: 'burns', name: 'Burn Tracker', description: 'Real-time burn monitoring dashboard.', status: 'live', link: '/burns' },
  { id: 'holdex', name: 'HolDex', description: 'Portfolio analytics & position tracking.', status: 'live', link: '/holdex' },
  { id: 'forecast', name: 'ASDForecast', description: 'Community-driven price predictions.', status: 'live', link: '/asdforecast' },
  { id: 'ignition', name: 'Ignition', description: 'Gamified ecosystem experience.', status: 'live', link: '/ignition' },
  { id: 'sdk', name: 'ASDF SDK', description: 'Developer toolkit for builders.', status: 'building' },
  { id: 'mobile', name: 'Mobile App', description: 'iOS & Android companion app.', status: 'planned' },
]

// ============================================
// COMPONENT
// ============================================

export default function YggdrasilScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    controls: OrbitControls
    nodes: Map<string, THREE.Mesh>
    fireParticles: THREE.Points
    snowParticles: THREE.Points
    animationId: number
  } | null>(null)

  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [isGuidedTour, setIsGuidedTour] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // ========== SCENE SETUP ==========
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    scene.fog = new THREE.FogExp2(0x000000, 0.015)

    // ========== CAMERA ==========
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    camera.position.set(0, 5, 20)

    // ========== RENDERER ==========
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)

    // ========== CONTROLS ==========
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxPolarAngle = Math.PI * 0.85
    controls.minDistance = 8
    controls.maxDistance = 50
    controls.target.set(0, 3, 0)

    // ========== LIGHTING ==========
    const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.3)
    scene.add(ambientLight)

    // Fire light (orange glow from below)
    const fireLight = new THREE.PointLight(0xea4e33, 2, 30)
    fireLight.position.set(0, -2, 0)
    scene.add(fireLight)

    // Ice light (blue glow from above)
    const iceLight = new THREE.PointLight(0x4fc3f7, 1.5, 40)
    iceLight.position.set(0, 15, 0)
    scene.add(iceLight)

    // Accent lights
    const accentLight1 = new THREE.PointLight(0xf59e0b, 0.8, 20)
    accentLight1.position.set(-8, 5, 5)
    scene.add(accentLight1)

    const accentLight2 = new THREE.PointLight(0x8b5cf6, 0.6, 20)
    accentLight2.position.set(8, 8, -5)
    scene.add(accentLight2)

    // ========== TREE TRUNK ==========
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.8, 12, 16, 8, true)
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d1810,
      roughness: 0.9,
      metalness: 0.1,
      emissive: 0x1a0a05,
      emissiveIntensity: 0.2,
    })
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
    trunk.position.y = 0
    scene.add(trunk)

    // ========== BRANCHES ==========
    const branchMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d2517,
      roughness: 0.85,
      metalness: 0.1,
    })

    const createBranch = (startY: number, angle: number, length: number, thickness: number) => {
      const branchGeometry = new THREE.CylinderGeometry(thickness * 0.3, thickness, length, 8)
      const branch = new THREE.Mesh(branchGeometry, branchMaterial)

      branch.position.y = startY
      branch.rotation.z = angle
      branch.position.x = Math.sin(angle) * length * 0.4
      branch.position.y = startY + Math.cos(angle) * length * 0.4

      return branch
    }

    // Main branches
    const branches = [
      createBranch(4, -Math.PI / 4, 4, 0.25),
      createBranch(4, Math.PI / 4, 3.5, 0.22),
      createBranch(5.5, -Math.PI / 3, 3, 0.18),
      createBranch(5.5, Math.PI / 3.5, 3.2, 0.2),
      createBranch(3, -Math.PI / 5, 2.5, 0.15),
      createBranch(3, Math.PI / 4.5, 2.8, 0.17),
    ]
    branches.forEach(b => scene.add(b))

    // ========== NODES ==========
    const nodes = new Map<string, THREE.Mesh>()
    const nodePositions = [
      new THREE.Vector3(0, 7, 0),      // daemon - top
      new THREE.Vector3(-4, 5, 2),     // burns
      new THREE.Vector3(-3, 3.5, -2),  // holdex
      new THREE.Vector3(3.5, 4.5, 1),  // forecast
      new THREE.Vector3(4, 3, -1.5),   // ignition
      new THREE.Vector3(-2, 6, -1),    // sdk
      new THREE.Vector3(2, 6.5, 1),    // mobile
    ]

    NODES_DATA.forEach((nodeData, i) => {
      const position = nodePositions[i]
      const isLive = nodeData.status === 'live'
      const isBuilding = nodeData.status === 'building'

      // Node sphere
      const geometry = new THREE.IcosahedronGeometry(isLive ? 0.5 : 0.4, 1)
      const material = new THREE.MeshStandardMaterial({
        color: isLive ? 0xea4e33 : isBuilding ? 0xf59e0b : 0x444444,
        roughness: 0.3,
        metalness: 0.7,
        emissive: isLive ? 0xea4e33 : isBuilding ? 0xf59e0b : 0x222222,
        emissiveIntensity: isLive ? 0.5 : 0.2,
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(position)
      mesh.userData = { ...nodeData, position }
      scene.add(mesh)
      nodes.set(nodeData.id, mesh)

      // Glow ring for live nodes
      if (isLive) {
        const ringGeometry = new THREE.TorusGeometry(0.7, 0.02, 8, 32)
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0xea4e33,
          transparent: true,
          opacity: 0.3,
        })
        const ring = new THREE.Mesh(ringGeometry, ringMaterial)
        ring.position.copy(position)
        ring.rotation.x = Math.PI / 2
        scene.add(ring)
      }
    })

    // ========== FIRE PARTICLES ==========
    const fireCount = 2000
    const firePositions = new Float32Array(fireCount * 3)
    const fireColors = new Float32Array(fireCount * 3)

    for (let i = 0; i < fireCount; i++) {
      const radius = Math.random() * 6
      const theta = Math.random() * Math.PI * 2
      firePositions[i * 3] = Math.cos(theta) * radius
      firePositions[i * 3 + 1] = Math.random() * 8 - 3
      firePositions[i * 3 + 2] = Math.sin(theta) * radius

      // Orange to red gradient
      const t = Math.random()
      fireColors[i * 3] = 0.9 + t * 0.1
      fireColors[i * 3 + 1] = 0.3 + t * 0.3
      fireColors[i * 3 + 2] = 0.1 + t * 0.1
    }

    const fireGeometry = new THREE.BufferGeometry()
    fireGeometry.setAttribute('position', new THREE.BufferAttribute(firePositions, 3))
    fireGeometry.setAttribute('color', new THREE.BufferAttribute(fireColors, 3))

    const fireMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const fireParticles = new THREE.Points(fireGeometry, fireMaterial)
    scene.add(fireParticles)

    // ========== SNOW/ICE PARTICLES ==========
    const snowCount = 1500
    const snowPositions = new Float32Array(snowCount * 3)

    for (let i = 0; i < snowCount; i++) {
      const radius = Math.random() * 15 + 5
      const theta = Math.random() * Math.PI * 2
      const y = Math.random() * 20 - 5
      snowPositions[i * 3] = Math.cos(theta) * radius
      snowPositions[i * 3 + 1] = y
      snowPositions[i * 3 + 2] = Math.sin(theta) * radius
    }

    const snowGeometry = new THREE.BufferGeometry()
    snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3))

    const snowMaterial = new THREE.PointsMaterial({
      size: 0.05,
      color: 0x88ccff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const snowParticles = new THREE.Points(snowGeometry, snowMaterial)
    scene.add(snowParticles)

    // ========== RAYCASTER FOR CLICKS ==========
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onMouseClick = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const meshes = Array.from(nodes.values())
      const intersects = raycaster.intersectObjects(meshes)

      if (intersects.length > 0) {
        const nodeData = intersects[0].object.userData as TreeNode
        setSelectedNode(nodeData)

        // Fly to node
        const targetPos = nodeData.position.clone()
        const cameraTarget = targetPos.clone().add(new THREE.Vector3(3, 1, 5))

        // Animate camera
        const startPos = camera.position.clone()
        const startTarget = controls.target.clone()
        let progress = 0

        const flyTo = () => {
          progress += 0.02
          if (progress < 1) {
            const eased = 1 - Math.pow(1 - progress, 3)
            camera.position.lerpVectors(startPos, cameraTarget, eased)
            controls.target.lerpVectors(startTarget, targetPos, eased)
            requestAnimationFrame(flyTo)
          }
        }
        flyTo()
      }
    }

    container.addEventListener('click', onMouseClick)

    // ========== ANIMATION LOOP ==========
    const clock = new THREE.Clock()

    const animate = () => {
      const elapsed = clock.getElapsedTime()

      // Animate fire particles (rise up)
      const firePos = fireGeometry.attributes.position.array as Float32Array
      for (let i = 0; i < fireCount; i++) {
        firePos[i * 3 + 1] += 0.02 + Math.random() * 0.01
        if (firePos[i * 3 + 1] > 10) {
          firePos[i * 3 + 1] = -3
        }
        // Slight horizontal drift
        firePos[i * 3] += Math.sin(elapsed + i) * 0.002
        firePos[i * 3 + 2] += Math.cos(elapsed + i) * 0.002
      }
      fireGeometry.attributes.position.needsUpdate = true

      // Animate snow particles (swirl and fall)
      const snowPos = snowGeometry.attributes.position.array as Float32Array
      for (let i = 0; i < snowCount; i++) {
        snowPos[i * 3 + 1] -= 0.02 + Math.random() * 0.01
        if (snowPos[i * 3 + 1] < -5) {
          snowPos[i * 3 + 1] = 15
        }
        // Swirl effect
        const angle = elapsed * 0.5 + i * 0.01
        const radius = Math.sqrt(snowPos[i * 3] ** 2 + snowPos[i * 3 + 2] ** 2)
        snowPos[i * 3] = Math.cos(angle) * radius
        snowPos[i * 3 + 2] = Math.sin(angle) * radius
      }
      snowGeometry.attributes.position.needsUpdate = true

      // Pulse fire light
      fireLight.intensity = 2 + Math.sin(elapsed * 3) * 0.5

      // Rotate nodes slightly
      nodes.forEach((mesh) => {
        mesh.rotation.y = elapsed * 0.5
        mesh.position.y += Math.sin(elapsed * 2 + mesh.position.x) * 0.001
      })

      controls.update()
      renderer.render(scene, camera)
      sceneRef.current!.animationId = requestAnimationFrame(animate)
    }

    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      nodes,
      fireParticles,
      snowParticles,
      animationId: 0,
    }

    animate()

    // ========== RESIZE HANDLER ==========
    const handleResize = () => {
      const newWidth = container.clientWidth
      const newHeight = container.clientHeight
      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }
    window.addEventListener('resize', handleResize)

    // ========== CLEANUP ==========
    return () => {
      window.removeEventListener('resize', handleResize)
      container.removeEventListener('click', onMouseClick)
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId)
      }
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  // Guided tour
  useEffect(() => {
    if (!isGuidedTour || !sceneRef.current) return

    const { camera, controls, nodes } = sceneRef.current
    const nodeIds = ['daemon', 'burns', 'holdex', 'ignition', 'sdk']
    let currentIndex = 0

    const tourInterval = setInterval(() => {
      const nodeId = nodeIds[currentIndex]
      const mesh = nodes.get(nodeId)
      if (mesh) {
        const targetPos = mesh.position.clone()
        const cameraTarget = targetPos.clone().add(new THREE.Vector3(4, 2, 6))

        setSelectedNode(mesh.userData as TreeNode)

        // Simple lerp animation
        const startPos = camera.position.clone()
        const startTarget = controls.target.clone()
        let progress = 0

        const flyTo = () => {
          progress += 0.015
          if (progress < 1) {
            const eased = 1 - Math.pow(1 - progress, 3)
            camera.position.lerpVectors(startPos, cameraTarget, eased)
            controls.target.lerpVectors(startTarget, targetPos, eased)
            requestAnimationFrame(flyTo)
          }
        }
        flyTo()
      }

      currentIndex = (currentIndex + 1) % nodeIds.length
      if (currentIndex === 0) {
        setIsGuidedTour(false)
      }
    }, 4000)

    return () => clearInterval(tourInterval)
  }, [isGuidedTour])

  return (
    <div className="relative w-full h-[700px] bg-black rounded-2xl overflow-hidden">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* UI Overlay */}
      <div className="absolute top-6 left-6 z-10">
        <h1 className="text-4xl font-light tracking-tight mb-2">
          <span className="text-[#ea4e33]">Yggdrasil</span>
        </h1>
        <p className="text-[#666] text-sm max-w-xs">
          The living ecosystem. Fire rises, ice swirls. Click nodes to explore.
        </p>
      </div>

      {/* Controls */}
      <div className="absolute top-6 right-6 z-10 flex gap-3">
        <button
          onClick={() => setIsGuidedTour(true)}
          disabled={isGuidedTour}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            isGuidedTour
              ? 'bg-[#ea4e33]/20 text-[#ea4e33] cursor-not-allowed'
              : 'bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] border border-[#333]'
          }`}
        >
          {isGuidedTour ? 'Touring...' : 'Guided Tour'}
        </button>
        <button
          onClick={() => {
            if (sceneRef.current) {
              const { camera, controls } = sceneRef.current
              camera.position.set(0, 5, 20)
              controls.target.set(0, 3, 0)
              setSelectedNode(null)
            }
          }}
          className="px-4 py-2 bg-[#1a1a1a] border border-[#333] rounded-lg text-sm text-white hover:bg-[#2a2a2a] transition-colors"
        >
          Reset View
        </button>
      </div>

      {/* Selected Node Panel */}
      {selectedNode && (
        <div className="absolute bottom-6 left-6 right-6 z-10">
          <div className="max-w-md mx-auto p-6 bg-[#0a0a0a]/95 backdrop-blur-sm border border-[#1a1a1a] rounded-2xl">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-xl font-semibold text-white">{selectedNode.name}</h3>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                    selectedNode.status === 'live'
                      ? 'bg-green-500/20 text-green-400'
                      : selectedNode.status === 'building'
                      ? 'bg-[#f59e0b]/20 text-[#f59e0b]'
                      : 'bg-[#333] text-[#666]'
                  }`}
                >
                  {selectedNode.status.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-2 text-[#666] hover:text-white transition-colors"
              >
                x
              </button>
            </div>
            <p className="text-[#999] text-sm mb-4">{selectedNode.description}</p>
            {selectedNode.link && (
              <a
                href={selectedNode.link}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#ea4e33]/10 border border-[#ea4e33]/30 rounded-lg text-[#ea4e33] text-sm hover:bg-[#ea4e33]/20 transition-colors"
              >
                Open Tool
                <span>-&gt;</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-6 right-6 z-10 flex gap-4 text-xs">
        {[
          { label: 'Live', color: 'bg-green-500' },
          { label: 'Building', color: 'bg-[#f59e0b]' },
          { label: 'Planned', color: 'bg-[#444]' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-[#666]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
