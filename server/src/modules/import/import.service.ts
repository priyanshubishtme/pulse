import prisma from '../../lib/prisma';
import { validateDestination } from '../links/urlValidator';
import { checkAlias, generateAlias } from '../links/aliasService';

export async function processImportBatch(rows: any[], ownerId: string, campaignId?: string) {
  if (!Array.isArray(rows) || rows.length === 0) throw { status: 400, message: 'No data rows found' };
  if (rows.length > 1000) throw { status: 400, message: 'Max 1000 rows allowed per batch' };

  if (campaignId) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.ownerId !== ownerId || campaign.archivedAt) {
      throw { status: 400, code: 'INVALID_CAMPAIGN', message: 'Campaign does not exist, belong to you, or is archived' };
    }
  }

  let added = 0;
  let rejected = 0;
  let duplicates = 0;

  const processedRows: any[] = [];

  // Create the batch record
  const batch = await prisma.importBatch.create({
    data: { ownerId, added: 0, rejected: 0, duplicates: 0 }
  });

  // Track aliases inside the same file to prevent double-booking
  const fileAliases = new Set<string>();

  // Process sequentially to honor unique aliases and DB transaction logic properly
  for (const row of rows) {
    let outcome = 'ADDED';
    let finalAlias = row.alias ? row.alias.trim().toLowerCase() : null;

    try {
      // 1. URL Validation
      const urlIssues = await validateDestination(row.url, ownerId);
      if (urlIssues.some(i => i.level === 'error')) {
        outcome = 'INVALID_URL';
      }

      // 2. Alias Validation
      if (outcome === 'ADDED') {
        if (finalAlias) {
          if (fileAliases.has(finalAlias)) {
            outcome = 'DUPLICATE_ALIAS';
          } else {
            const { available } = await checkAlias(finalAlias);
            if (!available) outcome = 'DUPLICATE_ALIAS';
          }
        } else {
          finalAlias = await generateAlias();
        }
      }

      // 3. Process Tags
      let tagIdsToConnect: string[] = [];
      if (outcome === 'ADDED' && row.tags) {
        const tagNames = row.tags.split(';').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
        for (const tName of tagNames.slice(0, 10)) {
          let t = await prisma.tag.findFirst({ where: { ownerId, name: { equals: tName, mode: 'insensitive' } } });
          if (!t) {
            t = await prisma.tag.create({ data: { ownerId, name: tName } });
          }
          tagIdsToConnect.push(t.id);
        }
      }

      // 4. Create Link
      if (outcome === 'ADDED') {
        fileAliases.add(finalAlias as string);
        await prisma.link.create({
          data: {
            ownerId,
            campaignId: campaignId || null,
            destinationUrl: row.url,
            alias: finalAlias as string,
            tags: tagIdsToConnect.length > 0 ? { create: tagIdsToConnect.map(id => ({ tagId: id })) } : undefined
          }
        });
        added++;
      } else if (outcome === 'DUPLICATE_ALIAS') {
        duplicates++;
      } else {
        rejected++;
      }

    } catch (e) {
      outcome = 'INVALID_URL'; // Fallback generic error
      rejected++;
    }

    processedRows.push({
      batchId: batch.id,
      url: row.url,
      alias: finalAlias || row.alias || null,
      outcome
    });
  }

  // Update batch stats and insert rows
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { added, rejected, duplicates }
  });

  await prisma.importRow.createMany({ data: processedRows });

  return { batchId: batch.id, added, rejected, duplicates, rows: processedRows };
}
