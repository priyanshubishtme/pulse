import crypto from 'crypto';
import { config } from '../../config';

const CONTINUE_TOKEN_TTL_SECONDS = 120;

function signatureFor(alias: string, expiresAt: number, unlocked: boolean) {
  return crypto.createHmac('sha256', config.serverSalt).update(`${alias}:${expiresAt}:${unlocked ? 'unlocked' : 'approved'}`).digest('base64url');
}

export function createContinueToken(alias: string, unlocked = false): string {
  const expiresAt = Math.floor(Date.now() / 1000) + CONTINUE_TOKEN_TTL_SECONDS;
  return `${expiresAt}.${unlocked ? '1' : '0'}.${signatureFor(alias, expiresAt, unlocked)}`;
}

export function getContinueTokenState(alias: string, token: unknown): { valid: boolean; unlocked: boolean } {
  if (typeof token !== 'string') return { valid: false, unlocked: false };

  const [expiresAtText, unlockedText, signature] = token.split('.');
  const expiresAt = Number(expiresAtText);
  const unlocked = unlockedText === '1';
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !signature || !['0', '1'].includes(unlockedText)) {
    return { valid: false, unlocked: false };
  }

  const expected = signatureFor(alias, expiresAt, unlocked);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return {
    valid: receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer),
    unlocked
  };
}

export function isValidContinueToken(alias: string, token: unknown): boolean {
  return getContinueTokenState(alias, token).valid;
}
