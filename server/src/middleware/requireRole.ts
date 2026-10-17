import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireRole = (role: 'ADMIN' | 'USER') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: `Requires ${role} role` } });
    }

    next();
  };
};
