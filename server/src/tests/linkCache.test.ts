import { beforeEach, describe, expect, it } from 'vitest';
import { linkCache } from '../modules/redirect/linkCache';

const value: any = {
  id: 'link-1',
  ownerId: 'user-1',
  campaignId: null,
  alias: 'cache-test',
  destinationUrl: 'https://example.com',
  title: null,
  status: 'ACTIVE',
  disabledReason: null,
  expiresAt: null,
  clickLimit: null,
  clickCount: 0,
  passwordHash: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('link cache invalidation', () => {
  beforeEach(async () => {
    await linkCache.clear();
  });

  it('clears local cached links for global policy changes', async () => {
    await linkCache.set(value.alias, value);
    expect(await linkCache.get(value.alias)).toEqual(value);

    await linkCache.clear();
    expect(await linkCache.get(value.alias)).toBeNull();
  });
});
