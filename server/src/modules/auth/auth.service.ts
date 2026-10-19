import prisma from '../../lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { z } from 'zod';

const DEFAULT_TAGS = [
  'Blog',
  'A/B Test',
  'Internal',
  'Seasonal',
  'Promotion',
  'Newsletter',
  'Product Launch'
];

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(72),
  timezone: z.string().default('UTC')
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string()
});

export async function signup(data: z.infer<typeof signupSchema>) {
  // Case-insensitive lookup also prevents creating a second account for an
  // address that was stored with different capitalization by an older build.
  const existingUser = await prisma.user.findFirst({ where: { email: { equals: data.email, mode: 'insensitive' } } });
  if (existingUser) {
    throw { status: 409, code: 'EMAIL_IN_USE', message: 'Email is already registered' };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      timezone: data.timezone,
      tags: {
        create: DEFAULT_TAGS.map(name => ({ name }))
      }
    }
  });

  const token = jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: '7d' });
  return { user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive, timezone: user.timezone }, token };
}

export async function login(data: z.infer<typeof loginSchema>) {
  // Match legacy records case-insensitively while all new records are stored
  // in normalized lowercase form.
  const user = await prisma.user.findFirst({ where: { email: { equals: data.email, mode: 'insensitive' } } });
  if (!user) {
    throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
  }

  const validPassword = await bcrypt.compare(data.password, user.passwordHash);
  if (!validPassword) {
    throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
  }

  if (!user.isActive) {
    throw { status: 403, code: 'ACCOUNT_DISABLED', message: 'This account is disabled. Contact a super-admin.' };
  }

  const token = jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: '7d' });
  return { user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive, timezone: user.timezone }, token };
}
