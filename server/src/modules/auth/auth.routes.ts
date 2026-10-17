import { Router } from 'express';
import { signup, login, signupSchema, loginSchema } from './auth.service';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { config } from '../../config';

const router = Router();

router.post('/signup', async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);
    const { user, token } = await signup(data);
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: config.isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const { user, token } = await login(data);
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: config.isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ success: true });
});

router.get('/me', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    // req.user is populated by requireAuth
    res.status(200).json({ user: req.user });
  } catch (err) {
    next(err);
  }
});

export default router;
