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

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ 
  origin: config.publicBaseUrl, 
  credentials: true 
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Core API Routes
app.use('/api/auth', authRoutes);
app.use('/api/links', linkRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Use Redirect Routes (also mounts public unlock)
app.use('/', redirectRoutes);

// Error handling must be last
app.use(errorHandler);

export default app;
