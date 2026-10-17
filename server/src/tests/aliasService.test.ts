import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAlias, generateAlias, ALIAS_REGEX } from '../modules/links/aliasService';
import prisma from '../lib/prisma';

vi.mock('../lib/prisma', () => ({
  default: {
    link: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Alias Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Regex', () => {
    it('allows valid aliases', () => {
      expect(ALIAS_REGEX.test('my-alias')).toBe(true);
      expect(ALIAS_REGEX.test('123')).toBe(true);
      expect(ALIAS_REGEX.test('a_b-c')).toBe(true);
    });

    it('rejects invalid aliases', () => {
      expect(ALIAS_REGEX.test('ab')).toBe(false); // too short
      expect(ALIAS_REGEX.test('-abc')).toBe(false); // starts with hyphen
      expect(ALIAS_REGEX.test('ABC')).toBe(false); // uppercase
    });
  });

  describe('checkAlias', () => {
    it('rejects reserved aliases', async () => {
      const res = await checkAlias('admin');
      expect(res.available).toBe(false);
      expect(res.reason).toMatch(/reserved/i);
    });

    it('rejects existing aliases', async () => {
      (prisma.link.findUnique as any).mockResolvedValue({ id: 'exists' });
      const res = await checkAlias('taken');
      expect(res.available).toBe(false);
      expect(res.reason).toMatch(/taken/i);
    });

    it('allows available valid aliases', async () => {
      (prisma.link.findUnique as any).mockResolvedValue(null);
      const res = await checkAlias('valid123');
      expect(res.available).toBe(true);
    });
  });

  describe('generateAlias', () => {
    it('generates a valid alias if no collisions', async () => {
      (prisma.link.findUnique as any).mockResolvedValue(null);
      const alias = await generateAlias(7);
      expect(alias.length).toBe(7);
      expect(ALIAS_REGEX.test(alias)).toBe(true);
    });
  });
});
