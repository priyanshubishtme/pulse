import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with realistic data...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@linkpulse.dev' },
    update: {},
    create: { email: 'admin@linkpulse.dev', name: 'Admin', passwordHash, role: 'ADMIN', timezone: 'UTC' }
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@linkpulse.dev' },
    update: {},
    create: { email: 'user@linkpulse.dev', name: 'Demo User', passwordHash, role: 'USER', timezone: 'UTC' }
  });

  // Default Tags
  const defaultTags = ['Blog', 'A/B Test', 'Internal', 'Seasonal', 'Promotion', 'Newsletter', 'Product Launch'];
  const tags: any[] = [];
  for (const name of defaultTags) {
    const t = await prisma.tag.upsert({
      where: { ownerId_name: { ownerId: user.id, name } },
      update: {},
      create: { ownerId: user.id, name }
    });
    tags.push(t);
  }

  // Campaigns
  const now = new Date();
  const c1 = await prisma.campaign.create({ data: { ownerId: user.id, name: 'Diwali Sale', category: 'EMAIL', startsAt: new Date(now.getTime() - 10*86400000), endsAt: new Date(now.getTime() + 5*86400000) }});
  const c2 = await prisma.campaign.create({ data: { ownerId: user.id, name: 'Product Launch', category: 'SOCIAL_MEDIA', startsAt: new Date(now.getTime() - 20*86400000), endsAt: new Date(now.getTime() - 2*86400000) }});
  const c3 = await prisma.campaign.create({ data: { ownerId: user.id, name: 'Blog Outreach', category: 'SEO', startsAt: new Date(now.getTime() + 5*86400000), endsAt: new Date(now.getTime() + 15*86400000) }});

  // Links
  const linkData = [
    { alias: 'diwali-promo', url: 'https://example.com/diwali', c: c1.id, t: [tags[4].id], limit: null, expires: null, status: 'ACTIVE' },
    { alias: 'launch-tweet', url: 'https://example.com/launch', c: c2.id, t: [tags[6].id], limit: null, expires: null, status: 'ACTIVE' },
    { alias: 'dead-link', url: 'https://example.com/old', c: null, t: [], limit: null, expires: null, status: 'ACTIVE' },
    { alias: 'limited-offer', url: 'https://example.com/limit', c: c1.id, t: [], limit: 100, count: 90, expires: null, status: 'ACTIVE' },
    { alias: 'secret-beta', url: 'https://example.com/beta', c: null, t: [], limit: null, expires: null, status: 'ACTIVE', pw: passwordHash },
    { alias: 'bad-actor', url: 'https://malicious.com', c: null, t: [], limit: null, expires: null, status: 'DISABLED', reason: 'Spam' },
    { alias: 'expired-sale', url: 'https://example.com/sale', c: null, t: [], limit: null, expires: new Date(now.getTime() - 86400000), status: 'EXPIRED' },
    { alias: 'expiring-soon', url: 'https://example.com/soon', c: null, t: [], limit: null, expires: new Date(now.getTime() + 3*86400000), status: 'ACTIVE' }
  ];

  const links: any[] = [];
  for (const ld of linkData) {
    const l = await prisma.link.create({
      data: {
        ownerId: user.id,
        campaignId: ld.c,
        alias: ld.alias,
        destinationUrl: ld.url,
        status: ld.status as any,
        disabledReason: ld.reason || null,
        expiresAt: ld.expires,
        clickLimit: ld.limit,
        clickCount: ld.count || 0,
        passwordHash: ld.pw || null,
        tags: { create: ld.t.map(id => ({ tagId: id })) }
      }
    });
    links.push(l);
  }

  // Generate ~3000 clicks
  console.log('Generating clicks...');
  const clicksToInsert = [];
  const sources = ['LINK', 'LINK', 'LINK', 'LINK', 'QR']; // 20% QR
  const devices = ['MOBILE', 'MOBILE', 'DESKTOP', 'DESKTOP', 'TABLET'];
  const channels = ['SOCIAL', 'SOCIAL', 'SEARCH', 'DIRECT', 'EMAIL'];
  const countries = ['IN', 'IN', 'IN', 'US', 'GB', 'SG', 'AE', 'AU']; // India heavy

  for (let i = 0; i < 3000; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const date = new Date(now.getTime() - daysAgo * 86400000);
    const isBot = Math.random() < 0.05; // 5% bot

    // Spike on 'diwali-promo' today
    let l = links[Math.floor(Math.random() * links.length)];
    if (daysAgo === 0 && Math.random() < 0.5) l = links[0]; // Spike!

    clicksToInsert.push({
      linkId: l.id,
      occurredAt: date,
      source: sources[Math.floor(Math.random() * sources.length)] as any,
      isBot,
      visitorHash: crypto.randomBytes(8).toString('hex'),
      channel: channels[Math.floor(Math.random() * channels.length)] as any,
      device: devices[Math.floor(Math.random() * devices.length)] as any,
      country: countries[Math.floor(Math.random() * countries.length)],
      lat: 19.0, // Mumbai approx
      lng: 72.8
    });
  }

  await prisma.clickEvent.createMany({ data: clicksToInsert });

  // Add some blocked attempts
  await prisma.blockedAttempt.create({
    data: { linkId: links[5].id, reason: 'DISABLED', visitorHash: 'abc', occurredAt: now, country: 'IN', isBot: false }
  });

  console.log('Seed complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
