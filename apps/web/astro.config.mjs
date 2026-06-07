import { defineConfig } from 'astro/config';

// Static Site Generation (SSG): every page is pre-rendered to static HTML at
// build time. Output goes to apps/web/dist and is served by the `web` container.
export default defineConfig({
  output: 'static',
});
