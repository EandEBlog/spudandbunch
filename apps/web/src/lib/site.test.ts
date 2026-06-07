import { describe, it, expect } from 'vitest';
import { siteName, slugify } from './site';

describe('site', () => {
  it('exposes the site name', () => {
    expect(siteName).toBe('Spud & Bunch');
  });

  describe('slugify', () => {
    it('lowercases and hyphenates', () => {
      expect(slugify('Seared Scallops')).toBe('seared-scallops');
    });

    it('strips punctuation and collapses separators', () => {
      expect(slugify('  30-Minute  Pasta! (Vegan)  ')).toBe('30-minute-pasta-vegan');
    });

    it('handles already-clean slugs', () => {
      expect(slugify('travel')).toBe('travel');
    });
  });
});
