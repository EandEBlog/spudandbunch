# preview — Astro SSR server that renders a single draft post on demand.
# Build context is the repo root (needs apps/web + apps/preview).
FROM node:20-bookworm-slim

ENV HUSKY=0
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV PATH=/app/node_modules/.bin:$PATH

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/preview/package.json apps/preview/package.json
RUN npm ci --include=dev

COPY apps/web ./apps/web
COPY apps/preview ./apps/preview

# PUBLIC_STRAPI_URL is inlined at build time (Vite) — bake the internal CMS host.
ENV NODE_ENV=production
ENV PUBLIC_STRAPI_URL=http://strapi:1337
RUN npm run build -w apps/preview

ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080
CMD ["node", "apps/preview/dist/server/entry.mjs"]
