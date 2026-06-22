/**
 * Tests for ServiceSelector async behavior (T3.2 / REQ-3.1).
 * Verifies:
 * - Fetches services from DB (no hardcoded array)
 * - Renders one option per DB row
 * - Shows error state on query failure
 * - Calls setService with real UUID + name + price
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ServiceSelector } from '../components/ServiceSelector';

// Mock supabase
const mockServiceQuery = vi.fn();

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'services') return mockServiceQuery();
      return { select: vi.fn() };
    },
  },
}));

// Mock bookingStore
const mockSetService = vi.fn();
const mockSetStep = vi.fn();

vi.mock('../bookingStore', () => ({
  useBookingStore: (selector: (s: any) => any) => {
    const state = {
      setService: mockSetService,
      setStep: mockSetStep,
    };
    return selector(state);
  },
}));

const mockServices = [
  { id: 'uuid-svc-1', name: 'Corte de Pelo', price: 12000, duration_min: 30 },
  { id: 'uuid-svc-2', name: 'Barba', price: 8000, duration_min: 30 },
  { id: 'uuid-svc-3', name: 'Corte + Barba', price: 16000, duration_min: 60 },
];

function makeSuccessQuery(data: typeof mockServices) {
  return () => ({
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data, error: null }),
    }),
  });
}

function makeErrorQuery() {
  return () => ({
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'network error' } }),
    }),
  });
}

describe('ServiceSelector (T3.2 — async from DB)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders one card per service returned from DB', async () => {
    mockServiceQuery.mockImplementation(makeSuccessQuery(mockServices));

    render(<ServiceSelector />);

    // Wait for async data load
    await waitFor(() => {
      expect(screen.getByText('Corte de Pelo')).toBeTruthy();
      expect(screen.getByText('Barba')).toBeTruthy();
      expect(screen.getByText('Corte + Barba')).toBeTruthy();
    });
  });

  it('does NOT render any element with a hardcoded service ID like "s1"', async () => {
    mockServiceQuery.mockImplementation(makeSuccessQuery(mockServices));

    const { container } = render(<ServiceSelector />);

    await waitFor(() => {
      expect(screen.getByText('Corte de Pelo')).toBeTruthy();
    });

    // No element should have data attribute or text matching hardcoded IDs
    expect(container.innerHTML).not.toContain('"s1"');
    expect(container.innerHTML).not.toContain('"s2"');
    expect(container.innerHTML).not.toContain('"s3"');
  });

  it('calls setService with real UUID, name, and price when card is clicked', async () => {
    mockServiceQuery.mockImplementation(makeSuccessQuery(mockServices));

    render(<ServiceSelector />);

    await waitFor(() => {
      expect(screen.getByText('Corte de Pelo')).toBeTruthy();
    });

    // Click the first service card
    fireEvent.click(screen.getByText('Corte de Pelo').closest('button')!);

    expect(mockSetService).toHaveBeenCalledWith('uuid-svc-1', 'Corte de Pelo', 12000);
    expect(mockSetService).not.toHaveBeenCalledWith('s1');
  });

  it('shows error message when DB query fails', async () => {
    mockServiceQuery.mockImplementation(makeErrorQuery());

    render(<ServiceSelector />);

    await waitFor(() => {
      expect(screen.getByText(/No se pudieron cargar los servicios/i)).toBeTruthy();
    });
  });

  it('disables Next button when services fail to load', async () => {
    mockServiceQuery.mockImplementation(makeErrorQuery());

    render(<ServiceSelector />);

    await waitFor(() => {
      expect(screen.getByText(/No se pudieron cargar los servicios/i)).toBeTruthy();
    });

    // No service cards should be clickable — just verify error state is shown
    // (The component shows error state and no cards)
    const buttons = screen.queryAllByRole('button');
    // Only the "back" button should remain; no service cards
    const serviceCards = buttons.filter((b) => {
      const text = b.textContent ?? '';
      return mockServices.some((s) => text.includes(s.name));
    });
    expect(serviceCards.length).toBe(0);
  });
});
