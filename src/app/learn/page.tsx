'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

// ============================================
// TYPES
// ============================================

type InteractionType = 'scroll' | 'drag' | 'burn' | 'type' | 'explore'

interface Phase {
  id: string
  level: string
  title: string
  subtitle: string
  content: string[]
  interaction: InteractionType
  unlockHint: string
}

// ============================================
// CONTENT - The Rabbit Hole
// ============================================

const phases: Phase[] = [
  {
    id: 'moldu',
    level: 'Outsider',
    title: 'You arrive here.',
    subtitle: 'Welcome to the rabbit hole.',
    content: [
      '$asdfasdfa. A token on Solana.',
      'Created on pump.fun. Nothing more.',
      'No promises. No roadmap. No team allocation.',
      'Just code. Code that does one thing.',
    ],
    interaction: 'scroll',
    unlockHint: 'Scroll to continue',
  },
  {
    id: 'mechanism',
    level: 'Outsider → Initiate',
    title: 'The Mechanism',
    subtitle: 'How it really works.',
    content: [
      'When a creator earns fees on pump.fun...',
      'Those fees trigger an automatic burn.',
      'Creator earns → ASDF buys back → Tokens burned forever.',
      'Simple. Transparent. Verifiable.',
    ],
    interaction: 'drag',
    unlockHint: 'Drag to reveal the flow',
  },
  {
    id: 'daemon',
    level: 'Initiate',
    title: 'The Daemon',
    subtitle: 'Code that runs. Always.',
    content: [
      'A program watches the blockchain.',
      'When conditions are met, it acts.',
      'No human intervention. No centralized control.',
      'Just code executing code.',
      'Open source. Readable. Executable by anyone.',
    ],
    interaction: 'burn',
    unlockHint: 'Click to burn',
  },
  {
    id: 'philosophy',
    level: 'Initiate → Believer',
    title: 'The Philosophy',
    subtitle: 'Deeper into the rabbit hole.',
    content: [
      'Most tokens promise everything.',
      '$asdfasdfa promises nothing.',
      'Don\'t trust. Verify.',
      'Don\'t extract. Burn.',
      'Don\'t panic. Hold.',
    ],
    interaction: 'type',
    unlockHint: 'Type "This is fine"',
  },
  {
    id: 'ecosystem',
    level: 'Believer',
    title: 'The Ecosystem',
    subtitle: 'Built by builders. For builders.',
    content: [
      'Tools created by the community.',
      'Burn Tracker - Watch burns in real-time.',
      'HolDex - Track your position.',
      'ASDForecast - Community predictions.',
      'Games - Earn while you learn.',
      'Everyone can build. The code is open.',
    ],
    interaction: 'explore',
    unlockHint: 'Explore the ecosystem',
  },
]

// ============================================
// INTERACTION COMPONENTS
// ============================================

// Drag to reveal interaction
function DragReveal({
  onComplete,
  isCompleted
}: {
  onComplete: () => void
  isCompleted: boolean
}) {
  const [dragProgress, setDragProgress] = useState(0)
  const constraintsRef = useRef(null)

  const handleDrag = (_: any, info: { offset: { x: number } }) => {
    const progress = Math.min(100, Math.max(0, (info.offset.x / 200) * 100))
    setDragProgress(progress)
    if (progress >= 95 && !isCompleted) {
      onComplete()
    }
  }

  if (isCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center gap-4 py-8"
      >
        <div className="flex items-center gap-3 text-gold-400 font-mono text-sm">
          <span className="opacity-60">Creator earns</span>
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            →
          </motion.span>
          <span className="text-amber-400">ASDF buys</span>
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            →
          </motion.span>
          <span className="text-orange-500">Burned forever</span>
          <motion.span
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, type: 'spring' }}
          >
            🔥
          </motion.span>
        </div>
      </motion.div>
    )
  }

  return (
    <div ref={constraintsRef} className="relative py-8">
      <div className="relative h-16 rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
        {/* Track */}
        <div
          className="absolute inset-0 flex items-center justify-end pr-6 text-warm-ghost font-mono text-sm"
        >
          <span style={{ opacity: 1 - dragProgress / 100 }}>Drag →</span>
        </div>

        {/* Revealed content */}
        <div
          className="absolute inset-0 flex items-center justify-center text-gold-400 font-mono text-sm"
          style={{
            clipPath: `inset(0 ${100 - dragProgress}% 0 0)`,
            background: 'linear-gradient(90deg, rgba(234,179,8,0.1), rgba(245,158,11,0.05))'
          }}
        >
          Creator → Buy → Burn 🔥
        </div>

        {/* Drag handle */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 200 }}
          dragElastic={0}
          onDrag={handleDrag}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-lg cursor-grab active:cursor-grabbing flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(234,179,8,0.3), rgba(234,179,8,0.1))',
            border: '1px solid rgba(234,179,8,0.4)',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-gold-400">⟫</span>
        </motion.div>
      </div>
    </div>
  )
}

// Click to burn interaction
function BurnInteraction({
  onComplete,
  isCompleted
}: {
  onComplete: () => void
  isCompleted: boolean
}) {
  const [burns, setBurns] = useState<{ id: number; x: number; y: number }[]>([])
  const [burnCount, setBurnCount] = useState(0)
  const requiredBurns = 5

  const handleBurn = (e: React.MouseEvent) => {
    if (isCompleted) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setBurns(prev => [...prev, { id: Date.now(), x, y }])
    setBurnCount(prev => {
      const newCount = prev + 1
      if (newCount >= requiredBurns) {
        setTimeout(onComplete, 300)
      }
      return newCount
    })

    // Remove burn after animation
    setTimeout(() => {
      setBurns(prev => prev.slice(1))
    }, 1000)
  }

  return (
    <div className="py-8">
      <motion.div
        onClick={handleBurn}
        className="relative h-32 rounded-xl cursor-pointer overflow-hidden"
        style={{
          background: isCompleted
            ? 'linear-gradient(135deg, rgba(234,179,8,0.15), rgba(245,158,11,0.1))'
            : 'rgba(0,0,0,0.3)',
          border: isCompleted ? '1px solid rgba(234,179,8,0.3)' : '1px solid rgba(201,184,154,0.1)',
        }}
        whileHover={{ scale: isCompleted ? 1 : 1.01 }}
        whileTap={{ scale: isCompleted ? 1 : 0.99 }}
      >
        {/* Burns */}
        <AnimatePresence>
          {burns.map(burn => (
            <motion.div
              key={burn.id}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              className="absolute pointer-events-none text-2xl"
              style={{ left: burn.x - 12, top: burn.y - 12 }}
            >
              🔥
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isCompleted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="text-2xl mb-2">🔥</div>
              <p className="text-gold-400 font-mono text-sm">Burned. Forever.</p>
            </motion.div>
          ) : (
            <>
              <p className="text-warm-muted font-mono text-sm mb-2">
                Click to burn ({burnCount}/{requiredBurns})
              </p>
              <div className="flex gap-1">
                {Array.from({ length: requiredBurns }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full transition-colors"
                    style={{
                      background: i < burnCount ? '#eab308' : 'rgba(201,184,154,0.2)'
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// Type to unlock interaction
function TypeInteraction({
  onComplete,
  isCompleted
}: {
  onComplete: () => void
  isCompleted: boolean
}) {
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)
  const target = 'This is fine'
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInput(value)

    if (value.toLowerCase() === target.toLowerCase()) {
      onComplete()
    } else if (value.length >= target.length && value.toLowerCase() !== target.toLowerCase()) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  if (isCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-8 text-center"
      >
        <motion.p
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="text-2xl font-mono text-gold-400 tracking-widest"
        >
          This is fine.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-warm-muted text-sm mt-2"
        >
          🔥 You understand now.
        </motion.p>
      </motion.div>
    )
  }

  return (
    <div className="py-8">
      <motion.div
        animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleChange}
          placeholder="Type the phrase..."
          className="w-full px-6 py-4 rounded-xl font-mono text-center bg-transparent text-warm-primary placeholder:text-warm-ghost focus:outline-none"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(234,179,8,0.2)',
          }}
          autoComplete="off"
          spellCheck={false}
        />
      </motion.div>
      <p className="text-center text-warm-ghost text-xs mt-3 font-mono">
        Hint: {target.split('').map((char, i) => (
          <span
            key={i}
            style={{
              opacity: input[i]?.toLowerCase() === char.toLowerCase() ? 1 : 0.3
            }}
          >
            {char}
          </span>
        ))}
      </p>
    </div>
  )
}

// Explore ecosystem interaction
function ExploreInteraction({
  onComplete,
  isCompleted
}: {
  onComplete: () => void
  isCompleted: boolean
}) {
  const [explored, setExplored] = useState<string[]>([])
  const tools = [
    { id: 'burns', name: 'Burn Tracker', icon: '🔥' },
    { id: 'holdex', name: 'HolDex', icon: '📊' },
    { id: 'forecast', name: 'ASDForecast', icon: '🎯' },
    { id: 'games', name: 'Games', icon: '🎮' },
  ]

  const handleExplore = (id: string) => {
    if (!explored.includes(id)) {
      const newExplored = [...explored, id]
      setExplored(newExplored)
      if (newExplored.length === tools.length) {
        setTimeout(onComplete, 300)
      }
    }
  }

  return (
    <div className="py-8">
      <div className="grid grid-cols-2 gap-3">
        {tools.map(tool => {
          const isExplored = explored.includes(tool.id)
          return (
            <motion.button
              key={tool.id}
              onClick={() => handleExplore(tool.id)}
              className="p-4 rounded-xl text-left transition-all"
              style={{
                background: isExplored
                  ? 'linear-gradient(135deg, rgba(234,179,8,0.15), rgba(234,179,8,0.05))'
                  : 'rgba(0,0,0,0.3)',
                border: isExplored
                  ? '1px solid rgba(234,179,8,0.3)'
                  : '1px solid rgba(201,184,154,0.1)',
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-xl mb-2 block">{tool.icon}</span>
              <span className={`font-mono text-sm ${isExplored ? 'text-gold-400' : 'text-warm-secondary'}`}>
                {tool.name}
              </span>
              {isExplored && (
                <motion.span
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="ml-2 text-gold-500"
                >
                  ✓
                </motion.span>
              )}
            </motion.button>
          )
        })}
      </div>

      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <p className="text-gold-400 font-mono text-sm">
            You know the ecosystem. Ready to build?
          </p>
        </motion.div>
      )}
    </div>
  )
}

// ============================================
// PHASE COMPONENT
// ============================================

function PhaseSection({
  phase,
  index,
  isUnlocked,
  isCompleted,
  onComplete,
}: {
  phase: Phase
  index: number
  isUnlocked: boolean
  isCompleted: boolean
  onComplete: () => void
}) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  const y = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [50, 0, 0, -50])

  // Auto-complete scroll interaction
  useEffect(() => {
    if (phase.interaction === 'scroll' && isUnlocked && !isCompleted) {
      const timer = setTimeout(onComplete, 2000)
      return () => clearTimeout(timer)
    }
  }, [phase.interaction, isUnlocked, isCompleted, onComplete])

  const renderInteraction = () => {
    switch (phase.interaction) {
      case 'drag':
        return <DragReveal onComplete={onComplete} isCompleted={isCompleted} />
      case 'burn':
        return <BurnInteraction onComplete={onComplete} isCompleted={isCompleted} />
      case 'type':
        return <TypeInteraction onComplete={onComplete} isCompleted={isCompleted} />
      case 'explore':
        return <ExploreInteraction onComplete={onComplete} isCompleted={isCompleted} />
      default:
        return null
    }
  }

  return (
    <motion.section
      ref={ref}
      style={{ opacity: isUnlocked ? opacity : 0.15, y: isUnlocked ? y : 0 }}
      className="min-h-screen flex items-center justify-center px-6 py-24"
    >
      <div className="max-w-xl w-full">
        {/* Level badge */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: isUnlocked ? 1 : 0.3, x: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <span
            className="inline-block px-3 py-1 rounded-full font-mono text-xs tracking-wider"
            style={{
              background: isCompleted
                ? 'rgba(234,179,8,0.2)'
                : 'rgba(201,184,154,0.1)',
              color: isCompleted ? '#fcd34d' : '#8a7a65',
              border: isCompleted
                ? '1px solid rgba(234,179,8,0.3)'
                : '1px solid rgba(201,184,154,0.2)',
            }}
          >
            {phase.level}
          </span>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isUnlocked ? 1 : 0.2, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl md:text-4xl font-light mb-2"
          style={{
            background: isUnlocked
              ? 'linear-gradient(135deg, #faf8f5 0%, #c9b89a 100%)'
              : 'linear-gradient(135deg, #5a4d40 0%, #3a3330 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {phase.title}
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: isUnlocked ? 0.6 : 0.1 }}
          transition={{ delay: 0.3 }}
          className="text-warm-muted font-mono text-sm mb-8"
        >
          {phase.subtitle}
        </motion.p>

        {/* Content */}
        <div className="space-y-4 mb-8">
          {phase.content.map((text, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{
                opacity: isUnlocked ? 1 : 0.1,
                x: 0,
                filter: isUnlocked ? 'blur(0px)' : 'blur(4px)',
              }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="text-warm-secondary text-lg leading-relaxed"
            >
              {text}
            </motion.p>
          ))}
        </div>

        {/* Interaction */}
        {isUnlocked && renderInteraction()}

        {/* Lock indicator */}
        {!isUnlocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            className="flex items-center gap-2 text-warm-ghost font-mono text-sm"
          >
            <span>🔒</span>
            <span>Section locked</span>
          </motion.div>
        )}
      </div>
    </motion.section>
  )
}

// ============================================
// MAIN PAGE
// ============================================

export default function LearnPage() {
  const [completedPhases, setCompletedPhases] = useState<string[]>([])
  const { scrollYProgress } = useScroll()

  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  const completePhase = useCallback((phaseId: string) => {
    setCompletedPhases(prev => {
      if (prev.includes(phaseId)) return prev
      return [...prev, phaseId]
    })
  }, [])

  const isPhaseUnlocked = (index: number) => {
    if (index === 0) return true
    return completedPhases.includes(phases[index - 1].id)
  }

  const allCompleted = completedPhases.length === phases.length
  const currentLevel = completedPhases.length === 0
    ? 'Outsider'
    : completedPhases.length < 3
      ? 'Initiate'
      : 'Believer'

  return (
    <main className="bg-hub-deep text-warm-primary">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-hub-elevated z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-gold-500 to-amber-500"
          style={{ width: progressWidth }}
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-40 px-6 py-4"
        style={{
          background: 'linear-gradient(to bottom, rgba(13,9,6,0.95), rgba(13,9,6,0))',
        }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-xs tracking-widest uppercase text-warm-muted hover:text-gold-400 transition-colors"
          >
            ← Hub
          </Link>

          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(234,179,8,0.1)',
              border: '1px solid rgba(234,179,8,0.2)',
            }}
          >
            <span className="text-gold-400 text-xs font-mono">{currentLevel}</span>
          </div>
        </div>
      </motion.header>

      {/* Phases */}
      {phases.map((phase, index) => (
        <PhaseSection
          key={phase.id}
          phase={phase}
          index={index}
          isUnlocked={isPhaseUnlocked(index)}
          isCompleted={completedPhases.includes(phase.id)}
          onComplete={() => completePhase(phase.id)}
        />
      ))}

      {/* CTA to Build */}
      <AnimatePresence>
        {allCompleted && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen flex items-center justify-center px-6"
          >
            <div className="max-w-xl text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="text-5xl mb-6"
              >
                🔥
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-4xl font-light mb-4"
                style={{
                  background: 'linear-gradient(135deg, #faf8f5 0%, #c9b89a 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                You're a Believer now.
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-warm-secondary mb-8"
              >
                You understand. You verify. You burn.<br />
                Ready to go deeper or start building?
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-4"
              >
                <Link
                  href="/deep-learn"
                  className="inline-block px-8 py-4 rounded-xl font-mono text-sm tracking-wide transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, rgba(234,179,8,0.3), rgba(245,158,11,0.2))',
                    border: '1px solid rgba(234,179,8,0.4)',
                    color: '#fcd34d',
                  }}
                >
                  Deep Learn →
                </Link>

                <div className="pt-4">
                  <Link
                    href="/"
                    className="text-warm-muted hover:text-warm-secondary font-mono text-sm transition-colors"
                  >
                    Back to Hub
                  </Link>
                </div>
              </motion.div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  )
}
