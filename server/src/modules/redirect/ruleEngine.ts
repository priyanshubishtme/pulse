import { Link, BlockedDomain } from '@prisma/client';

export type RedirectDecision = 'NOT_FOUND' | 'DISABLED' | 'EXPIRED' | 'LIMIT_REACHED' | 'PASSWORD_REQUIRED' | 'REDIRECT';

// In reality we pass link, now, unlockStatus, and blocklisted domains status
export function effectiveStatus(
  link: Link | null,
  now: Date,
  isUnlocked: boolean,
  isDomainBlocked: boolean
): RedirectDecision {
  if (!link) {
    return 'NOT_FOUND';
  }

  // 1. Check if physically disabled
  if (link.status === 'DISABLED') {
    return 'DISABLED';
  }

  // 2. Check Expiry
  if (link.status === 'EXPIRED' || (link.expiresAt && link.expiresAt <= now)) {
    return 'EXPIRED';
  }

  // 3. Click limit
  if (link.clickLimit !== null && link.clickCount >= link.clickLimit) {
    return 'LIMIT_REACHED';
  }

  // 4. Password check
  if (link.passwordHash && !isUnlocked) {
    return 'PASSWORD_REQUIRED';
  }

  // 5. Blocklisted destination domain
  if (isDomainBlocked) {
    return 'DISABLED'; // Rule 6 returns DISABLED
  }

  return 'REDIRECT';
}
