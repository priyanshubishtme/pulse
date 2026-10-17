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

router.post('/bulk-move', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { linkIds, campaignId } = req.body;
    if (!Array.isArray(linkIds)) return res.status(400).json({ error: { message: 'linkIds must be an array' } });

    if (campaignId) {
      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
      if (!campaign || campaign.ownerId !== req.user!.id) throw { status: 404, message: 'Campaign not found' };
      if (campaign.archivedAt) throw { status: 400, message: 'Cannot move to archived campaign' };
    }

    const { count } = await prisma.link.updateMany({
      where: { id: { in: linkIds }, ownerId: req.user!.id },
      data: { campaignId: campaignId || null }
    });

    res.json({ success: true, count });
  } catch (err) {
    next(err);
  }
});

router.post('/bulk-tag', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { linkIds, tagIds } = req.body;
    if (!Array.isArray(linkIds) || !Array.isArray(tagIds)) return res.status(400).json({ error: { message: 'Arrays expected' } });

    const tags = await prisma.tag.findMany({ where: { id: { in: tagIds }, ownerId: req.user!.id } });
    if (tags.length !== tagIds.length) throw { status: 400, message: 'Invalid tags' };

    const links = await prisma.link.findMany({ where: { id: { in: linkIds }, ownerId: req.user!.id } });

    for (const link of links) {
      await prisma.linkTag.deleteMany({ where: { linkId: link.id } });
      await prisma.linkTag.createMany({
        data: tagIds.map((t: string) => ({ linkId: link.id, tagId: t }))
      });
    }

    res.json({ success: true, count: links.length });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const link = await prisma.link.findUnique({ where: { id } });
    if (!link || link.ownerId !== req.user!.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Link not found' } });
    }

    const updated = await prisma.link.update({
      where: { id },
      data: req.body
    });

    linkCache.delete(updated.alias);
    res.json({ link: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const link = await prisma.link.findUnique({ where: { id } });
    if (!link || link.ownerId !== req.user!.id) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Link not found' } });
    }

    await prisma.link.delete({ where: { id } });
    linkCache.delete(link.alias);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
