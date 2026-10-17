import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errors';
import { config } from './config';
import authRoutes from './modules/auth/auth.routes';
import linkRoutes from './modules/links/links.routes';
import redirectRoutes from './modules/redirect/redirect.routes';
import campaignsRoutes from './modules/campaigns/campaigns.routes';
import tagsRoutes from './modules/tags/tags.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import importRoutes from './modules/import/import.routes';
import adminRoutes from './modules/admin/admin.routes';

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config.appUrl, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Core API Routes
app.use('/api/auth', authRoutes);
app.use('/api/links', linkRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/import', importRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Use Redirect Routes
app.use('/', redirectRoutes);

// Error handling must be last
app.use(errorHandler);

export default app;
