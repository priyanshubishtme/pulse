import { describe, expect, it } from 'vitest';
import { isFrontendRoute, isStaticAssetRequest } from '../middleware/staticServing';

describe('unified static serving route guards', () => {
  it('recognizes the frontend routes that need the SPA entry', () => {
    expect(isFrontendRoute('/login')).toBe(true);
    expect(isFrontendRoute('/campaigns/spring-sale')).toBe(true);
    expect(isFrontendRoute('/continue/short-link')).toBe(true);
    expect(isFrontendRoute('/dashboard/extra')).toBe(false);
  });

  it('does not classify backend or public redirect routes as static assets', () => {
    expect(isStaticAssetRequest('/api/auth/me')).toBe(false);
    expect(isStaticAssetRequest('/health')).toBe(false);
    expect(isStaticAssetRequest('/qr/short-link')).toBe(false);
    expect(isStaticAssetRequest('/customer-offer')).toBe(false);
  });

  it('recognizes Vite assets without intercepting SPA routes', () => {
    expect(isStaticAssetRequest('/assets/index-abc123.js')).toBe(true);
    expect(isStaticAssetRequest('/favicon.svg')).toBe(true);
    expect(isStaticAssetRequest('/status/expired')).toBe(false);
  });
});
