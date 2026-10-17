import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import * as queries from './queries';
import { getSmartAlerts } from './alerts';

const router = Router();

router.get('/overview', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const kpis = await queries.getOverviewKPIs(req.user!.id, req.query);
    res.json(kpis);
  } catch (err) {
    next(err);
  }
});

router.get('/timeseries', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const data = await queries.getTimeSeries(req.user!.id, req.query, req.user!.timezone);
    res.json({ series: data });
  } catch (err) {
    next(err);
  }
});

router.get('/breakdowns', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const data = await queries.getBreakdowns(req.user!.id, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/geo', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const data = await queries.getGeoMap(req.user!.id, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/alerts', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const alerts = await getSmartAlerts(req.user!.id);
    res.json({ alerts });
  } catch (err) {
    next(err);
  }
});

export default router;
