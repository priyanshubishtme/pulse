import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { validateLink, createLink, getLinks } from './links.service';
import { checkAlias, generateAlias } from './aliasService';
import { createLinkLimiter } from '../../middleware/rateLimit';
import prisma from '../../lib/prisma';
import { linkCache } from '../redirect/linkCache';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { validateDestination } from './urlValidator';

const router = Router();

const linkUpdateSchema = z.object({
  destinationUrl: z.string().url().optional(),
  title: z.string().max(120).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  clickLimit: z.number().int().min(0).max(1000000000).nullable().optional(),
  password: z.string().min(6).max(72).nullable().optional(),
  campaignId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).max(10).optional(),
}).strict().refine(data => Object.keys(data).length > 0, { message: 'Provide at least one field to update' });

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

    const input = linkUpdateSchema.parse(req.body);

    if (input.destinationUrl) {
      const issues = await validateDestination(input.destinationUrl, req.user!.id);
      const errors = issues.filter(issue => issue.level === 'error');
      if (errors.length) return res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: errors[0].message, issues: errors } });
    }

    if (input.campaignId) {
      const campaign = await prisma.campaign.findUnique({ where: { id: input.campaignId } });
      if (!campaign || campaign.ownerId !== req.user!.id || campaign.archivedAt) {
        return res.status(400).json({ error: { code: 'INVALID_CAMPAIGN', message: 'Campaign does not exist, belong to you, or is archived' } });
      }
    }

    const requestedTagIds = input.tagIds === undefined ? undefined : [...new Set(input.tagIds)];
    if (requestedTagIds) {
      const tags = await prisma.tag.findMany({ where: { id: { in: requestedTagIds }, ownerId: req.user!.id } });
      if (tags.length !== requestedTagIds.length) {
        return res.status(400).json({ error: { code: 'INVALID_TAGS', message: 'One or more tags do not belong to you' } });
      }
    }

    const data: any = {};
    if (input.destinationUrl !== undefined) data.destinationUrl = input.destinationUrl;
    if (input.title !== undefined) data.title = input.title;
    if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (input.clickLimit !== undefined) data.clickLimit = input.clickLimit === 0 ? null : input.clickLimit;
    if (input.campaignId !== undefined) data.campaignId = input.campaignId;
    if (input.password !== undefined) data.passwordHash = input.password ? await bcrypt.hash(input.password, 10) : null;

    const updated = await prisma.link.update({
      where: { id },
      data
    });

    if (requestedTagIds !== undefined) {
      await prisma.$transaction(async transaction => {
        await transaction.linkTag.deleteMany({ where: { linkId: id } });
        if (requestedTagIds.length) {
          await transaction.linkTag.createMany({ data: requestedTagIds.map(tagId => ({ linkId: id, tagId })) });
        }
      });
    }

    await linkCache.delete(link.alias);
    await linkCache.delete(updated.alias);
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
    await linkCache.delete(link.alias);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
