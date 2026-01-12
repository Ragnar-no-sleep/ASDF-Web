'use client'

import { motion } from 'framer-motion'
import { HubCenter } from '@/components/HubCenter'
import { HubPortal } from '@/components/HubPortal'
import { ToolsZone } from '@/components/ToolsZone'
import { HubFooter } from '@/components/HubFooter'

// Portal configuration - more space, better harmony
const portals = [
  {
    id: 'learn',
    position: { angle: -45, distance: 42 },
    href: '/learn',
    icon: '📚',
    title: 'Learn',
    subtitle: 'Understand $asdfasdfa',
    available: true,
  },
  {
    id: 'build',
    position: { angle: -135, distance: 42 },
    icon: '🔨',
    title: 'Build',
    subtitle: 'Contribute',
    available: false,
  },
  {
    id: 'analytics',
    position: { angle: 45, distance: 42 },
    href: '/burns',
    icon: '📊',
    title: 'Analytics',
    subtitle: 'Verify on-chain',
    available: true,
  },
  {
    id: 'play',
    position: { angle: 135, distance: 42 },
    icon: '🎮',
    title: 'Play',
    subtitle: 'Earn & Learn',
    available: false,
  },
]

export default function HubContent() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative w-full h-screen flex items-center justify-center"
    >
      {/* Outermost orbital ring - slow rotation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{
          opacity: [0, 0.4, 0.3],
          scale: 1,
          rotate: 360,
        }}
        transition={{
          opacity: { duration: 2, ease: 'easeOut' },
          scale: { duration: 2.5, ease: [0.16, 1, 0.3, 1] },
          rotate: { duration: 180, repeat: Infinity, ease: 'linear' },
        }}
        className="absolute rounded-full"
        style={{
          width: '95vh',
          height: '95vh',
          border: '1px solid rgba(201, 184, 154, 0.06)',
        }}
      />

      {/* Outer orbital ring - counter rotation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{
          opacity: [0, 0.6, 0.5],
          scale: 1,
          rotate: -360,
        }}
        transition={{
          opacity: { duration: 2, ease: 'easeOut', delay: 0.2 },
          scale: { duration: 2, ease: [0.16, 1, 0.3, 1], delay: 0.2 },
          rotate: { duration: 120, repeat: Infinity, ease: 'linear' },
        }}
        className="absolute rounded-full"
        style={{
          width: '75vh',
          height: '75vh',
          border: '1px solid rgba(234, 179, 8, 0.08)',
          boxShadow: '0 0 80px rgba(234, 179, 8, 0.03)',
        }}
      />

      {/* Inner orbital ring - breathing */}
      <motion.div
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{
          opacity: [0, 0.4, 0.3],
          scale: [0.3, 1, 1.02, 1],
        }}
        transition={{
          opacity: { duration: 1.5, ease: 'easeOut', delay: 0.4 },
          scale: {
            duration: 8,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
            times: [0, 0.2, 0.6, 1],
          },
        }}
        className="absolute rounded-full"
        style={{
          width: '50vh',
          height: '50vh',
          border: '1px solid rgba(201, 184, 154, 0.1)',
        }}
      />

      {/* Innermost glow ring */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: [0, 0.8, 0.6],
          scale: 1,
        }}
        transition={{
          duration: 2,
          delay: 0.3,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="absolute rounded-full"
        style={{
          width: '32vh',
          height: '32vh',
          background: 'radial-gradient(circle, rgba(234, 179, 8, 0.04) 0%, transparent 70%)',
          boxShadow: '0 0 100px rgba(234, 179, 8, 0.05)',
        }}
      />

      {/* Center */}
      <HubCenter />

      {/* Portals */}
      {portals.map((portal, index) => (
        <HubPortal
          key={portal.id}
          {...portal}
          index={index}
        />
      ))}

      {/* Tools Zone */}
      <ToolsZone />

      {/* Footer */}
      <HubFooter />
    </motion.div>
  )
}
