import { Router } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import * as service from './tags.service';

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const tag = await service.createTag(req.body, req.user!.id);
    res.status(201).json({ tag });
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const tags = await service.getTags(req.user!.id);
    res.json({ tags });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = req.params.id as string;
    await service.deleteTag(id, req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
