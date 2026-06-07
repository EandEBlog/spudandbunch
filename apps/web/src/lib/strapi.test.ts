import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { STRAPI_URL, mediaUrl, strapiFetch } from './strapi';

describe('mediaUrl', () => {
  it('absolutizes a relative /uploads path', () => {
    expect(mediaUrl('/uploads/photo.jpg')).toBe(`${STRAPI_URL}/uploads/photo.jpg`);
  });

  it('adds a slash when the path lacks one', () => {
    expect(mediaUrl('uploads/photo.jpg')).toBe(`${STRAPI_URL}/uploads/photo.jpg`);
  });

  it('leaves already-absolute URLs unchanged', () => {
    expect(mediaUrl('https://cdn.example.com/x.jpg')).toBe('https://cdn.example.com/x.jpg');
  });

  it('returns undefined for empty/missing input', () => {
    expect(mediaUrl(undefined)).toBeUndefined();
    expect(mediaUrl(null)).toBeUndefined();
    expect(mediaUrl('')).toBeUndefined();
  });
});

describe('strapiFetch', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed JSON on a 200 and calls the right URL', async () => {
    const body = { data: [{ id: 1 }], meta: {} };
    (globalThis.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => body,
    });

    const out = await strapiFetch<typeof body>('/api/categories');

    expect(out).toEqual(body);
    expect(globalThis.fetch).toHaveBeenCalledWith(`${STRAPI_URL}/api/categories`);
  });

  it('throws on a non-OK response', async () => {
    (globalThis.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => ({}),
    });

    await expect(strapiFetch('/api/posts')).rejects.toThrow(/500/);
  });

  it('returns null on 404 when allowNotFound is set', async () => {
    (globalThis.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ data: null }),
    });

    await expect(strapiFetch('/api/site-setting', { allowNotFound: true })).resolves.toBeNull();
  });

  it('throws on 404 when allowNotFound is not set', async () => {
    (globalThis.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({}),
    });

    await expect(strapiFetch('/api/posts')).rejects.toThrow(/404/);
  });
});
