/**
 * CancelAppointment (/mi-turno) — regression test
 *
 * Bug: the deposit/payment section only rendered for status === 'pending'.
 * Once a barber confirms a turno (which can happen without deposit_paid
 * ever being set — see confirmAppointment()), the client had no way to
 * see whether they still owed the seña or had already paid it.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRpc = vi.fn();

vi.mock('@/shared/lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: (...args: unknown[]) => mockRpc(...args) },
}));

import { CancelAppointment } from '../components/CancelAppointment';

const baseAppointment = {
  id: 'apt-1',
  client_name: 'Juan Perez',
  appointment_date: '2026-07-03',
  appointment_time: '14:00:00',
  qr_hash: 'ABC12345',
  final_price: 14000,
  barbers: { name: 'Santi Ducca' },
  services: { name: 'Corte Premium' },
};

describe('CancelAppointment — deposit visibility after confirmation', () => {
  it('shows the "seña pendiente" payment CTA when confirmed but not yet paid', () => {
    render(
      <CancelAppointment
        appointment={{ ...baseAppointment, status: 'confirmed', deposit_paid: false }}
        hash='ABC12345'
      />
    );

    expect(screen.getByText('¡Turno confirmado por el barbero!')).toBeInTheDocument();
    expect(screen.getByText('Finalizar Compra')).toBeInTheDocument();
    expect(screen.getByText('Ya realicé el pago')).toBeInTheDocument();
  });

  it('shows "Seña recibida" when confirmed and already paid', () => {
    render(
      <CancelAppointment
        appointment={{ ...baseAppointment, status: 'confirmed', deposit_paid: true }}
        hash='ABC12345'
      />
    );

    expect(screen.getByText('Seña recibida ✓')).toBeInTheDocument();
    expect(screen.queryByText('Finalizar Compra')).not.toBeInTheDocument();
  });

  it('still shows the pending flow with the pre-confirmation wording', () => {
    render(
      <CancelAppointment
        appointment={{ ...baseAppointment, status: 'pending', deposit_paid: true }}
        hash='ABC12345'
      />
    );

    expect(
      screen.getByText('Queda sujeto a validación del pago por parte del barbero.')
    ).toBeInTheDocument();
  });
});

/**
 * handleCancel / handleMarkPaid — RPC return-value branching (anon-hardening
 * Unit 2, T3.3). Both actions now call `cancel_appointment(p_hash)` /
 * `mark_deposit_paid(p_hash)` keyed by the `hash` prop instead of mutating
 * `appointments` directly by `appointment.id`. The UI MUST branch on the
 * RETURNED VALUE (success status vs. generic no_op), not merely on the
 * absence of a thrown error (design IB-C2 fix).
 */
const cancellableAppointment = {
  id: 'ABC12345',
  client_name: 'Juan Perez',
  appointment_date: '2099-01-01',
  appointment_time: '14:00:00',
  qr_hash: 'ABC12345',
  final_price: 14000,
  barbers: { name: 'Santi Ducca' },
  services: { name: 'Corte Premium' },
  status: 'pending',
  deposit_paid: false,
};

describe('CancelAppointment — handleCancel RPC branching', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('shows the cancelled state when cancel_appointment returns "cancelled"', async () => {
    mockRpc.mockResolvedValue({ data: 'cancelled', error: null });

    render(<CancelAppointment appointment={cancellableAppointment} hash='ABC12345' />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar turno' }));

    await waitFor(() => {
      expect(screen.getByText('Turno cancelado')).toBeInTheDocument();
    });
    expect(mockRpc).toHaveBeenCalledWith('cancel_appointment', { p_hash: 'ABC12345' });
  });

  it('treats a "no_op" return value as could-not-cancel, without leaking why', async () => {
    mockRpc.mockResolvedValue({ data: 'no_op', error: null });

    render(<CancelAppointment appointment={cancellableAppointment} hash='ABC12345' />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar turno' }));

    await waitFor(() => {
      expect(screen.getByText('Error al cancelar. Intentá nuevamente.')).toBeInTheDocument();
    });
    expect(screen.queryByText('Turno cancelado')).not.toBeInTheDocument();
  });

  it('treats a thrown RPC error the same as a no_op (no distinguishable UI state)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'network error' } });

    render(<CancelAppointment appointment={cancellableAppointment} hash='ABC12345' />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar turno' }));

    await waitFor(() => {
      expect(screen.getByText('Error al cancelar. Intentá nuevamente.')).toBeInTheDocument();
    });
  });
});

describe('CancelAppointment — handleMarkPaid RPC branching', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('marks the deposit as paid when mark_deposit_paid returns true', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    render(<CancelAppointment appointment={cancellableAppointment} hash='ABC12345' />);
    fireEvent.click(screen.getByRole('button', { name: 'Ya realicé el pago' }));

    await waitFor(() => {
      expect(screen.getByText('Seña enviada')).toBeInTheDocument();
    });
    expect(mockRpc).toHaveBeenCalledWith('mark_deposit_paid', { p_hash: 'ABC12345' });
  });

  /**
   * JDA-006 regression: marking the deposit on a non-pending/confirmed
   * appointment now returns `false` (no_op) from the RPC — previously this
   * write went through the blanket "TEMP: anon update appointments" policy
   * with no status guard and would silently "succeed" client-side. The UI
   * MUST NOT flip to the paid state when the RPC reports no mutation.
   */
  it('does not mark the deposit as paid when mark_deposit_paid returns false (no_op)', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    render(<CancelAppointment appointment={cancellableAppointment} hash='ABC12345' />);
    fireEvent.click(screen.getByRole('button', { name: 'Ya realicé el pago' }));

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('mark_deposit_paid', { p_hash: 'ABC12345' });
    });
    expect(screen.getByText('Ya realicé el pago')).toBeInTheDocument();
    expect(screen.queryByText('Seña enviada')).not.toBeInTheDocument();
  });
});
