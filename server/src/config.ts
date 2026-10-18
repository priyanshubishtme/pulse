import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || (isProd ? '' : 'supersecretjwtkey'),
  serverSalt: process.env.SERVER_SALT || (isProd ? '' : 'randomsalt'),
  appUrl: process.env.APP_URL || 'http://localhost:5174',
  redisUrl: process.env.REDIS_URL || '',
  isProd
};

if (isProd && (!config.jwtSecret || !config.serverSalt || !config.redisUrl)) {
  console.error("Missing required production environment variables: JWT_SECRET, SERVER_SALT, and REDIS_URL are required");
  process.exit(1);
}
