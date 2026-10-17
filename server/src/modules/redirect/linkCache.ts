import { LRUCache } from 'lru-cache';
import { Link } from '@prisma/client';

export const linkCache = new LRUCache<string, Link>({
  max: 5000,
  ttl: 1000 * 30, // 30 seconds
});
