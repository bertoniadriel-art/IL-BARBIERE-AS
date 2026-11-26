/**
 * availabilityService.getBlockedSlotsForDay — cadencia VIP (GitHub issue #50)
 *
 * `blocked_slots.reason = 'vip_reserved'` se siembra 1:1 desde `vip_clients` y se
 * aplica a TODOS los días de la semana del barbero, sin ventana de fechas. Para un
 * cliente `biweekly` eso trababa la semana sin turno: el slot no era reservable y
 * tampoco había cita que lo justificara.
 *
 * Semántica nueva: el bloqueo permanente desde `blocked_slots` aplica solo a
 * `weekly`; en `biweekly` la ocupación de la semana VIP la dan las citas `VIP-*`
 * ya materializadas por el cron, que llegan por `getBookedSlots`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/shared/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mocks.mockFrom(...(args as [string])) },
}));

import { getBlockedSlotsForDay, getBookedSlots } from '../services/availabilityService';

type TableResult = { data: Record<string, unknown>[] | null; error: unknown };
type CapturedQuery = { table: string; columns: string };

/**
 * Mock de supabase-js que *honra* los filtros `.eq()` en lugar de devolver un
 * fixture fijo: si la implementación deja de filtrar por barber_id o por día de
 * la semana, el test falla de verdad; y `columns` queda capturado para fijar que
 * la cadencia (`frequency`) se lee en la misma consulta de `vip_clients`.
 */
function setupSupabaseMock(byTable: Record<string, TableResult>) {
  const queries: CapturedQuery[] = [];

  const makeChain = (rows: Record<string, unknown>[], error: unknown): unknown => ({
    eq: (column: string, value: unknown) =>
      makeChain(
        rows.filter((row) => row[column] === value),
        error
      ),
    then: (resolve: (value: TableResult) => unknown) =>
      Promise.resolve({ data: rows, error }).then(resolve),
  });

  mocks.mockFrom.mockImplementation((table: string) => {
    const result = byTable[table] ?? { data: [], error: null };
    return {
      select: (columns: string) => {
        queries.push({ table, columns });
        return makeChain(result.data ?? [], result.error);
      },
    };
  });

  return { queries };
}

// Sábado 2026-11-28 (day_of_week 6): el slot reportado por Santi para Juli Bustos.
const SATURDAY = '2026-11-28';
// Sábado siguiente, fuera de la ventana de materialización del cron: la off-week.
const NEXT_SATURDAY = '2026-12-05';

function vipBlockedRows() {
  return [
    {
      barber_id: 'barber-1',
      day_of_week: 6,
      slot_time: '11:30:00',
      reason: 'vip_reserved',
      enabled: true,
      label: 'Juli Bustos',
    },
    {
      barber_id: 'barber-1',
      day_of_week: 6,
      slot_time: '15:00:00',
      reason: 'personal',
      enabled: true,
      label: 'Almuerzo',
    },
  ];
}

function vipClientRow(overrides: Record<string, unknown> = {}) {
  return {
    barber_id: 'barber-1',
    day_of_week: 6,
    slot_time: '11:30:00',
    frequency: 'weekly',
    services: { duration_min: 30 },
    ...overrides,
  };
}

describe('getBlockedSlotsForDay (GitHub issue #50 — VIP biweekly)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no bloquea el slot vip_reserved de un cliente biweekly (la semana sin turno queda reservable)', async () => {
    const { queries } = setupSupabaseMock({
      blocked_slots: { data: vipBlockedRows(), error: null },
      vip_clients: { data: [vipClientRow({ frequency: 'biweekly' })], error: null },
    });

    const result = await getBlockedSlotsForDay('barber-1', SATURDAY);

    expect(result).not.toContain('11:30');
    expect(result).toEqual(['15:00']);

    // La cadencia tiene que venir de la misma consulta de vip_clients (sin un
    // round-trip extra ni un default asumido por el llamador).
    const vipQuery = queries.find((query) => query.table === 'vip_clients');
    expect(vipQuery?.columns).toContain('frequency');
    expect(vipQuery?.columns).toContain('services(duration_min)');
  });

  it('sigue bloqueando el slot vip_reserved de un cliente weekly en cualquier fecha del día (PRESERVE)', async () => {
    setupSupabaseMock({
      blocked_slots: { data: vipBlockedRows(), error: null },
      vip_clients: { data: [vipClientRow({ frequency: 'weekly' })], error: null },
    });

    const result = await getBlockedSlotsForDay('barber-1', SATURDAY);

    expect(result).toContain('11:30');
    expect(result.sort()).toEqual(['11:30', '15:00']);
  });

  it('expande por duración el slot vip_reserved de un cliente weekly (PRESERVE)', async () => {
    setupSupabaseMock({
      blocked_slots: {
        data: [{ ...vipBlockedRows()[0], slot_time: '09:00:00' }],
        error: null,
      },
      vip_clients: {
        data: [vipClientRow({ slot_time: '09:00:00', services: { duration_min: 60 } })],
        error: null,
      },
    });

    const result = await getBlockedSlotsForDay('barber-1', SATURDAY);

    expect(result.sort()).toEqual(['09:00', '09:30']);
  });

  it('sigue bloqueando los slots personales del día sin consultar vip_clients (PRESERVE)', async () => {
    const personal = [
      {
        barber_id: 'barber-1',
        day_of_week: 6,
        slot_time: '13:00:00',
        reason: 'personal',
        enabled: true,
      },
      {
        barber_id: 'barber-1',
        day_of_week: 6,
        slot_time: '13:30:00',
        reason: 'personal',
        enabled: true,
      },
    ];
    const { queries } = setupSupabaseMock({
      blocked_slots: { data: personal, error: null },
    });

    const result = await getBlockedSlotsForDay('barber-1', SATURDAY);

    expect(result).toEqual(['13:00', '13:30']);
    expect(queries.map((query) => query.table)).toEqual(['blocked_slots']);
  });

  it('en la semana con turno, la ocupación del cliente biweekly la da la cita materializada (booked ∪ blocked)', async () => {
    setupSupabaseMock({
      blocked_slots: { data: vipBlockedRows(), error: null },
      vip_clients: { data: [vipClientRow({ frequency: 'biweekly' })], error: null },
      booked_slots: {
        data: [
          {
            barber_id: 'barber-1',
            appointment_date: SATURDAY,
            appointment_time: '11:30:00',
            duration_min: 30,
          },
        ],
        error: null,
      },
    });

    const onWeek = await Promise.all([
      getBlockedSlotsForDay('barber-1', SATURDAY),
      getBookedSlots('barber-1', SATURDAY),
    ]);
    const offWeek = await Promise.all([
      getBlockedSlotsForDay('barber-1', NEXT_SATURDAY),
      getBookedSlots('barber-1', NEXT_SATURDAY),
    ]);

    // Es el contrato que usan TimeSelector y AgendaView: booked ∪ blocked.
    expect([...onWeek[0], ...onWeek[1]]).toContain('11:30');
    expect([...offWeek[0], ...offWeek[1]]).not.toContain('11:30');
  });

  it('trata una fila sin cadencia conocida (legacy/null) como semanal y la sigue bloqueando', async () => {
    setupSupabaseMock({
      blocked_slots: { data: vipBlockedRows(), error: null },
      vip_clients: { data: [vipClientRow({ frequency: null })], error: null },
    });

    const result = await getBlockedSlotsForDay('barber-1', SATURDAY);

    expect(result).toContain('11:30');
  });

  it('ante un error de vip_clients no bloquea la semana sin turno: devuelve solo los personales', async () => {
    setupSupabaseMock({
      blocked_slots: { data: vipBlockedRows(), error: null },
      vip_clients: { data: null, error: { message: 'network error' } },
    });

    const result = await getBlockedSlotsForDay('barber-1', SATURDAY);

    expect(result).toEqual(['15:00']);
    expect(result).not.toContain('11:30');
  });
});
