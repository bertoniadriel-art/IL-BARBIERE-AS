/**
 * appointmentService — unit tests
 * TDD: T2.1 — moveAppointment success + 23505 slot_occupied
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockEq = vi.fn();
  const mockUpdate = vi.fn();
  const mockFrom = vi.fn();
  return { mockEq, mockUpdate, mockFrom };
});

vi.mock('@/shared/lib/supabase-client', () => ({
  supabase: {
    from: (...args: any[]) => mocks.mockFrom(...args),
  },
}));

import { moveAppointment } from '../services/appointmentService';

function createUpdateChain(result: { error: any }) {
  const chain: any = {};
  chain.eq = vi.fn().mockResolvedValue(result);
  chain.update = vi.fn().mockReturnValue(chain);
  return chain;
}

describe('appointmentService — moveAppointment (T2.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves with { error: null } on success', async () => {
    const chain = createUpdateChain({ error: null });
    mocks.mockFrom.mockReturnValue(chain);

    const result = await moveAppointment('apt-1', '2026-07-10', '11:00');

    expect(result.error).toBeNull();
    expect(chain.update).toHaveBeenCalledWith({
      appointment_date: '2026-07-10',
      appointment_time: '11:00',
    });
    expect(chain.eq).toHaveBeenCalledWith('id', 'apt-1');
  });

  it('resolves with { error: { type: "slot_occupied" } } on 23505', async () => {
    const chain = createUpdateChain({ error: { code: '23505', message: 'unique violation' } });
    mocks.mockFrom.mockReturnValue(chain);

    const result = await moveAppointment('apt-1', '2026-07-10', '11:00');

    expect(result.error).toEqual({ type: 'slot_occupied' });
  });

  it('resolves with { error: Error } on other DB errors', async () => {
    const chain = createUpdateChain({ error: { code: '42501', message: 'permission denied' } });
    mocks.mockFrom.mockReturnValue(chain);

    const result = await moveAppointment('apt-1', '2026-07-10', '11:00');

    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe('permission denied');
  });
});
