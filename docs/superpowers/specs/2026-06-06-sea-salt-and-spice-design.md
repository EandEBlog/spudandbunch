# Sea Salt & Spice — Design Specification

**Date:** 2026-06-06
**Status:** Approved design (pending final user review)
**Working name:** "Sea Salt & Spice" (subject to change — site title/tagline are editable content, not hardcoded)

## 1. Overview

A food, cooking, and travel blog. The public site is fast, image-heavy, and
optimized for reading and beautiful photography. Content is authored by
non-technical people through a friendly CMS dashboard. Every post is taggable,
sorted into curated categories, and full-text searchable.

The entire system is self-hosted and runs as a single `docker-compose` stack.

### Goals
- A polished, fast, SEO-friendly public blog.
- A non-technical author can write, preview, and publish posts without touching code.
- All content taggable (freeform) and categorized (curated), with full-text search.
- Self-contained, fully dockerized stack the owner controls (no SaaS lock-in).
- Best-practice engineering: linting, formatting, unit tests, enforced quality gates.

### Non-goals (v1 — explicit YAGNI)
- User accounts / comments on the public site.
- End-to-end browser tests and visual-regression testing.
- Automated deployment (CD) — deferred until a hosting target is chosen.
- True per-category sub-sites / subdomains (we ship one unified site).
- Recipe schema.org structured data / Google rich results (v2 nicety).

## 2. Core Architectural Principle: Data / Presentation / Theme Separation

This is a **non-negotiable design principle** that governs the frontend and
makes the visual design cheaply swappable.

Three layers, deliberately decoupled:

- **Data layer (`apps/web/src/lib/`)** — fetches from Strapi and returns typed,
  plain domain objects (`Post`, `Category`, `Tag`, `Author`, `Recommendation`).
  Contains **no markup and no styling**. Knows nothing about how things look.
- **Presentation layer (`components/`, `layouts/`)** — consumes typed data and
  renders markup. Knows nothing about Strapi.
- **Theme layer (`styles/tokens.css`)** — colors, fonts, spacing as CSS custom
  properties. Components reference tokens, never hardcoded values.

**Routing (`pages/`)** is a thin wire: it calls the data layer and hands results
to presentation components.

### Why this matters (cost of changing the design)

| Change | What you touch | Effort |
|---|---|---|
| **Reskin** (colors/fonts/spacing) | `styles/tokens.css` only | Minutes |
| **Relayout** (new homepage / card style) | `components/` + `layouts/` | Hours — data & schema untouched |
| **Total redesign** | replace `components/` + `layouts/` + `styles/` | Days — `lib/` + Strapi schema stay as-is |

The homepage layout decision is deliberately deferred (see §9). Because of this
seam, that deferral costs nothing later — content, schema, search, and the data
layer are all independent of the chosen look.

**Designed-for extension — per-section theming:** v1 ships one shared theme and
layout across all categories. The theme layer must be structured so a
`section → theme` lookup can later give each category its own accent/feel
(e.g., Travel airy/blue, Recipes warm/spiced) **without** touching content,
schema, search, or the data layer. Data stays uniform across categories; only
presentation may diverge in future.

## 3. System Architecture

One `docker-compose` stack. The public site is **Static Site Generation (SSG)**:
every page is pre-rendered to static HTML at build time. The live public site is
just static files served by a small web server — **zero runtime dependency on
the CMS or database.** Fast, cheap, robust; the public site stays up even if
Strapi/Postgres are down for maintenance.

### Services

| Service | Role | Public-facing? |
|---|---|---|
| `postgres` | Content database (Docker volume for persistence) | Internal only |
| `strapi` | Headless CMS: admin dashboard, content API, media library | Admin behind auth |
| `rebuild-hook` | Webhook listener; triggers production builds | Internal only |
| `astro-builder` | Runs `astro build` (one-shot; invoked by hook). Not a server. | No |
| `preview` | Authenticated single-page draft preview render service | Internal/auth only |
| `web` (nginx or Caddy) | Serves static `dist` to the public | **Public** |

Only `web` and the Strapi admin login face the world. Postgres, the build
machinery, and the preview service stay on the internal Docker network.

### Production publish flow (published content → public site)

```
Author clicks Publish in Strapi
  └─▶ Strapi fires webhook
       └─▶ rebuild-hook (debounce + serialize)
            └─▶ astro-builder runs `astro build`
                 ├─ fetches all PUBLISHED content from Strapi
                 ├─ runs Pagefind to build the search index
                 └─ writes static HTML/CSS/JS to the shared `dist` volume
                      └─▶ web serves the fresh files  (live in ~1–2 min)
```

The public site keeps serving the previous static files throughout the rebuild.

### rebuild-hook (the one custom service)

A small (~30-line) Node webhook listener. Strapi cannot run `astro build`
itself, so this service bridges the gap. Responsibilities:
- Listen for Strapi's webhook on publish / update / delete.
- **Debounce**: wait a few seconds and coalesce rapid edits into a single build.
- **Serialize**: never run two builds concurrently.
- Invoke the builder, which writes fresh static files (incl. Pagefind index) to `dist`.
- Expose a manual "rebuild now" endpoint to force a build on demand.

## 4. Frontend (Astro) — Structure & Pages

Framework: **Astro** (content-focused, zero-JS-by-default, first-class image
optimization and Markdown/MDX, integrates cleanly with any headless CMS).

```
apps/web/src/
├── lib/                    DATA LAYER (pure — no markup)
│   ├── strapi.ts             low-level Strapi REST client
│   ├── content.ts            getPosts, getPost(slug), getCategories, getTags, getRecommendations
│   └── types.ts              Post, Category, Tag, Author, Recommendation, RecipeDetails types
├── components/             PRESENTATION
│   ├── PostCard.astro
│   ├── Hero.astro
│   ├── Nav.astro
│   ├── SearchBox.astro       (Pagefind UI)
│   ├── RecipeCard.astro      (renders Post.recipeDetails when present)
│   └── TagList.astro
├── layouts/                PRESENTATION
│   ├── BaseLayout.astro      <head>, header, footer shell
│   └── PostLayout.astro      single-article template
├── pages/                  ROUTING (thin)
│   ├── index.astro           homepage
│   ├── posts/[slug].astro    one post (generated per published post)
│   ├── category/[cat].astro  category index
│   ├── tag/[tag].astro       tag index
│   ├── search.astro          search results
│   ├── recommendations.astro recommendations list
│   └── about.astro           bio / about page
└── styles/
    └── tokens.css            THEME — colors, fonts, spacing variables
```

### Public pages (v1)

1. **Homepage** (`/`) — featured + recent posts. Layout TBD (see §9).
2. **Post page** (`/posts/<slug>`) — article: title, hero image, body, author,
   category, tags; renders a structured recipe card when `recipeDetails` present.
3. **Category page** (`/category/<cat>`) — all posts in a category.
4. **Tag page** (`/tag/<tag>`) — all posts with a tag.
5. **Search** (`/search`) — Pagefind full-text search across titles and bodies,
   combinable with category/tag filters.
6. **Recommendations** (`/recommendations`) — CMS-managed structured list.
7. **About / Bio** (`/about`) — editable single-type content.

### Navigation / information architecture

**Unified site with category tabs** (chosen). Top nav has a tab per category
(`Recipes · Restaurant Reviews · Travel · Cooking Tips`), each linking to that
category's page within the same site. One header, one brand, one footer, one
shared search index across all content. (Per-section theming is a future
extension per §2 — not built in v1.)

### Page generation

Astro's `getStaticPaths()` asks the data layer which posts/categories/tags exist
at build time and emits one static HTML file per item. Adding content in Strapi
+ a rebuild produces new pages automatically — **no routing code changes ever
needed for new content.**

### Images

Uploaded in Strapi, fetched at build, processed by Astro's image optimization
(resized, modern formats, lazy-loaded). Critical for a photo-heavy blog on
mobile.

## 5. Content Model (Strapi Schema)

Headless CMS: **Strapi** (self-hosted, open-source). Provides the admin
dashboard, draft/publish states, media library with upload, and role-based
access so an author account can edit content but not alter schema.

### Collection types (many entries)

**`Post`** — core blog entry:

| Field | Type | Notes |
|---|---|---|
| `title` | text | required |
| `slug` | uid (from title) | URL, e.g. `seared-scallops` |
| `excerpt` | text | summary for cards & search |
| `coverImage` | media | hero photo |
| `body` | rich text / blocks | article, with inline images |
| `category` | relation → Category | one per post |
| `tags` | relation → Tag (many) | freeform-ish, author adds |
| `author` | relation → Author | who wrote it |
| `recipeDetails` | component (optional) | present ⇒ post renders a recipe card |
| `publishedAt` | datetime | Strapi built-in draft/publish |

**`recipeDetails`** (optional component on Post):

| Field | Type | Notes |
|---|---|---|
| `prepTime` | integer (minutes) | |
| `cookTime` | integer (minutes) | |
| `servings` | integer | |
| `ingredients` | repeatable sub-component | rows of `{ quantity, unit, item }` |
| `steps` | repeatable text (optional) | method steps; otherwise steps live in `body` |

Modeling note: recipe fields are an **optional component on `Post`**, not a
separate type. A post with `recipeDetails` renders a structured recipe card; a
post without it is a normal article. This keeps one unified Post type so search,
categories, tags, and listings all work uniformly.

**`Category`** — `name`, `slug`, optional `description`.
Launch set: **Recipes, Restaurant Reviews, Travel, Cooking Tips** (editable/extensible in Strapi).

**`Tag`** — `name`, `slug`. Freeform keywords (e.g. `vegan`, `italy`, `30-minutes`, `seafood`).

**`Author`** — `name`, `bio`, `avatar`. Supports multiple authors.

**`Recommendation`** — `name`, `photo`, `blurb`, `link` (URL),
`type` (enum: *Tool / Restaurant / Place / Book*), `order` (for manual sorting).

### Single types (exactly one entry)

- **`AboutPage`** — `bio` (rich text), `portrait` (image), `tagline`.
- **`SiteSettings`** — site title, tagline, social links, footer text.
  (Site name/tagline are editable content, not hardcoded — the name may change.)

## 6. Search & Taxonomy

- **Categories** — curated, structured set chosen from a dropdown. Drive the main
  nav and section pages (`/category/<cat>`). One per post.
- **Tags** — freeform keywords the author types. Many per post. Drive tag pages
  (`/tag/<tag>`) and fine-grained filtering.
- **Full-text search** — **Pagefind**, a static-site search tool. Builds a search
  index at build time over titles and post bodies; runs entirely **client-side**
  (no server, no runtime dependency). Search is combinable with category/tag filters.

## 7. Author Preview (single-page, on-demand)

A non-technical author can see exactly how a post will look **before** publishing.

- Distinct from the production build, which includes only **published** content.
- The **`preview`** service is a small authenticated render endpoint that
  live-renders **just the one draft post** straight from Strapi when the author
  clicks "Preview" in the admin UI.
- Instant — no full rebuild. Uses the same post template as production.
- Preview-only, on the internal network, behind login. The **public site stays
  100% pure static** and is unaffected.

| | Production build | Preview |
|---|---|---|
| Includes drafts? | No | Yes |
| Audience | Public | Logged-in author only |
| Trigger | Publish webhook | "Preview" button in Strapi |
| Mechanism | Full SSG rebuild | On-demand single-page render |

## 8. Tooling, Quality Gates & Testing

### Linting & formatting
- **ESLint** with Astro + TypeScript plugins (catches bugs).
- **Prettier** with `prettier-plugin-astro` (handles formatting/style).

### Git hooks (Husky + lint-staged)
- **pre-commit** — ESLint + Prettier on *staged files only* (fast), plus related
  unit tests. Bad code can't be committed.
- **pre-push** — full ESLint pass + the complete test suite. Nothing broken
  reaches GitHub.

### CI (GitHub Actions) — in scope for v1
The real enforcement layer (local hooks can be bypassed with `--no-verify`; CI
cannot). On every push/PR: `install → lint → test → astro build` must all pass.

### CD (automated deployment) — explicitly deferred
Not built in v1, for two reasons: (1) no deployment target chosen yet, and
(2) the frequent action ("new post goes live") is already handled by the Strapi
webhook → rebuild path; code changes are rare on a blog.
- **v1 deployment:** documented manual step — `docker compose up -d --build` on
  the server.
- **v2 (once a host is chosen):** add a CD job that builds/pushes images and
  deploys on merge to `main`. The CI workflow is structured to extend into this.

### Unit testing (Vitest)
- **Data layer (`lib/`)** — highest value: mock Strapi responses; assert
  `getPosts`/`getPost`/etc. parse and shape data correctly, handle missing
  fields, and sort/filter properly. Pure functions, thoroughly testable.
- **Components** — render `PostCard`, `Hero`, `RecipeCard`, etc. with sample
  data (Astro container API / testing-library); assert correct output.
- **Utilities** — slug building, date formatting, excerpt truncation.
- **Coverage target** — ~80% on `lib/` and utilities; components tested for key
  rendering, not pixel-chasing.

### Deliberately out of scope (v1)
No end-to-end browser tests, no visual-regression testing — high maintenance for
a small blog; revisit only if the site grows complex.

## 9. Open / Deferred Decisions

- **Homepage layout** — deferred for review with the site owner's wife. Three
  candidate directions captured during design:
  - **A · Hero + Grid** — featured post on top, grid of recent posts (magazine).
  - **B · Editorial Minimal** — calm centered column, large type, big stacked photos.
  - **C · Photo Masonry** — Pinterest-style image-first grid.
  Mockups saved under `.superpowers/brainstorm/`. This decision does not block
  implementation of the data model, CMS, tooling, or non-homepage pages, and—per
  §2—can be made/changed later without touching content, schema, or data layer.
- **Optional recipe `steps` field** — include a structured repeatable `steps`
  list, or keep method in the post `body`? Default: optional `steps`, falls back
  to `body`.
- **Deployment target / host** — undecided; gates the future CD work (§8).
- **Web server choice** — nginx vs Caddy for the `web` service (Caddy gives
  automatic HTTPS; either is fine). Decide at implementation time.

## 10. Repository Layout

Monorepo:

```
seasaltandspice/
├── apps/
│   ├── web/            Astro frontend (lib, components, layouts, pages, styles)
│   ├── cms/            Strapi project (schema, config)
│   ├── rebuild-hook/   webhook listener → triggers production builds
│   └── preview/        authenticated single-page draft preview service
├── docker-compose.yml          production stack
├── docker-compose.dev.yml      dev (hot-reload Strapi + Astro dev server)
├── .github/workflows/ci.yml    lint · test · build
├── .husky/                     pre-commit · pre-push
├── .env.example                committed; real .env is gitignored
└── docs/superpowers/specs/     this design doc
```

### Run modes
- **Dev:** `docker compose -f docker-compose.dev.yml up` — Strapi with hot-reload
  + Astro dev server (live, no static build) for fast iteration.
- **Prod:** `docker compose up -d --build` — full SSG stack with webhook rebuilds.

### Config & secrets
A `.env` file holds DB password, Strapi keys, and the webhook secret.
`.env.example` is committed; the real `.env` is gitignored.

## 11. Technology Summary

| Concern | Choice |
|---|---|
| Frontend framework | Astro (SSG) |
| CMS | Strapi (self-hosted) |
| Database | Postgres |
| Search | Pagefind (client-side, build-time index) |
| Public serving | nginx or Caddy (static files) |
| Rebuild trigger | Custom Node webhook listener (debounced, serialized) |
| Author preview | On-demand single-page authenticated render service |
| Linting / formatting | ESLint + Prettier |
| Git hooks | Husky + lint-staged (pre-commit, pre-push) |
| Unit tests | Vitest |
| CI | GitHub Actions (lint · test · build) |
| CD | Deferred to v2 |
| Orchestration | Docker Compose |
```
