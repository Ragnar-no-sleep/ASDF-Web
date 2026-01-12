'use client'

import { motion } from 'framer-motion'
import { FireIcon } from './icons/PortalIcons'

export function HubCenter() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 1.8,
        ease: [0.34, 1.56, 0.64, 1],
        delay: 0.2,
      }}
      className="absolute z-20 flex flex-col items-center justify-center"
    >
      {/* Outer breathing glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{
          opacity: [0.3, 0.5, 0.3],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute rounded-full"
        style={{
          width: '320px',
          height: '320px',
          background: 'radial-gradient(circle, rgba(234, 179, 8, 0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Inner pulsing aura */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0.4, 0.7, 0.4],
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
        className="absolute rounded-full"
        style={{
          width: '240px',
          height: '240px',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, rgba(234, 179, 8, 0.03) 50%, transparent 70%)',
          filter: 'blur(25px)',
        }}
      />

      {/* Main circle */}
      <motion.div
        animate={{
          boxShadow: [
            '0 0 80px rgba(234, 179, 8, 0.1), 0 0 40px rgba(245, 158, 11, 0.05), 0 30px 60px rgba(0, 0, 0, 0.5), inset 0 0 60px rgba(0, 0, 0, 0.3)',
            '0 0 120px rgba(234, 179, 8, 0.15), 0 0 60px rgba(245, 158, 11, 0.08), 0 30px 60px rgba(0, 0, 0, 0.5), inset 0 0 60px rgba(0, 0, 0, 0.3)',
            '0 0 80px rgba(234, 179, 8, 0.1), 0 0 40px rgba(245, 158, 11, 0.05), 0 30px 60px rgba(0, 0, 0, 0.5), inset 0 0 60px rgba(0, 0, 0, 0.3)',
          ],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        whileHover={{
          scale: 1.05,
          boxShadow: '0 0 150px rgba(234, 179, 8, 0.2), 0 0 80px rgba(245, 158, 11, 0.12), 0 30px 60px rgba(0, 0, 0, 0.5), inset 0 0 60px rgba(0, 0, 0, 0.3)',
        }}
        className="relative flex flex-col items-center justify-center w-[200px] h-[200px] rounded-full cursor-pointer"
        style={{
          background: 'linear-gradient(165deg, rgba(55, 40, 25, 0.95) 0%, rgba(22, 16, 10, 0.98) 100%)',
          border: '1px solid rgba(201, 184, 154, 0.15)',
        }}
      >
        {/* Fire icon with animated glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0, rotate: -30 }}
          animate={{
            opacity: 1,
            scale: [1, 1.05, 1],
            rotate: 0,
          }}
          transition={{
            opacity: { duration: 0.8, delay: 0.6 },
            scale: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 },
            rotate: { duration: 1.2, delay: 0.6, ease: [0.34, 1.56, 0.64, 1] },
          }}
          className="w-20 h-20 mb-3"
        >
          <FireIcon className="w-full h-full" />
        </motion.div>

        {/* Title with subtle animation */}
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1, ease: 'easeOut' }}
          className="font-mono text-[11px] font-semibold tracking-[0.35em] uppercase"
          style={{
            color: 'rgba(250, 204, 21, 0.9)',
            textShadow: '0 0 40px rgba(234, 179, 8, 0.5)',
          }}
        >
          This is Fine
        </motion.span>
      </motion.div>
    </motion.div>
  )
}
