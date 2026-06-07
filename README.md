# Spud & Bunch

A dockerized food, cooking & travel blog. Static, fast, and image-first, with a
friendly CMS so non-technical authors can write, preview, and publish without
touching code.

**Stack:** [Astro](https://astro.build) (static site) · [Strapi 5](https://strapi.io)
(headless CMS) · PostgreSQL · [Pagefind](https://pagefind.app) (search) · Docker Compose.

See the full design in [`docs/superpowers/specs/2026-06-06-spud-and-bunch-design.md`](docs/superpowers/specs/2026-06-06-spud-and-bunch-design.md).

---

## Prerequisites

- **Node 20** (the repo pins it via `.nvmrc`). With [nvm](https://github.com/nvm-sh/nvm): `nvm use` (or `nvm install 20`).
- **Docker** + Docker Compose (Docker Desktop on macOS/Windows).

## Repository layout

```
spudandbunch/
├── apps/
│   └── cms/                 Strapi CMS (content types, config) — dockerized service
│       └── src/api/...      content-type schemas (Post, Category, Tag, Author, …)
│   └── web/                 Astro frontend (lib / components / layouts / pages / styles)
├── docker-compose.dev.yml   dev stack: Postgres + Strapi
├── docs/superpowers/specs/  design specification
├── task_plan.md             implementation plan (phases)
└── .github/workflows/ci.yml CI: lint · test · build
```

> Note: `apps/cms` (Strapi) is intentionally **not** part of the root npm
> workspace — it is a self-contained, dockerized service that manages its own
> dependencies inside its container.

---

## Running the CMS (dev)

Bring up Postgres + Strapi:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

- **Admin panel:** http://localhost:1337/admin
- First run compiles the admin panel and seeds the launch categories; give it a minute.
- Stop (keep data): `docker compose -f docker-compose.dev.yml down`
- Stop **and wipe all data** (factory reset): `docker compose -f docker-compose.dev.yml down -v`
- Logs: `docker compose -f docker-compose.dev.yml logs -f strapi`

### Data persistence

- **Content** (posts, categories, admin users) lives in Postgres, in the named
  Docker volume `pgdata`.
- **Uploaded images** live on the host at `apps/cms/public/uploads`.

Both survive `down`/`up`, container rebuilds, and reboots. They are only removed
by an explicit `docker compose ... down -v`.

---

## Admin accounts

Strapi admin accounts are stored (with **bcrypt-hashed** passwords) in the
Postgres `admin_users` table — never in any file. Manage them with the CLI while
the stack is running.

**List admin users:**

```bash
docker compose -f docker-compose.dev.yml exec strapi strapi admin:list-users
```

**Reset a forgotten password** (the web "Forgot password?" link needs SMTP, which
dev doesn't configure — use this instead):

```bash
docker compose -f docker-compose.dev.yml exec strapi \
  strapi admin:reset-user-password --email=you@example.com --password='NewPass123!'
```

**Create a new admin** (e.g. if fully locked out, or to add an author):

```bash
docker compose -f docker-compose.dev.yml exec strapi \
  strapi admin:create-user --email=you@example.com --password='NewPass123!' --firstname=You
```

Passwords must be ≥8 characters with upper, lower, and a number. For day-to-day
writing, create an **Author** or **Editor** account (content access, no schema/
settings access) rather than sharing the Super Admin.

---

## Frontend (web) commands

Run from the repo root (uses Node 20):

```bash
npm install        # install web + tooling deps
npm run dev        # Astro dev server
npm run build      # static build → apps/web/dist
npm run lint       # ESLint
npm test           # Vitest
npm run format     # Prettier (write)
```

---

## Quality gates & workflow

- **Husky hooks:** pre-commit runs ESLint + Prettier + related tests on staged
  files; pre-push runs the full lint + test suite.
- **CI** (GitHub Actions) runs `install → lint → test → build` on every push/PR.
- **Branching:** one branch + PR per implementation phase; merge to `main` on GitHub.

---

## Project status

Built in phases (see [`task_plan.md`](task_plan.md)):

- ✅ Phase 1 — repo & tooling skeleton
- ✅ Phase 2 — Strapi CMS + Postgres (dockerized)
- 🚧 Phase 3 — Astro data layer
- ⬜ Phase 4 — presentation + theme (Photo Masonry)
- ⬜ Phase 5 — Pagefind search
- ⬜ Phase 6 — production stack (build + serve + webhook rebuilds)
- ⬜ Phase 7 — author preview
