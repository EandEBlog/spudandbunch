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

## User context
- User: strong in C/C++ & systems design, new to web/frontend — explain web idioms, lean on architecture framing.
