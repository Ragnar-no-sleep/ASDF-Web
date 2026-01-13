/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Test file patterns
  testMatch: ['**/tests/unit/**/*.test.js', '**/__tests__/**/*.js'],

  // Coverage configuration
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/**/*.min.js',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
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
