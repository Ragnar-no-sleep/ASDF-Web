import js from '@eslint/js';
import html from 'eslint-plugin-html';
import globals from 'globals';

export default [
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      '**/*.min.js',
      '.next/**',
      'src-react-backup/**',
      '_archive/**',
      // Separate monorepos — have their own lint configs
      'ecosystem/**',
      // Archived build artifacts
      '_archive/**',
    ],
  },

  // Base config for all JS files
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
        // Custom globals
        ASDF: 'readonly',
        solanaWeb3: 'readonly',
        appState: 'writable',
        CONFIG: 'readonly',
        ShopUtils: 'readonly',
        escapeHtml: 'readonly',
        DOMPurify: 'readonly',
        Chart: 'readonly',
        Confetti: 'readonly',
        gsap: 'readonly',
        THREE: 'readonly',
        ScrollTrigger: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      eqeqeq: ['error', 'smart'],
      curly: ['error', 'multi-line', 'consistent'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-case-declarations': 'warn',
      'no-useless-escape': 'warn',
      'no-prototype-builtins': 'warn',
      'no-useless-catch': 'warn',
      // ESLint 10 recommended — downgrade until audited
      'no-useless-assignment': 'warn',
      'prefer-object-has-own': 'warn',
      'preserve-caught-error': 'warn',
    },
  },

  // HTML files config
  {
    files: ['**/*.html'],
    plugins: {
      html,
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },

  // JS in js/ folder — script-tag base: cross-file usage invisible to ESLint
  {
    files: ['js/**/*.js'],
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },

  // ES module directories — re-enable no-unused-vars (imports are trackable)
  {
    files: [
      'js/core/**/*.js',
      'js/config/**/*.js',
      'js/utils/**/*.js',
      'js/build/**/*.js',
      'js/dashboard/**/*.js',
      'js/solana/**/*.js',
      'js/shared/**/*.js',
      'js/audio/**/*.js',
      'js/badge/**/*.js',
      'js/ui/**/*.js',
      'js/persistence/**/*.js',
      'js/learn-build/**/*.js',
      'js/burns.js',
      'js/forecast.js',
      'js/holdex.js',
      'js/staking.js',
      'js/ignition.js',
      'js/me.js',
      'js/hub-majestic.js',
      'js/debug.js',
      'js/asdf-integration.js',
    ],
    rules: {
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  // Debug utilities — console.log is their purpose
  {
    files: ['js/debug.js', 'js/core/debug.js'],
    rules: {
      'no-console': 'off',
    },
  },

  // Server-side code — console.log is standard, P3 backend has planned imports
  {
    files: ['api/**/*.js', 'services/**/*.js', 'middleware/**/*.js', 'build/**/*.js'],
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
    },
  },

  // CJS files — only .cjs extension (package.json "type": "module")
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
    rules: {
      'no-console': 'off',
    },
  },

  // Test files — mocks and helpers may appear unused
  {
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
    },
  },
];
