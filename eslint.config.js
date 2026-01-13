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
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'multi-line', 'consistent'],
      'no-var': 'warn',
      'prefer-const': 'warn',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-case-declarations': 'warn',
      'no-useless-escape': 'warn',
      'no-prototype-builtins': 'warn',
      'no-useless-catch': 'warn',
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

  // JS in js/ folder
  {
    files: ['js/**/*.js'],
    rules: {
      'no-undef': 'warn',
    },
  },

  // Test files
  {
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
