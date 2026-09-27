import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/admin/services/recentBookings', async (orig) => ({
  ...(await orig<typeof import('@/features/admin/services/recentBookings')>()),
  getRecentBookings: vi.fn(),
}));

vi.mock('@/features/admin/services/appointmentService', () => ({
  confirmAppointment: vi.fn(),
}));

import { NotificationCenter } from '../components/NotificationCenter';
import { confirmAppointment } from '../services/appointmentService';
import { getRecentBookings } from '../services/recentBookings';

const base = {
  client_phone: '3409998877',
  appointment_date: '2026-09-28',
  appointment_time: '10:00:00',
  created_at: '2026-09-27T10:00:00Z',
  services: { name: 'Corte' },
};

const bookings = [
  { ...base, id: 'a1', status: 'pending', client_name: 'Ana', qr_hash: 'AB12CD34' },
  { ...base, id: 'a2', status: 'confirmed', client_name: 'Beto', qr_hash: 'MANUAL-11112222' },
  { ...base, id: 'a3', status: 'confirmed', client_name: 'Caro', qr_hash: 'VIP-33334444' },
];

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.mocked(getRecentBookings).mockResolvedValue(bookings);
  });
  afterEach(() => vi.restoreAllMocks());

  it('should badge the bell with the number of pending turnos', async () => {
    render(<NotificationCenter barberId='b1' />);
    expect(await screen.findByLabelText('Notificaciones: 1 por confirmar')).toBeInTheDocument();
  });

  it('should list every recent turno tagged with its origin', async () => {
    render(<NotificationCenter barberId='b1' />);
    fireEvent.click(await screen.findByLabelText(/Notificaciones/));
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByTitle('Reservado desde la app')).toBeInTheDocument();
    expect(screen.getByTitle('Cargado a mano')).toBeInTheDocument();
    expect(screen.getByTitle('Turno VIP')).toBeInTheDocument();
  });

  it('should offer confirm only on pending turnos', async () => {
    render(<NotificationCenter barberId='b1' />);
    fireEvent.click(await screen.findByLabelText(/Notificaciones/));
    expect(screen.getAllByRole('button', { name: 'Confirmar y avisar' })).toHaveLength(1);
  });

  it('should open WhatsApp on confirm and notify the parent', async () => {
    const tab = { opener: {}, location: { href: '' }, close: vi.fn() };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    vi.mocked(confirmAppointment).mockResolvedValue({
      error: null,
      whatsappUrl: 'https://wa.me/5493409998877?text=ok',
    });
    const onConfirmed = vi.fn();
    render(<NotificationCenter barberId='b1' onConfirmed={onConfirmed} />);
    fireEvent.click(await screen.findByLabelText(/Notificaciones/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y avisar' }));

    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    await waitFor(() => expect(tab.location.href).toBe('https://wa.me/5493409998877?text=ok'));
    expect(confirmAppointment).toHaveBeenCalledWith('a1');
    expect(onConfirmed).toHaveBeenCalled();
  });

  it('should close the pending tab when confirm fails', async () => {
    const tab = { opener: {}, location: { href: '' }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    vi.mocked(confirmAppointment).mockResolvedValue({ error: new Error('x'), whatsappUrl: null });
    render(<NotificationCenter barberId='b1' />);
    fireEvent.click(await screen.findByLabelText(/Notificaciones/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y avisar' }));
    await waitFor(() => expect(tab.close).toHaveBeenCalled());
  });

  it('should say so when nothing was booked in the last 24 hours', async () => {
    vi.mocked(getRecentBookings).mockResolvedValue([]);
    render(<NotificationCenter barberId='b1' />);
    fireEvent.click(await screen.findByLabelText(/Notificaciones/));
    expect(await screen.findByText('Sin reservas en las últimas 24 horas')).toBeInTheDocument();
  });
});
