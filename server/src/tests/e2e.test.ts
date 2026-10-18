import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../app';
import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';
import { config } from '../config';

describe('End to End Flow', () => {
  let token = '';
  let linkId = '';
  let alias = '';

  beforeAll(async () => {
    // Clear old test user and relations properly
    const u = await prisma.user.findUnique({ where: { email: 'e2e@linkpulse.dev' } });
    if (u) {
      await prisma.tag.deleteMany({ where: { ownerId: u.id } });
      await prisma.campaign.deleteMany({ where: { ownerId: u.id } });
      await prisma.link.deleteMany({ where: { ownerId: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
    }

    // 1. Signup
    const res = await request(app).post('/api/auth/signup').send({
      name: 'E2E User',
      email: 'e2e@linkpulse.dev',
      password: 'password123'
    });

    token = res.headers['set-cookie'][0].split(';')[0].split('=')[1];
  });

  it('Creates a link', async () => {
    const res = await request(app)
      .post('/api/links')
      .set('Cookie', [`token=${token}`])
      .send({
        destinationUrl: 'https://example.com/e2e',
        title: 'E2E Test Link'
      });

    expect(res.status).toBe(201);
    expect(res.body.link.alias).toBeDefined();
    linkId = res.body.link.id;
    alias = res.body.link.alias;
  });

  it('Redirects correctly', async () => {
    const res = await request(app).get(`/${alias}`);
    expect(res.status).toBe(302);
    expect(res.header.location).toBe(`${config.appUrl}/continue/${alias}?source=link`);
  });

  it('Respects admin disable', async () => {
    // Manually disable in DB since we need Admin role
    await prisma.link.update({ where: { id: linkId }, data: { status: 'DISABLED' } });
  });
});
