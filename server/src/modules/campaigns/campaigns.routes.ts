import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import * as service from './campaigns.service';
import prisma from '../../lib/prisma';

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const campaign = await service.createCampaign(req.body, req.user!.id);
    res.status(201).json({ campaign });
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const campaigns = await service.getCampaigns(req.user!.id);
    res.json({ campaigns });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id as string;
    const campaign = await service.updateCampaign(id, req.user!.id, req.body);
    res.json({ campaign });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id as string;
    await service.deleteCampaign(id, req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/:id/archive', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id as string;
    await service.archiveCampaign(id, req.user!.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/unarchive', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id as string;
    await service.unarchiveCampaign(id, req.user!.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
