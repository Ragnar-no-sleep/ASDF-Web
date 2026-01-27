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
// TRACKS - Builder Paths (3 tracks: dev, games, content)
// Note: Growth track merged into Content as of 2026-01-21
// ============================================
export const TRACKS = {
  dev: {
    id: 'dev',
    icon: '{ }',
    name: 'Developer',
    desc: 'Master Solana, Rust, TypeScript',
    color: '#ea4e33',
    modules: 12,
  },
  gaming: {
    id: 'gaming',
    icon: '\u25C8', // ◈
    name: 'Game Dev',
    desc: 'Unity, game design, tokenomics',
    color: '#8b5cf6',
    modules: 8,
  },
  content: {
    id: 'content',
    icon: '\u2726', // ✦
    name: 'Creator',
    desc: 'Narrative, video, community, growth',
    color: '#06b6d4',
    modules: 12, // Increased: 9 original + growth modules merged
  },
};

// ============================================
// PROJECT STATUS
// ============================================
export const STATUS = {
  live: {
    id: 'live',
    label: 'Live',
    color: '#4ade80',
    cssClass: 'live',
  },
  building: {
    id: 'building',
    label: 'Building',
    color: '#f59e0b',
    cssClass: 'building',
  },
  planned: {
    id: 'planned',
    label: 'Planned',
    color: '#8b5cf6',
    cssClass: 'planned',
  },
};

// ============================================
// BUILD STATES (State Machine)
// ============================================
export const STATES = {
  INTRO: 'intro',
  QUIZ: 'quiz',
  TREE: 'tree',
  PROJECT: 'project',
  TRACK: 'track',
};

// ============================================
// STATE TRANSITIONS
// ============================================
export const TRANSITIONS = {
  [STATES.INTRO]: [STATES.QUIZ, STATES.TREE],
  [STATES.QUIZ]: [STATES.TREE, STATES.PROJECT],
  [STATES.TREE]: [STATES.PROJECT, STATES.INTRO, STATES.QUIZ],
  [STATES.PROJECT]: [STATES.TREE, STATES.TRACK],
  [STATES.TRACK]: [STATES.TREE, STATES.PROJECT],
};

// ============================================
// QUIZ QUESTIONS (3 tracks: dev, gaming, content)
// ============================================
export const QUIZ_QUESTIONS = [
  {
    id: 'q1',
    text: 'What excites you most?',
    options: [
      { track: 'dev', text: 'Building systems that scale', icon: '\u{1F527}' },
      { track: 'gaming', text: 'Creating immersive experiences', icon: '\u{1F3AE}' },
      { track: 'content', text: 'Growing communities & telling stories', icon: '\u{1F4C8}' },
    ],
  },
  {
    id: 'q2',
    text: 'Your ideal Friday night?',
    options: [
      { track: 'dev', text: 'Debugging a tricky issue', icon: '\u{1F41B}' },
      { track: 'gaming', text: 'Playtesting new mechanics', icon: '\u{1F3B2}' },
      { track: 'content', text: 'Editing content & analyzing metrics', icon: '\u{1F3A5}' },
    ],
  },
  {
    id: 'q3',
    text: 'Pick your superpower',
    options: [
      { track: 'dev', text: 'Read any codebase instantly', icon: '\u26A1' },
      { track: 'gaming', text: 'Design perfect game loops', icon: '\u{1F504}' },
      { track: 'content', text: 'Predict viral content & captivate audiences', icon: '\u{1F52E}' },
    ],
  },
];

// ============================================
// MODAL TYPES
// ============================================
export const MODAL_TYPES = {
  DOC: 'doc',
  FEATURE: 'feature',
  COMPONENT: 'component',
  CODE_LEARNING: 'code-learning',
  PROJECT_IMMERSIVE: 'project-immersive',
  PROJECT_TIMELINE: 'project-timeline',
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
  PROJECT_FOCUS: 'project:focus',
  PROJECT_BLUR: 'project:blur',

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
  DATA_ERROR: 'data:error',

  // 3D Renderer events
  RENDERER_READY: 'renderer:ready',
  RENDERER_ERROR: 'renderer:error',
  CAMERA_ZOOM_START: 'camera:zoom:start',
  CAMERA_ZOOM_END: 'camera:zoom:end',
  CAMERA_RESET: 'camera:reset',

  // Skill Tree events
  SKILL_TREE_SHOW: 'skillTree:show',
  SKILL_TREE_HIDE: 'skillTree:hide',
  SKILL_NODE_CLICK: 'skillTree:node:click',
  SKILL_NODE_HOVER: 'skillTree:node:hover',

  // Formation Panel events
  FORMATION_OPEN: 'formation:open',
  FORMATION_CLOSE: 'formation:close',
  FORMATION_TRACK_SELECT: 'formation:track:select',
  FORMATION_MODULE_START: 'formation:module:start',
  FORMATION_MODULE_COMPLETE: 'formation:module:complete',

  // Builder Profile events
  BUILDER_VIEW: 'builder:view',
  BUILDER_OPENED: 'builder:opened',
  BUILDER_CLOSED: 'builder:closed',

  // GitHub Timeline events
  TIMELINE_LOAD: 'timeline:load',
  TIMELINE_LOADED: 'timeline:loaded',
  TIMELINE_ERROR: 'timeline:error',
  CONTRIBUTOR_CLICK: 'contributor:click',
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
  JOURNEY_TRACK: '.journey-track',

  // 3D Renderer
  RENDERER_CONTAINER: '#yggdrasil-canvas',

  // Formation Panel
  FORMATION_PANEL_ROOT: '#formation-panel-root',
  FORMATION_PANEL: '.formation-panel',
  FORMATION_BACKDROP: '.formation-backdrop',
  TRACK_CARD: '.track-card',
  MODULE_CARD: '.module-card',

  // Skill Tree
  SKILL_TREE_CONTAINER: '.skill-tree-container',
  SKILL_NODE: '.skill-node',
  SKILL_TOOLTIP: '.skill-tooltip',

  // Builder Profile
  BUILDER_PROFILE_ROOT: '#builder-profile-root',
  BUILDER_PROFILE_MODAL: '.builder-profile-modal',
  BUILDER_PROFILE_BACKDROP: '.builder-profile-backdrop',

  // GitHub Timeline
  GITHUB_TIMELINE: '.github-timeline',
  COMMIT_ITEM: '.commit-item',
  CONTRIBUTOR_CARD: '.contributor-card',
};

// ============================================
// DEFAULTS
// ============================================
export const DEFAULTS = {
  initialState: STATES.TREE,
  defaultTrack: 'dev',
  animationDuration: 300,
  debounceDelay: 150,
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
    DEFAULTS,
  };
}
