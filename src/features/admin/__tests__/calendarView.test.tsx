/**
 * CalendarView — unit tests
 * TDD: T5.2 Santi-only toggle, T5.3 cancelled strikethrough
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const SANTI_ID = '1755f2ef-3156-4dbe-bba1-31dea3c44be8';
const OTHER_ID = 'other-barber-id';

const supabaseMock = vi.hoisted(() => {
  // Chain needs to support thenable (promise) AND method chaining
  // CalendarView calls .order().order() — each .order() must return the chain
  // but the chain itself must be thenable so the whole expression resolves
  let resolveData: any[] = [];
  let resolveError: any = null;

  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  // Make chain thenable so `await chain` resolves
  chain.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve({ data: resolveData, error: resolveError }).then(onFulfilled, onRejected);

  const mockFrom = vi.fn().mockReturnValue(chain);

  function setResult(data: any[], error: any = null) {
    resolveData = data;
    resolveError = error;
  }

  return { mockFrom, chain, setResult };
});

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => supabaseMock.mockFrom(...args),
  },
}));

vi.mock('../components/AgendaCompact', () => ({
  AgendaCompact: vi.fn(({ appointmentsByDate }: { appointmentsByDate: any }) => (
    <div data-testid="agenda-compact">AgendaCompact({Object.keys(appointmentsByDate).length} dates)</div>
  )),
}));

// Capture the last app prop passed to AppointmentCard
let lastAppCardProps: any = null;
vi.mock('../components/AppointmentCard', () => ({
  AppointmentCard: vi.fn((props: any) => {
    lastAppCardProps = props;
    return (
      <div data-testid="appointment-card">
        <h4 className={props.app.status === 'cancelled' ? 'line-through' : ''}>
          {props.app.client_name}
        </h4>
      </div>
    );
  }),
}));

import { CalendarView } from '../components/CalendarView';

describe('CalendarView — T5.2: Santi-only toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.setResult([]);
    // Restore chain method implementations after clearAllMocks
    supabaseMock.chain.select.mockReturnValue(supabaseMock.chain);
    supabaseMock.chain.eq.mockReturnValue(supabaseMock.chain);
    supabaseMock.chain.gte.mockReturnValue(supabaseMock.chain);
    supabaseMock.chain.lte.mockReturnValue(supabaseMock.chain);
    supabaseMock.chain.order.mockReturnValue(supabaseMock.chain);
    supabaseMock.mockFrom.mockReturnValue(supabaseMock.chain);
  });

  it('shows Calendario|Agenda toggle for Santi barber', async () => {
    render(<CalendarView barber={{ id: SANTI_ID, name: 'Santi' }} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /agenda/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /calendario/i })).toBeInTheDocument();
    });
  });

  it('does NOT show toggle for other barbers', async () => {
    render(<CalendarView barber={{ id: OTHER_ID, name: 'Fede' }} />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /agenda/i })).not.toBeInTheDocument();
    });
  });

  it('renders AgendaCompact when Agenda tab clicked', async () => {
    render(<CalendarView barber={{ id: SANTI_ID, name: 'Santi' }} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /agenda/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /agenda/i }));

    expect(screen.getByTestId('agenda-compact')).toBeInTheDocument();
  });

  it('restores calendar grid when Calendario tab clicked after Agenda', async () => {
    render(<CalendarView barber={{ id: SANTI_ID, name: 'Santi' }} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /agenda/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /agenda/i }));
    expect(screen.getByTestId('agenda-compact')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /calendario/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('agenda-compact')).not.toBeInTheDocument();
    });
  });
});

describe('CalendarView — W1: fetchAppointments re-runs after onMutated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.setResult([]);
    supabaseMock.chain.select.mockReturnValue(supabaseMock.chain);
    supabaseMock.chain.eq.mockReturnValue(supabaseMock.chain);
    supabaseMock.chain.gte.mockReturnValue(supabaseMock.chain);
    supabaseMock.chain.lte.mockReturnValue(supabaseMock.chain);
    supabaseMock.chain.order.mockReturnValue(supabaseMock.chain);
    supabaseMock.mockFrom.mockReturnValue(supabaseMock.chain);
    lastAppCardProps = null;
  });

  it('calls fetchAppointments (supabase.from) again after AppointmentCard triggers onMutated', async () => {
    const { format: dateFnsFormat, startOfToday } = await import('date-fns');
    const today = dateFnsFormat(startOfToday(), 'yyyy-MM-dd');
    const app = {
      id: 'apt-1',
      status: 'confirmed',
      client_name: 'Test Client',
      client_phone: '1111',
      appointment_time: '10:00:00',
      appointment_date: today,
      barber_id: OTHER_ID,
      final_price: null,
    };

    supabaseMock.setResult([app]);

    const parentOnMutated = vi.fn();
    render(<CalendarView barber={{ id: OTHER_ID, name: 'Fede' }} onMutated={parentOnMutated} />);

    // Wait for initial render + fetch
    await waitFor(() => {
      expect(screen.getByTestId('appointment-card')).toBeInTheDocument();
    });

    const callsAfterMount = supabaseMock.mockFrom.mock.calls.length;

    // Simulate the card triggering onMutated
    expect(lastAppCardProps).not.toBeNull();
    lastAppCardProps.onMutated();

    // fetchAppointments must run again (extra supabase.from calls)
    await waitFor(() => {
      expect(supabaseMock.mockFrom.mock.calls.length).toBeGreaterThan(callsAfterMount);
    });

    // Parent onMutated must also have been called
    expect(parentOnMutated).toHaveBeenCalledTimes(1);
  });
});

describe('CalendarView — T5.3: Cancelled strikethrough', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.setResult([]);
    // Restore chain method implementations after clearAllMocks
    supabaseMock.chain.select.mockReturnValue(supabaseMock.chain);
    supabaseMock.chain.eq.mockReturnValue(supabaseMock.chain);
    supabaseMock.chain.gte.mockReturnValue(supabaseMock.chain);
    supabaseMock.chain.lte.mockReturnValue(supabaseMock.chain);
    supabaseMock.chain.order.mockReturnValue(supabaseMock.chain);
    supabaseMock.mockFrom.mockReturnValue(supabaseMock.chain);
    lastAppCardProps = null;
  });

  it('renders AppointmentCard with cancelled appointment that has strikethrough', async () => {
    const { format: dateFnsFormat, startOfToday } = await import('date-fns');
    const today = dateFnsFormat(startOfToday(), 'yyyy-MM-dd');
    const cancelledApp = {
      id: 'apt-cancelled',
      status: 'cancelled',
      client_name: 'Cliente Cancelado',
      client_phone: '9999',
      appointment_time: '10:00:00',
      appointment_date: today,
      barber_id: OTHER_ID,
      final_price: null,
    };

    supabaseMock.setResult([cancelledApp]);

    render(<CalendarView barber={{ id: OTHER_ID, name: 'Fede' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('appointment-card')).toBeInTheDocument();
    });

    // Our mock AppointmentCard renders h4 with line-through when status is cancelled
    const heading = screen.getByRole('heading', { level: 4 });
    expect(heading).toHaveClass('line-through');
  });
});
