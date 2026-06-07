import type { Core } from '@strapi/strapi';
import { findOrCreateTag } from './utils';

// Dev-only sample content. Invoked from the bootstrap when SEED_SAMPLE=1 so the
// frontend has something to render during development. Never runs in production
// (the env var is unset there) and is skipped if any post already exists.

type Block = { type: 'paragraph'; children: { type: 'text'; text: string }[] };
const para = (text: string): Block[] => [{ type: 'paragraph', children: [{ type: 'text', text }] }];

export async function seedSamplePosts(strapi: Core.Strapi) {
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
