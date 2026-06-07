// Tiny seed of the (pure) data layer. In Phase 2+ this becomes the typed
// Strapi-backed content layer; for now it just proves the lib/test wiring works.

/** Default site name. Real value will come from Strapi SiteSettings (Phase 2). */
export const siteName = 'Spud & Bunch';

/** Build a URL-safe slug from an arbitrary title. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
