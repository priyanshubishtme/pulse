import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/** ADMIN is the platform-wide super-admin role in the current schema. */
export const SUPER_ADMIN_ROLE = 'ADMIN' as const;

export const requireRole = (role: typeof SUPER_ADMIN_ROLE | 'USER') => {
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

export const requireSuperAdmin = requireRole(SUPER_ADMIN_ROLE);
