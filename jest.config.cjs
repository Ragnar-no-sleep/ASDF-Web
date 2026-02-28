/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Test file patterns
  testMatch: ['**/tests/unit/**/*.test.js', '**/__tests__/**/*.js'],

  // Coverage configuration (v8 provider — babel-istanbul crashes on Node 24+)
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'server.cjs',
    'ssr/**/*.cjs',
    'js/config/**/*.js',
    'js/core/**/*.js',
    'js/utils/format.js',
    'js/utils/notice.js',
    'js/utils/fetch-retry.js',
    'js/games/shared/timing-config.js',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10,
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', 'js'],

  // Transform (no transform needed for vanilla JS)
  transform: {},

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Fail on console errors
  errorOnDeprecated: true,
};
