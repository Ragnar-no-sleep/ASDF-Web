'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

// ============================================
// TYPES
// ============================================

type BuildSection = 'yggdrasil' | 'builders' | 'path' | 'journey'

interface Builder {
  id: string
  name: string
  avatar: string
  role: string
  skills: string[]
  projects: string[]
  github?: string
  contributions: number
  status: 'active' | 'building' | 'legend'
}

interface YggdrasilNode {
  id: string
  name: string
  type: 'tool' | 'game' | 'analytics' | 'community'
  status: 'live' | 'building' | 'planned'
  description: string
  builders: string[]
  link?: string
}

// ============================================
// MOCK DATA
// ============================================

const YGGDRASIL_NODES: YggdrasilNode[] = [
  { id: 'burns', name: 'Burn Tracker', type: 'analytics', status: 'live', description: 'Real-time burn monitoring', builders: ['Ragnar'], link: '/burns' },
  { id: 'holdex', name: 'HolDex', type: 'analytics', status: 'live', description: 'Portfolio tracking & analytics', builders: ['Ragnar'], link: '/holdex' },
  { id: 'forecast', name: 'ASDForecast', type: 'community', status: 'live', description: 'Community predictions', builders: ['Ragnar'], link: '/asdforecast' },
  { id: 'ignition', name: 'Ignition', type: 'game', status: 'live', description: 'Gamified learning experience', builders: ['Ragnar'], link: '/ignition' },
  { id: 'daemon', name: 'Burn Daemon', type: 'tool', status: 'live', description: 'Automated burn mechanism', builders: ['Ragnar'] },
  { id: 'sdk', name: 'ASDF SDK', type: 'tool', status: 'building', description: 'Developer toolkit', builders: [] },
  { id: 'mobile', name: 'Mobile App', type: 'tool', status: 'planned', description: 'iOS & Android companion', builders: [] },
]

const BUILDERS: Builder[] = [
  {
    id: 'ragnar',
    name: 'Ragnar',
    avatar: '🐕',
    role: 'Core Builder',
    skills: ['Solana', 'TypeScript', 'React', 'Node.js'],
    projects: ['Burn Tracker', 'HolDex', 'ASDForecast', 'Ignition'],
    github: 'Ragnar-no-sleep',
    contributions: 420,
    status: 'legend',
  },
]

const JOURNEY_TRACKS = [
  {
    id: 'dev',
    icon: '💻',
    name: 'Developer',
    description: 'Code the future of ASDF',
    skills: ['Solana', 'Rust', 'TypeScript', 'Smart Contracts'],
    levels: ['Moldu', 'Apprentice', 'Developer', 'Senior', 'Architect'],
    modules: 12,
  },
  {
    id: 'marketing',
    icon: '📣',
    name: 'Marketing & Design',
    description: 'Distribution is the bottleneck',
    skills: ['Psychology', 'Hooks', 'Viral Loops', 'UI/UX'],
    levels: ['Moldu', 'Creator', 'Strategist', 'Growth Lead', 'CMO'],
    modules: 10,
  },
  {
    id: 'gaming',
    icon: '🎮',
    name: 'Game Dev',
    description: 'Build engaging experiences',
    skills: ['Unity', 'Game Design', 'Tokenomics', 'UX'],
    levels: ['Moldu', 'Designer', 'Developer', 'Lead', 'Studio'],
    modules: 8,
  },
  {
    id: 'content',
    icon: '🎬',
    name: 'Content Creator',
    description: 'Own the narrative',
    skills: ['Writing', 'Video', 'Community', 'Analytics'],
    levels: ['Moldu', 'Creator', 'Influencer', 'Thought Leader', 'Media'],
    modules: 9,
  },
]

// ============================================
// NAVIGATION
// ============================================

function BuildNav({ active, onChange }: { active: BuildSection; onChange: (s: BuildSection) => void }) {
  const sections: { id: BuildSection; label: string; icon: string }[] = [
    { id: 'yggdrasil', label: 'Yggdrasil', icon: '🌳' },
    { id: 'builders', label: 'Builders', icon: '👷' },
    { id: 'path', label: 'Find Your Path', icon: '🧭' },
    { id: 'journey', label: 'Your Journey', icon: '🚀' },
  ]

  return (
    <nav className="flex gap-2 p-2 bg-dark-elevated border border-ragnar/20 rounded-xl overflow-x-auto">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onChange(section.id)}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
            active === section.id
              ? 'bg-ragnar/20 text-ragnar border border-ragnar/30'
              : 'text-warm-secondary hover:bg-dark-surface hover:text-warm-primary'
          }`}
        >
          <span>{section.icon}</span>
          <span>{section.label}</span>
        </button>
      ))}
    </nav>
  )
}

// ============================================
// YGGDRASIL - Interactive Ecosystem Tree
// ============================================

function YggdrasilSection() {
  const [selectedNode, setSelectedNode] = useState<YggdrasilNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Node positions for tree layout
  const getNodePosition = (index: number, total: number) => {
    const centerX = 50
    const centerY = 50
    const radius = 35
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    }
  }

  const getStatusColor = (status: YggdrasilNode['status']) => {
    switch (status) {
      case 'live': return 'bg-green-500'
      case 'building': return 'bg-ragnar'
      case 'planned': return 'bg-warm-ghost'
    }
  }

  const getTypeIcon = (type: YggdrasilNode['type']) => {
    switch (type) {
      case 'tool': return '🔧'
      case 'game': return '🎮'
      case 'analytics': return '📊'
      case 'community': return '👥'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">
          <span className="text-ragnar">Yggdrasil</span> - The Living Ecosystem
        </h2>
        <p className="text-warm-secondary">
          Every node is a tool. Every tool feeds the burn. Click to explore.
        </p>
      </div>

      {/* Tree Visualization */}
      <div className="relative aspect-square max-w-2xl mx-auto">
        {/* Center - ASDF Core */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <motion.div
            animate={{
              boxShadow: [
                '0 0 20px rgba(234, 78, 51, 0.3)',
                '0 0 40px rgba(234, 78, 51, 0.5)',
                '0 0 20px rgba(234, 78, 51, 0.3)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-24 h-24 rounded-full bg-dark-elevated border-2 border-ragnar flex items-center justify-center"
          >
            <span className="text-3xl">🐕🔥</span>
          </motion.div>
          <p className="text-center text-xs text-ragnar font-mono mt-2">$asdfasdfa</p>
        </div>

        {/* Nodes */}
        {YGGDRASIL_NODES.map((node, i) => {
          const pos = getNodePosition(i, YGGDRASIL_NODES.length)
          const isHovered = hoveredNode === node.id
          const isSelected = selectedNode?.id === node.id

          return (
            <motion.div
              key={node.id}
              className="absolute cursor-pointer"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              onHoverStart={() => setHoveredNode(node.id)}
              onHoverEnd={() => setHoveredNode(null)}
              onClick={() => setSelectedNode(isSelected ? null : node)}
            >
              {/* Connection line to center */}
              <svg
                className="absolute pointer-events-none"
                style={{
                  width: '200px',
                  height: '200px',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <line
                  x1="100"
                  y1="100"
                  x2={100 + (50 - pos.x) * 2}
                  y2={100 + (50 - pos.y) * 2}
                  stroke={node.status === 'live' ? 'rgba(234, 78, 51, 0.3)' : 'rgba(90, 77, 64, 0.2)'}
                  strokeWidth="2"
                  strokeDasharray={node.status === 'planned' ? '5,5' : undefined}
                />
              </svg>

              {/* Node */}
              <motion.div
                animate={{
                  scale: isHovered || isSelected ? 1.15 : 1,
                  boxShadow: isHovered || isSelected
                    ? '0 0 30px rgba(234, 78, 51, 0.4)'
                    : '0 0 0px rgba(234, 78, 51, 0)',
                }}
                className={`relative w-16 h-16 rounded-xl flex flex-col items-center justify-center transition-colors ${
                  isSelected ? 'bg-ragnar/30 border-ragnar' : 'bg-dark-elevated border-ragnar/30'
                } border`}
              >
                {/* Status indicator */}
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(node.status)}`} />

                <span className="text-xl">{getTypeIcon(node.type)}</span>
                <span className="text-[10px] text-warm-secondary mt-1 truncate max-w-full px-1">
                  {node.name}
                </span>
              </motion.div>
            </motion.div>
          )
        })}
      </div>

      {/* Selected Node Details */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-md mx-auto p-6 bg-dark-elevated border border-ragnar/30 rounded-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{getTypeIcon(selectedNode.type)}</span>
              <div>
                <h3 className="font-bold text-lg">{selectedNode.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedNode.status === 'live' ? 'bg-green-500/20 text-green-400' :
                  selectedNode.status === 'building' ? 'bg-ragnar/20 text-ragnar' :
                  'bg-warm-ghost/20 text-warm-ghost'
                }`}>
                  {selectedNode.status.toUpperCase()}
                </span>
              </div>
            </div>
            <p className="text-warm-secondary mb-4">{selectedNode.description}</p>
            <div className="flex items-center justify-between">
              <div className="text-sm text-warm-muted">
                Built by: <span className="text-ragnar">{selectedNode.builders.join(', ') || 'Open'}</span>
              </div>
              {selectedNode.link && (
                <Link
                  href={selectedNode.link}
                  className="px-4 py-2 bg-ragnar/20 border border-ragnar/40 rounded-lg text-ragnar text-sm hover:bg-ragnar/30 transition-colors"
                >
                  Visit →
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-warm-muted">Live</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-ragnar" />
          <span className="text-warm-muted">Building</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-warm-ghost" />
          <span className="text-warm-muted">Planned</span>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================
// BUILDERS SECTION
// ============================================

function BuildersSection() {
  const getStatusBadge = (status: Builder['status']) => {
    switch (status) {
      case 'active': return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Active' }
      case 'building': return { bg: 'bg-ragnar/20', text: 'text-ragnar', label: 'Building' }
      case 'legend': return { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Legend' }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">Builders</h2>
          <p className="text-warm-secondary">The people behind the ecosystem</p>
        </div>
        <button className="px-4 py-2 bg-ragnar/20 border border-ragnar/40 rounded-lg text-ragnar hover:bg-ragnar/30 transition-colors">
          + Join as Builder
        </button>
      </div>

      {/* Builders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {BUILDERS.map((builder) => {
          const badge = getStatusBadge(builder.status)
          return (
            <motion.div
              key={builder.id}
              whileHover={{ y: -4 }}
              className="p-6 bg-dark-elevated border border-ragnar/20 rounded-xl hover:border-ragnar/40 transition-colors"
            >
              {/* Header */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-dark-surface flex items-center justify-center text-2xl">
                  {builder.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{builder.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-sm text-warm-muted">{builder.role}</p>
                </div>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {builder.skills.slice(0, 4).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-dark-surface rounded text-xs text-warm-secondary"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {/* Projects */}
              <div className="mb-4">
                <div className="text-xs text-warm-ghost uppercase tracking-wider mb-2">Projects</div>
                <div className="text-sm text-warm-secondary">
                  {builder.projects.join(' • ')}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between pt-4 border-t border-ragnar/10">
                <div className="flex items-center gap-2">
                  <span className="text-ragnar font-mono">{builder.contributions}</span>
                  <span className="text-warm-ghost text-sm">contributions</span>
                </div>
                {builder.github && (
                  <a
                    href={`https://github.com/${builder.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-warm-muted hover:text-ragnar transition-colors"
                  >
                    GitHub →
                  </a>
                )}
              </div>
            </motion.div>
          )
        })}

        {/* Empty State / CTA */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-6 bg-dark-card border-2 border-dashed border-ragnar/30 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-ragnar/50 transition-colors min-h-[280px]"
        >
          <span className="text-4xl mb-4">🔨</span>
          <h3 className="font-bold mb-2">Become a Builder</h3>
          <p className="text-sm text-warm-muted mb-4">
            Complete Your Journey to unlock your builder profile
          </p>
          <span className="text-ragnar text-sm">Start Journey →</span>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ============================================
// FIND YOUR PATH - Quiz
// ============================================

const PATH_QUESTIONS = [
  {
    id: 'motivation',
    question: 'What drives you?',
    type: 'psycho',
    options: [
      { id: 'build', label: 'Building things from scratch', icon: '🔨', track: 'dev' },
      { id: 'influence', label: 'Influencing & connecting people', icon: '🎯', track: 'marketing' },
      { id: 'play', label: 'Creating fun experiences', icon: '🎮', track: 'gaming' },
      { id: 'express', label: 'Expressing ideas & stories', icon: '✨', track: 'content' },
    ],
  },
  {
    id: 'skill',
    question: 'What\'s your strongest skill?',
    type: 'skill',
    options: [
      { id: 'code', label: 'Writing code / Logic', icon: '💻', track: 'dev' },
      { id: 'design', label: 'Design / Aesthetics', icon: '🎨', track: 'marketing' },
      { id: 'game', label: 'Game mechanics / UX', icon: '🕹️', track: 'gaming' },
      { id: 'story', label: 'Storytelling / Writing', icon: '📝', track: 'content' },
    ],
  },
  {
    id: 'time',
    question: 'How much time can you commit weekly?',
    type: 'motivation',
    options: [
      { id: 'full', label: '20+ hours (Full commitment)', icon: '🔥', multiplier: 1.5 },
      { id: 'part', label: '10-20 hours (Serious hobby)', icon: '⚡', multiplier: 1.2 },
      { id: 'casual', label: '5-10 hours (Learning)', icon: '📚', multiplier: 1 },
      { id: 'explore', label: '< 5 hours (Exploring)', icon: '🌱', multiplier: 0.8 },
    ],
  },
  {
    id: 'goal',
    question: 'What\'s your end goal?',
    type: 'psycho',
    options: [
      { id: 'job', label: 'Land a job in web3', icon: '💼', track: 'dev' },
      { id: 'founder', label: 'Start my own project', icon: '🚀', track: 'marketing' },
      { id: 'create', label: 'Create something memorable', icon: '🏆', track: 'gaming' },
      { id: 'community', label: 'Build a community', icon: '🤝', track: 'content' },
    ],
  },
]

function FindYourPathSection({ onComplete }: { onComplete: (track: string) => void }) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<string | null>(null)

  const question = PATH_QUESTIONS[currentQuestion]

  const handleAnswer = (optionId: string, track?: string) => {
    const newAnswers = { ...answers, [question.id]: optionId }
    setAnswers(newAnswers)

    if (currentQuestion < PATH_QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQuestion(prev => prev + 1), 300)
    } else {
      // Calculate result
      const trackCounts: Record<string, number> = {}
      PATH_QUESTIONS.forEach((q) => {
        const answer = newAnswers[q.id]
        const option = q.options.find(o => o.id === answer)
        if (option && 'track' in option) {
          trackCounts[option.track] = (trackCounts[option.track] || 0) + 1
        }
      })

      const winningTrack = Object.entries(trackCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'dev'
      setResult(winningTrack)
    }
  }

  const resetQuiz = () => {
    setCurrentQuestion(0)
    setAnswers({})
    setResult(null)
  }

  if (result) {
    const track = JOURNEY_TRACKS.find(t => t.id === result)!
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="text-6xl mb-6"
        >
          {track.icon}
        </motion.div>
        <h2 className="text-3xl font-bold mb-2">Your Path: <span className="text-ragnar">{track.name}</span></h2>
        <p className="text-warm-secondary mb-6">{track.description}</p>

        <div className="p-6 bg-dark-elevated border border-ragnar/30 rounded-xl mb-8 text-left">
          <div className="text-sm text-warm-ghost mb-3">You'll master:</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {track.skills.map((skill) => (
              <span key={skill} className="px-3 py-1 bg-ragnar/20 text-ragnar rounded-full text-sm">
                {skill}
              </span>
            ))}
          </div>
          <div className="text-sm text-warm-muted">
            {track.modules} modules • {track.levels.length} levels
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={resetQuiz}
            className="px-6 py-3 bg-dark-surface border border-ragnar/20 rounded-xl text-warm-secondary hover:bg-dark-elevated transition-colors"
          >
            Retake Quiz
          </button>
          <button
            onClick={() => onComplete(result)}
            className="px-6 py-3 bg-ragnar/20 border border-ragnar/40 rounded-xl text-ragnar hover:bg-ragnar/30 transition-colors"
          >
            Start Your Journey →
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto"
    >
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-warm-muted mb-2">
          <span>Question {currentQuestion + 1}/{PATH_QUESTIONS.length}</span>
          <span>{Math.round(((currentQuestion + 1) / PATH_QUESTIONS.length) * 100)}%</span>
        </div>
        <div className="h-2 bg-dark-surface rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-ragnar"
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestion + 1) / PATH_QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <h2 className="text-2xl font-bold mb-6 text-center">{question.question}</h2>

          <div className="space-y-3">
            {question.options.map((option) => (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAnswer(option.id, 'track' in option ? option.track : undefined)}
                className={`w-full p-5 text-left bg-dark-elevated border rounded-xl transition-all ${
                  answers[question.id] === option.id
                    ? 'border-ragnar bg-ragnar/10'
                    : 'border-ragnar/20 hover:border-ragnar/40'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{option.icon}</span>
                  <span className="font-medium">{option.label}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================
// YOUR JOURNEY - Training Hub
// ============================================

function YourJourneySection({ selectedTrack }: { selectedTrack?: string }) {
  const [activeTrack, setActiveTrack] = useState(selectedTrack || 'dev')

  const track = JOURNEY_TRACKS.find(t => t.id === activeTrack)!

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Your Journey</h2>
        <p className="text-warm-secondary">From Moldu to Production-Ready Builder</p>
      </div>

      {/* Track Selector */}
      <div className="flex gap-3 justify-center flex-wrap mb-8">
        {JOURNEY_TRACKS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTrack(t.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all ${
              activeTrack === t.id
                ? 'bg-ragnar/20 text-ragnar border border-ragnar/40'
                : 'bg-dark-elevated text-warm-secondary border border-ragnar/10 hover:border-ragnar/30'
            }`}
          >
            <span className="text-xl">{t.icon}</span>
            <span className="font-medium">{t.name}</span>
          </button>
        ))}
      </div>

      {/* Track Details */}
      <div className="max-w-3xl mx-auto">
        <div className="p-8 bg-dark-elevated border border-ragnar/20 rounded-xl mb-6">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-5xl">{track.icon}</span>
            <div>
              <h3 className="text-2xl font-bold">{track.name}</h3>
              <p className="text-warm-secondary">{track.description}</p>
            </div>
          </div>

          {/* Skills */}
          <div className="mb-6">
            <div className="text-sm text-warm-ghost uppercase tracking-wider mb-3">Skills you'll learn</div>
            <div className="flex flex-wrap gap-2">
              {track.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-4 py-2 bg-dark-surface border border-ragnar/20 rounded-lg text-warm-secondary"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Progression */}
          <div className="mb-6">
            <div className="text-sm text-warm-ghost uppercase tracking-wider mb-3">Progression</div>
            <div className="flex items-center gap-2">
              {track.levels.map((level, i) => (
                <div key={level} className="flex items-center">
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    i === 0 ? 'bg-ragnar/20 text-ragnar' : 'bg-dark-surface text-warm-muted'
                  }`}>
                    {level}
                  </div>
                  {i < track.levels.length - 1 && (
                    <span className="text-warm-ghost mx-1">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-ragnar/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-ragnar">{track.modules}</div>
              <div className="text-sm text-warm-muted">Modules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-ragnar">{track.levels.length}</div>
              <div className="text-sm text-warm-muted">Levels</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-ragnar">∞</div>
              <div className="text-sm text-warm-muted">Possibilities</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="p-6 bg-ragnar/10 border border-ragnar rounded-xl text-center">
          <p className="text-warm-secondary mb-4">
            Complete your journey and propose a feature to join <span className="text-ragnar">Yggdrasil</span>
          </p>
          <button className="px-8 py-4 bg-ragnar/20 border border-ragnar/40 rounded-xl text-ragnar font-medium hover:bg-ragnar/30 transition-colors">
            Begin {track.name} Journey →
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================
// MAIN PAGE
// ============================================

export default function BuildPage() {
  const [activeSection, setActiveSection] = useState<BuildSection>('yggdrasil')
  const [selectedTrack, setSelectedTrack] = useState<string | undefined>()

  const handlePathComplete = (track: string) => {
    setSelectedTrack(track)
    setActiveSection('journey')
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'yggdrasil':
        return <YggdrasilSection />
      case 'builders':
        return <BuildersSection />
      case 'path':
        return <FindYourPathSection onComplete={handlePathComplete} />
      case 'journey':
        return <YourJourneySection selectedTrack={selectedTrack} />
    }
  }

  return (
    <main className="min-h-screen bg-black text-warm-primary">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-gradient-to-b from-black to-transparent">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-xs tracking-widest uppercase text-warm-muted hover:text-ragnar transition-colors"
          >
            ← Hub
          </Link>
          <span className="text-ragnar font-mono text-sm">BUILD</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 pt-24 pb-16">
        {/* Navigation */}
        <div className="mb-8">
          <BuildNav active={activeSection} onChange={setActiveSection} />
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeSection}>
            {renderSection()}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  )
}
