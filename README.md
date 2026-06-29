# Spud & Bunch

A dockerized food, cooking & travel blog. Static, fast, and image-first. Authors write and preview posts in a friendly CMS; publishing triggers an automatic site rebuild — no code changes, no manual deploys.

**Stack:** [Astro](https://astro.build) (static site) · [Strapi 5](https://strapi.io) (headless CMS) · PostgreSQL · [Pagefind](https://pagefind.app) (search) · Caddy · Docker Compose

---

## How it works

```
Author writes in Strapi admin
  → clicks Publish
    → webhook fires to rebuild-hook
      → astro build + pagefind run (~1–2 min)
        → Caddy serves the new static site
```

The public site is **pure static files** — no runtime dependency on Strapi or Postgres. A failed build leaves the previous site up.

---

## Prerequisites

- **Node 20** — pinned via `.nvmrc`. With [nvm](https://github.com/nvm-sh/nvm): `nvm use`
- **Docker + Docker Compose** — [Docker Desktop](https://www.docker.com/products/docker-desktop/) on macOS/Windows

---

## Getting started (local dev)

The dev stack runs Postgres and Strapi only. The Astro frontend runs locally with `npm run dev` and talks to Strapi directly.

### 1. Start the CMS

```bash
make dev-up
```

First run takes a minute or two to compile the Strapi admin panel. Once it's up:

- **Admin panel:** http://localhost:1337/admin
- **Logs:** `make dev-logs`

### 2. Create your admin account

The first time only — while Strapi is running:

```bash
make dev-admin-create EMAIL=you@example.com PASS='YourPass123!' NAME=You
```

Passwords must be ≥8 characters with at least one uppercase letter, one lowercase, and one number.

### 3. Start the frontend

```bash
make install   # first time only
make dev       # Astro dev server → http://localhost:4321
```

The dev server reads live from Strapi, so changes in the CMS appear immediately on refresh.

---

## Writing and publishing (day-to-day)

1. Go to http://localhost:1337/admin (dev) or your admin URL (prod)
2. **Content Manager → Posts → Create new post**
3. Fill in title, body, cover image, category, and tags
4. **Save** to store a draft
5. Click **Preview** to see it rendered exactly as it will appear live
6. Click **Publish** — in production, the site rebuilds automatically in ~1–2 minutes

> **Draft vs published:** Saved posts are private drafts until you click Publish. The Preview button lets you see a draft without publishing it.

---

## Production deployment

The production stack (`docker-compose.yml`) runs everything: Postgres, Strapi, the rebuild hook, Caddy (static site), and the preview service. It has its **own database** — content from the dev stack doesn't carry over.

### 1. Create `.env`

```bash
cp .env.example .env
```

Then open `.env` and fill in each value. To generate all secrets at once:

```bash
make gen-secrets   # prints a ready-to-paste block of new secrets
```

Key values to set:

| Variable              | What it is                                                | How to generate                          |
| --------------------- | --------------------------------------------------------- | ---------------------------------------- |
| `DATABASE_PASSWORD`   | Postgres password                                         | `openssl rand -base64 16`                |
| `APP_KEYS`            | 4 comma-separated keys                                    | run `openssl rand -base64 16` four times |
| `API_TOKEN_SALT`      | Strapi token salt                                         | `openssl rand -base64 16`                |
| `ADMIN_JWT_SECRET`    | Admin session signing                                     | `openssl rand -base64 16`                |
| `TRANSFER_TOKEN_SALT` | Data transfer signing                                     | `openssl rand -base64 16`                |
| `ENCRYPTION_KEY`      | Field encryption                                          | `openssl rand -base64 16`                |
| `JWT_SECRET`          | User JWT signing                                          | `openssl rand -base64 16`                |
| `WEBHOOK_SECRET`      | Rebuild webhook auth                                      | `openssl rand -base64 16`                |
| `PREVIEW_SECRET`      | Preview URL auth                                          | `openssl rand -base64 16`                |
| `PREVIEW_URL`         | How your browser reaches the preview service              | e.g. `http://your-host:4323`             |
| `SITE_PUBLIC_URL`     | Your live site's URL                                      | e.g. `https://spudandbunch.com`          |
| `SITE_ADDRESS`        | Caddy bind address                                        | `:80` for HTTP, or your domain for HTTPS |
| `PREVIEW_TOKEN`       | Leave as placeholder for now — you'll fill this in step 4 | —                                        |

### 2. Bring up the stack

```bash
make up
```

First run pulls images and compiles Strapi — allow a few minutes.

### 3. Create the admin user

```bash
make admin-create EMAIL=you@example.com PASS='YourPass123!' NAME=You
```

### 4. Create the preview API token

In the Strapi admin → **Settings → API Tokens → Create new API Token**:

- Token type: **Full access**
- Duration: **Unlimited**

Copy the token, add it to `.env` as `PREVIEW_TOKEN=…`, then apply:

```bash
make up   # recreates the preview service with the real token
```

### Where everything runs

| Service             | Default URL                         | Visibility                        |
| ------------------- | ----------------------------------- | --------------------------------- |
| **Public site**     | `http://localhost` (or your domain) | Public-facing                     |
| **Strapi admin**    | `http://localhost:1337/admin`       | Authors only                      |
| **Preview service** | `http://localhost:4323`             | Authors only (via Preview button) |

Only the public site should face the internet. Put the admin and preview behind a VPN, firewall, or a separate subdomain.

### HTTPS and custom domains

Set `SITE_ADDRESS` to your bare domain (e.g. `spudandbunch.com`) and Caddy will obtain and renew a TLS certificate automatically via Let's Encrypt. Make sure port 443 is open and DNS points to your host.

---

## Quick-reference commands

Run `make` (no args) to see all targets with descriptions.

### Dev stack

```bash
make dev-up       # start
make dev-down     # stop (keep data)
make dev-reset    # stop + wipe all data
make dev-logs     # stream Strapi logs
```

### Production stack

```bash
make up           # start / apply code changes
make down         # stop (keep data)
make reset        # stop + wipe all data
make logs         # watch rebuild-hook (see build progress)
make logs-strapi  # watch Strapi
make status       # print rebuild health (last build time, any errors)
make rebuild      # manually trigger a site rebuild
```

### Frontend development

```bash
make install      # install deps (first time, or after pulling)
make dev          # Astro dev server → http://localhost:4321
make build        # static build → apps/web/dist (requires Strapi running)
make test         # Vitest unit tests
make lint         # ESLint
make format       # Prettier (writes files)
```

### Admin accounts

```bash
make admin-list                                                   # prod
make admin-create EMAIL=you@example.com PASS='Pass123!' NAME=You  # prod
make admin-reset-password EMAIL=you@example.com PASS='New123!'    # prod

make dev-admin-list                                               # dev
make dev-admin-create EMAIL=you@example.com PASS='Pass123!'       # dev
make dev-admin-reset-password EMAIL=you@example.com PASS='New1!'  # dev
```

For day-to-day writing, create an **Editor** account rather than sharing the Super Admin.

---

## Troubleshooting

**Strapi admin won't load after `up`**
Give it 1–2 minutes on first run — it's compiling the admin panel. Watch with `logs -f strapi` until you see `[Server] Listening on: http://0.0.0.0:1337`.

**Site didn't rebuild after publishing**
Check the rebuild-hook logs: `docker compose logs -f rebuild-hook`. Look for `[rebuild] FAILED:`. A common cause is Strapi being briefly unavailable — click Publish again to re-trigger. The rebuild hook also builds once on startup, so if the site is empty, wait for that initial build to finish.

**Preview button shows an error**
Make sure `PREVIEW_TOKEN` is set in `.env` (not the placeholder) and you ran `docker compose up -d` after adding it. The token must be a Full Access token with Unlimited duration from Strapi → Settings → API Tokens.

**`astro build` fails with "Strapi request failed"**
Strapi isn't reachable from inside the rebuild-hook container. Check `docker compose ps` — Strapi should show `healthy`. If it's starting up, the rebuild-hook will retry on the next publish.

**"Forgot password?" email never arrives**
The dev stack has no SMTP configured. Use `make dev-admin-reset-password EMAIL=you@example.com PASS='New123!'` instead.

**Need to start completely fresh**

```bash
make reset && make up   # prod
make dev-reset && make dev-up   # dev
```

This wipes the Postgres volume and all uploaded images. You'll need to recreate your admin user and re-enter all content.

---

## Repository layout

```
spudandbunch/
├── apps/
│   ├── cms/               Strapi 5 CMS — content types, config, dockerized
│   │   └── src/api/       Post, Category, Tag, Author, Recommendation, AboutPage, SiteSettings
│   ├── web/               Astro frontend
│   │   └── src/
│   │       ├── lib/       Data layer: strapi.ts, content.ts, types.ts
│   │       ├── components/
│   │       ├── layouts/
│   │       ├── pages/     index, posts/[slug], category/[slug], tag/[slug], search, about, recommendations
│   │       └── styles/    tokens.css (design system), global.css
│   ├── preview/           Astro SSR — renders draft posts for authors
│   └── rebuild-hook/      Webhook server — debounces builds, publishes on success
├── docker-compose.yml     Production stack (all services)
├── docker-compose.dev.yml Dev stack (Postgres + Strapi only)
├── .env.example           Template for production secrets
└── .github/workflows/ci.yml  CI: lint → test → build
```

> `apps/cms` is intentionally **not** part of the npm workspace — it runs self-contained inside Docker and manages its own dependencies there.

---

## Code quality

- **Husky hooks:** pre-commit runs ESLint + Prettier on staged files; pre-push runs the full test suite
- **CI** (GitHub Actions): `install → lint → test → build` on every push and PR
- **Tests:** `make test` runs 31 Vitest unit tests covering the data layer (`strapi.ts`, `content.ts`, `site.ts`)
- **`STRAPI_OPTIONAL=true`** — set this env var to let `astro build` produce an empty site when no Strapi is available (used in CI)
