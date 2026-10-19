import express from 'express';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: {
    link: { findUnique: vi.fn() },
    blockedDomain: { findMany: vi.fn() }
  },
  cache: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn()
  },
  enqueueClick: vi.fn().mockResolvedValue(undefined),
  enqueueBlock: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../lib/prisma', () => ({ default: mocks.prisma }));
vi.mock('../modules/redirect/linkCache', () => ({ linkCache: mocks.cache }));
vi.mock('../modules/clicks/clickQueue', () => ({
  enqueueClick: mocks.enqueueClick,
  enqueueBlock: mocks.enqueueBlock
}));

import redirectRoutes from '../modules/redirect/redirect.routes';
import { createContinueToken } from '../modules/redirect/continueToken';

const link = (overrides: Record<string, unknown> = {}) => ({
  id: 'link-1',
  ownerId: 'user-1',
  campaignId: null,
  alias: 'test',
  destinationUrl: 'https://example.com/path',
  title: null,
  status: 'ACTIVE',
  disabledReason: null,
  expiresAt: null,
  clickLimit: null,
  clickCount: 0,
  passwordHash: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

const app = express();
app.use(express.json());
app.use(redirectRoutes);

describe('public redirect paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cache.get.mockResolvedValue(null);
    mocks.cache.set.mockResolvedValue(undefined);
    mocks.prisma.blockedDomain.findMany.mockResolvedValue([]);
  });

  it('preserves QR source through the interstitial and records a QR click', async () => {
    const value = link({ alias: 'qr-test' });
    mocks.prisma.link.findUnique.mockResolvedValue(value);

    const response = await request(app).get('/qr/QR-Test');

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('/continue/qr-test?source=qr');
    expect(mocks.enqueueClick).toHaveBeenCalledWith(expect.objectContaining({ linkId: 'link-1', source: 'QR' }));
  });

  it('requires a password at resolve time and unlocks through the public endpoint', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    const value = link({ alias: 'secret', passwordHash });
    mocks.prisma.link.findUnique.mockResolvedValue(value);

    const resolve = await request(app).get('/api/public/resolve/secret');
    expect(resolve.status).toBe(423);
    expect(resolve.body.error.code).toBe('PASSWORD_REQUIRED');

    const unlock = await request(app).post('/api/public/unlock/secret').send({ password: 'correct-password' });
    expect(unlock.status).toBe(200);
    expect(unlock.body.destinationUrl).toBe(value.destinationUrl);
    expect(unlock.body.continueToken).toBeTypeOf('string');
    const unlockedResolve = await request(app)
      .get(`/api/public/resolve/secret?token=${encodeURIComponent(unlock.body.continueToken)}`);
    expect(unlockedResolve.status).toBe(200);
    expect(unlockedResolve.body.destinationUrl).toBe(value.destinationUrl);
    expect(mocks.enqueueClick).toHaveBeenCalledWith(expect.objectContaining({ linkId: 'link-1', source: 'LINK' }));
  });

  it('requires a short-lived continue token before resolving an approved visit', async () => {
    const value = link({ alias: 'approved' });
    mocks.prisma.link.findUnique.mockResolvedValue(value);

    const withoutToken = await request(app).get('/api/public/resolve/approved');
    expect(withoutToken.status).toBe(403);
    expect(withoutToken.body.error.code).toBe('INVALID_CONTINUE_TOKEN');

    const withToken = await request(app)
      .get(`/api/public/resolve/approved?token=${encodeURIComponent(createContinueToken('approved'))}`);
    expect(withToken.status).toBe(200);
    expect(withToken.body.destinationUrl).toBe(value.destinationUrl);
  });

  it('blocks exact and subdomain destinations using normalized blocklist entries', async () => {
    const value = link({ destinationUrl: 'https://cdn.Example.com/path' });
    mocks.prisma.link.findUnique.mockResolvedValue(value);
    mocks.prisma.blockedDomain.findMany.mockResolvedValue([{ domain: '*.EXAMPLE.COM.' }]);

    const response = await request(app).get('/test');

    expect(response.status).toBe(302);
    expect(response.headers.location).toMatch(/\/status\/disabled$/);
    expect(mocks.enqueueBlock).toHaveBeenCalledWith(expect.objectContaining({ linkId: 'link-1', reason: 'DISABLED' }));
    expect(mocks.enqueueClick).not.toHaveBeenCalled();
  });
});
