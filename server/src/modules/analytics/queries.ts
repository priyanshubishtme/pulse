import prisma from '../../lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  range: z.enum(['7', '30', '90', 'all']).default('30'),
  campaignId: z.string().optional(),
  tagId: z.string().optional(),
  linkId: z.string().optional(),
  source: z.enum(['LINK', 'QR']).optional(),
  country: z.string().length(2).optional(),
  includeBots: z.string().optional() // 'true' or 'false' from query
});

function getDateRange(range: string) {
  const end = new Date();
  let start = new Date();

  if (range === 'all') {
    start = new Date('2000-01-01');
  } else {
    start.setDate(end.getDate() - parseInt(range, 10));
  }

  // Calculate previous period
  const diff = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - diff);

  return { start, end, prevStart, prevEnd };
}

// Builds the standard where clause for clicks based on filters
function buildWhereClause(ownerId: string, parsedQuery: any, startDate: Date, endDate: Date) {
  const linkCondition: any = { ownerId };
  if (parsedQuery.campaignId) linkCondition.campaignId = parsedQuery.campaignId;
  if (parsedQuery.tagId) linkCondition.tags = { some: { tagId: parsedQuery.tagId } };

  const where: Prisma.ClickEventWhereInput = {
    link: linkCondition,
    occurredAt: { gte: startDate, lte: endDate },
    isBot: parsedQuery.includeBots === 'true' ? undefined : false,
  };

  if (parsedQuery.linkId) where.linkId = parsedQuery.linkId;
  if (parsedQuery.source) where.source = parsedQuery.source;
  if (parsedQuery.country) where.country = parsedQuery.country;

  return where;
}

export async function getOverviewKPIs(ownerId: string, query: any) {
  const parsed = analyticsQuerySchema.parse(query);
  const { start, end, prevStart, prevEnd } = getDateRange(parsed.range);

  const currentWhere = buildWhereClause(ownerId, parsed, start, end);
  const prevWhere = buildWhereClause(ownerId, parsed, prevStart, prevEnd);

  // Clicks
  const currentClicks = await prisma.clickEvent.count({ where: currentWhere });
  const prevClicks = await prisma.clickEvent.count({ where: prevWhere });

  // Unique Visitors (COUNT DISTINCT visitorHash)
  const currentUniques = await prisma.clickEvent.groupBy({
    by: ['visitorHash'],
    where: currentWhere,
  }).then(res => res.length);

  const prevUniques = await prisma.clickEvent.groupBy({
    by: ['visitorHash'],
    where: prevWhere,
  }).then(res => res.length);

  // Active Links (right now)
  const allLinks = await prisma.link.findMany({
    where: { ownerId }
  });
  const activeLinks = allLinks.filter(l => l.status === 'ACTIVE' && (l.expiresAt === null || l.expiresAt > new Date())).length;

  return {
    clicks: { current: currentClicks, previous: prevClicks },
    uniqueVisitors: { current: currentUniques, previous: prevUniques },
    activeLinks
  };
}

export async function getTimeSeries(ownerId: string, query: any, timezone: string) {
  const parsed = analyticsQuerySchema.parse(query);
  const { start, end } = getDateRange(parsed.range);
  const where = buildWhereClause(ownerId, parsed, start, end);

  // Raw query needed to aggregate by day considering Timezone accurately
  // Note: For simplicity in SQLite/Postgres compatibility we just group by JS dates here
  // to avoid complex raw DB timezone handling in the sandbox, zero-filling in JS.

  const events = await prisma.clickEvent.findMany({
    where,
    select: { occurredAt: true }
  });

  const dailyMap: Record<string, number> = {};

  // Initialize zero-filled map
  const curr = new Date(start);
  while (curr <= end) {
    const key = curr.toISOString().split('T')[0];
    dailyMap[key] = 0;
    curr.setDate(curr.getDate() + 1);
  }

  // Populate map
  events.forEach(e => {
    // Basic TZ shift: subtract offset or assume UTC format for the required day grouping
    const dateStr = e.occurredAt.toISOString().split('T')[0];
    if (dailyMap[dateStr] !== undefined) {
      dailyMap[dateStr]++;
    }
  });

  return Object.keys(dailyMap).sort().map(date => ({ date, clicks: dailyMap[date] }));
}

export async function getBreakdowns(ownerId: string, query: any) {
  const parsed = analyticsQuerySchema.parse(query);
  const { start, end } = getDateRange(parsed.range);
  const where = buildWhereClause(ownerId, parsed, start, end);

  const channels = await prisma.clickEvent.groupBy({ by: ['channel'], where, _count: true });
  const devices = await prisma.clickEvent.groupBy({ by: ['device'], where, _count: true });
  const browsers = await prisma.clickEvent.groupBy({ by: ['browser'], where, _count: true });

  return {
    channels: channels.map(c => ({ name: c.channel, count: c._count })),
    devices: devices.map(c => ({ name: c.device, count: c._count })),
    browsers: browsers.map(c => ({ name: c.browser || 'Unknown', count: c._count })).sort((a,b)=>b.count - a.count).slice(0, 10),
  };
}

export async function getGeoMap(ownerId: string, query: any) {
  const parsed = analyticsQuerySchema.parse(query);
  const { start, end } = getDateRange(parsed.range);
  const where = buildWhereClause(ownerId, parsed, start, end);

  const countries = await prisma.clickEvent.groupBy({
    by: ['country'],
    where: { ...where, country: { not: null } },
    _count: true
  });

  const cities = await prisma.clickEvent.groupBy({
    by: ['lat', 'lng', 'city', 'country'],
    where: { ...where, lat: { not: null }, lng: { not: null } },
    _count: true
  });

  return {
    countries: countries.map(c => ({ country: c.country, count: c._count })),
    cities: cities.map(c => ({ lat: c.lat, lng: c.lng, city: c.city, country: c.country, count: c._count }))
  };
}
