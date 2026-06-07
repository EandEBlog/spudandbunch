import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Server (SSR) app: renders a single draft post on demand for the author's
// "Preview" button. Reuses apps/web's PostLayout + data layer.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),

  image: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'http', hostname: 'strapi' },
    ],
  },

  // Allow importing components/lib from the sibling apps/web app.
  vite: {
    server: { fs: { allow: ['../..'] } },
  },
});
