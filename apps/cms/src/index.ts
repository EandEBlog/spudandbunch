import type { Core } from '@strapi/strapi';
import { seedSamplePosts } from './seed/sample-posts';

// The four launch categories (idempotently seeded on boot). Authors can add
// more in the admin UI; these just guarantee a sensible starting taxonomy.
const LAUNCH_CATEGORIES: { name: string; slug: string; description: string }[] = [
  { name: 'Recipes', slug: 'recipes', description: 'Dishes to cook at home, step by step.' },
  {
    name: 'Restaurant Reviews',
    slug: 'restaurant-reviews',
    description: 'Places we ate and what we thought.',
  },
  { name: 'Travel', slug: 'travel', description: 'Food-led journeys and destinations.' },
  { name: 'Cooking Tips', slug: 'cooking-tips', description: 'Techniques, tools, and shortcuts.' },
];

// Read-only actions the public (unauthenticated) role may call. The Astro build
// fetches published content over these endpoints. Single types expose only `find`.
const PUBLIC_READ: Record<string, string[]> = {
  'api::post.post': ['find', 'findOne'],
  'api::category.category': ['find', 'findOne'],
  'api::tag.tag': ['find', 'findOne'],
  'api::author.author': ['find', 'findOne'],
  'api::recommendation.recommendation': ['find', 'findOne'],
  'api::about-page.about-page': ['find'],
  'api::site-setting.site-setting': ['find'],
};

async function seedCategories(strapi: Core.Strapi) {
  for (const cat of LAUNCH_CATEGORIES) {
    const existing = await strapi.documents('api::category.category').findMany({
      filters: { slug: cat.slug },
      limit: 1,
    });
    if (existing.length === 0) {
      await strapi.documents('api::category.category').create({ data: cat });
      strapi.log.info(`[seed] created category "${cat.name}"`);
    }
  }
}

// Grant the public role read access to the content the site renders. Idempotent:
// only creates permissions that don't already exist.
async function grantPublicRead(strapi: Core.Strapi) {
  const publicRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });
  if (!publicRole) return;

  for (const [uid, actions] of Object.entries(PUBLIC_READ)) {
    for (const action of actions) {
      const actionId = `${uid}.${action}`;
      const existing = await strapi.db
        .query('plugin::users-permissions.permission')
        .findOne({ where: { action: actionId, role: publicRole.id } });
      if (!existing) {
        await strapi.db
          .query('plugin::users-permissions.permission')
          .create({ data: { action: actionId, role: publicRole.id } });
        strapi.log.info(`[perms] public read enabled: ${actionId}`);
      }
    }
  }
}

export default {
  /**
   * Runs before the application is initialized.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * Runs before the application starts. Seeds launch categories and grants the
   * public role read access (both idempotent — safe on every boot). Optionally
   * seeds sample posts when SEED_SAMPLE=1 (dev only).
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await seedCategories(strapi);
    await grantPublicRead(strapi);
    if (process.env.SEED_SAMPLE === '1') {
      await seedSamplePosts(strapi);
    }
  },
};
