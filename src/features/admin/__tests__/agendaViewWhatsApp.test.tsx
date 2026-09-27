import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { format } from 'date-fns';
import { afterEach, describe, expect, it, vi } from 'vitest';

const today = format(new Date(), 'yyyy-MM-dd');
const row = {
  id: 'a1',
  status: 'confirmed',
  deposit_paid: false,
  final_price: null,
  client_name: 'Adri',
  client_phone: '3409998877',
  appointment_date: today,
  appointment_time: '23:30:00',
  qr_hash: 'h',
  barber_id: 'b1',
  services: { name: 'Corte', duration_min: 30 },
  is_fixed_weekly: false,
};

// Chainable query stub: every builder method returns itself; awaiting resolves the rows.
function query(data: unknown) {
  const q: any = new Proxy(
    {},
    {
      get: (_t, prop) =>
        prop === 'then' ? (res: (v: unknown) => void) => res({ data, error: null }) : () => q,
    }
  );
  return q;
}

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: (table: string) => query(table === 'appointments' ? [row] : []),
    channel: () => ({
      on: function () {
        return this;
      },
      subscribe: function () {
        return this;
      },
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/features/admin/services/appointmentService', () => ({
  updateAppointmentStatus: vi.fn().mockResolvedValue({ error: null }),
  confirmAppointment: vi.fn(),
  moveAppointment: vi.fn(),
}));

vi.mock('@/features/booking/services/availabilityService', () => ({
  expandSlots: vi.fn(() => []),
  getBlockedSlotsForDay: vi.fn().mockResolvedValue([]),
  getBookedSlots: vi.fn().mockResolvedValue([]),
}));

import { AgendaView } from '../components/AgendaView';

describe('AgendaView cancel → WhatsApp', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens the tab synchronously on click and points it at WhatsApp', async () => {
    const tab = { opener: {}, location: { href: '' }, close: vi.fn() };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);

    render(<AgendaView barber={{ id: 'b1', name: 'Santi' }} />);
    const btn = await screen.findByRole('button', { name: 'Cancelar' });
    fireEvent.click(btn);

    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    await waitFor(() => expect(tab.location.href).toContain('https://wa.me/5493409998877'));
    expect(tab.close).not.toHaveBeenCalled();
  });
});
