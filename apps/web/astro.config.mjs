import { defineConfig } from 'astro/config';

// Static Site Generation (SSG): every page is pre-rendered to static HTML at
// build time. Output goes to apps/web/dist and is served by the `web` container.
export default defineConfig({
  output: 'static',

  // Cover/inline images come from Strapi (remote URLs). Allow the Strapi host so
  // Astro's <Image> can optimize them at build time. localhost covers dev; add
  // the production Strapi origin here (or via env) when deploying.
  image: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
  },
});
