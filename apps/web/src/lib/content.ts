// Typed content API for Spud & Bunch. Each function fetches from Strapi and maps
// the raw (flat, v5) response into our domain types. Pure data layer — no markup.

import {
  strapiFetch,
  mediaUrl,
  type StrapiListResponse,
  type StrapiSingleResponse,
} from './strapi';
import type {
  Author,
  Category,
  ImageAsset,
  Post,
  Recommendation,
  RecipeDetails,
  AboutPage,
  SiteSettings,
  Tag,
} from './types';

// ---------------------------------------------------------------------------
// Raw Strapi shapes (v5 flattens attributes to the top level)
// ---------------------------------------------------------------------------

interface RawImage {
  url: string;
  alternativeText?: string | null;
  width?: number;
  height?: number;
}
interface RawCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
}
interface RawTag {
  id: number;
  name: string;
  slug: string;
}
interface RawAuthor {
  id: number;
  name: string;
  bio?: string | null;
  avatar?: RawImage | null;
}
interface RawIngredient {
  quantity?: string | null;
  unit?: string | null;
  item: string;
}
interface RawStep {
  text: string;
}
interface RawRecipeDetails {
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number | null;
  ingredients?: RawIngredient[] | null;
  steps?: RawStep[] | null;
}
interface RawPost {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImage?: RawImage | null;
  body?: unknown;
  category?: RawCategory | null;
  tags?: RawTag[] | null;
  author?: RawAuthor | null;
  recipeDetails?: RawRecipeDetails | null;
  publishedAt?: string | null;
}
interface RawRecommendation {
  id: number;
  name: string;
  photo?: RawImage | null;
  blurb?: string | null;
  link?: string | null;
  type: Recommendation['type'];
  order?: number | null;
}
interface RawAboutPage {
  tagline?: string | null;
  bio?: unknown;
  portrait?: RawImage | null;
}
interface RawSiteSettings {
  siteTitle: string;
  tagline?: string | null;
  footerText?: string | null;
  socialLinks?: unknown;
}

// ---------------------------------------------------------------------------
// Mappers (raw → domain). Defensive about nulls/missing populated fields.
// ---------------------------------------------------------------------------

function mapImage(raw?: RawImage | null): ImageAsset | undefined {
  if (!raw) return undefined;
  const url = mediaUrl(raw.url);
  if (!url) return undefined;
  return { url, alt: raw.alternativeText ?? '', width: raw.width, height: raw.height };
}

function mapCategory(raw: RawCategory): Category {
  return { id: raw.id, name: raw.name, slug: raw.slug, description: raw.description ?? undefined };
}

function mapTag(raw: RawTag): Tag {
  return { id: raw.id, name: raw.name, slug: raw.slug };
}

function mapAuthor(raw?: RawAuthor | null): Author | undefined {
  if (!raw) return undefined;
  return { id: raw.id, name: raw.name, bio: raw.bio ?? undefined, avatar: mapImage(raw.avatar) };
}

function mapRecipe(raw?: RawRecipeDetails | null): RecipeDetails | undefined {
  if (!raw) return undefined;
  return {
    prepTime: raw.prepTime ?? undefined,
    cookTime: raw.cookTime ?? undefined,
    servings: raw.servings ?? undefined,
    ingredients: (raw.ingredients ?? []).map((i) => ({
      quantity: i.quantity ?? undefined,
      unit: i.unit ?? undefined,
      item: i.item,
    })),
    steps: (raw.steps ?? []).map((s) => ({ text: s.text })),
  };
}

function mapPost(raw: RawPost): Post {
  return {
    id: raw.id,
    documentId: raw.documentId,
    title: raw.title,
    slug: raw.slug,
    excerpt: raw.excerpt ?? undefined,
    coverImage: mapImage(raw.coverImage),
    body: raw.body,
    category: raw.category ? mapCategory(raw.category) : undefined,
    tags: (raw.tags ?? []).map(mapTag),
    author: mapAuthor(raw.author),
    recipe: mapRecipe(raw.recipeDetails),
    publishedAt: raw.publishedAt ?? undefined,
  };
}

function mapRecommendation(raw: RawRecommendation): Recommendation {
  return {
    id: raw.id,
    name: raw.name,
    photo: mapImage(raw.photo),
    blurb: raw.blurb ?? undefined,
    link: raw.link ?? undefined,
    type: raw.type,
    order: raw.order ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

// Deep-populate everything a Post card or page needs in one request.
const POST_POPULATE =
  'populate[coverImage]=true' +
  '&populate[category]=true' +
  '&populate[tags]=true' +
  '&populate[author][populate][avatar]=true' +
  '&populate[recipeDetails][populate]=*';

const BIG_PAGE = 'pagination[pageSize]=100';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** All published posts, newest first. */
export async function getPosts(): Promise<Post[]> {
  const res = await strapiFetch<StrapiListResponse<RawPost>>(
    `/api/posts?${POST_POPULATE}&sort=publishedAt:desc&${BIG_PAGE}`,
  );
  return (res?.data ?? []).map(mapPost);
}

/** A single published post by slug, or null if not found. */
export async function getPost(slug: string): Promise<Post | null> {
  const res = await strapiFetch<StrapiListResponse<RawPost>>(
    `/api/posts?filters[slug][$eq]=${encodeURIComponent(slug)}&${POST_POPULATE}`,
  );
  const first = res?.data?.[0];
  return first ? mapPost(first) : null;
}

/**
 * A single post by its Strapi documentId, including the **draft** version —
 * for the preview service. Requires an API token that can read drafts. Returns
 * null if not found. Never used by the public build.
 */
export async function getDraftPost(
  documentId: string,
  token = typeof process !== 'undefined' ? process.env?.PREVIEW_TOKEN : undefined,
): Promise<Post | null> {
  const res = await strapiFetch<StrapiSingleResponse<RawPost>>(
    `/api/posts/${encodeURIComponent(documentId)}?status=draft&${POST_POPULATE}`,
    { authToken: token, allowNotFound: true },
  );
  return res?.data ? mapPost(res.data) : null;
}

/** Published posts in a category, newest first. */
export async function getPostsByCategory(categorySlug: string): Promise<Post[]> {
  const res = await strapiFetch<StrapiListResponse<RawPost>>(
    `/api/posts?filters[category][slug][$eq]=${encodeURIComponent(categorySlug)}` +
      `&${POST_POPULATE}&sort=publishedAt:desc&${BIG_PAGE}`,
  );
  return (res?.data ?? []).map(mapPost);
}

/** Published posts with a tag, newest first. */
export async function getPostsByTag(tagSlug: string): Promise<Post[]> {
  const res = await strapiFetch<StrapiListResponse<RawPost>>(
    `/api/posts?filters[tags][slug][$eq]=${encodeURIComponent(tagSlug)}` +
      `&${POST_POPULATE}&sort=publishedAt:desc&${BIG_PAGE}`,
  );
  return (res?.data ?? []).map(mapPost);
}

/** All categories, alphabetical. */
export async function getCategories(): Promise<Category[]> {
  const res = await strapiFetch<StrapiListResponse<RawCategory>>(
    `/api/categories?sort=name:asc&${BIG_PAGE}`,
  );
  return (res?.data ?? []).map(mapCategory);
}

/** All tags, alphabetical. */
export async function getTags(): Promise<Tag[]> {
  const res = await strapiFetch<StrapiListResponse<RawTag>>(`/api/tags?sort=name:asc&${BIG_PAGE}`);
  return (res?.data ?? []).map(mapTag);
}

/** All recommendations, by manual order. */
export async function getRecommendations(): Promise<Recommendation[]> {
  const res = await strapiFetch<StrapiListResponse<RawRecommendation>>(
    `/api/recommendations?populate[photo]=true&sort=order:asc&${BIG_PAGE}`,
  );
  return (res?.data ?? []).map(mapRecommendation);
}

/** The about page, or null if it hasn't been created in the CMS yet. */
export async function getAboutPage(): Promise<AboutPage | null> {
  const res = await strapiFetch<StrapiSingleResponse<RawAboutPage>>(`/api/about-page?populate=*`, {
    allowNotFound: true,
  });
  if (!res?.data) return null;
  const raw = res.data;
  return {
    tagline: raw.tagline ?? undefined,
    bio: raw.bio,
    portrait: mapImage(raw.portrait),
  };
}

/** Site settings, or null if not configured yet. */
export async function getSiteSettings(): Promise<SiteSettings | null> {
  const res = await strapiFetch<StrapiSingleResponse<RawSiteSettings>>(
    `/api/site-setting?populate=*`,
    { allowNotFound: true },
  );
  if (!res?.data) return null;
  const raw = res.data;
  return {
    siteTitle: raw.siteTitle,
    tagline: raw.tagline ?? undefined,
    footerText: raw.footerText ?? undefined,
    socialLinks: raw.socialLinks,
  };
}
