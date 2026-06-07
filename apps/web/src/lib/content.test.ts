import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { STRAPI_URL } from './strapi';
import {
  getPosts,
  getPost,
  getPostsByCategory,
  getPostsByTag,
  getCategories,
  getTags,
  getRecommendations,
  getAboutPage,
  getSiteSettings,
} from './content';

/** Mock the next fetch call with a 200 + JSON body. */
function mockJson(body: unknown) {
  (globalThis.fetch as Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => body,
  });
}
/** Mock the next fetch call with a 404 (for single-type "not created yet"). */
function mock404() {
  (globalThis.fetch as Mock).mockResolvedValueOnce({
    ok: false,
    status: 404,
    statusText: 'Not Found',
    json: async () => ({ data: null }),
  });
}
/** URL the most recent fetch was called with. */
function lastUrl(): string {
  const calls = (globalThis.fetch as Mock).mock.calls;
  return calls[calls.length - 1][0] as string;
}

// A fully-populated raw post (Strapi v5 flat shape).
const rawFullPost = {
  id: 1,
  documentId: 'doc-1',
  title: 'Seared Scallops',
  slug: 'seared-scallops',
  excerpt: 'Quick and elegant.',
  coverImage: {
    url: '/uploads/scallops.jpg',
    alternativeText: 'A plate of scallops',
    width: 1200,
    height: 800,
  },
  body: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hello' }] }],
  category: { id: 3, name: 'Recipes', slug: 'recipes', description: 'Cook at home.' },
  tags: [
    { id: 1, name: 'seafood', slug: 'seafood' },
    { id: 2, name: 'quick', slug: 'quick' },
  ],
  author: {
    id: 7,
    name: 'Ernie',
    bio: 'Home cook.',
    avatar: { url: '/uploads/ernie.jpg', alternativeText: 'Ernie' },
  },
  recipeDetails: {
    prepTime: 10,
    cookTime: 15,
    servings: 2,
    ingredients: [{ quantity: '200', unit: 'g', item: 'scallops' }],
    steps: [{ text: 'Sear 2 minutes per side.' }],
  },
  publishedAt: '2026-06-07T00:00:00.000Z',
};

// A minimal raw post: no relations, no recipe, nulls everywhere optional.
const rawMinimalPost = {
  id: 2,
  documentId: 'doc-2',
  title: 'Just Words',
  slug: 'just-words',
  excerpt: null,
  coverImage: null,
  body: null,
  category: null,
  tags: null,
  author: null,
  recipeDetails: null,
  publishedAt: '2026-06-06T00:00:00.000Z',
};

beforeEach(() => {
  globalThis.fetch = vi.fn();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('getPosts', () => {
  it('maps a fully-populated post into the domain shape', async () => {
    mockJson({ data: [rawFullPost], meta: {} });

    const [post] = await getPosts();

    expect(post.title).toBe('Seared Scallops');
    expect(post.slug).toBe('seared-scallops');
    expect(post.documentId).toBe('doc-1');
    // media is absolutized
    expect(post.coverImage).toEqual({
      url: `${STRAPI_URL}/uploads/scallops.jpg`,
      alt: 'A plate of scallops',
      width: 1200,
      height: 800,
    });
    expect(post.category).toEqual({
      id: 3,
      name: 'Recipes',
      slug: 'recipes',
      description: 'Cook at home.',
    });
    expect(post.tags.map((t) => t.slug)).toEqual(['seafood', 'quick']);
    expect(post.author?.name).toBe('Ernie');
    expect(post.author?.avatar?.url).toBe(`${STRAPI_URL}/uploads/ernie.jpg`);
    expect(post.recipe?.servings).toBe(2);
    expect(post.recipe?.ingredients).toEqual([{ quantity: '200', unit: 'g', item: 'scallops' }]);
    expect(post.recipe?.steps).toEqual([{ text: 'Sear 2 minutes per side.' }]);
  });

  it('handles a minimal post (no relations, no recipe)', async () => {
    mockJson({ data: [rawMinimalPost], meta: {} });

    const [post] = await getPosts();

    expect(post.excerpt).toBeUndefined();
    expect(post.coverImage).toBeUndefined();
    expect(post.category).toBeUndefined();
    expect(post.author).toBeUndefined();
    expect(post.recipe).toBeUndefined();
    expect(post.tags).toEqual([]);
  });

  it('requests newest-first with deep populate', async () => {
    mockJson({ data: [], meta: {} });
    await getPosts();
    const url = lastUrl();
    expect(url).toContain('/api/posts?');
    expect(url).toContain('sort=publishedAt:desc');
    expect(url).toContain('populate[recipeDetails][populate]=*');
  });

  it('returns [] when there are no posts', async () => {
    mockJson({ data: [], meta: {} });
    expect(await getPosts()).toEqual([]);
  });
});

describe('getPost', () => {
  it('returns the first match for a slug', async () => {
    mockJson({ data: [rawFullPost], meta: {} });
    const post = await getPost('seared-scallops');
    expect(post?.title).toBe('Seared Scallops');
    expect(lastUrl()).toContain('filters[slug][$eq]=seared-scallops');
  });

  it('returns null when no post matches', async () => {
    mockJson({ data: [], meta: {} });
    expect(await getPost('nope')).toBeNull();
  });

  it('URL-encodes the slug', async () => {
    mockJson({ data: [], meta: {} });
    await getPost('a b/c');
    expect(lastUrl()).toContain('filters[slug][$eq]=a%20b%2Fc');
  });
});

describe('getPostsByCategory', () => {
  it('filters by category slug', async () => {
    mockJson({ data: [rawFullPost], meta: {} });
    const posts = await getPostsByCategory('recipes');
    expect(posts).toHaveLength(1);
    expect(lastUrl()).toContain('filters[category][slug][$eq]=recipes');
  });
});

describe('getPostsByTag', () => {
  it('filters by tag slug', async () => {
    mockJson({ data: [rawFullPost], meta: {} });
    const posts = await getPostsByTag('seafood');
    expect(posts).toHaveLength(1);
    expect(lastUrl()).toContain('filters[tags][slug][$eq]=seafood');
  });
});

describe('getCategories / getTags', () => {
  it('maps categories', async () => {
    mockJson({
      data: [{ id: 1, name: 'Travel', slug: 'travel', description: null }],
      meta: {},
    });
    const cats = await getCategories();
    expect(cats).toEqual([{ id: 1, name: 'Travel', slug: 'travel', description: undefined }]);
  });

  it('maps tags', async () => {
    mockJson({ data: [{ id: 9, name: 'vegan', slug: 'vegan' }], meta: {} });
    const tags = await getTags();
    expect(tags).toEqual([{ id: 9, name: 'vegan', slug: 'vegan' }]);
  });
});

describe('getRecommendations', () => {
  it('maps recommendations and defaults a missing order to 0', async () => {
    mockJson({
      data: [
        {
          id: 1,
          name: 'Chef Knife',
          photo: { url: '/uploads/knife.jpg', alternativeText: 'Knife' },
          blurb: 'Sharp.',
          link: 'https://example.com',
          type: 'Tool',
        },
      ],
      meta: {},
    });

    const [rec] = await getRecommendations();
    expect(rec.name).toBe('Chef Knife');
    expect(rec.type).toBe('Tool');
    expect(rec.order).toBe(0);
    expect(rec.photo?.url).toBe(`${STRAPI_URL}/uploads/knife.jpg`);
  });
});

describe('getAboutPage', () => {
  it('maps the single-type entry', async () => {
    mockJson({
      data: { tagline: 'Hi', bio: [{ type: 'paragraph' }], portrait: { url: '/uploads/me.jpg' } },
      meta: {},
    });
    const about = await getAboutPage();
    expect(about?.tagline).toBe('Hi');
    expect(about?.portrait?.url).toBe(`${STRAPI_URL}/uploads/me.jpg`);
  });

  it('returns null when the entry does not exist yet (404)', async () => {
    mock404();
    expect(await getAboutPage()).toBeNull();
  });
});

describe('getSiteSettings', () => {
  it('maps settings', async () => {
    mockJson({
      data: {
        siteTitle: 'Spud & Bunch',
        tagline: 'Food & travel',
        footerText: '© 2026',
        socialLinks: { ig: 'x' },
      },
      meta: {},
    });
    const settings = await getSiteSettings();
    expect(settings?.siteTitle).toBe('Spud & Bunch');
    expect(settings?.tagline).toBe('Food & travel');
  });

  it('returns null when not configured (404)', async () => {
    mock404();
    expect(await getSiteSettings()).toBeNull();
  });
});
