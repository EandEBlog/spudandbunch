# Findings: Spud & Bunch

## Approved design decisions (from spec, 2026-06-06)

- **Stack:** Astro (SSG) + Strapi (self-hosted) + Postgres + Pagefind + nginx/Caddy, all in docker-compose.
- **Rendering:** SSG. Public site = static files; zero runtime dependency on CMS/DB.
- **Publish flow:** Strapi publish → webhook → `rebuild-hook` (debounce+serialize) → `astro build` → `dist` → `web`. ~1–2 min to live.
- **Core principle:** Data (`lib/`, pure) / Presentation (`components/`,`layouts/`) / Theme (`styles/tokens.css`). Pages are thin wiring.
- **Homepage:** Photo Masonry (decided). Revisitable — presentation-only change.
- **Navigation:** Unified site, category tabs. Per-section theming is a designed-for future extension, not v1.
- **Search:** Pagefind, client-side, build-time index over titles + bodies.
- **Preview:** On-demand single-page authenticated render of a draft; public stays pure static.

## Content model

- **Post:** title, slug(uid), excerpt, coverImage, body, category(1), tags(many), author, optional `recipeDetails`, publishedAt (draft/publish).
- **recipeDetails (component):** prepTime, cookTime, servings, ingredients[]{quantity,unit,item}, optional steps[].
- **Category / Tag / Author / Recommendation** collection types; **AboutPage / SiteSettings** single types.
- Launch categories: Recipes, Restaurant Reviews, Travel, Cooking Tips.

## Quality gates

- ESLint + Prettier; Husky pre-commit (staged + related tests) & pre-push (full lint + tests).
- Vitest: heavy on `lib/` + utils (~80%), key-render tests on components. No E2E/visual-regression in v1.
- GitHub Actions CI (lint·test·build) = real enforcement. **CD deferred** (no host chosen).

## Data persistence (local dev)

- Named Docker volumes for Postgres data AND Strapi media → survive stop/restart/rebuild/reboot.
- Lost only on explicit `docker compose down -v` (the "factory reset").
- MUST apply the same named volumes to the **dev** compose, not just prod.

## Open implementation-time questions

- nginx vs Caddy (Caddy = auto HTTPS).
- Ship optional recipe `steps` in v1? (default yes, falls back to body)
- Deployment host (gates CD).

## Toolchain (Phase 1)

- Node: machine default is v18.12.1 (too old for Astro 5, which needs >=18.20.8/20.3/22).
  Installed **Node 20.20.2** via nvm and set as nvm default, BUT the tool's fresh shells still
  load v18.12.1 from the user's profile. => Prefix every Node command with
  `export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"`. `.nvmrc` pins 20 for `nvm use`.
- npm 10.8.2 (with Node 20). Docker 20.10.24 present.

## npm audit (Phase 1) — accepted, dev-only

- 6 advisories (5 moderate, 1 critical), ALL in dev tooling; none reach the static production output.
- Critical: vitest UI server file-read (GHSA-5xrq-8626-4rwp) — only when running `vitest --ui` exposed; we never do.
- Moderate: esbuild/vite dev-server request vuln (build-time only); two Astro feature XSS (define:vars, server islands) — features we don't use.
- Only `npm audit fix --force` clears them, forcing astro@6 + vitest@4 (major breaking). Deferred to a deliberate dependency-upgrade task, not Phase 1.

## User context

- User: strong in C/C++ & systems design, new to web/frontend — explain web idioms, lean on architecture framing.
