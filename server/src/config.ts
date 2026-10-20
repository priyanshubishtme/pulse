import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProd = process.env.NODE_ENV === 'production';
const renderExternalUrl = process.env.RENDER_EXTERNAL_URL || '';

export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || (isProd ? '' : 'supersecretjwtkey'),
  serverSalt: process.env.SERVER_SALT || (isProd ? '' : 'randomsalt'),
  appUrl: process.env.APP_URL || renderExternalUrl || 'http://localhost:5174',
  redisUrl: process.env.REDIS_URL || '',
  isProd
};

if (isProd && (!config.jwtSecret || !config.serverSalt)) {
  console.error("Missing required production environment variables: JWT_SECRET and SERVER_SALT are required");
  process.exit(1);
}

if (isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(config.appUrl)) {
  console.error('Invalid production APP_URL: it must be the public Render URL, not localhost.');
  process.exit(1);
}
