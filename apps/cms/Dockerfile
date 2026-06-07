# Strapi (production). Builds the admin panel, then runs `strapi start`.
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app
ENV PATH=/opt/app/node_modules/.bin:$PATH

# Install all dependencies (the admin build needs them). No lockfile is committed
# for the CMS, so a plain install resolves one inside the image.
COPY package.json package-lock.json* ./
RUN npm install

# App source, then build the admin panel for production.
COPY . .
ENV NODE_ENV=production
RUN npm run build

EXPOSE 1337
CMD ["npm", "run", "start"]
