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

type Block = { type: 'paragraph'; children: { type: 'text'; text: string }[] };
const para = (text: string): Block[] => [{ type: 'paragraph', children: [{ type: 'text', text }] }];

async function findOrCreateTag(strapi: Core.Strapi, name: string, slug: string) {
  const found = await strapi.documents('api::tag.tag').findMany({ filters: { slug }, limit: 1 });
  return found[0] ?? (await strapi.documents('api::tag.tag').create({ data: { name, slug } }));
}

// Dev-only: seed a few published sample posts so the frontend has content to
// render. Guarded by SEED_SAMPLE=1 and skipped if any post already exists.
async function seedSamplePosts(strapi: Core.Strapi) {
  const existing = await strapi.documents('api::post.post').findMany({ limit: 1 });
  if (existing.length > 0) return;

  const cats = await strapi.documents('api::category.category').findMany({});
  const bySlug: Record<string, string> = Object.fromEntries(
    cats.map((c) => [c.slug, c.documentId]),
  );

  const seafood = await findOrCreateTag(strapi, 'seafood', 'seafood');
  const quick = await findOrCreateTag(strapi, 'quick', 'quick');
  const portugal = await findOrCreateTag(strapi, 'portugal', 'portugal');
  const technique = await findOrCreateTag(strapi, 'technique', 'technique');

  const samples = [
    {
      title: 'Seared Scallops with Brown Butter',
      slug: 'seared-scallops-with-brown-butter',
      excerpt: 'Restaurant-quality scallops in under 15 minutes.',
      category: bySlug['recipes'],
      tags: [seafood.documentId, quick.documentId],
      body: para(
        'Pat the scallops very dry, sear them hard, and finish with nutty brown butter. The whole thing comes together faster than waiting on takeaway.',
      ),
      recipeDetails: {
        prepTime: 10,
        cookTime: 8,
        servings: 2,
        ingredients: [
          { quantity: '8', item: 'large sea scallops' },
          { quantity: '2', unit: 'tbsp', item: 'butter' },
          { quantity: '1', unit: 'tbsp', item: 'olive oil' },
          { item: 'Salt & pepper' },
        ],
        steps: [
          { text: 'Pat scallops very dry and season well.' },
          { text: 'Sear in hot oil 2 minutes per side until deeply golden.' },
          { text: 'Add butter, baste for 30 seconds, and serve.' },
        ],
      },
    },
    {
      title: 'A Weekend in Lisbon',
      slug: 'a-weekend-in-lisbon',
      excerpt: 'Pastéis de nata, tiled streets, and the best grilled sardines.',
      category: bySlug['travel'],
      tags: [portugal.documentId],
      body: para(
        'Two days of hills, trams, and custard tarts. Here is how we ate our way across Lisbon without missing the views.',
      ),
    },
    {
      title: 'Knife Skills 101',
      slug: 'knife-skills-101',
      excerpt: 'The three cuts that make every recipe faster.',
      category: bySlug['cooking-tips'],
      tags: [technique.documentId],
      body: para(
        'A sharp knife and a steady claw grip will change how you cook. Master the dice, the julienne, and the chiffonade.',
      ),
    },
  ];

  for (const data of samples) {
    const created = await strapi.documents('api::post.post').create({ data });
    await strapi.documents('api::post.post').publish({ documentId: created.documentId });
    strapi.log.info(`[seed] sample post "${data.title}"`);
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
