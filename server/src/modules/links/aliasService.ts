import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { reservedAliases } from '../../lib/reservedAliases';

export const ALIAS_REGEX = /^[a-z0-9][a-z0-9_-]{2,47}$/;

export async function generateAlias(length = 7): Promise<string> {
  let attempts = 0;
  while (attempts < 5) {
    const randomBuffer = crypto.randomBytes(length);
    let alias = '';
    for (let i = 0; i < randomBuffer.length; i++) {
      const char = randomBuffer[i].toString(36).toLowerCase();
      // Ensure we get a valid char
      if (/[a-z0-9]/.test(char[0])) {
         alias += char[0];
      }
      if (alias.length === length) break;
    }

    // ensure it matches regex constraints
    if (!ALIAS_REGEX.test(alias) || alias.length !== length) {
      continue;
    }

    const { available } = await checkAlias(alias);
    if (available) return alias;
    attempts++;
  }

  // lengthen on collisions
  return generateAlias(length + 1);
}

export async function checkAlias(alias: string): Promise<{ available: boolean; reason?: string }> {
  const lowercaseAlias = alias.trim().toLowerCase();

  if (!ALIAS_REGEX.test(lowercaseAlias)) {
    return { available: false, reason: 'Alias must be 3-48 characters, lowercase, and start with a letter/number.' };
  }

  if (reservedAliases.has(lowercaseAlias)) {
    return { available: false, reason: 'This alias is reserved by the platform.' };
  }

  const existing = await prisma.link.findUnique({
    where: { alias: lowercaseAlias }
  });

  if (existing) {
    return { available: false, reason: 'This alias is already taken.' };
  }

  return { available: true };
}
