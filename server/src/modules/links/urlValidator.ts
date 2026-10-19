import prisma from '../../lib/prisma';
import { config } from '../../config';
import { matchesDomain, normalizeDomain } from '../../lib/domains';

export interface ValidationIssue {
  field: string;
  level: 'error' | 'warning' | 'info';
  code: string;
  message: string;
}

export async function validateDestination(url: string, ownerId: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      issues.push({ field: 'destination', level: 'error', code: 'INVALID_PROTOCOL', message: 'Protocol must be http or https.' });
    }
    if (url.length > 2048) {
      issues.push({ field: 'destination', level: 'error', code: 'URL_TOO_LONG', message: 'URL exceeds 2048 characters.' });
    }
  } catch (e) {
    return [{ field: 'destination', level: 'error', code: 'INVALID_URL', message: 'Invalid URL format.' }];
  }

  const hostname = normalizeDomain(parsedUrl.hostname) || parsedUrl.hostname.toLowerCase();

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === new URL(config.appUrl).hostname) {
    issues.push({ field: 'destination', level: 'error', code: 'LOOP_PROTECTION', message: 'Cannot link to localhost or the application domain itself.' });
  }

  const blocklists = await prisma.blockedDomain.findMany();
  const isBlocked = blocklists.some(b => matchesDomain(hostname, b.domain));

  if (isBlocked) {
    issues.push({ field: 'destination', level: 'error', code: 'DOMAIN_BLOCKED', message: `The domain ${hostname} is blocklisted.` });
  }

  const existingLink = await prisma.link.findFirst({
    where: { ownerId, destinationUrl: url }
  });

  if (existingLink) {
    issues.push({ field: 'destination', level: 'warning', code: 'DUPLICATE_URL', message: `You already have a short link to this exact URL (alias: ${existingLink.alias}).` });
  }

  const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl'];
  if (shorteners.includes(hostname)) {
    issues.push({ field: 'destination', level: 'warning', code: 'CHAINED_SHORTENER', message: 'Chaining shorteners is discouraged.' });
  }

  return issues;
}
