# Task Plan: Spud & Bunch — Implementation

## Goal

Build a dockerized Astro (SSG) + Strapi food/cooking/travel blog per the approved spec
(`docs/superpowers/specs/2026-06-06-spud-and-bunch-design.md`): non-technical authoring,
taggable/categorized posts, full-text search, structured recipes, single-page author preview,
and webhook-driven rebuilds — all enforced by ESLint/Prettier, Husky hooks, Vitest, and CI.

## Current Phase

Phase 7

## Source of Truth

- Spec: `docs/superpowers/specs/2026-06-06-spud-and-bunch-design.md`
- Core principle: strict Data (`lib/`) / Presentation (`components/`,`layouts/`) / Theme (`styles/tokens.css`) separation.
- Homepage layout: **Photo Masonry** (decided).

## Phases

### Phase 1: Repo & Tooling Skeleton

- [x] Monorepo layout — npm workspaces (`apps/*`); `apps/web` created now, sibling apps (`cms`/`rebuild-hook`/`preview`) added in their phases
- [x] Astro app scaffolded in `apps/web` with TypeScript (strict), SSG output
- [x] ESLint 9 flat config (Astro + typescript-eslint) + Prettier (`prettier-plugin-astro`) + eslint-config-prettier
- [x] Husky pre-commit (lint-staged: ESLint+Prettier+related tests) and pre-push (full lint + test suite); hooks force Node 20 via nvm
- [x] Vitest configured; 4 passing tests in `apps/web/src/lib/site.test.ts`
- [x] GitHub Actions CI: `install → lint → test → astro build` (Node from `.nvmrc`)
- [x] `.env.example` committed; `.env`/`.env.*` gitignored
- **Acceptance:** ✅ `npm run lint` clean, `npm test` 4/4 pass, `npm run build` emits `/index.html`; bad commit BLOCKED by pre-commit hook (verified).
- **Status:** complete
- **Notes:** Node 20.20.2 installed via nvm (machine default 18.12.1 too old). npm audit: 6 dev-only advisories accepted/deferred — see findings.md.

### Phase 2: Strapi CMS + Postgres (Docker)

- [x] `docker-compose.dev.yml` with `postgres` (named volume `pgdata`) + `strapi` (Dockerfile.dev); uploads persist via host bind mount
- [x] Strapi content types: Post (+ optional `recipeDetails` component w/ repeatable `ingredients` + optional `steps`), Category, Tag, Author, Recommendation
- [x] Single types: AboutPage, SiteSettings (note: site-settings singular renamed to `site-setting` — Strapi requires singular≠plural)
- [x] Seed the four launch categories via `src/index.ts` bootstrap (idempotent)
- [x] Author role — satisfied by Strapi's built-in admin roles (Editor/Author = content-edit, no schema/config). First admin `ernie@spudandbunch.local` created (Super Admin)
- **Acceptance:** ✅ Stack boots; all 10 tables created; seed ran (4 categories); `down`+`up` preserves categories, admin user, and uploaded file (named volume + bind mount). Admin UI live at http://localhost:1337/admin. Hands-on UI post+image creation is the user's final UX check.
- **Status:** complete
- **Notes:** Public REST API returns 403 by default (correct). Enabling public read / API token for the Astro build is the first task of Phase 3. Body uses Strapi `blocks` editor.

### Phase 3: Astro Data Layer (`lib/`) — pure + tested

- [x] `lib/strapi.ts` (REST client: base URL from env, fetch wrapper w/ 404→null, mediaUrl) + `lib/content.ts` (getPosts/getPost/getPostsByCategory/getPostsByTag/getCategories/getTags/getRecommendations/getAboutPage/getSiteSettings)
- [x] `lib/types.ts` (Post, Category, Tag, Author, Recommendation, RecipeDetails, Ingredient, RecipeStep, ImageAsset, AboutPage, SiteSettings)
- [x] Vitest units against mocked Strapi v5 responses: parsing, media absolutization, missing-field handling, sort/filter, single-type 404→null (28 tests)
- [x] Enabled public read on the API via idempotent bootstrap (`grantPublicRead`)
- **Acceptance:** ✅ 28 tests pass; `lib/` coverage 100% stmts/lines/funcs (branch 71%); pure TS (no markup); live smoke test against real Strapi returns the 4 seeded categories + handles 404→null.
- **Status:** complete
- **Notes:** Confirmed Strapi 5 flat REST shape (no `attributes` wrapper). Added `@vitest/coverage-v8` + `test:coverage` script.

### Phase 4: Presentation + Theme (Photo Masonry)

- [x] `styles/tokens.css` (warm/spiced palette, fonts, spacing) + `global.css`; structured for future per-section theming
- [x] `BaseLayout`, `PostLayout`; components: Nav, PostCard, Hero, RecipeCard, TagList, SearchBox, Blocks (rich-text), StrapiImage
- [x] Pages: `index` (Photo Masonry), `posts/[slug]`, `category/[slug]`, `tag/[slug]`, `recommendations`, `about`, `search` (placeholder for Phase 5)
- [x] Astro image optimization via `<Image>` (remotePatterns for Strapi host) + lazy loading
- **Acceptance:** ✅ Build generated 15 pages from seeded content; homepage masonry shows all posts + category tabs; recipe post renders the RecipeCard (Ingredients/Method/Serves), travel post has zero recipe markers; category/tag pages list their posts. 30 tests pass.
- **Status:** complete
- **Notes:** Build fetches Strapi at build time → added `STRAPI_OPTIONAL=true` (CI build) so an unreachable CMS yields an empty-but-valid site; prod builds leave it unset (fail loud). Added a guarded dev sample seeder (`SEED_SAMPLE=1`).

### Phase 5: Search (Pagefind)

- [x] Integrate Pagefind into the build (`astro build && pagefind --site dist`); post pages marked `data-pagefind-body` so titles + bodies are indexed
- [x] `search.astro` (Pagefind UI, reads `?q=`) + header SearchBox; Category/Tag exposed as `data-pagefind-filter` facets
- **Acceptance:** ✅ Pagefind indexed 3 post pages / 101 words / 2 filters; index contains title + body terms (scallops, Lisbon, julienne); preview serves search page + pagefind assets (200); search runs client-side (static WASM + index, no server).
- **Status:** complete
- **Notes:** Search only works on the built/preview site, not `astro dev` (index is build-time). Using Pagefind Default UI.

### Phase 6: Production Stack (build + serve + rebuild)

- [x] Builder consolidated into `rebuild-hook` (runs `astro build && pagefind`) — avoids a docker-socket-controlled one-shot container; publishes to the shared `site` volume only on success (failed build keeps the previous site)
- [x] `rebuild-hook` Node service (dependency-free): webhook + manual `/rebuild` + `/health`; debounces and serializes builds; `X-Webhook-Secret` auth
- [x] `web` = **Caddy** (decided) serving the static `site` volume; only public service; auto-HTTPS via `SITE_ADDRESS` domain; 404 fallback
- [x] `docker-compose.yml` (prod): postgres + strapi (prod Dockerfile) + rebuild-hook + web, named volumes, healthchecks; secrets from gitignored root `.env`
- [x] Strapi webhook registered reproducibly in bootstrap (`seedRebuildWebhook`, when `REBUILD_WEBHOOK_URL` set); manual fallback documented
- **Acceptance:** ✅ Verified — rebuild-hook builds + publishes in ~3s; Caddy serves homepage/posts/pagefind/404; manual `/rebuild` 202 (wrong secret 401); **with Strapi + Postgres stopped the site still serves 200 with content** (zero runtime dependency).
- **Status:** complete
- **Notes:** Verified the hook+Caddy slice against the dev Strapi's content. Prod Strapi image build + full-stack publish flow exercised separately. `web` is the only public service; Strapi admin behind its own login.

### Phase 7: Author Preview (single-page)

- [ ] `preview` service: authenticated single-page render of one draft straight from Strapi
- [ ] Wire Strapi "Preview" button to the preview URL
- **Acceptance:** A logged-in author sees an unpublished draft via Preview; the public site does not expose it.
- **Status:** pending

## Decisions Pending (implementation-time)

- ~~nginx vs Caddy for `web`~~ → **DECIDED: Caddy** (automatic HTTPS). [Phase 6]
- Whether to ship the optional recipe `steps` field in v1 → shipped (the schema includes `steps`).
- Deployment host (gates future CD — out of scope for v1).

## Errors Encountered

| Error      | Attempt | Resolution |
| ---------- | ------- | ---------- |
| (none yet) |         |            |
