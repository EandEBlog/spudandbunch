# Task Plan: Sea Salt & Spice — Implementation

## Goal
Build a dockerized Astro (SSG) + Strapi food/cooking/travel blog per the approved spec
(`docs/superpowers/specs/2026-06-06-sea-salt-and-spice-design.md`): non-technical authoring,
taggable/categorized posts, full-text search, structured recipes, single-page author preview,
and webhook-driven rebuilds — all enforced by ESLint/Prettier, Husky hooks, Vitest, and CI.

## Current Phase
Phase 1

## Source of Truth
- Spec: `docs/superpowers/specs/2026-06-06-sea-salt-and-spice-design.md`
- Core principle: strict Data (`lib/`) / Presentation (`components/`,`layouts/`) / Theme (`styles/tokens.css`) separation.
- Homepage layout: **Photo Masonry** (decided).

## Phases

### Phase 1: Repo & Tooling Skeleton
- [ ] Monorepo layout (`apps/web`, `apps/cms`, `apps/rebuild-hook`, `apps/preview`)
- [ ] Astro app scaffolded in `apps/web` with TypeScript
- [ ] ESLint (Astro + TS plugins) + Prettier (`prettier-plugin-astro`)
- [ ] Husky pre-commit (lint-staged: ESLint+Prettier+related tests) and pre-push (full lint + test suite)
- [ ] Vitest configured with one trivial passing test
- [ ] GitHub Actions CI: `install → lint → test → astro build`
- [ ] `.env.example` committed; `.env` gitignored
- **Acceptance:** `npm run lint`, `npm test`, `npm run build` all pass locally and in CI; a bad commit is blocked by the hook.
- **Status:** in_progress

### Phase 2: Strapi CMS + Postgres (Docker)
- [ ] `docker-compose.dev.yml` with `postgres` + `strapi` (both on named volumes for persistence)
- [ ] Strapi content types: Post (+ optional `recipeDetails` component with repeatable `ingredients` and optional `steps`), Category, Tag, Author, Recommendation
- [ ] Single types: AboutPage, SiteSettings
- [ ] Seed the four launch categories (Recipes, Restaurant Reviews, Travel, Cooking Tips)
- [ ] Author role with content-edit (not schema) permissions
- **Acceptance:** Create a post + upload an image in the admin UI; `docker compose down && up` and confirm both survive (volumes persist).
- **Status:** pending

### Phase 3: Astro Data Layer (`lib/`) — pure + tested
- [ ] `lib/strapi.ts` (REST client), `lib/content.ts` (getPosts/getPost/getCategories/getTags/getRecommendations/getAbout/getSettings)
- [ ] `lib/types.ts` (Post, Category, Tag, Author, Recommendation, RecipeDetails)
- [ ] Vitest units against mocked Strapi responses: parsing, missing-field handling, sort/filter
- **Acceptance:** Tests green; ~80% coverage on `lib/`; no markup/styling in `lib/`.
- **Status:** pending

### Phase 4: Presentation + Theme (Photo Masonry)
- [ ] `styles/tokens.css` (colors, fonts, spacing) structured for future per-section theming
- [ ] `BaseLayout`, `PostLayout`; components: Nav, PostCard, Hero, RecipeCard, TagList, SearchBox
- [ ] Pages: `index` (Photo Masonry), `posts/[slug]`, `category/[cat]`, `tag/[tag]`, `recommendations`, `about`
- [ ] Astro image optimization on cover/inline images
- **Acceptance:** Dev server renders real Strapi content; recipe posts show a recipe card; non-recipe posts don't; category tabs navigate.
- **Status:** pending

### Phase 5: Search (Pagefind)
- [ ] Integrate Pagefind into the build to index titles + bodies
- [ ] `search.astro` + SearchBox UI; combinable with category/tag filters
- **Acceptance:** Searching a known term returns the expected posts client-side, no server calls.
- **Status:** pending

### Phase 6: Production Stack (build + serve + rebuild)
- [ ] `astro-builder` one-shot container (build + Pagefind → shared `dist` volume)
- [ ] `rebuild-hook` Node service: receives Strapi webhook, debounces, serializes, triggers build; manual "rebuild now" endpoint
- [ ] `web` (nginx or Caddy) serving static `dist`; only public-facing service
- [ ] `docker-compose.yml` (prod) wiring all services on internal network
- [ ] Strapi webhook configured to call `rebuild-hook` on publish/update/delete
- **Acceptance:** Publish in Strapi → site updates within ~1–2 min; public site has zero runtime dependency on Strapi/Postgres.
- **Status:** pending

### Phase 7: Author Preview (single-page)
- [ ] `preview` service: authenticated single-page render of one draft straight from Strapi
- [ ] Wire Strapi "Preview" button to the preview URL
- **Acceptance:** A logged-in author sees an unpublished draft via Preview; the public site does not expose it.
- **Status:** pending

## Decisions Pending (implementation-time)
- nginx vs Caddy for `web` (Caddy = automatic HTTPS).
- Whether to ship the optional recipe `steps` field in v1 (default: yes, falls back to body).
- Deployment host (gates future CD — out of scope for v1).

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| (none yet) | | |
