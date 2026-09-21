/**
 * CancelAppointment (/mi-turno) — honest client flow.
 *
 * The shop takes no seña, and the app sends no automated message: every
 * WhatsApp goes out manually from the barber's phone. So this screen must
 * never offer a deposit, never write `deposit_paid` (that column belongs to
 * the barber), and never promise a notification. `/mi-turno/<hash>` is the
 * single source of truth the client returns to.
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom implements neither of these; the .ics download uses both.
beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
});

// Chainable supabase mock: from().update().eq().in().select() → { data, error }.
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockIn = vi.fn(() => ({ select: mockSelect }));
const mockEq = vi.fn(() => ({ in: mockIn }));
const CANCELLED_ONE_ROW = { data: [{ id: 'apt-1' }], error: null };

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: () => ({ update: mockUpdate }),
  },
}));

const mockSingle = vi.fn();
vi.mock('@/shared/lib/supabase-server', () => ({
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: mockSingle }) }) }),
  }),
}));

import MiTurnoPage from '@/app/mi-turno/[hash]/page';
import { CancelAppointment } from '../components/CancelAppointment';

const baseAppointment = {
  id: 'apt-1',
  client_name: 'Juan Perez',
  // Far enough in the future that cancelling is still allowed (>4 h).
  appointment_date: '2099-07-03',
  appointment_time: '14:00:00',
  qr_hash: 'ABC12345',
  barbers: { name: 'Santi Ducca' },
  services: { name: 'Corte Premium', duration_min: 30 },
};

function renderAppointment(overrides: Record<string, unknown> = {}, isNew = false) {
  return render(
    <CancelAppointment
      appointment={{ ...baseAppointment, status: 'pending', ...overrides }}
      hash='ABC12345'
      isNew={isNew}
    />
  );
}

describe('CancelAppointment — no client-side deposit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockResolvedValue(CANCELLED_ONE_ROW);
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ in: mockIn });
  });

  it('offers the client no way to write deposit_paid', () => {
    renderAppointment({ status: 'confirmed' });

    expect(screen.queryByText(/ya realicé el pago/i)).toBeNull();
    expect(screen.queryByText(/seña/i)).toBeNull();
    expect(screen.queryByText(/finalizar compra/i)).toBeNull();
    expect(screen.queryByText(/alias/i)).toBeNull();

    // No button on this screen may issue a deposit_paid update.
    for (const button of screen.getAllByRole('button')) {
      fireEvent.click(button);
    }
    for (const call of mockUpdate.mock.calls) {
      expect(call[0]).not.toHaveProperty('deposit_paid');
    }
  });

  it('does not offer to send anything by WhatsApp', () => {
    renderAppointment({ status: 'confirmed' });
    expect(screen.queryByText(/enviar por whatsapp/i)).toBeNull();
  });
});

describe('CancelAppointment — status is explained', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ eq: mockEq });
  });

  it('explains what "pendiente" means and where to check back', () => {
    renderAppointment({ status: 'pending' });

    expect(screen.getByText(/pendiente de confirmación del barbero/i)).toBeTruthy();
    expect(screen.getByText(/el barbero tiene que aprobarlo/i)).toBeTruthy();
    expect(screen.getByText(/volvé a abrir este mismo link/i)).toBeTruthy();
  });

  it('never promises a message for a pending turno', () => {
    renderAppointment({ status: 'pending' });
    expect(screen.getByText(/no te vamos a enviar ningún mensaje/i)).toBeTruthy();
  });

  it('renders the confirmed state when the barber approved it', () => {
    renderAppointment({ status: 'confirmed' });

    expect(screen.getByText(/turno confirmado por el barbero/i)).toBeTruthy();
    expect(screen.queryByText(/pendiente de confirmación/i)).toBeNull();
  });

  it('captions the QR with the rules the scanner actually enforces', () => {
    renderAppointment({ status: 'confirmed' });

    expect(screen.getByText(/el barbero escanea este código cuando llegás/i)).toBeTruthy();
    expect(screen.getByText(/sólo sirve el día del turno/i)).toBeTruthy();
    expect(screen.getByText(/vence 2 horas después/i)).toBeTruthy();
  });

  it('gives the client a way to keep the link', () => {
    renderAppointment({ status: 'pending' });

    expect(screen.getByRole('button', { name: /copiar link/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /agregar al calendario/i })).toBeTruthy();
  });
});

describe('CancelAppointment — first arrival (?nuevo=1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ eq: mockEq });
  });

  it('shows the success banner when isNew', () => {
    renderAppointment({ status: 'pending' }, true);
    expect(screen.getByText(/tu pedido de turno entró/i)).toBeTruthy();
  });

  it('does not show the success banner on a normal visit', () => {
    renderAppointment({ status: 'pending' }, false);
    expect(screen.queryByText(/tu pedido de turno entró/i)).toBeNull();
  });
});

describe('CancelAppointment — cancelling requires confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockResolvedValue(CANCELLED_ONE_ROW);
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ in: mockIn });
  });

  it('does not touch supabase on the first click — it asks first', () => {
    renderAppointment({ status: 'confirmed' });

    fireEvent.click(screen.getByRole('button', { name: /^cancelar turno$/i }));

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(screen.getByText(/¿cancelar este turno\?/i)).toBeTruthy();
  });

  it('cancels only after the client confirms', async () => {
    renderAppointment({ status: 'confirmed' });

    fireEvent.click(screen.getByRole('button', { name: /^cancelar turno$/i }));
    fireEvent.click(screen.getByRole('button', { name: /sí, cancelar/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'cancelled' });
    });
  });

  it('backs out without cancelling when the client declines', () => {
    renderAppointment({ status: 'confirmed' });

    fireEvent.click(screen.getByRole('button', { name: /^cancelar turno$/i }));
    fireEvent.click(screen.getByRole('button', { name: /no, mantener/i }));

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^cancelar turno$/i })).toBeTruthy();
  });
});

describe('CancelAppointment — dead ends always offer a way out', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockResolvedValue(CANCELLED_ONE_ROW);
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ in: mockIn });
  });

  it('offers a route out when the turno does not exist', () => {
    render(<CancelAppointment appointment={null} hash='NOPE' />);

    expect(screen.getByText(/turno no encontrado/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /pedir un turno/i })).toHaveAttribute(
      'href',
      '/reservar'
    );
  });

  it('offers a route out when the turno was already cancelled', () => {
    renderAppointment({ status: 'cancelled' });

    expect(screen.getByText(/este turno ya fue cancelado/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /pedir otro turno/i })).toHaveAttribute(
      'href',
      '/reservar'
    );
  });

  it('offers a route out when the turno was already completed', () => {
    renderAppointment({ status: 'attended' });

    expect(screen.getByText(/este turno ya fue completado/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /pedir otro turno/i })).toHaveAttribute(
      'href',
      '/reservar'
    );
  });

  it('offers a route out from the post-cancellation screen', async () => {
    renderAppointment({ status: 'confirmed' });

    fireEvent.click(screen.getByRole('button', { name: /^cancelar turno$/i }));
    fireEvent.click(screen.getByRole('button', { name: /sí, cancelar/i }));

    await waitFor(() => {
      expect(screen.getByText(/^turno cancelado$/i)).toBeTruthy();
    });
    expect(screen.getByRole('link', { name: /pedir otro turno/i })).toHaveAttribute(
      'href',
      '/reservar'
    );
  });
});

describe('CancelAppointment — never claims what did not happen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockResolvedValue(CANCELLED_ONE_ROW);
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ in: mockIn });
  });

  // A row outside the .in() filter matches ZERO rows and returns NO error.
  it('reports failure, not "Turno cancelado", when the update changes zero rows', async () => {
    mockSelect.mockResolvedValue({ data: [], error: null });
    renderAppointment({ status: 'confirmed' });

    fireEvent.click(screen.getByRole('button', { name: /^cancelar turno$/i }));
    fireEvent.click(screen.getByRole('button', { name: /sí, cancelar/i }));

    expect(await screen.findByText(/no pudimos cancelar el turno/i)).toBeTruthy();
    expect(screen.queryByText(/^turno cancelado$/i)).toBeNull();
  });

  it('disables the confirm button while the cancellation is in flight', async () => {
    mockSelect.mockReturnValue(new Promise(() => {})); // never settles
    renderAppointment({ status: 'confirmed' });

    fireEvent.click(screen.getByRole('button', { name: /^cancelar turno$/i }));
    fireEvent.click(screen.getByRole('button', { name: /sí, cancelar/i }));

    expect(await screen.findByRole('button', { name: /cancelando/i })).toBeDisabled();
  });

  it('shows the link to copy by hand when the clipboard is unavailable', async () => {
    renderAppointment({ status: 'confirmed' }); // jsdom has no navigator.clipboard
    fireEvent.click(screen.getByRole('button', { name: /copiar link/i }));
    expect(await screen.findByText(/copiá el link a mano/i)).toBeTruthy();
  });

  it.each(['debt', 'blocked'])('renders an honest screen for %s, with no cancel', (status) => {
    renderAppointment({ status });

    expect(screen.getByText(/pago pendiente|ya no está activo/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /cancelar/i })).toBeNull();
  });

  it('says "no pudimos cargar" on a read error, "no encontrado" only on zero rows', async () => {
    const renderPage = () =>
      MiTurnoPage({
        params: Promise.resolve({ hash: 'abc12345' }),
        searchParams: Promise.resolve({}),
      }).then(render);

    mockSingle.mockResolvedValue({ data: null, error: { code: '08006' } }); // network
    await renderPage();
    expect(screen.getByText(/no pudimos cargar tu turno/i)).toBeTruthy();
    expect(screen.queryByText(/turno no encontrado/i)).toBeNull();

    cleanup();
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } }); // zero rows
    await renderPage();
    expect(screen.getByText(/turno no encontrado/i)).toBeTruthy();
  });
});
