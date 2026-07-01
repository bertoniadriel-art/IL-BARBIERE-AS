/**
 * DashboardBento — unit tests
 * TDD: T8.2 — Status update buttons with optimistic UI
 *
 * REQ-8.1: Admin dashboard provides UI control on each appointment entry
 * to update status to attended or confirmed, persisting to Supabase.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
/// <reference types="@testing-library/jest-dom" />
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockUpdate = vi.fn();
  const mockFrom = vi.fn();
  const mockChannel = vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  });
  const mockRemoveChannel = vi.fn();
  return { mockUpdate, mockFrom, mockChannel, mockRemoveChannel };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/admin',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mocks.mockFrom(...args),
    channel: (...args: any[]) => mocks.mockChannel(...args),
    removeChannel: (...args: any[]) => mocks.mockRemoveChannel(...args),
  },
}));

vi.mock('@/features/admin/services/appointmentService', () => ({
  updateAppointmentStatus: vi.fn(),
  confirmAppointment: vi.fn(),
}));

// Capture onMutated prop passed to CalendarView
let capturedOnMutated: (() => void) | undefined;
vi.mock('../components/CalendarView', () => ({
  CalendarView: vi.fn((props: { onMutated?: () => void }) => {
    capturedOnMutated = props.onMutated;
    return null;
  }),
}));

import { DashboardBento } from '../components/DashboardBento';
import { confirmAppointment, updateAppointmentStatus } from '../services/appointmentService';

const mockUpdateAppointmentStatus = vi.mocked(updateAppointmentStatus);
const mockConfirmAppointment = vi.mocked(confirmAppointment);

function createChainableQuery(data: any[] = [], error: any = null) {
  const chain: any = {};
  const resolve = () => Promise.resolve({ data, error });

  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.then = (onFulfilled: any, onRejected: any) => resolve().then(onFulfilled, onRejected);

  return chain;
}

describe('DashboardBento (T8.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Confirmar button for pending appointments', async () => {
    const chain = createChainableQuery([
      {
        id: 'apt-1',
        status: 'pending',
        deposit_paid: false,
        final_price: null,
        client_name: 'Juan Perez',
        client_phone: '1234',
        appointment_date: '2026-06-10',
        appointment_time: '10:00',
      },
    ]);
    mocks.mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) });

    render(<DashboardBento barber={{ id: 'b1', name: 'Test Barber' }} />);

    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
  });

  it('renders Presente button for confirmed appointments in pending deposits', async () => {
    const chain = createChainableQuery([
      {
        id: 'apt-2',
        status: 'confirmed',
        deposit_paid: false,
        final_price: 5000,
        client_name: 'Maria Lopez',
        client_phone: '5678',
        appointment_date: '2026-06-10',
        appointment_time: '11:00',
      },
    ]);
    mocks.mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) });

    render(<DashboardBento barber={{ id: 'b1', name: 'Test Barber' }} />);

    await waitFor(() => {
      expect(screen.getByText('Maria Lopez')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /presente/i })).toBeInTheDocument();
  });

  it('calls confirmAppointment when Confirmar clicked', async () => {
    mockConfirmAppointment.mockResolvedValue({ error: null, whatsappUrl: null });

    const chain = createChainableQuery([
      {
        id: 'apt-1',
        status: 'pending',
        deposit_paid: false,
        final_price: null,
        client_name: 'Juan Perez',
        client_phone: '1234',
        appointment_date: '2026-06-10',
        appointment_time: '10:00',
      },
    ]);
    mocks.mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) });

    render(<DashboardBento barber={{ id: 'b1', name: 'Test Barber' }} />);

    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(mockConfirmAppointment).toHaveBeenCalledWith('apt-1');
    });
  });

  it("calls updateAppointmentStatus with 'attended' when Presente clicked", async () => {
    mockUpdateAppointmentStatus.mockResolvedValue({ error: null });

    const chain = createChainableQuery([
      {
        id: 'apt-2',
        status: 'confirmed',
        deposit_paid: false,
        final_price: 5000,
        client_name: 'Maria Lopez',
        client_phone: '5678',
        appointment_date: '2026-06-10',
        appointment_time: '11:00',
      },
    ]);
    mocks.mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) });

    render(<DashboardBento barber={{ id: 'b1', name: 'Test Barber' }} />);

    await waitFor(() => {
      expect(screen.getByText('Maria Lopez')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /presente/i }));

    await waitFor(() => {
      expect(mockUpdateAppointmentStatus).toHaveBeenCalledWith('apt-2', 'attended');
    });
  });

  it('T1.3: passes onMutated callback to CalendarView that triggers refetch', async () => {
    const chain = createChainableQuery([]);
    mocks.mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) });

    capturedOnMutated = undefined;
    render(<DashboardBento barber={{ id: 'b1', name: 'Test Barber' }} />);

    await waitFor(() => {
      expect(capturedOnMutated).toBeDefined();
    });

    // Calling onMutated triggers a refetch (mockFrom gets called again)
    const callCountBefore = mocks.mockFrom.mock.calls.length;
    await act(async () => {
      capturedOnMutated?.();
    });
    await waitFor(() => {
      expect(mocks.mockFrom.mock.calls.length).toBeGreaterThan(callCountBefore);
    });
  });

  it('rolls back optimistic update on error', async () => {
    mockConfirmAppointment.mockResolvedValue({
      error: new Error('network fail'),
      whatsappUrl: null,
    });

    const chain = createChainableQuery([
      {
        id: 'apt-1',
        status: 'pending',
        deposit_paid: false,
        final_price: null,
        client_name: 'Juan Perez',
        client_phone: '1234',
        appointment_date: '2026-06-10',
        appointment_time: '10:00',
      },
    ]);
    mocks.mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue(chain) });

    render(<DashboardBento barber={{ id: 'b1', name: 'Test Barber' }} />);

    await waitFor(() => {
      expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    // After rollback, Confirmar button should reappear (status reverted to pending)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
    });
  });
});
