/**
 * AppointmentCard — unit tests
 * TDD: T3.1 cancel button visibility, T3.2 optimistic cancel
 * TDD: T4.1 move button, T4.2 slot validation, T4.3 move success/error
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
/// <reference types="@testing-library/jest-dom" />
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockUpdateAppointmentStatus = vi.fn();
  const mockMoveAppointment = vi.fn();
  const mockGetBookedSlots = vi.fn();
  return { mockUpdateAppointmentStatus, mockMoveAppointment, mockGetBookedSlots };
});

vi.mock('../services/appointmentService', () => ({
  updateAppointmentStatus: (...args: any[]) => mocks.mockUpdateAppointmentStatus(...args),
  moveAppointment: (...args: any[]) => mocks.mockMoveAppointment(...args),
}));

vi.mock('@/features/booking/services/availabilityService', () => ({
  getBookedSlots: (...args: any[]) => mocks.mockGetBookedSlots(...args),
}));

import { AppointmentCard } from '../components/AppointmentCard';
import type { Appointment } from '../components/AppointmentCard';

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

function makeApp(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'apt-1',
    status: 'pending',
    client_name: 'Juan Perez',
    client_phone: '1234567890',
    appointment_time: '10:00',
    appointment_date: '2026-07-01',
    barber_id: 'barber-1',
    final_price: null,
    ...overrides,
  };
}

describe('AppointmentCard — T3.1: Cancel button visibility', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows Cancelar button for pending appointment', () => {
    render(
      <AppointmentCard app={makeApp({ status: 'pending' })} currencyFormatter={currencyFormatter} />
    );
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('shows Cancelar button for confirmed appointment', () => {
    render(
      <AppointmentCard
        app={makeApp({ status: 'confirmed' })}
        currencyFormatter={currencyFormatter}
      />
    );
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('hides Cancelar button for cancelled appointment', () => {
    render(
      <AppointmentCard
        app={makeApp({ status: 'cancelled' })}
        currencyFormatter={currencyFormatter}
      />
    );
    expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
  });
});

describe('AppointmentCard — T3.2: Optimistic cancel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('applies strikethrough and calls onMutated on successful cancel', async () => {
    mocks.mockUpdateAppointmentStatus.mockResolvedValue({ error: null });
    const onMutated = vi.fn();

    render(
      <AppointmentCard
        app={makeApp({ status: 'pending' })}
        currencyFormatter={currencyFormatter}
        onMutated={onMutated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    await waitFor(() => {
      expect(onMutated).toHaveBeenCalledTimes(1);
    });

    // After cancel, no Cancelar button (card shows cancelled)
    expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
  });

  it('reverts to original status and shows error on cancel failure', async () => {
    mocks.mockUpdateAppointmentStatus.mockResolvedValue({ error: new Error('network fail') });
    const onMutated = vi.fn();

    render(
      <AppointmentCard
        app={makeApp({ status: 'confirmed' })}
        currencyFormatter={currencyFormatter}
        onMutated={onMutated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    await waitFor(() => {
      // Button should reappear after rollback
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    expect(onMutated).not.toHaveBeenCalled();
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});

describe('AppointmentCard — T4.1: Mover button', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows Mover button for pending appointment', () => {
    render(
      <AppointmentCard app={makeApp({ status: 'pending' })} currencyFormatter={currencyFormatter} />
    );
    expect(screen.getByRole('button', { name: /mover/i })).toBeInTheDocument();
  });

  it('hides Mover button for cancelled appointment', () => {
    render(
      <AppointmentCard
        app={makeApp({ status: 'cancelled' })}
        currencyFormatter={currencyFormatter}
      />
    );
    expect(screen.queryByRole('button', { name: /mover/i })).not.toBeInTheDocument();
  });

  it('opens modal with pre-populated date when Mover clicked', async () => {
    mocks.mockGetBookedSlots.mockResolvedValue([]);

    render(
      <AppointmentCard
        app={makeApp({
          status: 'pending',
          appointment_date: '2026-07-01',
          appointment_time: '10:00',
        })}
        currencyFormatter={currencyFormatter}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /mover/i }));

    await waitFor(() => {
      const dateInput = screen.getByLabelText(/nueva fecha/i) as HTMLInputElement;
      expect(dateInput.value).toBe('2026-07-01');
    });
  });
});

describe('AppointmentCard — T4.2: Slot validation in MoveModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows error and does NOT call moveAppointment when slot is occupied', async () => {
    mocks.mockGetBookedSlots.mockResolvedValue(['11:00']);
    mocks.mockMoveAppointment.mockResolvedValue({ error: null });

    render(
      <AppointmentCard
        app={makeApp({
          status: 'pending',
          appointment_date: '2026-07-01',
          appointment_time: '10:00',
          barber_id: 'barber-1',
        })}
        currencyFormatter={currencyFormatter}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /mover/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/nueva fecha/i)).toBeInTheDocument();
    });

    // Change date to load slots, then select occupied slot
    const dateInput = screen.getByLabelText(/nueva fecha/i);
    fireEvent.change(dateInput, { target: { value: '2026-07-10' } });

    await waitFor(() => {
      // occupied slot should appear in select
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    // Select an occupied slot (11:00 is in bookedSlots but shown as unavailable or we need to pick it directly)
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '11:00' } });

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(screen.getByText(/ya está ocupado/i)).toBeInTheDocument();
    });

    expect(mocks.mockMoveAppointment).not.toHaveBeenCalled();
  });

  it('does NOT call moveAppointment on same-slot confirm (no-op)', async () => {
    mocks.mockGetBookedSlots.mockResolvedValue([]);
    mocks.mockMoveAppointment.mockResolvedValue({ error: null });
    const onMutated = vi.fn();

    render(
      <AppointmentCard
        app={makeApp({
          status: 'pending',
          appointment_date: '2026-07-01',
          appointment_time: '10:00',
          barber_id: 'barber-1',
        })}
        currencyFormatter={currencyFormatter}
        onMutated={onMutated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /mover/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/nueva fecha/i)).toBeInTheDocument();
    });

    // Confirm without changing date or time (same slot)
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      // Modal should close (no error, no DB call)
      expect(screen.queryByRole('button', { name: /confirmar/i })).not.toBeInTheDocument();
    });

    expect(mocks.mockMoveAppointment).not.toHaveBeenCalled();
    expect(onMutated).not.toHaveBeenCalled();
  });

  it('calls moveAppointment with correct args for a free slot', async () => {
    mocks.mockGetBookedSlots.mockResolvedValue([]);
    mocks.mockMoveAppointment.mockResolvedValue({ error: null });
    const onMutated = vi.fn();

    render(
      <AppointmentCard
        app={makeApp({
          status: 'pending',
          appointment_date: '2026-07-01',
          appointment_time: '10:00',
          barber_id: 'barber-1',
        })}
        currencyFormatter={currencyFormatter}
        onMutated={onMutated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /mover/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/nueva fecha/i)).toBeInTheDocument();
    });

    const dateInput = screen.getByLabelText(/nueva fecha/i);
    fireEvent.change(dateInput, { target: { value: '2026-07-15' } });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '11:00' } });

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(mocks.mockMoveAppointment).toHaveBeenCalledWith('apt-1', '2026-07-15', '11:00');
    });
  });
});

describe('AppointmentCard — T4.3: Move success/error handling', () => {
  beforeEach(() => vi.clearAllMocks());

  it('closes modal and calls onMutated on move success', async () => {
    mocks.mockGetBookedSlots.mockResolvedValue([]);
    mocks.mockMoveAppointment.mockResolvedValue({ error: null });
    const onMutated = vi.fn();

    render(
      <AppointmentCard
        app={makeApp({
          status: 'pending',
          appointment_date: '2026-07-01',
          appointment_time: '10:00',
          barber_id: 'barber-1',
        })}
        currencyFormatter={currencyFormatter}
        onMutated={onMutated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /mover/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/nueva fecha/i)).toBeInTheDocument();
    });

    const dateInput = screen.getByLabelText(/nueva fecha/i);
    fireEvent.change(dateInput, { target: { value: '2026-07-15' } });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '11:00' } });

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(onMutated).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('button', { name: /confirmar/i })).not.toBeInTheDocument();
    });
  });

  it('keeps modal open and shows error on slot_occupied from service', async () => {
    mocks.mockGetBookedSlots.mockResolvedValue([]);
    mocks.mockMoveAppointment.mockResolvedValue({ error: { type: 'slot_occupied' } });
    const onMutated = vi.fn();

    render(
      <AppointmentCard
        app={makeApp({
          status: 'pending',
          appointment_date: '2026-07-01',
          appointment_time: '10:00',
          barber_id: 'barber-1',
        })}
        currencyFormatter={currencyFormatter}
        onMutated={onMutated}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /mover/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/nueva fecha/i)).toBeInTheDocument();
    });

    const dateInput = screen.getByLabelText(/nueva fecha/i);
    fireEvent.change(dateInput, { target: { value: '2026-07-15' } });

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '11:00' } });

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(screen.getByText(/ya está ocupado/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
    });

    expect(onMutated).not.toHaveBeenCalled();
  });
});
