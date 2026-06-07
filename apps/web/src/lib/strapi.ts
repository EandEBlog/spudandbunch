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
  if (/^https?:\/\//i.test(path)) return path;
  return `${STRAPI_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

interface FetchOptions {
  /** When true, a 404 resolves to null instead of throwing (for single types). */
  allowNotFound?: boolean;
}

/**
 * Fetch a path from Strapi and return the parsed JSON envelope. Throws on
 * non-OK responses, except 404 when `allowNotFound` is set (returns null).
 */
export async function strapiFetch<T>(
  path: string,
  { allowNotFound = false }: FetchOptions = {},
): Promise<T | null> {
  const res = await fetch(`${STRAPI_URL}${path}`);

  if (res.status === 404 && allowNotFound) return null;
  if (!res.ok) {
    throw new Error(`Strapi request failed: ${res.status} ${res.statusText} (${path})`);
  }

  return (await res.json()) as T;
}
