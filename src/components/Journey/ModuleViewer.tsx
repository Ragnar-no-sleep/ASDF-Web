'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Module, SkillPack, Lesson } from '@/data/dev-curriculum';
import { LEVELS, getLessonXpReward } from '@/data/dev-curriculum';
import { getProgress, getModuleStats, getLevelProgress } from '@/lib/journey-progress';

// ============================================
// TYPES
// ============================================

interface ModuleViewerProps {
  module: Module;
  onSelectLesson: (lesson: Lesson, skillPack: SkillPack) => void;
  onBack?: () => void;
}

// ============================================
// MODULE VIEWER COMPONENT
// ============================================

export function ModuleViewer({ module, onSelectLesson, onBack }: ModuleViewerProps) {
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof getModuleStats> | null>(null);
  const [userProgress, setUserProgress] = useState<ReturnType<typeof getProgress> | null>(null);

  useEffect(() => {
    const progress = getProgress();
    setUserProgress(progress);
    setStats(getModuleStats(module));
  }, [module]);

  const levelProgress = userProgress ? getLevelProgress(userProgress.totalXP) : null;
  const currentLevel = userProgress ? LEVELS[userProgress.currentLevel] : LEVELS[0];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#666] hover:text-white transition-colors mb-4"
          >
            <span>←</span>
            <span className="text-sm">Back to Track</span>
          </button>
        )}

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ backgroundColor: `${module.color}20` }}
            >
              {module.icon}
            </div>
            <div>
              <div className="text-xs text-[#666] uppercase tracking-wider mb-1">
                Module {module.number}
              </div>
              <h1 className="text-3xl font-bold text-white mb-1">{module.title}</h1>
              <p className="text-[#888]">{module.subtitle}</p>
            </div>
          </div>

          {/* User Level */}
          <div className="text-right">
            <div className="text-sm text-[#666] mb-1">Your Level</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentLevel.icon}</span>
              <div>
                <div className="font-bold text-white">{currentLevel.name}</div>
                <div className="text-xs text-[#666]">{userProgress?.totalXP || 0} XP</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Progress Overview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-4 mb-8"
      >
        <StatCard
          label="Lessons"
          value={`${stats?.completedLessons || 0}/${stats?.totalLessons || 0}`}
          color="#4ade80"
        />
        <StatCard
          label="XP Earned"
          value={`${stats?.earnedXP || 0}`}
          suffix={`/${stats?.totalXP || 0}`}
          color="#ea4e33"
        />
        <StatCard label="Progress" value={`${stats?.percentComplete || 0}%`} color="#f59e0b" />
        <StatCard label="To Next Level" value={`${levelProgress?.percent || 0}%`} color="#8b5cf6" />
      </motion.div>

      {/* XP Progress Bar */}
      {levelProgress && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8 p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl"
        >
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentLevel.icon}</span>
              <span className="text-sm font-medium text-white">{currentLevel.name}</span>
            </div>
            <div className="text-xs text-[#666]">
              {levelProgress.current} / {levelProgress.max} XP to next level
            </div>
          </div>
          <div className="h-2 bg-[#111] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#ea4e33] to-[#f59e0b] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress.percent}%` }}
              transition={{ duration: 0.5, delay: 0.3 }}
            />
          </div>
        </motion.div>
      )}

      {/* Skill Packs */}
      <div className="space-y-4">
        {module.skillPacks.map((skillPack, index) => (
          <SkillPackCard
            key={skillPack.id}
            skillPack={skillPack}
            index={index}
            expanded={expandedPack === skillPack.id}
            onToggle={() => setExpandedPack(expandedPack === skillPack.id ? null : skillPack.id)}
            onSelectLesson={lesson => onSelectLesson(lesson, skillPack)}
            userProgress={userProgress}
          />
        ))}
      </div>

      {/* Module Milestone */}
      {module.milestone && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 p-6 bg-gradient-to-br from-[#ea4e33]/10 to-[#f59e0b]/5 border border-[#ea4e33]/30 rounded-2xl"
        >
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#ea4e33]/20 flex items-center justify-center text-3xl shrink-0">
              🏆
            </div>
            <div className="flex-1">
              <div className="text-xs text-[#ea4e33] uppercase tracking-wider mb-1">
                Milestone Badge
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{module.milestone.name}</h3>
              <p className="text-sm text-[#888] mb-3">{module.milestone.description}</p>
              <div className="flex items-center gap-4">
                <div className="text-xs text-[#666]">
                  Required:{' '}
                  <span className="text-[#ea4e33] font-medium">
                    {module.milestone.requiredXp} XP
                  </span>
                </div>
                <div className="text-xs px-2 py-1 bg-[#111] rounded text-[#888]">
                  SBT: {module.milestone.sbtMetadata.symbol}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function StatCard({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: string;
  suffix?: string;
  color: string;
}) {
  return (
    <div className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
      <div className="text-xs text-[#666] mb-1">{label}</div>
      <div className="text-xl font-bold" style={{ color }}>
        {value}
        {suffix && <span className="text-sm text-[#444]">{suffix}</span>}
      </div>
    </div>
  );
}

function SkillPackCard({
  skillPack,
  index,
  expanded,
  onToggle,
  onSelectLesson,
  userProgress,
}: {
  skillPack: SkillPack;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onSelectLesson: (lesson: Lesson) => void;
  userProgress: ReturnType<typeof getProgress> | null;
}) {
  const completedLessons = skillPack.lessons.filter(
    l => userProgress?.lessons[l.id]?.completed
  ).length;
  const totalLessons = skillPack.lessons.length;
  const isComplete = completedLessons === totalLessons && totalLessons > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between text-left hover:bg-[#111] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${skillPack.color}20` }}
          >
            {skillPack.icon}
          </div>
          <div>
            <h3 className="font-semibold text-white">{skillPack.name}</h3>
            <p className="text-sm text-[#666]">{skillPack.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress */}
          <div className="text-right">
            <div className="text-sm font-medium" style={{ color: isComplete ? '#4ade80' : '#888' }}>
              {completedLessons}/{totalLessons} lessons
            </div>
            <div className="w-24 h-1.5 bg-[#222] rounded-full mt-1 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(completedLessons / totalLessons) * 100}%`,
                  backgroundColor: isComplete ? '#4ade80' : skillPack.color,
                }}
              />
            </div>
          </div>

          {/* Chevron */}
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} className="text-[#666]">
            ▼
          </motion.span>
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[#1a1a1a]"
          >
            <div className="p-4 space-y-2">
              {skillPack.lessons.map((lesson, lessonIndex) => {
                const lessonProgress = userProgress?.lessons[lesson.id];
                const isLessonComplete = lessonProgress?.completed;
                const isInProgress = lessonProgress && !lessonProgress.completed;

                return (
                  <motion.button
                    key={lesson.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: lessonIndex * 0.05 }}
                    onClick={() => onSelectLesson(lesson)}
                    className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-4 ${
                      isLessonComplete
                        ? 'bg-[#4ade80]/10 border border-[#4ade80]/30 hover:border-[#4ade80]/50'
                        : isInProgress
                          ? 'bg-[#f59e0b]/10 border border-[#f59e0b]/30 hover:border-[#f59e0b]/50'
                          : 'bg-[#111] border border-[#222] hover:border-[#333]'
                    }`}
                  >
                    {/* Status Icon */}
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isLessonComplete
                          ? 'bg-[#4ade80] text-black'
                          : isInProgress
                            ? 'bg-[#f59e0b] text-black'
                            : 'bg-[#222] text-[#666]'
                      }`}
                    >
                      {isLessonComplete ? '✓' : lessonIndex + 1}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`font-medium ${isLessonComplete ? 'text-[#4ade80]' : 'text-white'}`}
                        >
                          {lesson.title}
                        </h4>
                        {isInProgress && (
                          <span className="px-2 py-0.5 bg-[#f59e0b]/20 rounded text-xs text-[#f59e0b]">
                            In Progress
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#666] truncate">{lesson.subtitle}</p>
                    </div>

                    {/* Meta */}
                    <div className="text-right shrink-0">
                      <div className="text-xs text-[#666]">{lesson.estimatedTime} min</div>
                      <div className="text-xs text-[#ea4e33]">+{getLessonXpReward(lesson)} XP</div>
                    </div>

                    {/* Arrow */}
                    <span className="text-[#444] shrink-0">→</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Milestone Preview */}
            {skillPack.milestone && (
              <div className="px-4 pb-4">
                <div className="p-3 bg-[#ea4e33]/5 border border-[#ea4e33]/20 rounded-xl flex items-center gap-3">
                  <span className="text-lg">🎖️</span>
                  <div className="flex-1">
                    <span className="text-sm text-[#ea4e33]">{skillPack.milestone.name}</span>
                  </div>
                  <span className="text-xs text-[#666]">Complete all lessons</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ModuleViewer;
