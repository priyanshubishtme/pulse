import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { requireSuperAdmin } from '../../middleware/requireRole';
import prisma from '../../lib/prisma';
import { linkCache } from '../redirect/linkCache';
import { matchesDomain, normalizeDomain } from '../../lib/domains';

const router = Router();

// Every route in this module is platform-wide and therefore requires the
// ADMIN role, which is the super-admin role in the current schema.
router.use(requireAuth, requireSuperAdmin);

const linkQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.enum(['ACTIVE', 'DISABLED', 'EXPIRED']).optional(),
  ownerId: z.string().trim().min(1).optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'alias', 'clickCount', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
});

const userQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.enum(['all', 'active', 'inactive']).default('all'),
  role: z.enum(['USER', 'ADMIN']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
});

const userStatusSchema = z.object({ isActive: z.boolean() });
const blocklistSchema = z.object({
  domain: z.string().trim().min(1).max(255),
  reason: z.string().trim().max(500).optional()
});
const linkStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'DISABLED']),
  reason: z.string().trim().max(500).optional()
});

function safeUser(user: { id: string; email: string; name: string; role: string; isActive: boolean; timezone: string; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    timezone: user.timezone,
    createdAt: user.createdAt
  };
}

router.get('/overview', async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, totalLinks, totalClicks, botClicks] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.link.count(),
      prisma.clickEvent.count({ where: { isBot: false } }),
      prisma.clickEvent.count({ where: { isBot: true } })
    ]);

    res.json({ stats: { totalUsers, activeUsers, disabledUsers: totalUsers - activeUsers, totalLinks, totalClicks, botClicks } });
  } catch (err) {
    next(err);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const query = userQuerySchema.parse(req.query);
    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.status === 'active') where.isActive = true;
    if (query.status === 'inactive') where.isActive = false;
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { _count: { select: { links: true } } }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users: users.map(user => ({ ...safeUser(user), linkCount: user._count.links })),
      pagination: { page: query.page, pageSize: query.pageSize, total }
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/status', async (req: AuthRequest, res, next) => {
  try {
    const { isActive } = userStatusSchema.parse(req.body);
    const id = req.params.id as string;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });

    if (!isActive && target.id === req.user!.id) {
      return res.status(400).json({ error: { code: 'SELF_DEACTIVATION', message: 'A super-admin cannot disable their own account' } });
    }

    if (!isActive && target.role === 'ADMIN' && target.isActive) {
      const activeAdminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ error: { code: 'LAST_SUPER_ADMIN', message: 'The last active super-admin cannot be disabled' } });
      }
    }

    const user = await prisma.user.update({ where: { id }, data: { isActive } });
    res.json({ user: safeUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/links', async (req, res, next) => {
  try {
    const query = linkQuerySchema.parse(req.query);
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.ownerId) where.ownerId = query.ownerId;
    if (query.search) {
      where.OR = [
        { alias: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { destinationUrl: { contains: query.search, mode: 'insensitive' } },
        { owner: { email: { contains: query.search, mode: 'insensitive' } } }
      ];
    }

    const [links, total] = await Promise.all([
      prisma.link.findMany({
        where,
        include: { owner: { select: { id: true, email: true, name: true } }, campaign: true },
        orderBy: { [query.sort]: query.order },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize
      }),
      prisma.link.count({ where })
    ]);

    res.json({ links, pagination: { page: query.page, pageSize: query.pageSize, total } });
  } catch (err) {
    next(err);
  }
});

async function setLinkStatus(id: string, status: 'ACTIVE' | 'DISABLED', reason?: string) {
  const existing = await prisma.link.findUnique({ where: { id } });
  if (!existing) throw { status: 404, code: 'NOT_FOUND', message: 'Link not found' };

  const link = await prisma.link.update({
    where: { id },
    data: {
      status,
      disabledReason: status === 'DISABLED' ? (reason || 'Admin action') : null
    }
  });
  await linkCache.delete(link.alias);
  return link;
}

router.patch('/links/:id/status', async (req, res, next) => {
  try {
    const { status, reason } = linkStatusSchema.parse(req.body);
    const link = await setLinkStatus(req.params.id as string, status, reason);
    res.json({ success: true, link });
  } catch (err) {
    next(err);
  }
});

// Kept for the existing admin screen; the status endpoint is the canonical API.
router.post('/links/:id/disable', async (req, res, next) => {
  try {
    const reason = z.object({ reason: z.string().trim().max(500).optional() }).parse(req.body).reason;
    const link = await setLinkStatus(req.params.id as string, 'DISABLED', reason);
    res.json({ success: true, link });
  } catch (err) {
    next(err);
  }
});

router.get('/activity', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const [clicks, blockedAttempts] = await Promise.all([
      prisma.clickEvent.findMany({
        orderBy: { occurredAt: 'desc' },
        take: limit,
        select: { id: true, occurredAt: true, source: true, isBot: true, link: { select: { id: true, alias: true, owner: { select: { id: true, email: true } } } } }
      }),
      prisma.blockedAttempt.findMany({
        orderBy: { occurredAt: 'desc' },
        take: limit,
        select: { id: true, occurredAt: true, reason: true, isBot: true, link: { select: { id: true, alias: true, owner: { select: { id: true, email: true } } } } }
      })
    ]);

    const activity = [
      ...clicks.map(event => ({ id: event.id, type: 'CLICK' as const, occurredAt: event.occurredAt, source: event.source, isBot: event.isBot, link: event.link })),
      ...blockedAttempts.map(event => ({ id: event.id, type: 'BLOCKED_ATTEMPT' as const, occurredAt: event.occurredAt, reason: event.reason, isBot: event.isBot, link: event.link }))
    ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, limit);

    res.json({ activity });
  } catch (err) {
    next(err);
  }
});

router.get('/blocklist', async (req, res, next) => {
  try {
    const domains = await prisma.blockedDomain.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ domains: domains.map(domain => ({ ...domain, domain: normalizeDomain(domain.domain) || domain.domain })) });
  } catch (err) {
    next(err);
  }
});

router.post('/blocklist', async (req, res, next) => {
  try {
    const input = blocklistSchema.parse(req.body);
    const domain = normalizeDomain(input.domain);
    if (!domain) return res.status(400).json({ error: { code: 'INVALID_DOMAIN', message: 'A valid hostname is required' } });

    const existing = await prisma.blockedDomain.findMany({ select: { id: true, domain: true } });
    if (existing.some(entry => matchesDomain(domain, entry.domain) && normalizeDomain(entry.domain) === domain)) {
      return res.status(409).json({ error: { code: 'DOMAIN_ALREADY_BLOCKED', message: 'Domain is already blocklisted' } });
    }

    const blocked = await prisma.blockedDomain.create({ data: { domain, reason: input.reason || null } });
    await linkCache.clear();
    res.status(201).json({ blocked });
  } catch (err) {
    next(err);
  }
});

router.delete('/blocklist/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.blockedDomain.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Blocked domain not found' } });
    await prisma.blockedDomain.delete({ where: { id } });
    await linkCache.clear();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
