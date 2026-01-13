'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModuleViewer } from './ModuleViewer';
import { LessonViewer } from './LessonViewer';
import { MODULE_1_FOUNDATIONS, LEVELS, getLessonXpReward } from '@/data/dev-curriculum';
import type { Module, SkillPack, Lesson, MicroSkill } from '@/data/dev-curriculum';
import { getProgress, completeLesson, getModuleStats } from '@/lib/journey-progress';

// ============================================
// TYPES
// ============================================

type ViewState =
  | { type: 'track' }
  | { type: 'module'; module: Module }
  | { type: 'lesson'; lesson: Lesson; skillPack: SkillPack; module: Module };

// ============================================
// AVAILABLE MODULES
// ============================================

const MODULES: Module[] = [
  MODULE_1_FOUNDATIONS,
  // Future modules will be added here
];

// ============================================
// MAIN COMPONENT
// ============================================

export function JourneyDevTrack() {
  const [view, setView] = useState<ViewState>({ type: 'track' });
  const [userProgress, setUserProgress] = useState<ReturnType<typeof getProgress> | null>(null);

  // Load progress on mount
  useEffect(() => {
    setUserProgress(getProgress());
  }, []);

  // Refresh progress when returning to track view
  useEffect(() => {
    if (view.type === 'track') {
      setUserProgress(getProgress());
    }
  }, [view.type]);

  // Handle lesson completion
  const handleLessonComplete = (skills: MicroSkill[], lesson: Lesson) => {
    const xpReward = getLessonXpReward(lesson);
    completeLesson(lesson.id, xpReward);
    setUserProgress(getProgress());

    // Return to module view
    if (view.type === 'lesson') {
      setView({ type: 'module', module: view.module });
    }
  };

  // Get current level info
  const currentLevel = userProgress ? LEVELS[userProgress.currentLevel] : LEVELS[0];

  return (
    <div className="min-h-screen py-16">
      <AnimatePresence mode="wait">
        {/* Track Overview */}
        {view.type === 'track' && (
          <motion.div
            key="track"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-6xl mx-auto px-6"
          >
            {/* Header */}
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#ea4e33]/10 border border-[#ea4e33]/30 rounded-full text-sm text-[#ea4e33] mb-4"
              >
                <span>⚡</span>
                <span>Developer Track</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl font-bold text-white mb-4"
              >
                From Moldu to <span className="text-[#ea4e33]">Architect</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-[#888] max-w-2xl mx-auto"
              >
                Master Solana development from the ground up. Build real applications, earn skill
                badges, and join the builder community.
              </motion.p>
            </div>

            {/* User Progress Card */}
            {userProgress && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-12 p-6 bg-gradient-to-br from-[#0a0a0a] to-[#111] border border-[#1a1a1a] rounded-3xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ea4e33] to-[#f59e0b] flex items-center justify-center text-3xl">
                      {currentLevel.icon}
                    </div>
                    <div>
                      <div className="text-sm text-[#666] mb-1">Your Level</div>
                      <div className="text-2xl font-bold text-white">{currentLevel.name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#ea4e33]">
                        {userProgress.totalXP}
                      </div>
                      <div className="text-sm text-[#666]">Total XP</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#4ade80]">
                        {Object.values(userProgress.lessons).filter(l => l.completed).length}
                      </div>
                      <div className="text-sm text-[#666]">Lessons</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#f59e0b]">
                        {userProgress.achievements.length}
                      </div>
                      <div className="text-sm text-[#666]">Badges</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Philosophy Banner */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-12 p-4 bg-[#111] border border-[#222] rounded-xl text-center"
            >
              <p className="text-lg text-[#888]">
                <span className="text-[#ea4e33] font-medium">
                  &quot;Don&apos;t trust. Verify.&quot;
                </span>{' '}
                — Learn by doing. Build to understand.
              </p>
            </motion.div>

            {/* Modules Grid */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white">Modules</h2>

              {MODULES.map((module, index) => {
                const stats = getModuleStats(module);
                const isLocked =
                  index > 0 && !userProgress?.modules[MODULES[index - 1].id]?.completed;

                return (
                  <motion.div
                    key={module.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <button
                      onClick={() => !isLocked && setView({ type: 'module', module })}
                      disabled={isLocked}
                      className={`w-full p-6 rounded-2xl border text-left transition-all ${
                        isLocked
                          ? 'bg-[#0a0a0a] border-[#1a1a1a] opacity-50 cursor-not-allowed'
                          : 'bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#ea4e33]/50 hover:bg-[#111]'
                      }`}
                    >
                      <div className="flex items-start gap-5">
                        {/* Module Icon */}
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                          style={{ backgroundColor: isLocked ? '#111' : `${module.color}20` }}
                        >
                          {isLocked ? '🔒' : module.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-xs text-[#666] uppercase tracking-wider">
                              Module {module.number}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${module.color}20`,
                                color: module.color,
                              }}
                            >
                              {module.difficulty}
                            </span>
                          </div>

                          <h3 className="text-xl font-semibold text-white mb-1">{module.title}</h3>
                          <p className="text-sm text-[#666] mb-3">{module.description}</p>

                          {/* Stats */}
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-[#888]">📚</span>
                              <span className="text-[#666]">
                                {stats.completedLessons}/{stats.totalLessons} lessons
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[#888]">⏱️</span>
                              <span className="text-[#666]">{module.estimatedHours}h</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[#888]">✨</span>
                              <span className="text-[#ea4e33]">{module.totalXp} XP</span>
                            </div>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="shrink-0 text-right">
                          <div className="text-2xl font-bold" style={{ color: module.color }}>
                            {stats.percentComplete}%
                          </div>
                          <div className="w-24 h-2 bg-[#222] rounded-full mt-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${stats.percentComplete}%`,
                                backgroundColor: module.color,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}

              {/* Coming Soon Placeholder */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="p-6 bg-[#0a0a0a] border border-dashed border-[#222] rounded-2xl text-center"
              >
                <div className="text-3xl mb-2">🚀</div>
                <div className="text-lg font-medium text-[#444]">More modules coming soon</div>
                <div className="text-sm text-[#333]">
                  Smart Contracts, Token Programs, DeFi, and more...
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Module View */}
        {view.type === 'module' && (
          <motion.div
            key="module"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-6"
          >
            <ModuleViewer
              module={view.module}
              onBack={() => setView({ type: 'track' })}
              onSelectLesson={(lesson, skillPack) =>
                setView({ type: 'lesson', lesson, skillPack, module: view.module })
              }
            />
          </motion.div>
        )}

        {/* Lesson View */}
        {view.type === 'lesson' && (
          <motion.div
            key="lesson"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-6"
          >
            <LessonViewer
              lesson={view.lesson}
              onBack={() => setView({ type: 'module', module: view.module })}
              onComplete={skills => handleLessonComplete(skills, view.lesson)}
              completedSkills={Object.keys(userProgress?.lessons || {})
                .filter(id => userProgress?.lessons[id]?.completed)
                .flatMap(id => {
                  const lesson = view.skillPack.lessons.find(l => l.id === id);
                  return lesson?.skills.map(s => s.id) || [];
                })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default JourneyDevTrack;
