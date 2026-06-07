import type { Core } from '@strapi/strapi';

// Shared helpers for seeders.

/** Find a tag by slug, or create it if it doesn't exist yet. */
export async function findOrCreateTag(strapi: Core.Strapi, name: string, slug: string) {
  const found = await strapi.documents('api::tag.tag').findMany({ filters: { slug }, limit: 1 });
  return found[0] ?? (await strapi.documents('api::tag.tag').create({ data: { name, slug } }));
}
