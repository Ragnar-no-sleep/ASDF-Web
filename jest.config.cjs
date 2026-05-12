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
    '!js/core/redis-client.js',
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
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module paths
  moduleDirectories: ['node_modules', 'js'],

  // Transform ES modules to CJS for Jest (browser serves ES modules as-is)
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: ['/node_modules/'],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Fail on console errors
  errorOnDeprecated: true,

  // Force exit after all tests (prevents worker leak from audio timers)
  forceExit: true,
};
