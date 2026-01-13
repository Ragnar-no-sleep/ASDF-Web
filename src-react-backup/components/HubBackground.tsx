'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// Floating particles for ambient effect
const particles = [
  { size: 3, x: '15%', y: '20%', duration: 20, delay: 0 },
  { size: 2, x: '85%', y: '15%', duration: 25, delay: 2 },
  { size: 4, x: '10%', y: '70%', duration: 22, delay: 5 },
  { size: 2, x: '90%', y: '75%', duration: 28, delay: 3 },
  { size: 3, x: '30%', y: '85%', duration: 24, delay: 8 },
  { size: 2, x: '70%', y: '10%', duration: 26, delay: 6 },
  { size: 3, x: '5%', y: '45%', duration: 21, delay: 4 },
  { size: 2, x: '95%', y: '50%', duration: 23, delay: 7 },
];

export function HubBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 25;
      const y = (e.clientY / window.innerHeight - 0.5) * 25;
      containerRef.current.style.setProperty('--mouse-x', `${x}px`);
      containerRef.current.style.setProperty('--mouse-y', `${y}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 overflow-hidden">
      {/* Deep base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 140% 100% at 50% 40%,
              rgba(30, 22, 15, 1) 0%,
              rgba(14, 10, 6, 1) 45%,
              rgba(6, 4, 2, 1) 100%
            )
          `,
        }}
      />

      {/* Large central breathing glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{
          opacity: [0.5, 0.7, 0.5],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute rounded-full"
        style={{
          width: '120vh',
          height: '120vh',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) translate(var(--mouse-x, 0), var(--mouse-y, 0))',
          background:
            'radial-gradient(circle, rgba(234, 179, 8, 0.04) 0%, rgba(234, 179, 8, 0.01) 40%, transparent 65%)',
          filter: 'blur(60px)',
          transition: 'transform 2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

      {/* Secondary ambient glow - top */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
        className="absolute rounded-full"
        style={{
          width: '80vh',
          height: '50vh',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(ellipse, rgba(245, 158, 11, 0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Subtle side glows */}
      <motion.div
        animate={{
          opacity: [0.2, 0.35, 0.2],
          x: [0, 20, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute rounded-full"
        style={{
          width: '40vh',
          height: '60vh',
          top: '30%',
          left: '-5%',
          background: 'radial-gradient(ellipse, rgba(201, 184, 154, 0.04) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <motion.div
        animate={{
          opacity: [0.2, 0.35, 0.2],
          x: [0, -20, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
        className="absolute rounded-full"
        style={{
          width: '40vh',
          height: '60vh',
          top: '25%',
          right: '-5%',
          background: 'radial-gradient(ellipse, rgba(201, 184, 154, 0.04) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Floating particles */}
      {particles.map((particle, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.4, 0],
            y: [0, -30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'easeInOut',
          }}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            left: particle.x,
            top: particle.y,
            background: 'rgba(234, 179, 8, 0.6)',
            boxShadow: '0 0 10px rgba(234, 179, 8, 0.4)',
          }}
        />
      ))}

      {/* Deep vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 75% 75% at 50% 50%, transparent 35%, rgba(4, 3, 2, 0.6) 100%)
          `,
        }}
      />

      {/* Subtle grain texture */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
