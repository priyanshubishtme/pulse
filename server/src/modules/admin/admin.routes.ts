import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';
import prisma from '../../lib/prisma';
import { linkCache } from '../redirect/linkCache';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/overview', async (req, res, next) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalLinks = await prisma.link.count();
    const totalClicks = await prisma.clickEvent.count({ where: { isBot: false } });
    const botClicks = await prisma.clickEvent.count({ where: { isBot: true } });

    res.json({ stats: { totalUsers, totalLinks, totalClicks, botClicks } });
  } catch (err) {
    next(err);
  }
});

router.get('/links', async (req, res, next) => {
  try {
    const links = await prisma.link.findMany({
      include: { owner: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ links });
  } catch (err) {
    next(err);
  }
});

router.post('/links/:id/disable', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;
    const link = await prisma.link.update({
      where: { id },
      data: { status: 'DISABLED', disabledReason: reason || 'Admin action' }
    });

    linkCache.delete(link.alias);
    res.json({ success: true, link });
  } catch (err) {
    next(err);
  }
});

router.get('/blocklist', async (req, res, next) => {
  try {
    const domains = await prisma.blockedDomain.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ domains });
  } catch (err) {
    next(err);
  }
});

router.post('/blocklist', async (req, res, next) => {
  try {
    const { domain, reason } = req.body;
    if (!domain) return res.status(400).json({ error: { message: 'Domain required' } });

    const blocked = await prisma.blockedDomain.create({ data: { domain, reason } });
    res.json({ blocked });
  } catch (err) {
    next(err);
  }
});

router.delete('/blocklist/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await prisma.blockedDomain.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
