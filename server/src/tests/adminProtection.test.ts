import { describe, expect, it, vi } from 'vitest';
import { requireSuperAdmin } from '../middleware/requireRole';

function response() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as any;
}

describe('super-admin protection', () => {
  it('allows only ADMIN through the platform admin guard', () => {
    const next = vi.fn();
    requireSuperAdmin({ user: { id: '1', role: 'USER', isActive: true, timezone: 'UTC' } } as any, response(), next);
    expect(next).not.toHaveBeenCalled();

    const adminNext = vi.fn();
    requireSuperAdmin({ user: { id: '2', role: 'ADMIN', isActive: true, timezone: 'UTC' } } as any, response(), adminNext);
    expect(adminNext).toHaveBeenCalledOnce();
  });
});
