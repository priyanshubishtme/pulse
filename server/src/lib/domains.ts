/**
 * Normalize a blocklist entry or URL hostname to the value used for matching.
 * Blocklist entries are intentionally hostname-only; paths, schemes, ports,
 * wildcard prefixes, case, and a trailing DNS dot do not affect a match.
 */
export function normalizeDomain(value: string): string | null {
  const raw = value.trim().toLowerCase();
  if (!raw) return null;

  const withoutWildcard = raw.startsWith('*.') ? raw.slice(2) : raw;

  try {
    const parsed = withoutWildcard.includes('://')
      ? new URL(withoutWildcard)
      : new URL(`http://${withoutWildcard}`);
    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
    return hostname || null;
  } catch {
    return null;
  }
}

export function matchesDomain(hostname: string, blockedDomain: string): boolean {
  const normalizedHost = normalizeDomain(hostname);
  const normalizedBlocked = normalizeDomain(blockedDomain);
  if (!normalizedHost || !normalizedBlocked) return false;

  return normalizedHost === normalizedBlocked || normalizedHost.endsWith(`.${normalizedBlocked}`);
}
