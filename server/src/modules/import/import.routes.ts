import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { processImportBatch } from './import.service';
import rateLimit from 'express-rate-limit';

const router = Router();

const importLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many imports.' } }
});

router.post('/commit', requireAuth, importLimiter, async (req: AuthRequest, res, next) => {
  try {
    const { rows, campaignId } = req.body;
    const result = await processImportBatch(rows, req.user!.id, campaignId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
