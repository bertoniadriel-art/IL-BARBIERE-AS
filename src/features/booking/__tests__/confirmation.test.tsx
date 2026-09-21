import { fireEvent, render, screen, waitFor } from '@testing-library/react';
/**
 * Tests for Confirmation component (T2.3, T3.3, T6.1).
 *
 * T2.3: 23505 unique constraint violation shows inline error, wizard stays on step 4
 * T3.3: reads serviceName/servicePrice from store, uses real UUID in INSERT, final_price rounded to nearest 100
 * T6.1: Zod validateBookingForm wired — invalid phone shows error, insert NOT called
 *
 * Honest client flow: no deposit/payment UI is shown to the client (the shop
 * takes no seña), and a successful booking lands on /mi-turno/<hash>?nuevo=1.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Confirmation } from '../components/Confirmation';

// Mock supabase insert
const mockInsert = vi.fn();

// Capture router.push so we can assert the post-booking destination.
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: (_table: string) => ({
      insert: mockInsert,
    }),
  },
}));

// Mock react-qr-code
vi.mock('react-qr-code', () => ({
  default: () => <div data-testid='qr-code' />,
}));

// Mock VIP discount lookup (Bug #9) — defaults to "not VIP" (0%) unless a
// test overrides the resolved value.
const mockGetVipDiscountPercent = vi.fn().mockResolvedValue(0);
vi.mock('../services/vipDiscountService', () => ({
  getVipDiscountPercent: (...args: unknown[]) => mockGetVipDiscountPercent(...args),
}));

// Track setStep calls
const mockSetStep = vi.fn();
const mockSetSlotConflictError = vi.fn();
const mockReset = vi.fn();
const mockSetFixedWeekly = vi.fn();
const mockSetClient = vi.fn();

// Configurable store state
let storeState = {
  barberId: 'barber-001',
  barberName: 'Santi Ducca',
  serviceId: 'uuid-svc-1',
  serviceName: 'Corte de Pelo',
  servicePrice: 12000,
  date: '2026-06-10',
  time: '10:00',
  isFixedWeekly: false,
  clientName: '',
  clientPhone: '',
  slotConflictError: null as string | null,
  setStep: mockSetStep,
  setSlotConflictError: mockSetSlotConflictError,
  reset: mockReset,
  setFixedWeekly: mockSetFixedWeekly,
  setClient: mockSetClient,
};

vi.mock('../bookingStore', () => ({
  useBookingStore: (selector?: (s: typeof storeState) => unknown) => {
    if (typeof selector === 'function') return selector(storeState);
    return storeState;
  },
}));

function renderConfirmation(overrides: Partial<typeof storeState> = {}) {
  storeState = { ...storeState, ...overrides };
  return render(<Confirmation />);
}

describe('Confirmation (T2.3 + T3.3 + T6.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVipDiscountPercent.mockResolvedValue(0);
    storeState = {
      barberId: 'barber-001',
      barberName: 'Santi Ducca',
      serviceId: 'uuid-svc-1',
      serviceName: 'Corte de Pelo',
      servicePrice: 12000,
      date: '2026-06-10',
      time: '10:00',
      isFixedWeekly: false,
      clientName: '',
      clientPhone: '',
      slotConflictError: null,
      setStep: mockSetStep,
      setSlotConflictError: mockSetSlotConflictError,
      reset: mockReset,
      setFixedWeekly: mockSetFixedWeekly,
      setClient: mockSetClient,
    };
  });

  describe('T3.3 — service info from store', () => {
    it('displays service name from store', () => {
      renderConfirmation();
      expect(screen.getByText('Corte de Pelo')).toBeTruthy();
    });

    it('displays formatted service price from store', () => {
      renderConfirmation();
      // Price should appear in the details section
      expect(screen.getByText(/12[.,]?000/)).toBeTruthy();
    });

    it('sends real UUID (not hardcoded) in INSERT payload', async () => {
      mockInsert.mockResolvedValue({ error: null });

      renderConfirmation({
        clientName: 'Juan Perez',
        clientPhone: '3402500000',
        serviceId: 'uuid-svc-real-1',
        serviceName: 'Corte de Pelo',
        servicePrice: 12000,
      });

      // Fill in client info via store-controlled inputs
      fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            service_id: 'uuid-svc-real-1',
          })
        );
      });

      // Must NOT use the old hardcoded UUID
      expect(mockInsert).not.toHaveBeenCalledWith(
        expect.objectContaining({
          service_id: '00000000-0000-0000-0000-000000000001',
        })
      );
    });

    it('computes final_price as Math.round(price / 100) * 100 (nearest 100)', async () => {
      mockInsert.mockResolvedValue({ error: null });

      // Price 11950 → rounds to 12000
      renderConfirmation({
        clientName: 'Juan Perez',
        clientPhone: '3402500000',
        servicePrice: 11950,
        isFixedWeekly: false,
      });

      fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            final_price: 12000,
          })
        );
      });
    });

    it('applies 10% discount on final_price when isFixedWeekly is true, rounded to nearest 100', async () => {
      mockInsert.mockResolvedValue({ error: null });

      // price 12000 * 0.9 = 10800 → round to nearest 100 = 10800
      renderConfirmation({
        clientName: 'Juan Perez',
        clientPhone: '3402500000',
        servicePrice: 12000,
        isFixedWeekly: true,
      });

      fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            final_price: 10800,
          })
        );
      });
    });
  });

  describe('Bug #9 — VIP (Coronita) 10% discount applied automatically', () => {
    it('applies the VIP discount to final_price for a VIP client', async () => {
      mockInsert.mockResolvedValue({ error: null });
      mockGetVipDiscountPercent.mockResolvedValue(10);

      // price 12000 * 0.9 = 10800 → round to nearest 100 = 10800
      renderConfirmation({
        clientName: 'Cliente Coronita',
        clientPhone: '3402500001',
        servicePrice: 12000,
        isFixedWeekly: false,
      });

      fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            final_price: 10800,
          })
        );
      });

      expect(mockGetVipDiscountPercent).toHaveBeenCalledWith('3402500001', 'barber-001');
    });

    it('charges full price for a non-VIP client', async () => {
      mockInsert.mockResolvedValue({ error: null });
      mockGetVipDiscountPercent.mockResolvedValue(0);

      renderConfirmation({
        clientName: 'Cliente Regular',
        clientPhone: '3402500002',
        servicePrice: 12000,
        isFixedWeekly: false,
      });

      fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            final_price: 12000,
          })
        );
      });
    });

    it('does not stack VIP discount with the fixed-weekly discount (uses the higher one)', async () => {
      mockInsert.mockResolvedValue({ error: null });
      mockGetVipDiscountPercent.mockResolvedValue(10);

      renderConfirmation({
        clientName: 'Cliente Coronita Fijo',
        clientPhone: '3402500003',
        servicePrice: 12000,
        isFixedWeekly: true,
      });

      fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            final_price: 10800,
          })
        );
      });
    });
  });

  describe('T2.3 — 23505 collision error handling', () => {
    it('shows inline error when insert returns 23505, does not navigate away', async () => {
      mockInsert.mockResolvedValue({
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "appointments_unique_slot"',
        },
      });

      renderConfirmation({
        clientName: 'Juan Perez',
        clientPhone: '3402500000',
      });

      fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

      await waitFor(() => {
        // The inline error must be visible in DOM
        const errorEl = screen.getByText(/turno.*tomado|tomado.*turno/i);
        expect(errorEl).toBeTruthy();
      });

      // Must NOT navigate to confirmation screen
      expect(screen.queryByTestId('qr-code')).toBeNull();
    });

    it('calls setStep(3) to return to TimeSelector on 23505', async () => {
      mockInsert.mockResolvedValue({
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "appointments_unique_slot"',
        },
      });

      renderConfirmation({
        clientName: 'Juan Perez',
        clientPhone: '3402500000',
      });

      fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

      await waitFor(() => {
        expect(mockSetStep).toHaveBeenCalledWith(3);
      });
    });
  });

  describe('T6.1 — Zod validation wiring', () => {
    it('does NOT call supabase insert when phone is invalid', async () => {
      renderConfirmation({
        clientName: 'Juan Perez',
        clientPhone: 'abc',
      });

      fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

      // Wait a tick for async handler
      await new Promise((r) => setTimeout(r, 50));

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('shows inline phone validation error for invalid phone', async () => {
      renderConfirmation({
        clientName: 'Juan Perez',
        clientPhone: 'abc',
      });

      fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

      await waitFor(() => {
        // Some validation error text should be visible
        const errorEls = screen.queryAllByText(/.+/);
        const hasPhoneError = errorEls.some(
          (el) =>
            el.textContent?.toLowerCase().includes('teléfono') ||
            el.textContent?.toLowerCase().includes('formato') ||
            el.textContent?.toLowerCase().includes('dígito')
        );
        expect(hasPhoneError).toBe(true);
      });
    });

    it('calls supabase insert when validation passes', async () => {
      mockInsert.mockResolvedValue({ error: null });

      renderConfirmation({
        clientName: 'Juan Perez',
        clientPhone: '3402500000',
      });

      fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Honest client flow — no deposit, booking is a request', () => {
    it('does not show any payment alias or deposit copy to the client', () => {
      renderConfirmation({ barberName: 'Santi Ducca' });

      expect(screen.queryByText('santi.ducca')).toBeNull();
      expect(screen.queryByText(/alias/i)).toBeNull();
      expect(screen.queryByText(/seña/i)).toBeNull();
    });

    it('does not promise a WhatsApp message', () => {
      renderConfirmation();
      expect(screen.queryByText(/enviar los datos por whatsapp/i)).toBeNull();
    });

    it('inserts the turno as pending with deposit_paid false (barber approves)', async () => {
      mockInsert.mockResolvedValue({ error: null });

      renderConfirmation({ clientName: 'Juan Perez', clientPhone: '3402500000' });
      fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'pending', deposit_paid: false })
        );
      });
    });

    it('redirects to /mi-turno/<hash>?nuevo=1 on success', async () => {
      mockInsert.mockResolvedValue({ error: null });

      renderConfirmation({ clientName: 'Juan Perez', clientPhone: '3402500000' });
      fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/mi-turno\/.+\?nuevo=1$/));
      });
    });

    it('does not redirect when the insert fails', async () => {
      mockInsert.mockResolvedValue({ error: { code: '500', message: 'boom' } });

      renderConfirmation({ clientName: 'Juan Perez', clientPhone: '3402500000' });
      fireEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

      await waitFor(() => expect(mockInsert).toHaveBeenCalled());
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('tells the client the fixed-weekly option does not book the coming weeks', () => {
      renderConfirmation();

      // The generator only materializes turnos from `vip_clients`, which this
      // checkbox never writes — the label must not promise a recurring series.
      expect(
        screen.getByText(/los turnos de las próximas semanas no quedan reservados/i)
      ).toBeTruthy();
    });
  });
});
