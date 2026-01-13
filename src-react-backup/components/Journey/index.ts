// Journey Learning Components
export { JourneyDevTrack } from './JourneyDevTrack';
export { LessonViewer } from './LessonViewer';
export { ModuleViewer } from './ModuleViewer';
export { QuizBlock } from './QuizBlock';
export { CodeChallenge } from './CodeChallenge';
export { DiagramBlock } from './DiagramBlock';

// Re-export types from curriculum
export type {
  Module,
  SkillPack,
  Lesson,
  ContentBlock,
  QuizOption,
  DiagramData,
  Level,
} from '@/data/dev-curriculum';

// Re-export curriculum data and helpers
export { LEVELS, MODULE_1_FOUNDATIONS, getLessonXpReward } from '@/data/dev-curriculum';

// Re-export progress utilities
export {
  getProgress,
  saveProgress,
  startLesson,
  completeLesson,
  recordQuizAnswer,
  markChallengeCompleted,
  getModuleStats,
  getLevelProgress,
  checkSkillPackCompletion,
  checkModuleCompletion,
  getLessonProgress,
  resetProgress,
} from '@/lib/journey-progress';

export type {
  UserProgress,
  LessonProgress,
  SkillPackProgress,
  ModuleProgress,
} from '@/lib/journey-progress';
