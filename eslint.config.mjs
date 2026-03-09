import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/build/**',
      '**/*.js',
      '**/*.cjs',
      '**/*.mjs',
      'docs/**',
      'scripts/**',
      'infra/**',
      'packages/frontend/e2e/**',
    ],
  },

  // Base config for all TS files
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // Shared package
  {
    files: ['packages/shared/src/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Backend
  {
    files: ['packages/backend/src/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Frontend
  {
    files: ['packages/frontend/src/**/*.ts', 'packages/frontend/src/**/*.tsx'],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Relaxed rules for the whole project — pragmatic, not pedantic
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
      'prefer-const': 'warn',
    },
  },
);
