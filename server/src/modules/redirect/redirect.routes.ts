import { Router } from 'express';
import prisma from '../../lib/prisma';
import bcrypt from 'bcrypt';
import { isbot } from 'isbot'; // Changed to named import for isbot which fixes the runtime/vitest issue in isbot v3+
import { linkCache } from './linkCache';
import { effectiveStatus } from './ruleEngine';
import { enqueueClick, enqueueBlock } from '../clicks/clickQueue';
import { config } from '../../config';
import rateLimit from 'express-rate-limit';
import { matchesDomain, normalizeDomain } from '../../lib/domains';
import { createContinueToken, getContinueTokenState } from './continueToken';

const router = Router();

const unlockLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many unlock attempts, please try again later.' } }
});

async function isDestinationBlocked(destinationUrl: string): Promise<boolean> {
  let hostname: string;
  try {
    hostname = normalizeDomain(new URL(destinationUrl).hostname) || '';
  } catch {
    // Never send a malformed legacy destination to a browser.
    return true;
  }
  if (!hostname) return true;

  const blocklists = await prisma.blockedDomain.findMany({ select: { domain: true } });
  return blocklists.some(blocked => matchesDomain(hostname, blocked.domain));
}

router.post('/api/public/unlock/:alias', unlockLimiter, async (req, res) => {
  const alias = (req.params.alias as string).toLowerCase();
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: { code: 'MISSING_PASSWORD', message: 'Password required' } });
  }

  const link = await prisma.link.findUnique({ where: { alias } });
  if (!link || !link.passwordHash) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Link not found or not protected' } });
  }

  const isValid = await bcrypt.compare(password, link.passwordHash);
  if (!isValid) {
    await enqueueBlock({
      linkId: link.id,
      reason: 'WRONG_PASSWORD',
      ip: req.ip || '0.0.0.0',
      userAgent: req.headers['user-agent'] || '',
    });
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Incorrect password' } });
  }

  // Check rule engine again using the now unlocked status
  const isDomainBlocked = await isDestinationBlocked(link.destinationUrl);

  const decision = effectiveStatus(link, new Date(), true, isDomainBlocked);

  if (decision === 'EXPIRED' || decision === 'DISABLED' || decision === 'LIMIT_REACHED') {
    await enqueueBlock({
      linkId: link.id,
      reason: decision,
      ip: req.ip || '0.0.0.0',
      userAgent: req.headers['user-agent'] || '',
    });
    return res.status(403).json({ error: { code: decision, message: `Link is ${decision.toLowerCase()}` } });
  }

  try {
    await processValidRedirect(link, 'LINK', req);
    res.json({ destinationUrl: link.destinationUrl, continueToken: createContinueToken(alias, true) });
  } catch (err: any) {
    if (err.message === 'LIMIT_REACHED') {
      res.status(403).json({ error: { code: 'LIMIT_REACHED', message: 'Limit reached concurrently' } });
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } });
    }
  }
});

// The interstitial uses this read-only endpoint to resolve an already approved
// short-link visit. It deliberately does not enqueue another click event.
router.get('/api/public/resolve/:alias', async (req, res) => {
  const alias = (req.params.alias as string).toLowerCase();
  const link = await prisma.link.findUnique({ where: { alias } });
  if (!link) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Link not found' } });

  const isDomainBlocked = await isDestinationBlocked(link.destinationUrl);

  // The short-link request already reserved/consumed this visit before sending
  // the browser to the interstitial. Do not reject that same visit because it
  // just became the final allowed click.
  const continueToken = getContinueTokenState(alias, req.query.token);
  const decision = effectiveStatus({ ...link, clickLimit: null }, new Date(), continueToken.valid && continueToken.unlocked, isDomainBlocked);
  if (decision !== 'REDIRECT') {
    return res.status(decision === 'PASSWORD_REQUIRED' ? 423 : decision === 'NOT_FOUND' ? 404 : 403)
      .json({ error: { code: decision, message: `Link is ${decision.toLowerCase()}` } });
  }

  if (!continueToken.valid) {
    return res.status(403).json({ error: { code: 'INVALID_CONTINUE_TOKEN', message: 'This redirect session is no longer valid.' } });
  }

  return res.json({ destinationUrl: link.destinationUrl });
});

async function processValidRedirect(link: any, source: 'LINK' | 'QR', req: any) {
  const userAgent = req.headers['user-agent'] || '';
  const bot = isbot(userAgent);

  if (link.clickLimit !== null && !bot) {
    const res = await prisma.$executeRaw`
      UPDATE "Link" SET "clickCount" = "clickCount" + 1
      WHERE id = ${link.id} AND "clickCount" < ${link.clickLimit}
    `;
    if (res === 0) {
      throw new Error('LIMIT_REACHED');
    }
  }

  await enqueueClick({
    linkId: link.id,
    source,
    ip: req.ip || '0.0.0.0',
    userAgent,
    referrer: req.headers.referer || (req.headers as any).referrer as string | undefined,
    hasClickLimit: link.clickLimit !== null
  });
}

async function redirectHandler(req: any, res: any, source: 'LINK' | 'QR') {
  const alias = (req.params.alias as string).toLowerCase();

  let link = await linkCache.get(alias);
  if (!link) {
    link = await prisma.link.findUnique({ where: { alias } });
    if (link) await linkCache.set(alias, link);
  }

  const isDomainBlocked = link ? await isDestinationBlocked(link.destinationUrl) : false;

  const decision = effectiveStatus(link, new Date(), false, isDomainBlocked);

  if (decision === 'NOT_FOUND') {
    return res.redirect(302, `${config.appUrl}/status/not-found`);
  }

  if (decision === 'EXPIRED' && link && link.status !== 'EXPIRED') {
    await prisma.link.update({ where: { id: link.id }, data: { status: 'EXPIRED' } });
    link.status = 'EXPIRED';
    await linkCache.set(alias, link);
  }

  if (decision === 'EXPIRED' || decision === 'DISABLED' || decision === 'LIMIT_REACHED') {
    await enqueueBlock({
      linkId: link!.id,
      reason: decision,
      ip: req.ip || '0.0.0.0',
      userAgent: req.headers['user-agent'] || '',
    });
    const reasonUrl = decision.toLowerCase().replace('_', '-');
    return res.redirect(302, `${config.appUrl}/status/${reasonUrl}`);
  }

  if (decision === 'PASSWORD_REQUIRED') {
    return res.redirect(302, `${config.appUrl}/unlock/${alias}`);
  }

  try {
    await processValidRedirect(link, source, req);
    const continueUrl = new URL(`/continue/${encodeURIComponent(alias)}`, config.appUrl);
    continueUrl.searchParams.set('source', source.toLowerCase());
    continueUrl.searchParams.set('token', createContinueToken(alias));
    return res.redirect(302, continueUrl.toString());
  } catch (err: any) {
    console.error('Redirect Error:', err);
    if (err.message === 'LIMIT_REACHED') {
      return res.redirect(302, `${config.appUrl}/status/limit-reached`);
    }
    return res.status(500).send('Internal Server Error');
  }
}

router.get('/qr/:alias', (req, res) => redirectHandler(req, res, 'QR'));
router.get('/:alias', (req, res, next) => {
  if (req.params.alias === 'api' || req.params.alias === 'health') {
    return next();
  }
  redirectHandler(req, res, 'LINK');
});

export default router;
