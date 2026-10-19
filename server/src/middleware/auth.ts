import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    timezone: string;
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as any;
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    }

    // Verify user exists and get fresh role/timezone
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, timezone: true, isActive: true }
    });

    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: { code: 'ACCOUNT_DISABLED', message: 'Account is disabled' } });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
  }
};
