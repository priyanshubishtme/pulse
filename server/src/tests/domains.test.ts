import { describe, expect, it } from 'vitest';
import { matchesDomain, normalizeDomain } from '../lib/domains';

describe('blocked-domain normalization', () => {
  it('normalizes schemes, ports, wildcard prefixes, case, paths, and trailing dots', () => {
    expect(normalizeDomain('*.EXAMPLE.com:443/path')).toBe('example.com');
    expect(normalizeDomain('https://Example.COM/anything')).toBe('example.com');
  });

  it('matches only the exact domain or a real subdomain boundary', () => {
    expect(matchesDomain('example.com', 'example.com')).toBe(true);
    expect(matchesDomain('cdn.example.com', 'example.com')).toBe(true);
    expect(matchesDomain('notexample.com', 'example.com')).toBe(false);
  });

  it('rejects empty or malformed values', () => {
    expect(normalizeDomain('')).toBeNull();
    expect(normalizeDomain('not a hostname')).toBeNull();
  });
});
