import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkey',
  serverSalt: process.env.SERVER_SALT || 'randomsalt',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:5173',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  isProd: process.env.NODE_ENV === 'production'
};
