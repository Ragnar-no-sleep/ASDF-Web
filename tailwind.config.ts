import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Warm color palette - Gold, Amber, Cream
      colors: {
        // Background layers (warm - for hub/learn)
        hub: {
          deep: '#0d0906',
          base: '#1a120d',
          elevated: '#231810',
          surface: '#2d1f15',
        },
        // Ragnar dark backgrounds (for deep-learn/build)
        dark: {
          base: '#000000',
          elevated: '#111114',
          surface: '#1a1a1d',
          card: '#0a0a0c',
        },
        // Gold spectrum
        gold: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
        },
        // Amber spectrum
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        // Cream spectrum
        cream: {
          50: '#faf8f5',
          100: '#f5f0e8',
          200: '#ebe3d6',
          300: '#ddd1be',
          400: '#c9b89a',
          500: '#b5a07d',
        },
        // Text hierarchy
        'warm-primary': '#faf8f5',
        'warm-secondary': '#c9b89a',
        'warm-muted': '#8a7a65',
        'warm-ghost': '#5a4d40',
        // Ragnar accent (orange-red)
        ragnar: {
          DEFAULT: '#ea4e33',
          50: 'rgba(234, 78, 51, 0.05)',
          100: 'rgba(234, 78, 51, 0.1)',
          200: 'rgba(234, 78, 51, 0.2)',
          300: 'rgba(234, 78, 51, 0.3)',
          400: 'rgba(234, 78, 51, 0.4)',
          500: '#ea4e33',
          600: '#d94429',
          700: '#c53a20',
        },
        // Border colors
        'warm-subtle': 'rgba(201, 184, 154, 0.1)',
        'warm-default': 'rgba(201, 184, 154, 0.2)',
        'warm-strong': 'rgba(201, 184, 154, 0.35)',
      },
      // Font families
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      // Custom animations
      animation: {
        'float-glow': 'floatGlow 20s ease-in-out infinite',
        'center-breathe': 'centerBreathe 6s ease-in-out infinite',
        'logo-flicker': 'logoFlicker 4s ease-in-out infinite',
        'orbit-rotate': 'orbitRotate 60s linear infinite',
        'entrance-fade': 'entranceFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'entrance-portal': 'entrancePortal 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'runes-scroll': 'runesScroll 60s linear infinite',
      },
      keyframes: {
        floatGlow: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '25%': { transform: 'translate(30px, -20px) scale(1.05)' },
          '50%': { transform: 'translate(-20px, 30px) scale(0.95)' },
          '75%': { transform: 'translate(20px, 20px) scale(1.02)' },
        },
        centerBreathe: {
          '0%, 100%': {
            boxShadow:
              '0 0 60px rgba(250, 240, 220, 0.1), 0 0 120px rgba(234, 179, 8, 0.1), inset 0 0 40px rgba(0, 0, 0, 0.3)',
          },
          '50%': {
            boxShadow:
              '0 0 80px rgba(250, 240, 220, 0.15), 0 0 150px rgba(234, 179, 8, 0.15), inset 0 0 40px rgba(0, 0, 0, 0.3)',
          },
        },
        logoFlicker: {
          '0%, 100%': { filter: 'drop-shadow(0 0 20px rgba(234, 179, 8, 0.4))' },
          '50%': {
            filter:
              'drop-shadow(0 0 30px rgba(234, 179, 8, 0.4)) drop-shadow(0 0 10px rgba(245, 158, 11, 0.3))',
          },
        },
        orbitRotate: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        entranceFade: {
          from: { opacity: '0', transform: 'scale(0.8)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        entrancePortal: {
          from: { opacity: '0', transform: 'translateY(30px) scale(0.9)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        runesScroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(50%)' },
        },
      },
      // Timing functions
      transitionTimingFunction: {
        majestic: 'cubic-bezier(0.16, 1, 0.3, 1)',
        float: 'cubic-bezier(0.45, 0, 0.55, 1)',
        magnetic: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      // Box shadows
      boxShadow: {
        'glow-gold': '0 0 40px rgba(234, 179, 8, 0.4)',
        'glow-amber': '0 0 30px rgba(245, 158, 11, 0.3)',
        'glow-soft': '0 0 60px rgba(250, 240, 220, 0.1)',
      },
    },
  },
  plugins: [],
};

export default config;
