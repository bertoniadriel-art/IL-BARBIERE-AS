/**
 * FinanzasView — regression test
 *
 * Bug: "Esta semana" total silently dropped days from the previous month.
 * The data fetch was scoped to the current calendar month only, but the
 * week metric spans Mon–Sun, which can start in the previous month. When
 * "today" is early in a month, attended appointments from the last days
 * of the previous month never entered the fetched `rows` state, so the
 * week total quietly matched the day total instead of the real weekly sum.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock('@/shared/lib/supabase', () => ({
  supabase: { from: (...args: any[]) => mocks.mockFrom(...args) },
}));

vi.mock('@/features/admin/services/appointmentService', () => ({
  registerPayment: vi.fn(),
}));

import { FinanzasView } from '../components/FinanzasView';

function createChainableQuery(data: any[] = []) {
  const chain: any = {};
  const resolve = () => Promise.resolve({ data, error: null });
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.not = vi.fn().mockReturnValue(chain);
  chain.then = (onFulfilled: any, onRejected: any) => resolve().then(onFulfilled, onRejected);
  return chain;
}

describe('FinanzasView — month/week boundary', () => {
  beforeEach(() => {
    // Wednesday 2026-07-01: the week (Mon 29/06 – Sun 05/07) starts in June,
    // the month-only fetch used to miss it entirely.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-07-01T15:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('includes attended appointments from the previous month within the current week', async () => {
    const rows = [
      // Yesterday, previous month, already paid — must count toward "esta semana"
      {
        id: 'apt-1',
        status: 'attended',
        final_price: 14000,
        deposit_paid: true,
        client_name: 'Gonza Caceres',
        appointment_date: '2026-06-30',
        appointment_time: '09:30:00',
      },
      // Today, current month
      {
        id: 'apt-2',
        status: 'attended',
        final_price: 14000,
        deposit_paid: true,
        client_name: 'Juan Perez',
        appointment_date: '2026-07-01',
        appointment_time: '11:00:00',
      },
    ];
    mocks.mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(createChainableQuery(rows)) });

    render(<FinanzasView barber={{ id: 'b1' }} />);

    await waitFor(() => {
      expect(screen.getByText('Esta semana')).toBeInTheDocument();
    });

    const weekCard = screen.getByText('Esta semana').closest('div');
    const todayCard = screen.getByText('Hoy').closest('div');

    // "Esta semana" must sum both days: $28.000 — this is what broke before the fix
    await waitFor(() => {
      expect(weekCard).toHaveTextContent(/\$\s?28\.000/);
    });
    // "Hoy" only counts today's own appointment: $14.000
    expect(todayCard).toHaveTextContent(/\$\s?14\.000/);
  });

  it('fetches a range wide enough to cover both the month and the current week', async () => {
    mocks.mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(createChainableQuery([])) });

    render(<FinanzasView barber={{ id: 'b1' }} />);

    await waitFor(() => {
      const chain = mocks.mockFrom.mock.results[0].value.select.mock.results[0].value;
      // Week starts 2026-06-29 (Mon), before the month start 2026-07-01
      expect(chain.gte).toHaveBeenCalledWith('appointment_date', '2026-06-29');
    });
  });
});
