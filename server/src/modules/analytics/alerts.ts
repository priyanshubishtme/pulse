import prisma from '../../lib/prisma';

export async function getSmartAlerts(ownerId: string) {
  const alerts: string[] = [];
  const now = new Date();

  const links = await prisma.link.findMany({ where: { ownerId } });

  for (const link of links) {
    if (link.status === 'ACTIVE') {
      // 1. Expiring soon (within 7 days)
      if (link.expiresAt) {
        const msToExpiry = link.expiresAt.getTime() - now.getTime();
        if (msToExpiry > 0 && msToExpiry < 7 * 24 * 60 * 60 * 1000) {
          alerts.push(`Link ${link.alias} is expiring within 7 days.`);
        }
      }

      // 2. Click limit approached (>= 80%)
      if (link.clickLimit && link.clickCount >= (link.clickLimit * 0.8)) {
        const pct = Math.round((link.clickCount / link.clickLimit) * 100);
        alerts.push(`Link ${link.alias} is at ${pct}% of its click limit.`);
      }

      // 3. Dead link (0 clicks in 14 days)
      if (link.createdAt.getTime() < now.getTime() - 14 * 24 * 60 * 60 * 1000) {
        const recentClicks = await prisma.clickEvent.count({
          where: { linkId: link.id, occurredAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) } }
        });
        if (recentClicks === 0) {
          alerts.push(`Link ${link.alias} has 0 clicks in the last 14 days.`);
        }
      }
    }
  }

  // 4. Blocked visits recorded
  const recentBlocks = await prisma.blockedAttempt.count({
    where: { link: { ownerId }, occurredAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }
  });
  if (recentBlocks > 0) {
    alerts.push(`There have been ${recentBlocks} blocked visits (limit/expired/disabled/password) in the last 24 hours.`);
  }

  return alerts;
}
