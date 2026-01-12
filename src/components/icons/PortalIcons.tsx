'use client'

import { motion } from 'framer-motion'

interface IconProps {
  className?: string
  animated?: boolean
}

// Learn - Open book with glow
export function LearnIcon({ className = '', animated = true }: IconProps) {
  return (
    <motion.svg
      viewBox="0 0 48 48"
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ filter: 'drop-shadow(0 0 12px rgba(234, 179, 8, 0.5))' }}
    >
      <defs>
        <linearGradient id="learnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {/* Book base */}
      <motion.path
        d="M8 12 L24 8 L40 12 L40 38 L24 42 L8 38 Z"
        fill="none"
        stroke="url(#learnGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 0.2 }}
      />
      {/* Center spine */}
      <motion.path
        d="M24 8 L24 42"
        fill="none"
        stroke="url(#learnGrad)"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      />
      {/* Left page lines */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 0.5, delay: 1 }}
      >
        <line x1="12" y1="18" x2="20" y2="16" stroke="#fcd34d" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="24" x2="20" y2="22" stroke="#fcd34d" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="30" x2="20" y2="28" stroke="#fcd34d" strokeWidth="1.5" strokeLinecap="round" />
      </motion.g>
      {/* Right page lines */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 0.5, delay: 1.2 }}
      >
        <line x1="28" y1="16" x2="36" y2="18" stroke="#fcd34d" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="22" x2="36" y2="24" stroke="#fcd34d" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="28" x2="36" y2="30" stroke="#fcd34d" strokeWidth="1.5" strokeLinecap="round" />
      </motion.g>
      {/* Glow effect */}
      {animated && (
        <motion.circle
          cx="24"
          cy="24"
          r="18"
          fill="rgba(234, 179, 8, 0.1)"
          animate={{ r: [16, 20, 16], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.svg>
  )
}

// Build - Hammer/wrench construction
export function BuildIcon({ className = '', animated = true }: IconProps) {
  return (
    <motion.svg
      viewBox="0 0 48 48"
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ filter: 'drop-shadow(0 0 12px rgba(156, 163, 175, 0.4))' }}
    >
      <defs>
        <linearGradient id="buildGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
      </defs>
      {/* Hammer head */}
      <motion.rect
        x="8"
        y="10"
        width="20"
        height="10"
        rx="2"
        fill="none"
        stroke="url(#buildGrad)"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 }}
      />
      {/* Hammer handle */}
      <motion.path
        d="M18 20 L18 40"
        fill="none"
        stroke="url(#buildGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />
      {/* Wrench */}
      <motion.path
        d="M32 28 L40 20 L44 24 L36 32 L40 36 L36 40 L28 32 L32 28"
        fill="none"
        stroke="url(#buildGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.5 }}
      />
    </motion.svg>
  )
}

// Analytics - Rising chart with pulse
export function AnalyticsIcon({ className = '', animated = true }: IconProps) {
  return (
    <motion.svg
      viewBox="0 0 48 48"
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ filter: 'drop-shadow(0 0 12px rgba(234, 179, 8, 0.5))' }}
    >
      <defs>
        <linearGradient id="analyticsGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fcd34d" />
        </linearGradient>
      </defs>
      {/* Chart bars */}
      <motion.rect
        x="8"
        y="28"
        width="6"
        height="14"
        rx="1"
        fill="url(#analyticsGrad)"
        initial={{ scaleY: 0, originY: 1 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      />
      <motion.rect
        x="18"
        y="20"
        width="6"
        height="22"
        rx="1"
        fill="url(#analyticsGrad)"
        initial={{ scaleY: 0, originY: 1 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      />
      <motion.rect
        x="28"
        y="14"
        width="6"
        height="28"
        rx="1"
        fill="url(#analyticsGrad)"
        initial={{ scaleY: 0, originY: 1 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      />
      <motion.rect
        x="38"
        y="8"
        width="6"
        height="34"
        rx="1"
        fill="url(#analyticsGrad)"
        initial={{ scaleY: 0, originY: 1 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      />
      {/* Trend line */}
      <motion.path
        d="M11 26 L21 18 L31 12 L41 6"
        fill="none"
        stroke="#fef3c7"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 1 }}
      />
      {/* Pulse dot */}
      {animated && (
        <motion.circle
          cx="41"
          cy="6"
          r="3"
          fill="#fcd34d"
          animate={{ r: [3, 5, 3], opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.svg>
  )
}

// Play - Game controller / play symbol
export function PlayIcon({ className = '', animated = true }: IconProps) {
  return (
    <motion.svg
      viewBox="0 0 48 48"
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ filter: 'drop-shadow(0 0 12px rgba(156, 163, 175, 0.4))' }}
    >
      <defs>
        <linearGradient id="playGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#6b7280" />
        </linearGradient>
      </defs>
      {/* Controller body */}
      <motion.path
        d="M8 20 Q8 14 14 14 L34 14 Q40 14 40 20 L40 28 Q40 38 32 40 L28 40 Q26 40 25 38 L24 36 L23 38 Q22 40 20 40 L16 40 Q8 38 8 28 Z"
        fill="none"
        stroke="url(#playGrad)"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5 }}
      />
      {/* D-pad */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <rect x="13" y="22" width="6" height="2" rx="0.5" fill="#9ca3af" />
        <rect x="15" y="20" width="2" height="6" rx="0.5" fill="#9ca3af" />
      </motion.g>
      {/* Buttons */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ duration: 0.5, delay: 1 }}
      >
        <circle cx="31" cy="21" r="2" fill="#9ca3af" />
        <circle cx="35" cy="25" r="2" fill="#9ca3af" />
      </motion.g>
      {/* Center light */}
      <motion.circle
        cx="24"
        cy="26"
        r="2"
        fill="#6b7280"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.svg>
  )
}

// Tools Icon - Wrench
export function ToolsIcon({ className = '' }: IconProps) {
  return (
    <motion.svg
      viewBox="0 0 32 32"
      className={className}
      style={{ filter: 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.4))' }}
    >
      <defs>
        <linearGradient id="toolsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <motion.path
        d="M22 4 L28 10 L26 12 L24 10 L14 20 L16 22 L14 24 L4 14 L6 12 L8 14 L18 4 L16 2 L18 0 L22 4 Z"
        fill="none"
        stroke="url(#toolsGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 }}
      />
    </motion.svg>
  )
}

// Burns Icon - Flame
export function BurnsIcon({ className = '' }: IconProps) {
  return (
    <motion.svg
      viewBox="0 0 32 32"
      className={className}
      style={{ filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))' }}
    >
      <defs>
        <linearGradient id="burnsGrad" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fcd34d" />
        </linearGradient>
      </defs>
      <motion.path
        d="M16 2 Q22 8 24 14 Q26 20 22 26 Q18 30 16 30 Q14 30 10 26 Q6 20 8 14 Q10 8 16 2"
        fill="url(#burnsGrad)"
        animate={{
          d: [
            "M16 2 Q22 8 24 14 Q26 20 22 26 Q18 30 16 30 Q14 30 10 26 Q6 20 8 14 Q10 8 16 2",
            "M16 4 Q20 8 22 14 Q24 18 21 25 Q17 29 16 29 Q15 29 11 25 Q8 18 10 14 Q12 8 16 4",
            "M16 2 Q22 8 24 14 Q26 20 22 26 Q18 30 16 30 Q14 30 10 26 Q6 20 8 14 Q10 8 16 2",
          ]
        }}
        transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.svg>
  )
}

// Forecast Icon - Target/crosshair
export function ForecastIcon({ className = '' }: IconProps) {
  return (
    <motion.svg
      viewBox="0 0 32 32"
      className={className}
      style={{ filter: 'drop-shadow(0 0 8px rgba(236, 72, 153, 0.5))' }}
    >
      <defs>
        <linearGradient id="forecastGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <motion.circle
        cx="16"
        cy="16"
        r="12"
        fill="none"
        stroke="url(#forecastGrad)"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 }}
      />
      <motion.circle
        cx="16"
        cy="16"
        r="6"
        fill="none"
        stroke="url(#forecastGrad)"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />
      <motion.circle
        cx="16"
        cy="16"
        r="2"
        fill="#ec4899"
        initial={{ scale: 0 }}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      {/* Crosshair lines */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <line x1="16" y1="2" x2="16" y2="8" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
        <line x1="16" y1="24" x2="16" y2="30" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
        <line x1="2" y1="16" x2="8" y2="16" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="16" x2="30" y2="16" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
      </motion.g>
    </motion.svg>
  )
}

// Holdex Icon - Chart/hold
export function HoldexIcon({ className = '' }: IconProps) {
  return (
    <motion.svg
      viewBox="0 0 32 32"
      className={className}
      style={{ filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.5))' }}
    >
      <defs>
        <linearGradient id="holdexGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#86efac" />
        </linearGradient>
      </defs>
      {/* Diamond/hold shape */}
      <motion.path
        d="M16 2 L28 14 L16 30 L4 14 Z"
        fill="none"
        stroke="url(#holdexGrad)"
        strokeWidth="2"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2 }}
      />
      <motion.path
        d="M4 14 L16 18 L28 14"
        fill="none"
        stroke="url(#holdexGrad)"
        strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      />
      <motion.path
        d="M16 2 L16 18 L16 30"
        fill="none"
        stroke="url(#holdexGrad)"
        strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.7 }}
      />
    </motion.svg>
  )
}

// GASdf Icon - Gas pump
export function GasIcon({ className = '' }: IconProps) {
  return (
    <motion.svg
      viewBox="0 0 32 32"
      className={className}
      style={{ filter: 'drop-shadow(0 0 8px rgba(251, 146, 60, 0.5))' }}
    >
      <defs>
        <linearGradient id="gasGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      {/* Pump body */}
      <motion.rect
        x="6"
        y="8"
        width="14"
        height="20"
        rx="2"
        fill="none"
        stroke="url(#gasGrad)"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 }}
      />
      {/* Pump display */}
      <motion.rect
        x="9"
        y="12"
        width="8"
        height="6"
        rx="1"
        fill="url(#gasGrad)"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {/* Nozzle */}
      <motion.path
        d="M20 12 L24 12 L24 6 L28 6 L28 16 L24 16"
        fill="none"
        stroke="url(#gasGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      />
      {/* Base */}
      <motion.rect
        x="4"
        y="28"
        width="18"
        height="2"
        rx="1"
        fill="#fb923c"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      />
    </motion.svg>
  )
}

// Center Fire - Animated flame
export function FireIcon({ className = '' }: IconProps) {
  return (
    <motion.svg
      viewBox="0 0 48 48"
      className={className}
      style={{ filter: 'drop-shadow(0 0 20px rgba(234, 179, 8, 0.7))' }}
    >
      <defs>
        <linearGradient id="fireGrad1" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fcd34d" />
        </linearGradient>
        <linearGradient id="fireGrad2" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fef3c7" />
        </linearGradient>
      </defs>
      {/* Outer flame */}
      <motion.path
        d="M24 4 Q32 14 34 22 Q36 30 32 36 Q28 42 24 44 Q20 42 16 36 Q12 30 14 22 Q16 14 24 4"
        fill="url(#fireGrad1)"
        animate={{
          d: [
            "M24 4 Q32 14 34 22 Q36 30 32 36 Q28 42 24 44 Q20 42 16 36 Q12 30 14 22 Q16 14 24 4",
            "M24 6 Q30 14 33 22 Q35 28 31 35 Q27 41 24 43 Q21 41 17 35 Q13 28 15 22 Q18 14 24 6",
            "M24 4 Q32 14 34 22 Q36 30 32 36 Q28 42 24 44 Q20 42 16 36 Q12 30 14 22 Q16 14 24 4",
          ]
        }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Inner flame */}
      <motion.path
        d="M24 16 Q28 22 28 28 Q28 34 24 38 Q20 34 20 28 Q20 22 24 16"
        fill="url(#fireGrad2)"
        animate={{
          d: [
            "M24 16 Q28 22 28 28 Q28 34 24 38 Q20 34 20 28 Q20 22 24 16",
            "M24 18 Q27 22 27 27 Q27 33 24 36 Q21 33 21 27 Q21 22 24 18",
            "M24 16 Q28 22 28 28 Q28 34 24 38 Q20 34 20 28 Q20 22 24 16",
          ]
        }}
        transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
      />
      {/* Core glow */}
      <motion.ellipse
        cx="24"
        cy="32"
        rx="4"
        ry="6"
        fill="#fef3c7"
        animate={{ opacity: [0.8, 1, 0.8], ry: [6, 7, 6] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      />
    </motion.svg>
  )
}
