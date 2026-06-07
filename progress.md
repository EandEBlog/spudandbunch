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

- Dev stack is UP (postgres + strapi). Admin: http://localhost:1337/admin (user `ernie@spudandbunch.local`; local dev password set via CLI — not recorded here).
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

## Session 4 — 2026-06-07

### Done

- Added root `README.md` (prereqs, running CMS, persistence, admin recovery, commands, status); redacted local dev password from this log.
- Trimmed Strapi `config/database.ts` to Postgres-only (part of Phase 2 PR follow-up).
- **Phase 3 (Astro data layer) COMPLETE** on branch `phase-3-data-layer`:
  - `apps/web/src/lib/types.ts` (domain types), `strapi.ts` (client: env base URL, fetch wrapper w/ 404→null, `mediaUrl`), `content.ts` (typed getters + raw→domain mappers).
  - Enabled public read on the Strapi API via idempotent `grantPublicRead` in the CMS bootstrap.
  - 28 Vitest tests (mocked v5 fixtures); `lib/` coverage 100% stmts/lines/funcs. Added `@vitest/coverage-v8` + `test:coverage`.
  - Live smoke test (vite-node) against real Strapi: returns 4 seeded categories, single-type 404→null handled.

### Current state

- Branch `phase-3-data-layer` (also carries README + db trim). Dev stack still up.
- All gates green: lint clean, 28 tests, coverage 100% lines on lib/.

### Next actions

- Commit Phase 3 → push → PR → merge.
- Phase 4: presentation + theme (Photo Masonry homepage, components, pages).

### Test results

- `npm test`: 28 passed (site 4, strapi 8, content 16).
- Coverage (lib/): 100% statements/lines/functions, 71% branch.

### Notes

- Confirmed Strapi 5 REST is **flat** (fields top-level, no v4 `attributes` wrapper); media populated as flat object with relative `url`.
- Single-type endpoints: `/api/about-page`, `/api/site-setting` (404 = not-created-yet → mapped to null).
- `strapi console` won't run piped stdin reliably here; for one-off CMS scripts prefer the document API another way. Login shells (`sh -lc`) drop the container PATH — use `sh -c`.

## Session 5 — 2026-06-07

### Done

- **Phase 4 (Presentation + Theme) COMPLETE** on branch `phase-4-presentation`:
  - Theme: `styles/tokens.css` (warm/spiced) + `global.css`; per-section theming hook documented.
  - Components: Nav, SearchBox, Hero, PostCard, RecipeCard, TagList, Blocks (rich-text renderer), StrapiImage.
  - Layouts: BaseLayout (nav/footer, fetches settings+categories), PostLayout.
  - Pages: index (Photo Masonry), posts/[slug], category/[slug], tag/[slug], recommendations, about, search (Phase-5 placeholder).
  - Astro `<Image>` for remote Strapi images (`remotePatterns`).
  - Build resilience: `STRAPI_OPTIONAL=true` lets the CI build tolerate an unreachable CMS; wired into ci.yml build step.
  - Dev sample seeder (`SEED_SAMPLE=1`, guarded) — seeded 3 sample posts to verify rendering.

### Current state

- Build generates 15 pages; verified recipe card on recipe post, none on travel post; masonry + category tabs render. 30 tests pass, lint clean.
- Dev stack up; 3 sample posts published (delete in admin if unwanted). Branch not yet pushed.

### Next actions

- Commit Phase 4 → push → PR → merge.
- Phase 5: Pagefind search (replace the search placeholder).

### Test results

- `npm test`: 30 passed (site 4, strapi 10, content 16).
- `npm run build`: 15 pages (Strapi up). CI-sim (Strapi down + STRAPI_OPTIONAL): 4 pages, no error.

### Notes

- curl treats `[]` in URLs as globs → bracketed populate URLs fail in curl but work via `fetch` (data layer). Use `curl -g` or the data layer to test.
- Sample-seed code lives in the CMS bootstrap, guarded by `SEED_SAMPLE` (dev only, idempotent).
