// Domain types for Spud & Bunch. These are the clean, presentation-friendly
// shapes the rest of the app consumes — deliberately decoupled from Strapi's
// raw REST format (which is mapped into these in content.ts). Nothing here
// knows about Strapi, HTTP, or markup.

export interface ImageAsset {
  /** Absolute URL (Strapi's relative /uploads path is resolved to absolute). */
  url: string;
  /** Alt text; empty string when none was provided. */
  alt: string;
  width?: number;
  height?: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface Author {
  id: number;
  name: string;
  bio?: string;
  avatar?: ImageAsset;
}

export interface Ingredient {
  quantity?: string;
  unit?: string;
  item: string;
}

export interface RecipeStep {
  text: string;
}

export interface RecipeDetails {
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients: Ingredient[];
  steps: RecipeStep[];
}

/** Strapi "blocks" rich content. Rendered in Phase 4; kept opaque here. */
export type BlocksContent = unknown;

export type RecommendationType = 'Tool' | 'Restaurant' | 'Place' | 'Book';

export interface Recommendation {
  id: number;
  name: string;
  photo?: ImageAsset;
  blurb?: string;
  link?: string;
  type: RecommendationType;
  order: number;
}

export interface Post {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: ImageAsset;
  body?: BlocksContent;
  category?: Category;
  tags: Tag[];
  author?: Author;
  /** Present only when the post is a recipe. */
  recipe?: RecipeDetails;
  publishedAt?: string;
}

export interface AboutPage {
  tagline?: string;
  bio?: BlocksContent;
  portrait?: ImageAsset;
}

export interface SiteSettings {
  siteTitle: string;
  tagline?: string;
  footerText?: string;
  socialLinks?: unknown;
}
