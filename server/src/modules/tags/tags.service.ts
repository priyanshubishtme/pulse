import prisma from '../../lib/prisma';
import { z } from 'zod';

export const tagSchema = z.object({
  name: z.string().min(1).max(30).trim()
});

export async function createTag(data: any, ownerId: string) {
  const parsed = tagSchema.parse(data);
  const existing = await prisma.$queryRaw`
    SELECT id FROM "Tag" WHERE "ownerId" = ${ownerId} AND LOWER("name") = LOWER(${parsed.name})
  ` as any[];

  if (existing.length > 0) {
    throw { status: 400, code: 'TAG_NAME_TAKEN', message: 'Tag name must be unique' };
  }

  return prisma.tag.create({
    data: { ownerId, name: parsed.name }
  });
}

export async function getTags(ownerId: string) {
  return prisma.tag.findMany({
    where: { ownerId },
    include: { _count: { select: { links: true } } },
    orderBy: { name: 'asc' }
  });
}

export async function deleteTag(id: string, ownerId: string) {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag || tag.ownerId !== ownerId) throw { status: 404, code: 'NOT_FOUND', message: 'Tag not found' };
  return prisma.tag.delete({ where: { id } });
}
