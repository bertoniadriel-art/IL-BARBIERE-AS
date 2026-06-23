/**
 * AgendaCompact — unit tests
 * TDD: T5.1 grouping, empty-day hide, strikethrough, no fetch
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/shared/lib/supabase', () => ({
  supabase: supabaseMock,
}));

vi.mock('@/shared/lib/supabase-client', () => ({
  supabase: supabaseMock,
}));

import { AgendaCompact } from '../components/AgendaCompact';
import type { Appointment } from '../components/AppointmentCard';

function makeApp(overrides: Partial<Appointment> & { appointment_date: string }): Appointment {
  return {
    id: `apt-${Math.random()}`,
    status: 'pending',
    client_name: 'Cliente Test',
    client_phone: '1234',
    appointment_time: '10:00',
    barber_id: 'barber-1',
    final_price: null,
    ...overrides,
  };
}

describe('AgendaCompact — T5.1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.from.mockClear();
  });

  it('renders day headers in chronological order', () => {
    const appointmentsByDate = {
      '2026-07-03': [makeApp({ appointment_date: '2026-07-03', client_name: 'Carlos' })],
      '2026-07-01': [
        makeApp({ appointment_date: '2026-07-01', client_name: 'Ana' }),
        makeApp({ appointment_date: '2026-07-01', client_name: 'Bob' }),
      ],
    };

    render(<AgendaCompact appointmentsByDate={appointmentsByDate} />);

    const headers = screen.getAllByRole('heading', { level: 4 });
    expect(headers).toHaveLength(2);
    // First header should be the earlier date
    expect(headers[0].textContent).toContain('01/07');
    expect(headers[1].textContent).toContain('03/07');
  });

  it('hides day header for dates with empty appointment array', () => {
    const appointmentsByDate = {
      '2026-07-01': [makeApp({ appointment_date: '2026-07-01', client_name: 'Ana' })],
      '2026-07-02': [],
    };

    render(<AgendaCompact appointmentsByDate={appointmentsByDate} />);

    const headers = screen.getAllByRole('heading', { level: 4 });
    expect(headers).toHaveLength(1);
    expect(headers[0].textContent).toContain('01/07');
  });

  it('applies strikethrough to cancelled appointments only', () => {
    const appointmentsByDate = {
      '2026-07-01': [
        makeApp({ appointment_date: '2026-07-01', status: 'cancelled', client_name: 'Ana' }),
        makeApp({ appointment_date: '2026-07-01', status: 'pending', client_name: 'Bob' }),
      ],
    };

    render(<AgendaCompact appointmentsByDate={appointmentsByDate} />);

    const anaEl = screen.getByText(/Ana/);
    const bobEl = screen.getByText(/Bob/);

    // Ana is cancelled — her container should have line-through
    expect(anaEl.closest('[data-testid="agenda-entry"]')).toHaveClass('line-through');
    // Bob is pending — no line-through
    expect(bobEl.closest('[data-testid="agenda-entry"]')).not.toHaveClass('line-through');
  });

  it('does NOT trigger any supabase calls on render', () => {
    const appointmentsByDate = {
      '2026-07-01': [makeApp({ appointment_date: '2026-07-01', client_name: 'Ana' })],
    };

    render(<AgendaCompact appointmentsByDate={appointmentsByDate} />);

    expect(supabaseMock.from).not.toHaveBeenCalled();
  });
});
