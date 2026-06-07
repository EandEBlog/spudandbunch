// Flat ESLint config (ESLint 9). Lints JS/TS and Astro files; Prettier owns formatting.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import prettier from 'eslint-config-prettier';

export default [
  // Ignore build output and generated files everywhere.
  {
    ignores: ['**/dist/', '**/.astro/', '**/node_modules/', 'apps/cms/**', '.superpowers/**'],
  },

  // Base JavaScript recommendations.
  js.configs.recommended,

  // TypeScript recommendations (non type-checked; fast, no project service needed).
  ...tseslint.configs.recommended,

  // Astro component recommendations (sets up the Astro parser for .astro files).
  ...astro.configs.recommended,

  // Turn off rules that conflict with Prettier. Keep last.
  prettier,
];
