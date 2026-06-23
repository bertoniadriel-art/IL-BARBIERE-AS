/**
 * appointmentService — unit tests
 * TDD: T8.1 — updateAppointmentStatus calls Supabase update with correct args
 *
 * REQ-8.1: Admin dashboard persists status updates to Supabase.
 */

/// <reference types="@testing-library/jest-dom" />
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { updateAppointmentStatus } from '../services/appointmentService';

describe('appointmentService (T8.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls supabase update with correct table, status, and id', async () => {
    mocks.mockFrom.mockReturnValue({
      update: mocks.mockUpdate.mockReturnValue({
        eq: mocks.mockEq.mockResolvedValue({ error: null }),
      }),
    });

    const { error } = await updateAppointmentStatus('apt-123', 'confirmed');

    expect(error).toBeNull();
    expect(mocks.mockFrom).toHaveBeenCalledWith('appointments');
    expect(mocks.mockUpdate).toHaveBeenCalledWith({ status: 'confirmed' });
    expect(mocks.mockEq).toHaveBeenCalledWith('id', 'apt-123');
  });

  it('returns Error when supabase returns an error', async () => {
    mocks.mockFrom.mockReturnValue({
      update: mocks.mockUpdate.mockReturnValue({
        eq: mocks.mockEq.mockResolvedValue({
          error: { message: 'row not found' },
        }),
      }),
    });

    const { error } = await updateAppointmentStatus('apt-bad', 'attended');

    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('row not found');
  });

  it('returns Error when supabase is null (not configured)', async () => {
    vi.doMock('@/shared/lib/supabase-client', () => ({ supabase: null }));

    // Re-import with null supabase
    vi.resetModules();
    vi.doMock('@/shared/lib/supabase-client', () => ({ supabase: null }));
    const { updateAppointmentStatus: updateNull } = await import('../services/appointmentService');

    const { error } = await updateNull('apt-123', 'confirmed');

    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('Supabase no configurado');

    vi.doUnmock('@/shared/lib/supabase-client');
    vi.resetModules();
  });

  it("passes 'attended' status correctly (triangulation)", async () => {
    mocks.mockFrom.mockReturnValue({
      update: mocks.mockUpdate.mockReturnValue({
        eq: mocks.mockEq.mockResolvedValue({ error: null }),
      }),
    });

    const { error } = await updateAppointmentStatus('apt-456', 'attended');

    expect(error).toBeNull();
    expect(mocks.mockUpdate).toHaveBeenCalledWith({ status: 'attended' });
    expect(mocks.mockEq).toHaveBeenCalledWith('id', 'apt-456');
  });
});
