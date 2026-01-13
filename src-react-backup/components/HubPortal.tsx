'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { LearnIcon, BuildIcon, AnalyticsIcon, PlayIcon } from './icons/PortalIcons';

interface HubPortalProps {
  id: string;
  position: { angle: number; distance: number };
  href?: string;
  icon: string;
  title: string;
  subtitle: string;
  available: boolean;
  index: number;
}

// Map portal IDs to their custom icons
const portalIcons: Record<
  string,
  React.ComponentType<{ className?: string; animated?: boolean }>
> = {
  learn: LearnIcon,
  build: BuildIcon,
  analytics: AnalyticsIcon,
  play: PlayIcon,
};

export function HubPortal({
  id,
  position,
  href,
  icon,
  title,
  subtitle,
  available,
  index,
}: HubPortalProps) {
  // Convert polar coordinates to cartesian
  const { x, y } = useMemo(() => {
    const radians = (position.angle * Math.PI) / 180;
    return {
      x: Math.cos(radians) * position.distance,
      y: Math.sin(radians) * position.distance,
    };
  }, [position]);

  // Unique floating animation offset per portal
  const floatDuration = 5 + index * 0.5;
  const floatDelay = index * 0.8;

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
      animate={{
        opacity: available ? 1 : 0.5,
        scale: 1,
        x: `${x}vh`,
        y: `${y}vh`,
      }}
      transition={{
        duration: 1.4,
        ease: [0.34, 1.56, 0.64, 1],
        delay: 0.5 + index * 0.15,
        opacity: { duration: 1, delay: 0.5 + index * 0.15 },
      }}
      whileHover={
        available
          ? {
              scale: 1.12,
              transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
            }
          : {}
      }
      className={`
        absolute z-10 flex flex-col items-center justify-center
        w-[110px] h-[110px] rounded-[26px]
        ${available ? 'cursor-pointer' : 'cursor-default'}
      `}
      style={{
        background: available
          ? 'linear-gradient(165deg, rgba(55, 40, 25, 0.92) 0%, rgba(24, 17, 12, 0.96) 100%)'
          : 'linear-gradient(165deg, rgba(35, 30, 28, 0.6) 0%, rgba(18, 15, 14, 0.7) 100%)',
        border: `1px solid ${available ? 'rgba(201, 184, 154, 0.18)' : 'rgba(120, 115, 110, 0.08)'}`,
        boxShadow: available
          ? '0 25px 50px rgba(0, 0, 0, 0.45), 0 0 80px rgba(234, 179, 8, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.04)'
          : '0 15px 30px rgba(0, 0, 0, 0.25)',
        filter: available ? 'none' : 'saturate(0.25)',
      }}
    >
      {/* Hover glow effect */}
      {available && (
        <motion.div
          className="absolute inset-0 rounded-[24px] opacity-0"
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            background:
              'radial-gradient(circle at 50% 30%, rgba(234, 179, 8, 0.12) 0%, transparent 70%)',
            boxShadow: '0 0 50px rgba(234, 179, 8, 0.08)',
          }}
        />
      )}

      {/* Icon */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          duration: 0.8,
          delay: 0.9 + index * 0.12,
          ease: [0.34, 1.56, 0.64, 1],
        }}
        className="w-12 h-12 mb-2 relative z-10"
        style={{
          filter: available ? 'none' : 'grayscale(0.9) opacity(0.5)',
        }}
      >
        {portalIcons[id] &&
          (() => {
            const IconComponent = portalIcons[id];
            return <IconComponent className="w-full h-full" animated={available} />;
          })()}
      </motion.div>

      {/* Title */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.1 + index * 0.12 }}
        className="font-mono text-[10px] font-semibold tracking-[0.15em] uppercase relative z-10"
        style={{
          color: available ? 'rgba(250, 248, 245, 0.9)' : 'rgba(180, 175, 170, 0.5)',
        }}
      >
        {title}
      </motion.span>

      {/* Subtitle */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.2 + index * 0.12 }}
        className="text-[9px] mt-0.5 relative z-10 text-center px-2"
        style={{
          color: available ? 'rgba(201, 184, 154, 0.6)' : 'rgba(140, 135, 130, 0.4)',
        }}
      >
        {subtitle}
      </motion.span>

      {/* Coming Soon badge for unavailable */}
      {!available && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 1.4 + index * 0.12 }}
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md whitespace-nowrap z-20"
          style={{
            background: 'rgba(20, 15, 12, 0.9)',
            border: '1px solid rgba(100, 95, 90, 0.2)',
            fontSize: '7px',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(160, 155, 150, 0.6)',
          }}
        >
          Soon
        </motion.div>
      )}
    </motion.div>
  );

  if (href && available) {
    // Use Next.js Link for internal routes
    if (href.startsWith('/')) {
      return <Link href={href}>{content}</Link>;
    }
    // External links
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return content;
}
