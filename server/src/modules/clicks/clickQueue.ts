import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';
import { isbot } from 'isbot'; // fixed import
import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { config } from '../../config';

export interface ClickEventInput {
  linkId: string;
  source: 'LINK' | 'QR';
  ip: string;
  userAgent: string;
  referrer?: string;
  hasClickLimit: boolean;
}

export interface BlockedAttemptInput {
  linkId: string;
  reason: 'DISABLED' | 'EXPIRED' | 'LIMIT_REACHED' | 'WRONG_PASSWORD';
  ip: string;
  userAgent: string;
}

let clickBuffer: any[] = [];
let blockBuffer: any[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

function hashVisitor(ip: string, ua: string): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const data = `${ip}|${ua}|${dateStr}|${config.serverSalt}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

function deriveChannel(referrer: string | undefined): 'DIRECT' | 'SOCIAL' | 'SEARCH' | 'EMAIL' | 'OTHER_SITE' {
  if (!referrer) return 'DIRECT';
  try {
    const host = new URL(referrer).hostname;
    if (/instagram|facebook|x\.com|twitter|linkedin|youtube|reddit|whatsapp|t\.me|pinterest/.test(host)) return 'SOCIAL';
    if (/google|bing|duckduckgo|yahoo/.test(host)) return 'SEARCH';
    if (/mail\.google|outlook|mail\.yahoo/.test(host)) return 'EMAIL';
    return 'OTHER_SITE';
  } catch {
    return 'DIRECT';
  }
}

function deriveDevice(type: string | undefined): 'DESKTOP' | 'MOBILE' | 'TABLET' | 'OTHER' {
  if (type === 'mobile') return 'MOBILE';
  if (type === 'tablet') return 'TABLET';
  if (type === undefined) return 'DESKTOP';
  return 'OTHER';
}

function enrichClick(input: ClickEventInput) {
  const parser = new UAParser(input.userAgent);
  const result = parser.getResult();
  const bot = isbot(input.userAgent);

  const ipToUse = (process.env.NODE_ENV === 'development' && process.env.GEO_DEV_IP_OVERRIDE)
    ? process.env.GEO_DEV_IP_OVERRIDE
    : input.ip;

  const geo = geoip.lookup(ipToUse);

  return {
    linkId: input.linkId,
    source: input.source,
    isBot: bot,
    visitorHash: hashVisitor(input.ip, input.userAgent),
    referrer: input.referrer ? new URL(input.referrer).hostname : null,
    channel: deriveChannel(input.referrer),
    device: deriveDevice(result.device.type),
    browser: result.browser.name || null,
    os: result.os.name || null,
    country: geo?.country || null,
    region: geo?.region || null,
    city: geo?.city || null,
    lat: geo?.ll ? parseFloat(geo.ll[0].toFixed(1)) : null,
    lng: geo?.ll ? parseFloat(geo.ll[1].toFixed(1)) : null,
    _hasClickLimit: input.hasClickLimit
  };
}

export function enqueueClick(input: ClickEventInput) {
  clickBuffer.push(enrichClick(input));
  scheduleFlush();
}

export function enqueueBlock(input: BlockedAttemptInput) {
  const bot = isbot(input.userAgent);
  const ipToUse = (process.env.NODE_ENV === 'development' && process.env.GEO_DEV_IP_OVERRIDE) ? process.env.GEO_DEV_IP_OVERRIDE : input.ip;
  const geo = geoip.lookup(ipToUse);

  blockBuffer.push({
    linkId: input.linkId,
    reason: input.reason,
    visitorHash: hashVisitor(input.ip, input.userAgent),
    country: geo?.country || null,
    isBot: bot
  });
  scheduleFlush();
}

function scheduleFlush() {
  if (clickBuffer.length >= 50 || blockBuffer.length >= 50) {
    flush();
    return;
  }
  if (!flushTimeout) {
    flushTimeout = setTimeout(flush, 1000);
  }
}

async function flush() {
  if (flushTimeout) clearTimeout(flushTimeout);
  flushTimeout = null;

  const clicksToFlush = [...clickBuffer];
  const blocksToFlush = [...blockBuffer];
  clickBuffer = [];
  blockBuffer = [];

  if (clicksToFlush.length === 0 && blocksToFlush.length === 0) return;

  try {
    if (clicksToFlush.length > 0) {
      const dbClicks = clicksToFlush.map(c => {
        const { _hasClickLimit, ...rest } = c;
        return rest;
      });
      await prisma.clickEvent.createMany({ data: dbClicks });

      const humanClicksNoLimit = clicksToFlush.filter(c => !c.isBot && !c._hasClickLimit);
      const increments: Record<string, number> = {};
      for (const click of humanClicksNoLimit) {
        increments[click.linkId] = (increments[click.linkId] || 0) + 1;
      }

      for (const [linkId, count] of Object.entries(increments)) {
        await prisma.link.update({
          where: { id: linkId },
          data: { clickCount: { increment: count } }
        }).catch(e => console.error(e));
      }
    }
    if (blocksToFlush.length > 0) {
      await prisma.blockedAttempt.createMany({ data: blocksToFlush });
    }
  } catch (error) {
    console.error('Failed to flush click events:', error);
  }
}

process.on('SIGTERM', flush);
process.on('SIGINT', flush);
