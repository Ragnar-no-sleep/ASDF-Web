'use client'

import { motion } from 'framer-motion'

interface HubOrbitProps {
  variant: 'inner' | 'outer'
  delay: number
  isReady: boolean
}

export function HubOrbit({ variant, delay, isReady }: HubOrbitProps) {
  const isInner = variant === 'inner'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 0.5, scale: 1 }}
      transition={{
        duration: isInner ? 1 : 1.2,
        delay: delay / 1000,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`
        absolute rounded-full border border-warm-subtle
        ${isInner ? 'w-[70%] h-[70%]' : 'w-full h-full'}
        ${isReady ? (isInner ? 'animate-orbit-rotate' : '') : ''}
      `}
      style={{
        animationDuration: isInner ? '60s' : '90s',
        animationDirection: isInner ? 'normal' : 'reverse',
      }}
    />
  )
}
