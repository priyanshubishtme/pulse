import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';
import { isbot } from 'isbot';
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import os from 'os';
import prisma from '../../lib/prisma';
import { config } from '../../config';
import { redisClient } from '../../lib/redis';

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

type ClickPayload = ReturnType<typeof enrichClick>;
type BlockPayload = ReturnType<typeof enrichBlock>;
type QueuedEvent = { type: 'click'; payload: ClickPayload } | { type: 'block'; payload: BlockPayload };

const streamName = 'linkpulse:analytics:events';
const consumerGroup = 'linkpulse:analytics:persist';
const consumerName = `${os.hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`;
const localQueue: QueuedEvent[] = [];
let flushTimeout: NodeJS.Timeout | null = null;
let localFlushRunning = false;
let workerRunning = false;
let workerTask: Promise<void> | null = null;
let blockingClient: typeof redisClient = null;

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

function safeReferrerHost(referrer: string | undefined): string | null {
  if (!referrer) return null;
  try { return new URL(referrer).hostname.toLowerCase(); } catch { return null; }
}

function deriveDevice(type: string | undefined): 'DESKTOP' | 'MOBILE' | 'TABLET' | 'OTHER' {
  if (type === 'mobile') return 'MOBILE';
  if (type === 'tablet') return 'TABLET';
  if (type === undefined) return 'DESKTOP';
  return 'OTHER';
}

function visitorGeo(ip: string) {
  const ipToUse = process.env.NODE_ENV === 'development' && process.env.GEO_DEV_IP_OVERRIDE
    ? process.env.GEO_DEV_IP_OVERRIDE
    : ip;
  return geoip.lookup(ipToUse);
}

function enrichClick(input: ClickEventInput) {
  const parser = new UAParser(input.userAgent);
  const result = parser.getResult();
  const geo = visitorGeo(input.ip);
  return {
    eventId: randomUUID(),
    linkId: input.linkId,
    source: input.source,
    isBot: isbot(input.userAgent),
    visitorHash: hashVisitor(input.ip, input.userAgent),
    referrer: safeReferrerHost(input.referrer),
    channel: deriveChannel(input.referrer),
    device: deriveDevice(result.device.type),
    browser: result.browser.name || null,
    os: result.os.name || null,
    country: geo?.country || null,
    region: geo?.region || null,
    city: geo?.city || null,
    lat: geo?.ll ? parseFloat(geo.ll[0].toFixed(1)) : null,
    lng: geo?.ll ? parseFloat(geo.ll[1].toFixed(1)) : null,
    hasClickLimit: input.hasClickLimit
  };
}

function enrichBlock(input: BlockedAttemptInput) {
  const geo = visitorGeo(input.ip);
  return {
    eventId: randomUUID(),
    linkId: input.linkId,
    reason: input.reason,
    visitorHash: hashVisitor(input.ip, input.userAgent),
    country: geo?.country || null,
    isBot: isbot(input.userAgent)
  };
}

async function publish(event: QueuedEvent): Promise<void> {
  if (redisClient?.isReady) {
    try {
      await redisClient.xAdd(streamName, '*', {
        type: event.type,
        payload: JSON.stringify(event.payload)
      });
      return;
    } catch (error) {
      console.error('Redis event enqueue failed; using local fallback:', error);
    }
  }

  localQueue.push(event);
  scheduleLocalFlush();
}

export async function enqueueClick(input: ClickEventInput): Promise<void> {
  await publish({ type: 'click', payload: enrichClick(input) });
}

export async function enqueueBlock(input: BlockedAttemptInput): Promise<void> {
  await publish({ type: 'block', payload: enrichBlock(input) });
}

async function persistEvent(event: QueuedEvent): Promise<void> {
  try {
    await prisma.$transaction(async transaction => {
      if (event.type === 'click') {
        const { eventId, hasClickLimit, ...data } = event.payload;
        await transaction.clickEvent.create({ data: { id: eventId, ...data } });
        if (!event.payload.isBot && !hasClickLimit) {
          await transaction.link.update({ where: { id: event.payload.linkId }, data: { clickCount: { increment: 1 } } });
        }
      } else {
        const { eventId, ...data } = event.payload;
        await transaction.blockedAttempt.create({ data: { id: eventId, ...data } });
      }
    });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    // A repeated stream delivery is safe: the event ID is the database ID and
    // the click counter is updated in the same transaction as the event row.
    if (code === 'P2002') return;
    // The owner deleted the link while the event was queued; cascade semantics
    // mean that this analytics row can no longer be retained.
    if (code === 'P2003' || code === 'P2025') {
      console.warn('Dropping queued analytics event for a deleted link');
      return;
    }
    throw error;
  }
}

function scheduleLocalFlush() {
  if (localQueue.length >= 50) {
    void flushLocal();
    return;
  }
  if (!flushTimeout) flushTimeout = setTimeout(() => void flushLocal(), 1000);
}

async function flushLocal() {
  if (flushTimeout) clearTimeout(flushTimeout);
  flushTimeout = null;
  if (localFlushRunning || localQueue.length === 0) return;
  localFlushRunning = true;
  const batch = localQueue.splice(0, 100);
  try {
    for (const event of batch) await persistEvent(event);
  } catch (error) {
    console.error('Failed to persist local analytics fallback:', error);
    localQueue.unshift(...batch);
  } finally {
    localFlushRunning = false;
    if (localQueue.length) scheduleLocalFlush();
  }
}

async function ensureConsumerGroup() {
  try {
    await redisClient!.xGroupCreate(streamName, consumerGroup, '0', { MKSTREAM: true });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('BUSYGROUP')) throw error;
  }
}

async function handleStreamMessage(id: string, fields: Record<string, string>) {
  try {
    const payload = JSON.parse(fields.payload) as ClickPayload | BlockPayload;
    const event: QueuedEvent = fields.type === 'click'
      ? { type: 'click', payload: payload as ClickPayload }
      : { type: 'block', payload: payload as BlockPayload };
    await persistEvent(event);
    await redisClient!.xAck(streamName, consumerGroup, id);
    await redisClient!.xDel(streamName, id);
  } catch (error) {
    console.error(`Redis analytics event ${id} remains pending for retry:`, error);
  }
}

async function redisWorker() {
  let lastClaimAt = 0;
  while (workerRunning) {
    if (!redisClient?.isReady || !blockingClient?.isReady) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }
    try {
      if (Date.now() - lastClaimAt >= 10_000) {
        lastClaimAt = Date.now();
        const claimed = await redisClient.xAutoClaim(streamName, consumerGroup, consumerName, 30_000, '0-0', { COUNT: 25 });
        for (const message of claimed.messages) {
          if (message) await handleStreamMessage(message.id, message.message);
        }
      }

      const batches = await blockingClient.xReadGroup(
        consumerGroup,
        consumerName,
        [{ key: streamName, id: '>' }],
        { COUNT: 25, BLOCK: 1000 }
      );
      for (const stream of batches ?? []) {
        for (const message of stream.messages) {
          if (message) await handleStreamMessage(message.id, message.message);
        }
      }
    } catch (error) {
      if (workerRunning) {
        console.error('Redis analytics worker error; retrying:', error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}

export async function startClickQueue(): Promise<void> {
  if (!redisClient) return;
  await ensureConsumerGroup();
  blockingClient = redisClient.duplicate();
  blockingClient.on('error', error => console.error('Redis stream reader error:', error));
  await blockingClient.connect();
  workerRunning = true;
  workerTask = redisWorker();
  console.log(`Redis analytics stream ready (${streamName})`);
}

export async function stopClickQueue(): Promise<void> {
  workerRunning = false;
  if (flushTimeout) clearTimeout(flushTimeout);
  flushTimeout = null;
  await flushLocal();
  if (blockingClient?.isOpen) await blockingClient.quit();
  await workerTask;
}
