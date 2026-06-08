// Low-level Strapi REST client. Pure: builds URLs, performs fetches, resolves
// media URLs. Knows nothing about our domain types or markup — content.ts maps
// the raw responses into domain objects.

/** Base URL of the Strapi API. From PUBLIC_STRAPI_URL, with a local default. */
export const STRAPI_URL: string = (
  import.meta.env.PUBLIC_STRAPI_URL ?? 'http://localhost:1337'
).replace(/\/+$/, '');

/** Strapi's list response envelope (v5 flat entries). */
export interface StrapiListResponse<T> {
  data: T[];
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

/** Strapi's single-type response envelope. */
export interface StrapiSingleResponse<T> {
  data: T | null;
  meta: Record<string, unknown>;
}

/**
 * Resolve a Strapi media path to an absolute URL. Strapi returns paths like
 * `/uploads/photo.jpg`; we prefix the API origin. Already-absolute URLs (e.g.
 * an external CDN) are returned unchanged. Empty/missing input → undefined.
 */
export function mediaUrl(path: string | undefined | null): string | undefined {
  if (!path) return undefined;
  // Re-anchor any upload URL to the current Strapi host. Strapi embeds ABSOLUTE
  // URLs in rich-text blocks (e.g. http://localhost:1337/uploads/x.jpg), which
  // break when the build/preview runs somewhere that host isn't Strapi. Media
  // fields come back relative (/uploads/x.jpg). Normalize both to STRAPI_URL.
  const uploads = path.indexOf('/uploads/');
  if (uploads !== -1) return `${STRAPI_URL}${path.slice(uploads)}`;
  if (/^https?:\/\//i.test(path)) return path; // external URL (e.g. CDN) — leave as-is
  return `${STRAPI_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

interface FetchOptions {
  /** When true, a 404 resolves to null instead of throwing (for single types). */
  allowNotFound?: boolean;
  /** Bearer token for authenticated reads (e.g. drafts in the preview service). */
  authToken?: string;
}

/**
 * When STRAPI_OPTIONAL=true, a connection failure (Strapi unreachable) resolves
 * to null instead of throwing — so `astro build` can produce an empty-but-valid
 * site in CI, where no Strapi is running. Real production builds leave this unset
 * so a down CMS fails the build loudly rather than publishing an empty site.
 */
function strapiOptional(): boolean {
  return typeof process !== 'undefined' && process.env?.STRAPI_OPTIONAL === 'true';
}

/**
 * Fetch a path from Strapi and return the parsed JSON envelope. Throws on
 * non-OK responses, except 404 when `allowNotFound` is set (returns null).
 * A connection failure returns null only when STRAPI_OPTIONAL is set.
 */
export async function strapiFetch<T>(
  path: string,
  { allowNotFound = false, authToken }: FetchOptions = {},
): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${STRAPI_URL}${path}`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
  } catch (err) {
    if (strapiOptional()) return null;
    throw err;
  }

  if (res.status === 404 && allowNotFound) return null;
  if (!res.ok) {
    throw new Error(`Strapi request failed: ${res.status} ${res.statusText} (${path})`);
  }

  return (await res.json()) as T;
}
