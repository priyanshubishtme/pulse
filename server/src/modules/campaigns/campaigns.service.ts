import prisma from '../../lib/prisma';
import { z } from 'zod';
import { CampaignCategory } from '@prisma/client';

export const campaignSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60, 'Name must be at most 60 characters').trim(),
  category: z.nativeEnum(CampaignCategory),
  description: z.string().max(500).optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
}).refine(data => {
  if (data.startsAt && data.endsAt) {
    return new Date(data.startsAt) <= new Date(data.endsAt);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endsAt'],
});

export async function createCampaign(data: any, ownerId: string) {
  const parsed = campaignSchema.parse(data);

  // Check unique case-insensitive name
  const existing = await prisma.$queryRaw`
    SELECT id FROM "Campaign" WHERE "ownerId" = ${ownerId} AND LOWER("name") = LOWER(${parsed.name})
  ` as any[];

  if (existing.length > 0) {
    throw { status: 400, code: 'CAMPAIGN_NAME_TAKEN', message: 'Campaign name must be unique' };
  }

  return prisma.campaign.create({
    data: {
      ownerId,
      name: parsed.name,
      category: parsed.category,
      description: parsed.description,
      startsAt: parsed.startsAt ? new Date(parsed.startsAt) : null,
      endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
    }
  });
}

export async function updateCampaign(id: string, ownerId: string, data: any) {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign || campaign.ownerId !== ownerId) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Campaign not found' };
  }

  const parsed = campaignSchema.parse(data);

  if (parsed.name.toLowerCase() !== campaign.name.toLowerCase()) {
    const existing = await prisma.$queryRaw`
      SELECT id FROM "Campaign" WHERE "ownerId" = ${ownerId} AND LOWER("name") = LOWER(${parsed.name})
    ` as any[];
    if (existing.length > 0) {
      throw { status: 400, code: 'CAMPAIGN_NAME_TAKEN', message: 'Campaign name must be unique' };
    }
  }

  return prisma.campaign.update({
    where: { id },
    data: {
      name: parsed.name,
      category: parsed.category,
      description: parsed.description,
      startsAt: parsed.startsAt ? new Date(parsed.startsAt) : null,
      endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
    }
  });
}

export async function archiveCampaign(id: string, ownerId: string) {
  return prisma.campaign.updateMany({
    where: { id, ownerId },
    data: { archivedAt: new Date() }
  });
}

export async function unarchiveCampaign(id: string, ownerId: string) {
  return prisma.campaign.updateMany({
    where: { id, ownerId },
    data: { archivedAt: null }
  });
}

export async function deleteCampaign(id: string, ownerId: string) {
  // Cascading rule: Deleting a campaign sets link.campaignId to NULL, preserving links.
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign || campaign.ownerId !== ownerId) throw { status: 404, code: 'NOT_FOUND', message: 'Not found' };

  return prisma.campaign.delete({ where: { id } });
}

export async function getCampaigns(ownerId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: { ownerId },
    include: {
      _count: { select: { links: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const now = new Date();

  return campaigns.map(c => {
    let state = 'ACTIVE';
    if (c.archivedAt) state = 'ARCHIVED';
    else if (c.endsAt && c.endsAt < now) state = 'ENDED';
    else if (c.startsAt && c.startsAt > now) state = 'UPCOMING';

    return {
      ...c,
      state,
      linksCount: c._count.links
    };
  });
}
