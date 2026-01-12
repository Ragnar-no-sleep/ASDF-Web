'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Dynamic import for Three.js component (client-side only)
const YggdrasilScene = dynamic(
  () => import('@/components/Yggdrasil3D/YggdrasilScene'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[700px] bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#ea4e33] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#666] text-sm">Loading Yggdrasil...</p>
        </div>
      </div>
    ),
  }
)

// Dynamic import for Journey DEV Track (uses Monaco Editor - client-side only)
const JourneyDevTrack = dynamic(
  () => import('@/components/Journey/JourneyDevTrack'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#ea4e33] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#666] text-sm">Loading curriculum...</p>
        </div>
      </div>
    ),
  }
)

// ============================================
// TYPES
// ============================================

type BuildSection = 'yggdrasil' | 'builders' | 'path' | 'journey'

interface Skill {
  name: string
  level: number
}

interface Builder {
  id: string
  name: string
  role: string
  avatar: string
  color: string
  skills: Skill[]
  bio: string
  projects: string[]
  lookingFor: string[]
  github?: string
  status: 'legend' | 'active' | 'rising'
  badge: { type: 'core' | 'community' | 'infra'; label: string }
}

// ============================================
// DATA
// ============================================

const BUILDERS: Builder[] = [
  {
    id: 'zeyxx',
    name: 'Zeyxx',
    role: 'Lead Developer',
    avatar: '⚡',
    color: '#fbbf24',
    skills: [
      { name: 'TypeScript', level: 95 },
      { name: 'Rust/Solana', level: 90 },
      { name: 'JavaScript', level: 85 },
    ],
    bio: 'Burning in the chaos. Full-stack developer & main architect of the ASDF ecosystem. Building infrastructure for mathematical conviction over narrative.',
    projects: ['Burn Engine', 'ASDF Validator', 'ASDev (Launcher)', 'Vanity Grinder'],
    lookingFor: ['Smart Contract Auditor', 'UI/UX Designer'],
    github: 'zeyxx',
    status: 'legend',
    badge: { type: 'core', label: '👑 Core' },
  },
  {
    id: 'sollama',
    name: 'Sollama',
    role: 'Full-Stack Developer',
    avatar: '🦙',
    color: '#a855f7',
    skills: [
      { name: 'Full-Stack', level: 90 },
      { name: 'Rust', level: 85 },
      { name: 'JavaScript', level: 85 },
    ],
    bio: 'Full-stack developer building core infrastructure for the ASDF ecosystem. Specializing in developer tools, DeFi platforms, and on-chain analytics.',
    projects: ['Burn Tracker', 'HolDex', 'ASDForecast', 'ASDF Grinder'],
    lookingFor: ['Lead Developer', 'Product Engineer'],
    github: 'sollama58',
    status: 'legend',
    badge: { type: 'community', label: '🎯 Builder' },
  },
  {
    id: 'ragnar',
    name: 'Ragnar',
    role: 'Product Engineer & Security',
    avatar: '⚔️',
    color: '#3b82f6',
    skills: [
      { name: 'HTML/CSS', level: 90 },
      { name: 'Security', level: 88 },
      { name: 'Content/Product', level: 85 },
    ],
    bio: 'Product/Content Engineer and Security Analyst. Building educational content and securing the ecosystem.',
    projects: ['Learn Platform', 'Games Platform', 'Security Audits'],
    lookingFor: ['Games Developer/Designer', 'Security Researcher'],
    github: 'Ragnar-no-sleep',
    status: 'legend',
    badge: { type: 'infra', label: '🛡️ Security' },
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
// VIKING BACKGROUND - SVG Aurora & Yggdrasil
// ============================================

function VikingBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
      {/* Stars layer */}
      <div
        className="absolute inset-0 animate-pulse"
        style={{
          backgroundImage: `
            radial-gradient(2px 2px at 20px 30px, rgba(255, 255, 255, 0.9), transparent),
            radial-gradient(2px 2px at 90px 40px, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(3px 3px at 200px 50px, rgba(255, 255, 255, 0.85), transparent),
            radial-gradient(2px 2px at 340px 60px, rgba(255, 255, 255, 0.9), transparent),
            radial-gradient(2px 2px at 460px 170px, rgba(255, 255, 255, 0.7), transparent),
            radial-gradient(3px 3px at 580px 80px, rgba(255, 255, 255, 0.8), transparent),
            radial-gradient(2px 2px at 700px 110px, rgba(255, 255, 255, 0.85), transparent)
          `,
          backgroundSize: '820px 220px',
        }}
      />

      {/* Aurora layer */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 180% 80% at 10% -20%, rgba(34, 197, 94, 0.35) 0%, transparent 60%),
            radial-gradient(ellipse 150% 70% at 90% -10%, rgba(74, 222, 128, 0.3) 0%, transparent 55%),
            radial-gradient(ellipse 140% 60% at 50% -15%, rgba(34, 211, 238, 0.25) 0%, transparent 60%),
            radial-gradient(ellipse 120% 50% at 20% 10%, rgba(168, 85, 247, 0.3) 0%, transparent 55%),
            radial-gradient(ellipse 80% 50% at 25% 60%, rgba(34, 197, 94, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 70% 45% at 80% 50%, rgba(168, 85, 247, 0.06) 0%, transparent 45%)
          `,
        }}
      />

      {/* Yggdrasil SVG tree */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.15,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 1000'%3E%3Cdefs%3E%3ClinearGradient id='treeGrad' x1='0%25' y1='100%25' x2='0%25' y2='0%25'%3E%3Cstop offset='0%25' stop-color='%2322c55e'/%3E%3Cstop offset='30%25' stop-color='%234ade80'/%3E%3Cstop offset='60%25' stop-color='%2322d3ee'/%3E%3Cstop offset='100%25' stop-color='%23a855f7'/%3E%3C/linearGradient%3E%3Cfilter id='glow'%3E%3CfeGaussianBlur stdDeviation='3' result='coloredBlur'/%3E%3CfeMerge%3E%3CfeMergeNode in='coloredBlur'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E%3C/filter%3E%3C/defs%3E%3Cg fill='none' stroke='url(%23treeGrad)' stroke-linecap='round' filter='url(%23glow)'%3E%3Cpath d='M600 1000 L600 550 Q600 480 570 400 Q540 320 600 240 Q660 160 600 80' stroke-width='8'/%3E%3Cpath d='M600 850 Q480 800 360 860 Q240 920 100 850' stroke-width='5'/%3E%3Cpath d='M600 720 Q460 660 320 720 Q180 780 40 700' stroke-width='4'/%3E%3Cpath d='M600 590 Q440 520 280 590 Q120 660 -40 560' stroke-width='4'/%3E%3Cpath d='M600 850 Q720 800 840 860 Q960 920 1100 850' stroke-width='5'/%3E%3Cpath d='M600 720 Q740 660 880 720 Q1020 780 1160 700' stroke-width='4'/%3E%3Cpath d='M600 590 Q760 520 920 590 Q1080 660 1240 560' stroke-width='4'/%3E%3Cpath d='M600 1000 Q480 960 360 1010 Q240 1060 80 980' stroke-width='6'/%3E%3Cpath d='M600 1000 Q720 960 840 1010 Q960 1060 1120 980' stroke-width='6'/%3E%3Ccircle cx='280' cy='590' r='10' fill='%234ade80' opacity='0.8'/%3E%3Ccircle cx='920' cy='590' r='10' fill='%234ade80' opacity='0.8'/%3E%3Ccircle cx='600' cy='80' r='12' fill='%23fbbf24' opacity='1'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: 'contain',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Floating runes */}
      <div
        className="absolute top-[15%] left-0 w-[200%] text-2xl tracking-[40px] whitespace-nowrap animate-runes-scroll"
        style={{ color: 'rgba(74, 222, 128, 0.2)', textShadow: '0 0 20px rgba(74, 222, 128, 0.4)' }}
      >
        ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ᛈ ᛇ ᛉ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ ᛞ ᛟ   ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ᛈ ᛇ ᛉ ᛊ
      </div>

      {/* Mist at bottom */}
      <div
        className="absolute bottom-0 left-0 w-full h-1/2"
        style={{
          background: `linear-gradient(to top, rgba(34, 197, 94, 0.08) 0%, rgba(34, 211, 238, 0.05) 20%, transparent 100%)`,
        }}
      />
    </div>
  )
}

// ============================================
// BUILDERS - Viking Marketplace Style
// ============================================

function BuildersSection() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative max-w-6xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#ea4e33]/10 border border-[#ea4e33]/30 rounded-full mb-6"
        >
          <span className="w-2 h-2 bg-[#4ade80] rounded-full animate-pulse" />
          <span className="text-sm text-[#ea4e33] font-medium">3 Builders Active</span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold tracking-tight mb-4"
        >
          <span className="bg-gradient-to-r from-[#4ade80] via-[#22d3ee] to-[#a855f7] bg-clip-text text-transparent">
            Builders Marketplace
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-[#888] text-lg max-w-xl mx-auto"
        >
          The architects forging the ASDF ecosystem. Connect, collaborate, build.
        </motion.p>
      </div>

      {/* Builders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {BUILDERS.map((builder, index) => (
          <motion.div
            key={builder.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -6, borderColor: '#ea4e33' }}
            className="group relative p-6 bg-[#0a0808]/90 backdrop-blur-sm border-2 border-[#2a1a15] rounded-2xl hover:shadow-[0_8px_24px_rgba(234,78,51,0.15)] transition-all duration-300"
          >
            {/* Header: Avatar + Identity + Badge */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl bg-[#111] border border-[#333]"
                >
                  {builder.avatar}
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#4ade80] rounded-full border-2 border-[#0a0808] shadow-[0_0_8px_#4ade80]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[#f5f0e8]">{builder.name}</h3>
                <p className="text-xs text-[#666]">{builder.role}</p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                  builder.badge.type === 'core'
                    ? 'bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/50'
                    : builder.badge.type === 'community'
                    ? 'bg-[#a855f7]/10 text-[#a855f7] border-[#a855f7]/50'
                    : 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/50'
                }`}
              >
                {builder.badge.label}
              </span>
            </div>

            {/* Bio */}
            <p className="text-sm text-[#888] leading-relaxed mb-5 pb-5 border-b border-[#1a1a1a]">
              {builder.bio}
            </p>

            {/* Skills with progress bars */}
            <div className="mb-5">
              <h4 className="text-[10px] text-[#555] uppercase tracking-wider font-semibold mb-3">Skills</h4>
              <div className="space-y-2.5">
                {builder.skills.map((skill) => (
                  <div key={skill.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#999]">{skill.name}</span>
                      <span className="text-[#555]">{skill.level}%</span>
                    </div>
                    <div className="h-1.5 bg-[#111] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.level}%` }}
                        transition={{ delay: 0.3 + index * 0.1, duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${builder.color}, ${builder.color}88)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div className="mb-5">
              <h4 className="text-[10px] text-[#555] uppercase tracking-wider font-semibold mb-3">Projects</h4>
              <div className="space-y-1.5">
                {builder.projects.map((project) => (
                  <div key={project} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 bg-[#4ade80] rounded-full" />
                    <span className="text-[#aaa]">{project}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Looking For */}
            <div className="mb-5">
              <h4 className="text-[10px] text-[#555] uppercase tracking-wider font-semibold mb-3">Looking For</h4>
              <div className="flex flex-wrap gap-2">
                {builder.lookingFor.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-[#ea4e33]/10 border border-[#ea4e33]/30 rounded-md text-xs text-[#ea4e33]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer */}
            <a
              href={`https://github.com/${builder.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-[#ea4e33] to-[#d94429] rounded-xl text-sm font-medium text-white hover:from-[#f55a3f] hover:to-[#ea4e33] transition-all"
            >
              🤝 Join {builder.name}&apos;s Projects
            </a>
          </motion.div>
        ))}
      </div>

      {/* Join CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-8 bg-gradient-to-br from-[#ea4e33]/5 to-[#ea4e33]/10 border border-[#ea4e33]/20 rounded-2xl text-center"
      >
        <div className="text-4xl mb-4">🚀</div>
        <h3 className="text-xl font-bold text-white mb-2">Want to Join a Builder?</h3>
        <p className="text-[#888] text-sm mb-6 max-w-md mx-auto">
          Connect with builders, contribute to projects, and help grow the ecosystem.
        </p>
        <a
          href="https://github.com/Ragnar-no-sleep/ASDF-Builders"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#ea4e33] rounded-xl text-sm font-medium text-white hover:bg-[#d94429] transition-colors"
        >
          View All Projects on GitHub →
        </a>
      </motion.div>
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
  const [showFullTrack, setShowFullTrack] = useState(false)
  const track = JOURNEY_TRACKS.find(t => t.id === activeTrack)!

  // Show full DEV track experience
  if (showFullTrack && activeTrack === 'dev') {
    return (
      <div className="relative">
        <button
          onClick={() => setShowFullTrack(false)}
          className="absolute top-4 left-4 z-10 px-4 py-2 bg-[#111] border border-[#222] rounded-lg text-sm text-[#888] hover:text-white hover:border-[#333] transition-colors flex items-center gap-2"
        >
          <span>←</span>
          <span>Back to Overview</span>
        </button>
        <JourneyDevTrack />
      </div>
    )
  }

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
                { name: 'Foundations', lessons: 6, locked: false },
                { name: 'Smart Contracts', lessons: 8, locked: true },
                { name: 'DeFi Patterns', lessons: 6, locked: true },
                { name: 'Production Ready', lessons: 4, locked: true },
              ].map((module, i) => (
                <button
                  key={module.name}
                  onClick={() => !module.locked && activeTrack === 'dev' && setShowFullTrack(true)}
                  disabled={module.locked}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border ${
                    module.locked
                      ? 'border-[#1a1a1a] opacity-50 cursor-not-allowed'
                      : 'border-[#1a1a1a] hover:border-[#ea4e33]/50 hover:bg-[#111] cursor-pointer'
                  } transition-all`}
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
                    <div className="text-left">
                      <p className="font-medium text-white">{module.name}</p>
                      <p className="text-xs text-[#666]">{module.lessons} lessons</p>
                    </div>
                  </div>
                  {module.locked ? (
                    <span className="text-[#444]">🔒</span>
                  ) : (
                    <span className="text-[#ea4e33] text-sm font-medium">Start →</span>
                  )}
                </button>
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
              onClick={() => activeTrack === 'dev' && setShowFullTrack(true)}
              className="w-full py-3 rounded-xl text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: track.color }}
            >
              {activeTrack === 'dev' ? 'Start Learning' : 'Coming Soon'}
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

  // Show Viking background for Builders and Path sections
  const showVikingBg = section === 'builders' || section === 'path'

  return (
    <main className="min-h-screen bg-[#020812] text-white relative">
      {/* Viking Background (Builders + Path only) */}
      {showVikingBg && <VikingBackground />}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-5 bg-gradient-to-b from-[#020812] to-transparent">
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

      <div className="relative max-w-7xl mx-auto px-6 pt-28 pb-20">
        {/* Navigation */}
        <div className="flex justify-center mb-16">
          <BuildNav active={section} onChange={setSection} />
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div key={section}>
            {section === 'yggdrasil' && <YggdrasilScene />}
            {section === 'builders' && <BuildersSection />}
            {section === 'path' && <FindPathSection onComplete={handlePathComplete} />}
            {section === 'journey' && <JourneySection selectedTrack={selectedTrack} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  )
}
