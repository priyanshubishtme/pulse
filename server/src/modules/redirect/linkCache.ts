import { LRUCache } from 'lru-cache';
import { Link } from '@prisma/client';
import { redisClient } from '../../lib/redis';

const localCache = new LRUCache<string, Link>({ max: 5000, ttl: 30_000 });
const redisKey = (alias: string) => `linkpulse:link:${alias}`;

function hydrateLink(value: string): Link | null {
  try {
    const parsed = JSON.parse(value) as Link;
    if (parsed.expiresAt) parsed.expiresAt = new Date(parsed.expiresAt);
    parsed.createdAt = new Date(parsed.createdAt);
    parsed.updatedAt = new Date(parsed.updatedAt);
    return parsed;
  } catch {
    return null;
  }
}

export const linkCache = {
  async get(alias: string): Promise<Link | null> {
    if (redisClient?.isReady) {
      try {
        const value = await redisClient.get(redisKey(alias));
        return value ? hydrateLink(value) : null;
      } catch (error) {
        console.error('Redis link cache read failed:', error);
        return localCache.get(alias) ?? null;
      }
    }
    return localCache.get(alias) ?? null;
  },

  async set(alias: string, link: Link): Promise<void> {
    if (redisClient?.isReady) {
      try {
        await redisClient.set(redisKey(alias), JSON.stringify(link), { EX: 30 });
      } catch (error) {
        console.error('Redis link cache write failed:', error);
      }
    }
    localCache.set(alias, link);
  },

  async delete(alias: string): Promise<void> {
    localCache.delete(alias);
    if (!redisClient?.isReady) return;
    try {
      await redisClient.del(redisKey(alias));
    } catch (error) {
      console.error('Redis link cache invalidation failed:', error);
    }
  },

  async clear(): Promise<void> {
    localCache.clear();
    if (!redisClient?.isReady) return;
    try {
      const keys: string[] = [];
      for await (const key of redisClient.scanIterator({ MATCH: 'linkpulse:link:*', COUNT: 100 })) {
        keys.push(String(key));
      }
      if (keys.length) await redisClient.del(keys);
    } catch (error) {
      console.error('Redis link cache clear failed:', error);
    }
  }
};
