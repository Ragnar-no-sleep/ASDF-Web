/**
 * Build V2 - Configuration & Constants
 * Central configuration for the Yggdrasil Build system
 *
 * @version 2.0.0
 */

'use strict';

// ============================================
// STORAGE KEYS
// ============================================
export const STORAGE_KEY = 'asdf_build_v2';
export const STORAGE_VERSION = 1;

// ============================================
// TRACKS - Builder Paths
// ============================================
export const TRACKS = {
  dev: {
    id: 'dev',
    icon: '{ }',
    name: 'Developer',
    desc: 'Master Solana, Rust, TypeScript',
    color: '#ea4e33',
    modules: 12
  },
  growth: {
    id: 'growth',
    icon: '\u2197',  // ↗
    name: 'Growth',
    desc: 'Distribution, hooks, viral loops',
    color: '#f59e0b',
    modules: 10
  },
  gaming: {
    id: 'gaming',
    icon: '\u25C8',  // ◈
    name: 'Game Dev',
    desc: 'Unity, game design, tokenomics',
    color: '#8b5cf6',
    modules: 8
  },
  content: {
    id: 'content',
    icon: '\u2726',  // ✦
    name: 'Creator',
    desc: 'Narrative, video, community',
    color: '#06b6d4',
    modules: 9
  }
};

// ============================================
// PROJECT STATUS
// ============================================
export const STATUS = {
  live: {
    id: 'live',
    label: 'Live',
    color: '#4ade80',
    cssClass: 'live'
  },
  building: {
    id: 'building',
    label: 'Building',
    color: '#f59e0b',
    cssClass: 'building'
  },
  planned: {
    id: 'planned',
    label: 'Planned',
    color: '#8b5cf6',
    cssClass: 'planned'
  }
};

// ============================================
// BUILD STATES (State Machine)
// ============================================
export const STATES = {
  INTRO: 'intro',
  QUIZ: 'quiz',
  TREE: 'tree',
  PROJECT: 'project',
  TRACK: 'track'
};

// ============================================
// STATE TRANSITIONS
// ============================================
export const TRANSITIONS = {
  [STATES.INTRO]: [STATES.QUIZ, STATES.TREE],
  [STATES.QUIZ]: [STATES.TREE, STATES.PROJECT],
  [STATES.TREE]: [STATES.PROJECT, STATES.INTRO, STATES.QUIZ],
  [STATES.PROJECT]: [STATES.TREE, STATES.TRACK],
  [STATES.TRACK]: [STATES.TREE, STATES.PROJECT]
};

// ============================================
// QUIZ QUESTIONS
// ============================================
export const QUIZ_QUESTIONS = [
  {
    id: 'q1',
    text: 'What excites you most?',
    options: [
      { track: 'dev', text: 'Building systems that scale', icon: '\u{1F527}' },
      { track: 'growth', text: 'Watching metrics go up', icon: '\u{1F4C8}' },
      { track: 'gaming', text: 'Creating immersive experiences', icon: '\u{1F3AE}' },
      { track: 'content', text: 'Telling compelling stories', icon: '\u{1F3AC}' }
    ]
  },
  {
    id: 'q2',
    text: 'Your ideal Friday night?',
    options: [
      { track: 'dev', text: 'Debugging a tricky issue', icon: '\u{1F41B}' },
      { track: 'growth', text: 'Analyzing conversion funnels', icon: '\u{1F4CA}' },
      { track: 'gaming', text: 'Playtesting new mechanics', icon: '\u{1F3B2}' },
      { track: 'content', text: 'Editing a video', icon: '\u{1F3A5}' }
    ]
  },
  {
    id: 'q3',
    text: 'Pick your superpower',
    options: [
      { track: 'dev', text: 'Read any codebase instantly', icon: '\u26A1' },
      { track: 'growth', text: 'Predict viral content', icon: '\u{1F52E}' },
      { track: 'gaming', text: 'Design perfect game loops', icon: '\u{1F504}' },
      { track: 'content', text: 'Captivate any audience', icon: '\u2728' }
    ]
  }
];

// ============================================
// MODAL TYPES
// ============================================
export const MODAL_TYPES = {
  DOC: 'doc',
  FEATURE: 'feature',
  COMPONENT: 'component',
  CODE_LEARNING: 'code-learning',
  PROJECT_IMMERSIVE: 'project-immersive'
};

// ============================================
// EVENTS
// ============================================
export const EVENTS = {
  // State events
  STATE_CHANGE: 'state:change',
  STATE_ENTER: 'state:enter',
  STATE_EXIT: 'state:exit',

  // Modal events
  MODAL_OPEN: 'modal:open',
  MODAL_CLOSE: 'modal:close',

  // Project events
  PROJECT_SELECT: 'project:select',
  PROJECT_DESELECT: 'project:deselect',

  // Track events
  TRACK_SELECT: 'track:select',
  TRACK_COMPLETE: 'track:complete',

  // Quiz events
  QUIZ_START: 'quiz:start',
  QUIZ_ANSWER: 'quiz:answer',
  QUIZ_COMPLETE: 'quiz:complete',

  // Tree events
  TREE_NODE_CLICK: 'tree:node:click',
  TREE_FILTER: 'tree:filter',

  // Data events
  DATA_LOADED: 'data:loaded',
  DATA_ERROR: 'data:error'
};

// ============================================
// CSS SELECTORS
// ============================================
export const SELECTORS = {
  // Views
  VIEW_SECTION: '.view-section',
  VIEW_SWITCH_BTN: '.view-switch-btn',

  // Tree
  TREE_SVG: '.tree-svg',
  TREE_NODE: '.tree-node',
  TREE_HEART: '.tree-heart',

  // Modals
  MODAL_BACKDROP: '.modal-backdrop',
  MODAL_CLOSE: '.modal-close',
  DOC_MODAL: '#doc-modal',
  FEATURE_MODAL: '#feature-modal',
  COMPONENT_MODAL: '#component-modal',
  CODE_LEARNING_MODAL: '#code-learning-modal',

  // Quiz
  PATH_QUESTION: '.path-question',
  PATH_OPTION: '.path-option',
  PATH_DOT: '.path-dot',
  PATH_RESULT: '#path-result',

  // Filters
  FILTER_PILL: '.filter-pill',
  SKILL_PILL: '.skill-pill',

  // Journey
  JOURNEY_TRACK: '.journey-track'
};

// ============================================
// DEFAULTS
// ============================================
export const DEFAULTS = {
  initialState: STATES.TREE,
  defaultTrack: 'dev',
  animationDuration: 300,
  debounceDelay: 150
};

// Export for non-module environments
if (typeof window !== 'undefined') {
  window.BuildConfig = {
    STORAGE_KEY,
    STORAGE_VERSION,
    TRACKS,
    STATUS,
    STATES,
    TRANSITIONS,
    QUIZ_QUESTIONS,
    MODAL_TYPES,
    EVENTS,
    SELECTORS,
    DEFAULTS
  };
}
