/**
 * CancelAppointment (/mi-turno) — regression test
 *
 * Bug: the deposit/payment section only rendered for status === 'pending'.
 * Once a barber confirms a turno (which can happen without deposit_paid
 * ever being set — see confirmAppointment()), the client had no way to
 * see whether they still owed the seña or had already paid it.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase', () => ({ supabase: { from: vi.fn() } }));

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
