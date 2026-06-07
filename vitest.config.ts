import { defineConfig } from 'vitest/config';

// Unit tests run in a Node environment. The data layer (apps/web/src/lib) and
// utilities are the primary targets; coverage is reported for those.
export default defineConfig({
  test: {
    include: ['apps/**/src/**/*.{test,spec}.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['apps/web/src/lib/**', 'apps/web/src/utils/**'],
    },
  },
});
