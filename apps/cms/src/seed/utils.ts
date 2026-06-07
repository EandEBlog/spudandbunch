import type { Core } from '@strapi/strapi';

// Shared helpers for seeders.

/** Build a URL-safe slug from a display name. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Find a tag by its (derived) slug, or create it if it doesn't exist yet. */
export async function findOrCreateTag(strapi: Core.Strapi, name: string) {
  const slug = slugify(name);
  const found = await strapi.documents('api::tag.tag').findMany({ filters: { slug }, limit: 1 });
  return found[0] ?? (await strapi.documents('api::tag.tag').create({ data: { name, slug } }));
}
