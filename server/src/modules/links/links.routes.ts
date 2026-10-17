import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { validateLink, createLink, getLinks } from './links.service';
import { checkAlias, generateAlias } from './aliasService';
import { createLinkLimiter } from '../../middleware/rateLimit';
import prisma from '../../lib/prisma';
import { linkCache } from '../redirect/linkCache';

const router = Router();

router.get('/check-alias', requireAuth, async (req, res, next) => {
  try {
    const alias = req.query.alias as string;
    if (!alias) return res.status(400).json({ error: { code: 'MISSING_ALIAS', message: 'Alias query parameter required' } });
    
    const result = await checkAlias(alias);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/validate', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const issues = await validateLink(req.body, req.user!.id);
    res.json({ issues });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, createLinkLimiter, async (req: AuthRequest, res, next) => {
  try {
    const link = await createLink(req.body, req.user!.id);
    res.status(201).json({ link });
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const links = await getLinks(req.user!.id);
    res.json({ links });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const link = await prisma.link.findUnique({ where: { id: req.params.id } });
    if (!link || link.ownerId !== req.user!.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Link not found' } });
    }

    // Process basic status toggling or extensions here...
    const updated = await prisma.link.update({
      where: { id: link.id },
      data: req.body // Normally validate via zod, simplified for brevity
    });

    linkCache.delete(updated.alias);
    res.json({ link: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const link = await prisma.link.findUnique({ where: { id: req.params.id } });
    if (!link || link.ownerId !== req.user!.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Link not found' } });
    }

    await prisma.link.delete({ where: { id: link.id } });
    linkCache.delete(link.alias);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
