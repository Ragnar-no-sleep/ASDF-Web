'use client'

import { motion } from 'framer-motion'

const links = [
  { label: 'GitHub', href: 'https://github.com/Ragnar-no-sleep/ASDF-Ecosystem' },
  { label: 'Solscan', href: 'https://solscan.io/token/9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump' },
  { label: 'Community', href: 'https://x.com/i/communities/1942343109159051272' },
]

export function HubFooter() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, delay: 2, ease: 'easeOut' }}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-6"
    >
      <span
        className="font-mono text-[8px] tracking-[0.2em] uppercase"
        style={{ color: 'rgba(120, 110, 95, 0.5)' }}
      >
        Open source
      </span>

      {links.map((link, index) => (
        <div key={link.label} className="flex items-center gap-6">
          <div
            className="w-px h-2.5"
            style={{ background: 'rgba(150, 140, 125, 0.15)' }}
          />
          <motion.a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 2.2 + index * 0.1 }}
            whileHover={{
              color: 'rgba(234, 179, 8, 0.8)',
              transition: { duration: 0.2 }
            }}
            className="font-mono text-[8px] tracking-[0.15em] uppercase"
            style={{ color: 'rgba(120, 110, 95, 0.5)' }}
          >
            {link.label}
          </motion.a>
        </div>
      ))}
    </motion.footer>
  )
}
