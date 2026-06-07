# rebuild-hook — builds the Astro site (incl. Pagefind) and serves the webhook
# listener. Build context is the repo root (needs apps/web + the hook source).
FROM node:20-bookworm-slim

# Disable Husky (no .git in the image) and provide build tools native deps need.
ENV HUSKY=0
RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV PATH=/app/node_modules/.bin:$PATH

# Install web deps (incl. devDeps like pagefind, which the build needs).
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci --include=dev

# App source.
COPY apps/web ./apps/web
COPY apps/rebuild-hook ./apps/rebuild-hook

# Production Astro build at runtime (NODE_ENV affects the astro build).
ENV NODE_ENV=production

EXPOSE 8080
CMD ["node", "apps/rebuild-hook/server.mjs"]
