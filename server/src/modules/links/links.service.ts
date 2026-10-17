import prisma from '../../lib/prisma';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { checkAlias, generateAlias } from './aliasService';
import { validateDestination, ValidationIssue } from './urlValidator';

export const linkSchema = z.object({
  destinationUrl: z.string().url(),
  alias: z.string().optional(),
  title: z.string().max(120).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  clickLimit: z.number().int().min(0).max(1000000000).optional().nullable(),
  password: z.string().min(6).max(72).optional(),
  campaignId: z.string().optional().nullable(),
  tagIds: z.array(z.string()).max(10).optional(),
});

export async function validateLink(data: any, ownerId: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  // Zod parsing first
  try {
    linkSchema.parse(data);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      err.issues.forEach((e: any) => {
        issues.push({ field: String(e.path[0]), level: 'error', code: 'VALIDATION_ERROR', message: e.message });
      });
    }
    return issues;
  }

  // URL Validation
  const urlIssues = await validateDestination(data.destinationUrl, ownerId);
  issues.push(...urlIssues);

  // Alias Validation
  if (data.alias) {
    const { available, reason } = await checkAlias(data.alias);
    if (!available) {
      issues.push({ field: 'alias', level: 'error', code: 'ALIAS_UNAVAILABLE', message: reason || 'Alias unavailable' });
    }
  }

  // Expiry validation
  if (data.expiresAt) {
    const exp = new Date(data.expiresAt);
    if (exp <= new Date()) {
      issues.push({ field: 'expiresAt', level: 'error', code: 'EXPIRY_IN_PAST', message: 'Expiry must be in the future' });
    }
    const oneHour = new Date(Date.now() + 60 * 60 * 1000);
    const fiveYears = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000);
    if (exp < oneHour) issues.push({ field: 'expiresAt', level: 'warning', code: 'EXPIRY_SOON', message: 'Expiry is less than 1 hour away' });
    if (exp > fiveYears) issues.push({ field: 'expiresAt', level: 'error', code: 'EXPIRY_TOO_FAR', message: 'Expiry cannot be more than 5 years away' });
  }

  // Campaign validation
  if (data.campaignId) {
    const campaign = await prisma.campaign.findUnique({ where: { id: data.campaignId } });
    if (!campaign || campaign.ownerId !== ownerId) {
      issues.push({ field: 'campaignId', level: 'error', code: 'INVALID_CAMPAIGN', message: 'Campaign does not exist or belong to you' });
    } else if (campaign.archivedAt) {
      issues.push({ field: 'campaignId', level: 'error', code: 'CAMPAIGN_ARCHIVED', message: 'Cannot assign to an archived campaign' });
    } else {
      if (campaign.endsAt && new Date() > campaign.endsAt) {
         issues.push({ field: 'campaignId', level: 'warning', code: 'CAMPAIGN_ENDED', message: 'This campaign has already ended' });
      }
      if (campaign.startsAt && new Date() < campaign.startsAt) {
         issues.push({ field: 'campaignId', level: 'info', code: 'CAMPAIGN_UPCOMING', message: 'This campaign has not started yet' });
      }
      if (data.expiresAt && campaign.endsAt && new Date(data.expiresAt) > campaign.endsAt) {
         issues.push({ field: 'expiresAt', level: 'warning', code: 'EXPIRY_AFTER_CAMPAIGN', message: 'Link expires after the campaign ends' });
      }
    }
  }

  // Tags validation
  if (data.tagIds && data.tagIds.length > 0) {
    const tags = await prisma.tag.findMany({ where: { id: { in: data.tagIds }, ownerId } });
    if (tags.length !== data.tagIds.length) {
      issues.push({ field: 'tagIds', level: 'error', code: 'INVALID_TAGS', message: 'One or more tags do not belong to you' });
    }
  }

  return issues;
}

export async function createLink(data: any, ownerId: string) {
  const issues = await validateLink(data, ownerId);
  if (issues.some(i => i.level === 'error')) {
    throw { status: 400, code: 'VALIDATION_FAILED', message: 'Link validation failed', issues };
  }

  let finalAlias = data.alias ? data.alias.toLowerCase().trim() : await generateAlias();

  let passwordHash = null;
  if (data.password) {
    passwordHash = await bcrypt.hash(data.password, 10);
  }

  const link = await prisma.link.create({
    data: {
      ownerId,
      campaignId: data.campaignId || null,
      alias: finalAlias,
      destinationUrl: data.destinationUrl,
      title: data.title,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      clickLimit: data.clickLimit === 0 ? null : data.clickLimit, // 0 means unlimited UI side
      passwordHash,
      tags: data.tagIds ? {
        create: data.tagIds.map((id: string) => ({ tagId: id }))
      } : undefined
    },
    include: { tags: { include: { tag: true } } }
  });

  return link;
}

export async function getLinks(ownerId: string) {
  return prisma.link.findMany({
    where: { ownerId },
    include: { tags: { include: { tag: true } }, campaign: true },
    orderBy: { createdAt: 'desc' }
  });
}
