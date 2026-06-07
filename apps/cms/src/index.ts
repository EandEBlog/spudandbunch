import type { Core } from '@strapi/strapi';

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

export default {
  /**
   * Runs before the application is initialized.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * Runs before the application starts. We use it to seed the launch
   * categories if they don't already exist (safe to run on every boot).
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
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
  },
};
