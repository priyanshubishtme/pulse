import { createClient } from 'redis';
import { config } from '../config';

export const redisClient = config.redisUrl
  ? createClient({ url: config.redisUrl })
  : null;

if (redisClient) {
  redisClient.on('error', error => console.error('Redis client error:', error));
  redisClient.on('reconnecting', () => console.warn('Redis reconnecting'));
}

export async function connectRedis(): Promise<void> {
  if (!redisClient || redisClient.isOpen) return;
  await redisClient.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient?.isOpen) await redisClient.quit();
}
