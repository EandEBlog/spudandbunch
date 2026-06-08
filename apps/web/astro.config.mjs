import { defineConfig } from 'astro/config';

// Authorize the Strapi host so Astro's <Image> can fetch + optimize its images
// at build time (otherwise remote images are left as raw, unreachable <img>).
// We derive the host from PUBLIC_STRAPI_URL (set per environment) and also allow
// the common local/dockerized hosts.
function strapiPattern() {
  try {
    const u = new URL(process.env.PUBLIC_STRAPI_URL ?? 'http://localhost:1337');
    return { protocol: u.protocol.replace(':', ''), hostname: u.hostname };
  } catch {
    return { protocol: 'http', hostname: 'localhost' };
  }
}

// Static Site Generation (SSG): every page is pre-rendered to static HTML at
// build time. Output goes to apps/web/dist and is served by the `web` container.
export default defineConfig({
  output: 'static',

  image: {
    remotePatterns: [
      strapiPattern(),
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'http', hostname: 'strapi' },
    ],
  },
});
