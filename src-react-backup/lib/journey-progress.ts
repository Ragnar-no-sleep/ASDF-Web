/**
 * Journey Progress System
 * MVP: localStorage-based progress tracking
 * Future: Wallet-based with SBTs on Solana
 */

import { LEVELS, getLessonXpReward } from '@/data/dev-curriculum';
import type { Module, Lesson, SkillPack } from '@/data/dev-curriculum';

// Types
export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  startedAt: string;
  completedAt?: string;
  contentProgress: Record<string, boolean>; // blockId -> completed
  quizAnswers: Record<string, { answerId: string; correct: boolean }>;
  challengeCompleted: boolean;
}

export interface SkillPackProgress {
  skillPackId: string;
  lessonsCompleted: string[];
  completed: boolean;
  completedAt?: string;
}

export interface ModuleProgress {
  moduleId: string;
  skillPacksCompleted: string[];
  completed: boolean;
  completedAt?: string;
  sbtMinted?: boolean;
}

export interface UserProgress {
  userId: string; // For now, a random ID. Later: wallet address
  track: 'dev' | 'degen' | 'artist';
  totalXP: number;
  currentLevel: number;
  modules: Record<string, ModuleProgress>;
  skillPacks: Record<string, SkillPackProgress>;
  lessons: Record<string, LessonProgress>;
  achievements: string[];
  lastActiveAt: string;
  createdAt: string;
}

const STORAGE_KEY = 'asdf_journey_progress';

// Get or create user progress
export function getProgress(): UserProgress {
  if (typeof window === 'undefined') {
    return createDefaultProgress();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const progress = JSON.parse(stored) as UserProgress;
      // Update last active
      progress.lastActiveAt = new Date().toISOString();
      saveProgress(progress);
      return progress;
    }
  } catch (e) {
    console.error('Failed to load progress:', e);
  }

  const defaultProgress = createDefaultProgress();
  saveProgress(defaultProgress);
  return defaultProgress;
}

// Save progress to localStorage
export function saveProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
}

// Create default progress state
function createDefaultProgress(): UserProgress {
  return {
    userId: generateUserId(),
    track: 'dev',
    totalXP: 0,
    currentLevel: 0,
    modules: {},
    skillPacks: {},
    lessons: {},
    achievements: [],
    lastActiveAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

// Generate a random user ID (MVP)
function generateUserId(): string {
  return `user_${Math.random().toString(36).substring(2, 15)}`;
}

// Start a lesson
export function startLesson(lessonId: string): LessonProgress {
  const progress = getProgress();

  if (!progress.lessons[lessonId]) {
    progress.lessons[lessonId] = {
      lessonId,
      completed: false,
      startedAt: new Date().toISOString(),
      contentProgress: {},
      quizAnswers: {},
      challengeCompleted: false,
    };
    saveProgress(progress);
  }

  return progress.lessons[lessonId];
}

// Mark content block as completed
export function markContentCompleted(lessonId: string, blockId: string): void {
  const progress = getProgress();

  if (!progress.lessons[lessonId]) {
    startLesson(lessonId);
  }

  progress.lessons[lessonId].contentProgress[blockId] = true;
  saveProgress(progress);
}

// Record quiz answer
export function recordQuizAnswer(
  lessonId: string,
  quizId: string,
  answerId: string,
  correct: boolean
): void {
  const progress = getProgress();

  if (!progress.lessons[lessonId]) {
    startLesson(lessonId);
  }

  progress.lessons[lessonId].quizAnswers[quizId] = { answerId, correct };
  saveProgress(progress);
}

// Mark challenge as completed
export function markChallengeCompleted(lessonId: string): void {
  const progress = getProgress();

  if (!progress.lessons[lessonId]) {
    startLesson(lessonId);
  }

  progress.lessons[lessonId].challengeCompleted = true;
  saveProgress(progress);
}

// Complete a lesson and award XP
export function completeLesson(lessonId: string, xpReward: number): void {
  const progress = getProgress();

  if (!progress.lessons[lessonId]) {
    startLesson(lessonId);
  }

  const lesson = progress.lessons[lessonId];

  // Only award XP if not already completed
  if (!lesson.completed) {
    lesson.completed = true;
    lesson.completedAt = new Date().toISOString();
    progress.totalXP += xpReward;

    // Check for level up
    const newLevel = calculateLevel(progress.totalXP);
    if (newLevel > progress.currentLevel) {
      progress.currentLevel = newLevel;
      // TODO: Award level-up achievement
    }

    saveProgress(progress);
  }
}

// Calculate level from XP
export function calculateLevel(xp: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) {
      return i;
    }
  }
  return 0;
}

// Get XP progress to next level
export function getLevelProgress(xp: number): { current: number; max: number; percent: number } {
  const level = calculateLevel(xp);
  const currentLevel = LEVELS[level];
  const nextLevel = LEVELS[level + 1];

  if (!nextLevel) {
    return { current: xp - currentLevel.minXP, max: 1000, percent: 100 };
  }

  const current = xp - currentLevel.minXP;
  const max = nextLevel.minXP - currentLevel.minXP;
  const percent = Math.round((current / max) * 100);

  return { current, max, percent };
}

// Check if skill pack is completed
export function checkSkillPackCompletion(skillPackId: string, skillPack: SkillPack): boolean {
  const progress = getProgress();
  const lessonIds = skillPack.lessons.map(l => l.id);

  const allCompleted = lessonIds.every(id => progress.lessons[id]?.completed);

  if (allCompleted && !progress.skillPacks[skillPackId]?.completed) {
    if (!progress.skillPacks[skillPackId]) {
      progress.skillPacks[skillPackId] = {
        skillPackId,
        lessonsCompleted: lessonIds,
        completed: false,
      };
    }
    progress.skillPacks[skillPackId].completed = true;
    progress.skillPacks[skillPackId].completedAt = new Date().toISOString();
    saveProgress(progress);
  }

  return allCompleted;
}

// Check if module is completed
export function checkModuleCompletion(moduleId: string, module: Module): boolean {
  const progress = getProgress();
  const skillPackIds = module.skillPacks.map(sp => sp.id);

  const allCompleted = skillPackIds.every(id => progress.skillPacks[id]?.completed);

  if (allCompleted && !progress.modules[moduleId]?.completed) {
    if (!progress.modules[moduleId]) {
      progress.modules[moduleId] = {
        moduleId,
        skillPacksCompleted: skillPackIds,
        completed: false,
      };
    }
    progress.modules[moduleId].completed = true;
    progress.modules[moduleId].completedAt = new Date().toISOString();
    // TODO: Trigger SBT mint
    saveProgress(progress);
  }

  return allCompleted;
}

// Get completion stats for a module
export function getModuleStats(module: Module): {
  totalLessons: number;
  completedLessons: number;
  totalXP: number;
  earnedXP: number;
  percentComplete: number;
} {
  const progress = getProgress();
  let totalLessons = 0;
  let completedLessons = 0;
  let totalXP = 0;
  let earnedXP = 0;

  for (const skillPack of module.skillPacks) {
    for (const lesson of skillPack.lessons) {
      const xp = getLessonXpReward(lesson);
      totalLessons++;
      totalXP += xp;

      if (progress.lessons[lesson.id]?.completed) {
        completedLessons++;
        earnedXP += xp;
      }
    }
  }

  const percentComplete =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return { totalLessons, completedLessons, totalXP, earnedXP, percentComplete };
}

// Get lesson progress
export function getLessonProgress(lessonId: string): LessonProgress | null {
  const progress = getProgress();
  return progress.lessons[lessonId] || null;
}

// Reset all progress (for testing)
export function resetProgress(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(STORAGE_KEY);
}

// Export progress as JSON (for backup/migration)
export function exportProgress(): string {
  const progress = getProgress();
  return JSON.stringify(progress, null, 2);
}

// Import progress from JSON
export function importProgress(json: string): boolean {
  try {
    const progress = JSON.parse(json) as UserProgress;
    saveProgress(progress);
    return true;
  } catch {
    return false;
  }
}
