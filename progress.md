# Progress Log: Spud & Bunch

## Session 1 — 2026-06-06

### Done

- Completed brainstorming/design phase; spec written, reviewed, approved, committed:
  `docs/superpowers/specs/2026-06-06-spud-and-bunch-design.md`.
- Homepage layout decided: **Photo Masonry**.
- Installed `planning-with-files` skill; created `task_plan.md`, `findings.md`, `progress.md`.

### Current state

- Repo initialized (git, `main`). Only `docs/` + planning files committed so far.
- No application code yet. Phase 1 (repo & tooling skeleton) is next.

### Next actions

- Await user go-ahead to begin Phase 1 implementation (HARD-GATE: plan approved, not yet coding).
- Phase 1: scaffold monorepo, Astro app, ESLint/Prettier, Husky, Vitest, CI.

### Test results

- (none yet — no code)

### Notes

- Implementation-time decisions still open: nginx vs Caddy, recipe `steps` in v1, deploy host.

## Session 2 — 2026-06-06

### Done

- Renamed project Sea Salt & Spice -> **Spud & Bunch** (folders, files, references, memory).
- **Phase 1 COMPLETE** on branch `phase-1-tooling-skeleton`:
  - npm-workspaces monorepo; `apps/web` Astro app (TS strict, SSG).
  - ESLint 9 flat config + Prettier; Husky pre-commit (lint-staged) + pre-push (full gate), hooks pin Node 20.
  - Vitest + seed `lib/site.ts` (slugify, siteName) with 4 tests.
  - GitHub Actions CI (install/lint/test/build via `.nvmrc`).
  - `.env.example`, `.nvmrc` (20), `.gitignore` updated; untracked `.claude/settings.local.json`.
- Installed Node 20.20.2 via nvm (machine default 18.12.1 too old for Astro 5).

### Current state

- All Phase 1 gates pass: lint clean, 4/4 tests, build emits `/index.html`, bad commit blocked by hook (verified).
- Branch `phase-1-tooling-skeleton`, not yet merged to `main`. No remote configured.

### Next actions

- Commit Phase 1. Then await go-ahead for Phase 2 (Strapi + Postgres in Docker).

### Test results

- `npm test`: 4 passed (apps/web/src/lib/site.test.ts).
- `npm run build`: 1 page built (/index.html).

### Notes

- Node commands need PATH prefix: `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"` (fresh shells default to v18).
- npm audit: 6 dev-only advisories (1 critical vitest-UI), accepted/deferred — see findings.md.

## Session 3 — 2026-06-07

### Done

- **Phase 2 (Strapi + Postgres) functionally COMPLETE** on branch `phase-2-cms`:
  - Scaffolded Strapi 5.47.1 in `apps/cms` (TS, `--no-install`; deps install in the Docker image).
  - Content model authored as schema-as-code: Post (+ `recipe.recipe-details` component w/ `recipe.ingredient` + `recipe.step`), Category, Tag, Author, Recommendation; single types AboutPage, SiteSettings.
  - `docker-compose.dev.yml`: postgres (named volume `pgdata`) + strapi (Dockerfile.dev), uploads via host bind mount.
  - Category seed in `src/index.ts` bootstrap (idempotent). First admin created via CLI.
- **Verified:** stack boots; 10 tables created; 4 categories seeded; `down`+`up` preserves DB (categories, admin user) and uploads (sentinel). Admin UI 200 at /admin; public API 403 by default (correct).

### Current state

- Dev stack is UP (postgres + strapi). Admin: http://localhost:1337/admin (ernie@spudandbunch.local / Spudbunch123!).
- Branch `phase-2-cms`, not yet committed/pushed.

### Next actions

- Commit Phase 2 → push branch → open PR (per-phase flow) → user merges.
- USER hands-on acceptance: log into admin, create a post + upload an image (validates author UX).
- Phase 3 first task: enable public read (or API token) so the Astro build can fetch content.

### Test results

- 10 content-type/component tables present in Postgres.
- Persistence: categories=4 and admin user survive down/up; uploaded file survives.

### Notes

- Fixed boot error: Strapi requires singularName ≠ pluralName → renamed `site-settings` API to singular `site-setting` (plural `site-settings`).
- Strapi schema/folder convention: UID `api::<dir>.<singularName>`.
