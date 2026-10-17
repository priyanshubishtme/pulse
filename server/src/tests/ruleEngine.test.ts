import { describe, it, expect } from 'vitest';
import { effectiveStatus } from '../modules/redirect/ruleEngine';
import { Link } from '@prisma/client';

const mockLink = (overrides: Partial<Link>): Link => ({
  id: 'test',
  ownerId: 'user1',
  campaignId: null,
  alias: 'testalias',
  destinationUrl: 'https://example.com',
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

describe('Rule Engine', () => {
  const now = new Date('2026-01-01T12:00:00Z');

  it('returns NOT_FOUND if link is null', () => {
    expect(effectiveStatus(null, now, false, false)).toBe('NOT_FOUND');
  });

  it('returns DISABLED if status is DISABLED', () => {
    const link = mockLink({ status: 'DISABLED' });
    expect(effectiveStatus(link, now, false, false)).toBe('DISABLED');
  });

  it('returns EXPIRED if past expiresAt date', () => {
    const link = mockLink({ expiresAt: new Date('2025-12-31T12:00:00Z') });
    expect(effectiveStatus(link, now, false, false)).toBe('EXPIRED');
  });

  it('returns EXPIRED if stored status is EXPIRED', () => {
    const link = mockLink({ status: 'EXPIRED', expiresAt: new Date('2027-12-31T12:00:00Z') });
    expect(effectiveStatus(link, now, false, false)).toBe('EXPIRED');
  });

  it('returns LIMIT_REACHED if click limit is met', () => {
    const link = mockLink({ clickLimit: 100, clickCount: 100 });
    expect(effectiveStatus(link, now, false, false)).toBe('LIMIT_REACHED');
  });

  it('returns PASSWORD_REQUIRED if passwordHash exists and not unlocked', () => {
    const link = mockLink({ passwordHash: 'hash' });
    expect(effectiveStatus(link, now, false, false)).toBe('PASSWORD_REQUIRED');
  });

  it('returns REDIRECT if password is valid', () => {
    const link = mockLink({ passwordHash: 'hash' });
    expect(effectiveStatus(link, now, true, false)).toBe('REDIRECT');
  });

  it('returns DISABLED if domain is blocklisted', () => {
    const link = mockLink({});
    expect(effectiveStatus(link, now, false, true)).toBe('DISABLED');
  });

  it('returns REDIRECT for happy path', () => {
    const link = mockLink({});
    expect(effectiveStatus(link, now, false, false)).toBe('REDIRECT');
  });
});
