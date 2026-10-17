import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || (isProd ? '' : 'supersecretjwtkey'),
  serverSalt: process.env.SERVER_SALT || (isProd ? '' : 'randomsalt'),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:5173',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  isProd
};

if (isProd && (!config.jwtSecret || !config.serverSalt)) {
  console.error("Missing required secure environment variables in production");
  process.exit(1);
}
