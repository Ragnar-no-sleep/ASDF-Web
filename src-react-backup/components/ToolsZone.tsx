'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolsIcon, BurnsIcon, ForecastIcon, HoldexIcon, GasIcon } from './icons/PortalIcons';

interface Tool {
  id: string;
  name: string;
  href: string;
  angle: number;
}

const tools: Tool[] = [
  { id: 'burnengine', name: 'Burns', href: '/burns', angle: -150 },
  { id: 'forecast', name: 'Forecast', href: '/asdforecast', angle: -120 },
  { id: 'holdex', name: 'Holdex', href: '/holdex', angle: -60 },
  { id: 'gazdf', name: 'GASdf', href: '#', angle: -30 },
];

const toolIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  burnengine: BurnsIcon,
  forecast: ForecastIcon,
  holdex: HoldexIcon,
  gazdf: GasIcon,
};

const ORBIT_RADIUS = 85;

export function ToolsZone() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const zoneRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!zoneRef.current || !isExpanded) return;
      const rect = zoneRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2,
      });
    },
    [isExpanded]
  );

  const handleExpand = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    timeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 300);
  };

  // Calculate tool position with smooth magnetic effect
  const getToolPosition = (tool: Tool) => {
    const radians = (tool.angle * Math.PI) / 180;
    const baseX = Math.cos(radians) * ORBIT_RADIUS;
    const baseY = Math.sin(radians) * ORBIT_RADIUS;

    // Magnetic attraction effect
    const dx = mousePos.x - baseX;
    const dy = mousePos.y - baseY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 120;
    const magnetStrength = 0.2;

    let magnetX = 0;
    let magnetY = 0;

    if (distance < maxDistance && isExpanded) {
      const force = Math.pow(1 - distance / maxDistance, 2) * magnetStrength;
      magnetX = dx * force;
      magnetY = dy * force;
    }

    return {
      x: baseX + magnetX,
      y: baseY + magnetY,
    };
  };

  return (
    <motion.div
      ref={zoneRef}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 1.2,
        delay: 1.8,
        ease: [0.16, 1, 0.3, 1],
      }}
      onMouseEnter={handleExpand}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleCollapse}
      className="absolute z-30"
      style={{ bottom: '8vh' }}
    >
      {/* Tools trigger button */}
      <motion.button
        animate={{
          scale: isExpanded ? 1.05 : 1,
          borderColor: isExpanded ? 'rgba(245, 158, 11, 0.25)' : 'rgba(201, 184, 154, 0.12)',
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative flex flex-col items-center justify-center w-[80px] h-[65px] rounded-2xl"
        style={{
          background:
            'linear-gradient(165deg, rgba(50, 35, 22, 0.9) 0%, rgba(20, 14, 10, 0.95) 100%)',
          border: '1px solid',
          boxShadow: isExpanded
            ? '0 0 50px rgba(245, 158, 11, 0.1), 0 15px 35px rgba(0, 0, 0, 0.4)'
            : '0 15px 35px rgba(0, 0, 0, 0.4)',
          transition: 'box-shadow 0.5s ease',
        }}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 45 : 0 }}
          transition={{ duration: 0.3 }}
          className="w-6 h-6 mb-1"
        >
          <ToolsIcon className="w-full h-full" />
        </motion.div>
        <span
          className="font-mono text-[8px] font-semibold tracking-[0.2em] uppercase"
          style={{ color: 'rgba(250, 248, 245, 0.7)' }}
        >
          Tools
        </span>
      </motion.button>

      {/* Expanded tools arc */}
      <AnimatePresence>
        {isExpanded && (
          <div className="absolute inset-0 pointer-events-none">
            {tools.map((tool, index) => {
              const pos = getToolPosition(tool);
              return (
                <motion.a
                  key={tool.id}
                  href={tool.href}
                  initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: pos.x,
                    y: pos.y - 30,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0,
                    x: 0,
                    y: 0,
                    transition: { duration: 0.2, delay: (tools.length - index - 1) * 0.03 },
                  }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.04,
                    ease: [0.34, 1.56, 0.64, 1],
                    x: { duration: 0.12, ease: 'easeOut' },
                    y: { duration: 0.12, ease: 'easeOut' },
                  }}
                  whileHover={{
                    scale: 1.2,
                    transition: { duration: 0.2 },
                  }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex flex-col items-center justify-center w-[56px] h-[56px] rounded-xl"
                  style={{
                    background:
                      'linear-gradient(165deg, rgba(50, 35, 22, 0.95) 0%, rgba(22, 15, 10, 0.98) 100%)',
                    border: '1px solid rgba(201, 184, 154, 0.12)',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4), 0 0 30px rgba(234, 179, 8, 0.03)',
                  }}
                >
                  <div className="w-6 h-6 mb-0.5">
                    {toolIcons[tool.id] &&
                      (() => {
                        const IconComponent = toolIcons[tool.id];
                        return <IconComponent className="w-full h-full" />;
                      })()}
                  </div>
                  <span
                    className="font-mono text-[6px] tracking-[0.1em] uppercase"
                    style={{ color: 'rgba(201, 184, 154, 0.7)' }}
                  >
                    {tool.name}
                  </span>
                </motion.a>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
