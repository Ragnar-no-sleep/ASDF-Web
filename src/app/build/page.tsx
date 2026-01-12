'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion'
import Link from 'next/link'

// ============================================
// TYPES
// ============================================

type BuildSection = 'yggdrasil' | 'builders' | 'path' | 'journey'

interface TreeNode {
  id: string
  name: string
  description: string
  status: 'live' | 'building' | 'planned'
  category: 'core' | 'analytics' | 'games' | 'community'
  link?: string
}

interface Builder {
  id: string
  name: string
  role: string
  avatar: string
  color: string
  skills: string[]
  projects: string[]
  github?: string
  status: 'legend' | 'active' | 'rising'
}

// ============================================
// DATA
// ============================================

const TREE_NODES: TreeNode[] = [
  { id: 'daemon', name: 'Burn Daemon', description: 'The heart. Automated 24/7 burn mechanism.', status: 'live', category: 'core' },
  { id: 'burns', name: 'Burn Tracker', description: 'Real-time burn monitoring dashboard.', status: 'live', category: 'analytics', link: '/burns' },
  { id: 'holdex', name: 'HolDex', description: 'Portfolio analytics & position tracking.', status: 'live', category: 'analytics', link: '/holdex' },
  { id: 'forecast', name: 'ASDForecast', description: 'Community-driven price predictions.', status: 'live', category: 'community', link: '/asdforecast' },
  { id: 'ignition', name: 'Ignition', description: 'Gamified ecosystem experience.', status: 'live', category: 'games', link: '/ignition' },
  { id: 'sdk', name: 'ASDF SDK', description: 'Developer toolkit for builders.', status: 'building', category: 'core' },
  { id: 'mobile', name: 'Mobile App', description: 'iOS & Android companion app.', status: 'planned', category: 'core' },
]

const BUILDERS: Builder[] = [
  {
    id: 'ragnar',
    name: 'Ragnar',
    role: 'Core Architect',
    avatar: 'R',
    color: '#ea4e33',
    skills: ['Solana', 'TypeScript', 'React', 'Node.js', 'System Design'],
    projects: ['Burn Daemon', 'Burn Tracker', 'HolDex', 'Ignition'],
    github: 'Ragnar-no-sleep',
    status: 'legend',
  },
]

const JOURNEY_TRACKS = [
  { id: 'dev', name: 'Developer', icon: '{ }', description: 'Master Solana, Rust, TypeScript', color: '#ea4e33', modules: 12 },
  { id: 'growth', name: 'Growth', icon: '↗', description: 'Distribution, hooks, viral loops', color: '#f59e0b', modules: 10 },
  { id: 'gaming', name: 'Game Dev', icon: '◈', description: 'Unity, game design, tokenomics', color: '#8b5cf6', modules: 8 },
  { id: 'content', name: 'Creator', icon: '✦', description: 'Narrative, video, community', color: '#06b6d4', modules: 9 },
]

// ============================================
// NAVIGATION
// ============================================

function BuildNav({ active, onChange }: { active: BuildSection; onChange: (s: BuildSection) => void }) {
  const tabs: { id: BuildSection; label: string }[] = [
    { id: 'yggdrasil', label: 'Yggdrasil' },
    { id: 'builders', label: 'Builders' },
    { id: 'path', label: 'Find Your Path' },
    { id: 'journey', label: 'Your Journey' },
  ]

  return (
    <nav className="flex items-center gap-1 p-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-full">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
            active === tab.id ? 'text-white' : 'text-[#666] hover:text-[#999]'
          }`}
        >
          {active === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-[#1a1a1a] rounded-full"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

// ============================================
// YGGDRASIL - Proper Tree Visualization
// ============================================

function YggdrasilSection() {
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  const categories = {
    core: { label: 'Core', x: 50, nodes: TREE_NODES.filter(n => n.category === 'core') },
    analytics: { label: 'Analytics', x: 25, nodes: TREE_NODES.filter(n => n.category === 'analytics') },
    games: { label: 'Games', x: 75, nodes: TREE_NODES.filter(n => n.category === 'games') },
    community: { label: 'Community', x: 62, nodes: TREE_NODES.filter(n => n.category === 'community') },
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative"
    >
      {/* Tree Container */}
      <div className="relative max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-5xl font-light tracking-tight mb-4">
              <span className="text-[#ea4e33]">Yggdrasil</span>
            </h1>
            <p className="text-[#666] text-lg max-w-md mx-auto">
              The living ecosystem. Every branch feeds the burn.
            </p>
          </motion.div>
        </div>

        {/* Tree SVG Background */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 800 600"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Main trunk */}
          <motion.path
            d="M400 580 L400 300"
            stroke="url(#trunkGradient)"
            strokeWidth="3"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />

          {/* Branches */}
          <motion.path
            d="M400 300 Q300 280 200 200"
            stroke="url(#branchGradient)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          />
          <motion.path
            d="M400 300 Q500 280 600 200"
            stroke="url(#branchGradient)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
          />
          <motion.path
            d="M400 300 L400 150"
            stroke="url(#branchGradient)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
          />

          {/* Gradients */}
          <defs>
            <linearGradient id="trunkGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#1a1a1a" />
              <stop offset="100%" stopColor="#ea4e33" />
            </linearGradient>
            <linearGradient id="branchGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ea4e33" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ea4e33" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>

        {/* Root Node - ASDF Core */}
        <div className="relative h-[600px]">
          {/* Center/Root */}
          <motion.div
            className="absolute left-1/2 bottom-12 -translate-x-1/2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
          >
            <div className="relative">
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(234, 78, 51, 0)',
                    '0 0 0 20px rgba(234, 78, 51, 0.1)',
                    '0 0 0 0 rgba(234, 78, 51, 0)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ea4e33] to-[#c53a20] flex items-center justify-center"
              >
                <span className="text-white font-bold text-xl">$A</span>
              </motion.div>
              <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-[#666] whitespace-nowrap font-mono">
                asdfasdfa
              </p>
            </div>
          </motion.div>

          {/* Tree Nodes */}
          {TREE_NODES.map((node, index) => {
            // Position calculations for tree layout
            const positions: Record<string, { x: number; y: number }> = {
              daemon: { x: 50, y: 45 },
              burns: { x: 25, y: 35 },
              holdex: { x: 35, y: 25 },
              forecast: { x: 65, y: 30 },
              ignition: { x: 75, y: 35 },
              sdk: { x: 45, y: 20 },
              mobile: { x: 55, y: 15 },
            }
            const pos = positions[node.id] || { x: 50, y: 30 }
            const isHovered = hoveredNode === node.id
            const isSelected = selectedNode?.id === node.id

            return (
              <motion.div
                key={node.id}
                className="absolute cursor-pointer"
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1, type: 'spring' }}
                onHoverStart={() => setHoveredNode(node.id)}
                onHoverEnd={() => setHoveredNode(null)}
                onClick={() => setSelectedNode(isSelected ? null : node)}
              >
                <motion.div
                  animate={{
                    scale: isHovered || isSelected ? 1.1 : 1,
                    y: isHovered ? -4 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`relative group ${isSelected ? 'z-20' : 'z-10'}`}
                >
                  {/* Node Card */}
                  <div
                    className={`px-5 py-3 rounded-xl border backdrop-blur-sm transition-all duration-300 ${
                      node.status === 'live'
                        ? 'bg-[#0a0a0a]/90 border-[#ea4e33]/30 hover:border-[#ea4e33]/60'
                        : node.status === 'building'
                        ? 'bg-[#0a0a0a]/90 border-[#f59e0b]/30 hover:border-[#f59e0b]/60'
                        : 'bg-[#0a0a0a]/90 border-[#333]/50 hover:border-[#444]'
                    } ${isSelected ? 'border-[#ea4e33] shadow-lg shadow-[#ea4e33]/20' : ''}`}
                  >
                    {/* Status dot */}
                    <div
                      className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${
                        node.status === 'live' ? 'bg-green-500' :
                        node.status === 'building' ? 'bg-[#f59e0b]' : 'bg-[#444]'
                      }`}
                    />

                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        node.status === 'live' ? 'bg-[#ea4e33]/20 text-[#ea4e33]' :
                        node.status === 'building' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                        'bg-[#333] text-[#666]'
                      }`}>
                        {node.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{node.name}</p>
                        <p className="text-[10px] text-[#666] uppercase tracking-wider">
                          {node.status}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )
          })}
        </div>

        {/* Selected Node Detail Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md"
            >
              <div className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedNode.name}</h3>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                      selectedNode.status === 'live' ? 'bg-green-500/20 text-green-400' :
                      selectedNode.status === 'building' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                      'bg-[#333] text-[#666]'
                    }`}>
                      {selectedNode.status.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="p-2 text-[#666] hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[#999] mb-4">{selectedNode.description}</p>
                {selectedNode.link && (
                  <Link
                    href={selectedNode.link}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#ea4e33]/10 border border-[#ea4e33]/30 rounded-lg text-[#ea4e33] text-sm hover:bg-[#ea4e33]/20 transition-colors"
                  >
                    Open Tool
                    <span>→</span>
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-8 mt-8 text-sm">
        {[
          { status: 'Live', color: 'bg-green-500' },
          { status: 'Building', color: 'bg-[#f59e0b]' },
          { status: 'Planned', color: 'bg-[#444]' },
        ].map(({ status, color }) => (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-[#666]">{status}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ============================================
// BUILDERS - Clean Apple-style Cards
// ============================================

function BuildersSection() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-end justify-between mb-12">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-light tracking-tight mb-2"
          >
            Builders
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[#666] text-lg"
          >
            The architects of the ecosystem
          </motion.p>
        </div>
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-5 py-2.5 bg-[#ea4e33] rounded-full text-sm font-medium text-white hover:bg-[#d94429] transition-colors"
        >
          Apply to Build
        </motion.button>
      </div>

      {/* Builders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {BUILDERS.map((builder, index) => (
          <motion.div
            key={builder.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4 }}
            className="group relative p-8 bg-[#0a0a0a] border border-[#1a1a1a] rounded-3xl hover:border-[#2a2a2a] transition-all duration-300"
          >
            {/* Status Badge */}
            <div className="absolute top-6 right-6">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                builder.status === 'legend' ? 'bg-gradient-to-r from-[#ea4e33]/20 to-[#f59e0b]/20 text-[#f59e0b]' :
                builder.status === 'active' ? 'bg-green-500/20 text-green-400' :
                'bg-[#333] text-[#666]'
              }`}>
                {builder.status}
              </span>
            </div>

            {/* Avatar & Info */}
            <div className="flex items-start gap-5 mb-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: builder.color }}
              >
                {builder.avatar}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">{builder.name}</h3>
                <p className="text-[#666]">{builder.role}</p>
              </div>
            </div>

            {/* Skills */}
            <div className="mb-6">
              <p className="text-xs text-[#444] uppercase tracking-wider mb-3">Skills</p>
              <div className="flex flex-wrap gap-2">
                {builder.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 bg-[#111] border border-[#222] rounded-lg text-xs text-[#999]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div className="mb-6">
              <p className="text-xs text-[#444] uppercase tracking-wider mb-3">Projects</p>
              <p className="text-sm text-[#888]">{builder.projects.join(' · ')}</p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-6 border-t border-[#1a1a1a]">
              {builder.github && (
                <a
                  href={`https://github.com/${builder.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#666] hover:text-[#ea4e33] transition-colors"
                >
                  @{builder.github}
                </a>
              )}
              <button className="text-sm text-[#ea4e33] opacity-0 group-hover:opacity-100 transition-opacity">
                View Profile →
              </button>
            </div>
          </motion.div>
        ))}

        {/* Join Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -4, borderColor: '#ea4e33' }}
          className="relative p-8 border-2 border-dashed border-[#1a1a1a] rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[300px]"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center mb-4">
            <span className="text-2xl text-[#444]">+</span>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Become a Builder</h3>
          <p className="text-sm text-[#666] max-w-[200px]">
            Complete your journey to unlock your builder profile
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ============================================
// FIND YOUR PATH - Minimal Quiz
// ============================================

const PATH_QUESTIONS = [
  {
    id: 'drive',
    question: 'What drives you most?',
    options: [
      { id: 'create', label: 'Creating systems that work', track: 'dev' },
      { id: 'grow', label: 'Growing things exponentially', track: 'growth' },
      { id: 'play', label: 'Making experiences memorable', track: 'gaming' },
      { id: 'tell', label: 'Telling stories that matter', track: 'content' },
    ],
  },
  {
    id: 'strength',
    question: 'Your strongest asset?',
    options: [
      { id: 'logic', label: 'Logic & problem-solving', track: 'dev' },
      { id: 'people', label: 'Understanding people', track: 'growth' },
      { id: 'design', label: 'Design & aesthetics', track: 'gaming' },
      { id: 'words', label: 'Words & communication', track: 'content' },
    ],
  },
  {
    id: 'impact',
    question: 'How do you want to impact ASDF?',
    options: [
      { id: 'build', label: 'Build the infrastructure', track: 'dev' },
      { id: 'spread', label: 'Spread the word', track: 'growth' },
      { id: 'engage', label: 'Create engagement', track: 'gaming' },
      { id: 'educate', label: 'Educate newcomers', track: 'content' },
    ],
  },
]

function FindPathSection({ onComplete }: { onComplete: (track: string) => void }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<string | null>(null)

  const question = PATH_QUESTIONS[step]

  const handleAnswer = (optionId: string, track: string) => {
    const newAnswers = { ...answers, [question.id]: track }
    setAnswers(newAnswers)

    setTimeout(() => {
      if (step < PATH_QUESTIONS.length - 1) {
        setStep(prev => prev + 1)
      } else {
        // Calculate result
        const counts: Record<string, number> = {}
        Object.values(newAnswers).forEach((t) => {
          counts[t] = (counts[t] || 0) + 1
        })
        const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
        setResult(winner)
      }
    }, 200)
  }

  if (result) {
    const track = JOURNEY_TRACKS.find(t => t.id === result)!
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto text-center py-16"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="w-24 h-24 rounded-3xl mx-auto mb-8 flex items-center justify-center text-4xl font-light"
          style={{ backgroundColor: `${track.color}20`, color: track.color }}
        >
          {track.icon}
        </motion.div>

        <h2 className="text-4xl font-light mb-4">
          Your path: <span style={{ color: track.color }}>{track.name}</span>
        </h2>
        <p className="text-[#666] text-lg mb-8">{track.description}</p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => { setStep(0); setAnswers({}); setResult(null) }}
            className="px-6 py-3 bg-[#111] border border-[#222] rounded-full text-sm text-[#999] hover:bg-[#1a1a1a] transition-colors"
          >
            Retake
          </button>
          <button
            onClick={() => onComplete(result)}
            className="px-6 py-3 rounded-full text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: track.color }}
          >
            Start Journey →
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-xl mx-auto py-16"
    >
      {/* Progress */}
      <div className="mb-12">
        <div className="flex gap-2 mb-4">
          {PATH_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i <= step ? 'bg-[#ea4e33]' : 'bg-[#1a1a1a]'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-[#666]">{step + 1} of {PATH_QUESTIONS.length}</p>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <h2 className="text-3xl font-light mb-8">{question.question}</h2>

          <div className="space-y-3">
            {question.options.map((option, i) => (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ x: 8 }}
                onClick={() => handleAnswer(option.id, option.track)}
                className="w-full p-5 text-left bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl hover:border-[#ea4e33]/50 transition-all group"
              >
                <span className="text-white group-hover:text-[#ea4e33] transition-colors">
                  {option.label}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================
// YOUR JOURNEY - Training Dashboard
// ============================================

function JourneySection({ selectedTrack }: { selectedTrack?: string }) {
  const [activeTrack, setActiveTrack] = useState(selectedTrack || 'dev')
  const track = JOURNEY_TRACKS.find(t => t.id === activeTrack)!

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-light tracking-tight mb-4"
        >
          Your Journey
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-[#666] text-lg"
        >
          From zero to production-ready builder
        </motion.p>
      </div>

      {/* Track Selector */}
      <div className="flex justify-center gap-3 mb-12">
        {JOURNEY_TRACKS.map((t) => (
          <motion.button
            key={t.id}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTrack(t.id)}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all ${
              activeTrack === t.id
                ? 'border-transparent'
                : 'bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#2a2a2a]'
            }`}
            style={{
              backgroundColor: activeTrack === t.id ? `${t.color}15` : undefined,
              borderColor: activeTrack === t.id ? `${t.color}40` : undefined,
            }}
          >
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-light"
              style={{
                backgroundColor: activeTrack === t.id ? `${t.color}20` : '#111',
                color: activeTrack === t.id ? t.color : '#666',
              }}
            >
              {t.icon}
            </span>
            <div className="text-left">
              <p className={`font-medium ${activeTrack === t.id ? 'text-white' : 'text-[#888]'}`}>
                {t.name}
              </p>
              <p className="text-xs text-[#666]">{t.modules} modules</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Track Content */}
      <motion.div
        key={activeTrack}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Card */}
          <div className="p-8 bg-[#0a0a0a] border border-[#1a1a1a] rounded-3xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-1">{track.name}</h3>
                <p className="text-[#666]">{track.description}</p>
              </div>
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${track.color}20`, color: track.color }}
              >
                {track.icon}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#666]">Progress</span>
                <span className="text-[#666]">0%</span>
              </div>
              <div className="h-2 bg-[#111] rounded-full overflow-hidden">
                <div className="h-full w-0 rounded-full" style={{ backgroundColor: track.color }} />
              </div>
            </div>

            {/* Levels */}
            <div className="flex items-center gap-2 text-sm">
              {['Outsider', 'Apprentice', 'Builder', 'Senior', 'Architect'].map((level, i) => (
                <div key={level} className="flex items-center">
                  <span className={i === 0 ? 'text-[#ea4e33]' : 'text-[#444]'}>{level}</span>
                  {i < 4 && <span className="mx-2 text-[#333]">→</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Modules Preview */}
          <div className="p-8 bg-[#0a0a0a] border border-[#1a1a1a] rounded-3xl">
            <h4 className="text-lg font-medium text-white mb-6">Curriculum</h4>
            <div className="space-y-4">
              {[
                { name: 'Fundamentals', lessons: 4, locked: false },
                { name: 'Core Concepts', lessons: 6, locked: true },
                { name: 'Advanced Patterns', lessons: 5, locked: true },
                { name: 'Production Ready', lessons: 3, locked: true },
              ].map((module, i) => (
                <div
                  key={module.name}
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    module.locked ? 'border-[#1a1a1a] opacity-50' : 'border-[#1a1a1a] hover:border-[#2a2a2a]'
                  } transition-colors`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium"
                      style={{
                        backgroundColor: module.locked ? '#111' : `${track.color}20`,
                        color: module.locked ? '#444' : track.color,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-white">{module.name}</p>
                      <p className="text-xs text-[#666]">{module.lessons} lessons</p>
                    </div>
                  </div>
                  {module.locked ? (
                    <span className="text-[#444]">🔒</span>
                  ) : (
                    <span className="text-[#ea4e33] text-sm">Start →</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-3xl">
            <h4 className="text-sm text-[#666] uppercase tracking-wider mb-4">Your Stats</h4>
            <div className="space-y-4">
              {[
                { label: 'XP', value: '0' },
                { label: 'Modules', value: '0/12' },
                { label: 'Streak', value: '0 days' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-[#666]">{label}</span>
                  <span className="text-white font-mono">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div
            className="p-6 rounded-3xl border text-center"
            style={{ backgroundColor: `${track.color}10`, borderColor: `${track.color}30` }}
          >
            <p className="text-sm text-[#999] mb-4">
              Complete your journey to join Yggdrasil
            </p>
            <button
              className="w-full py-3 rounded-xl text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: track.color }}
            >
              Begin Learning
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================
// MAIN PAGE
// ============================================

export default function BuildPage() {
  const [section, setSection] = useState<BuildSection>('yggdrasil')
  const [selectedTrack, setSelectedTrack] = useState<string | undefined>()

  const handlePathComplete = (track: string) => {
    setSelectedTrack(track)
    setSection('journey')
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-[#666] hover:text-white transition-colors"
          >
            ← Back
          </Link>
          <span className="text-sm text-[#ea4e33] font-medium tracking-wider">BUILD</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pt-28 pb-20">
        {/* Navigation */}
        <div className="flex justify-center mb-16">
          <BuildNav active={section} onChange={setSection} />
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div key={section}>
            {section === 'yggdrasil' && <YggdrasilSection />}
            {section === 'builders' && <BuildersSection />}
            {section === 'path' && <FindPathSection onComplete={handlePathComplete} />}
            {section === 'journey' && <JourneySection selectedTrack={selectedTrack} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  )
}
