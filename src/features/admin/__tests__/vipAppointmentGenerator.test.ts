/**
 * vipAppointmentGenerator — unit tests (GitHub issue #15)
 *
 * Covers the 15-day window generation, weekly vs biweekly cadence,
 * rounding formula, incomplete-row skipping, and idempotency (pre-check
 * skip + 23505 unique-violation race fallback).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/shared/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mocks.mockFrom(...(args as [string])),
  },
}));

import { computeFinalPrice, generateVipAppointments } from '../services/vipAppointmentGenerator';

type VipClientFixture = {
  id: string;
  client_name: string;
  client_phone: string | null;
  barber_id: string | null;
  service_id: string | null;
  day_of_week: number | null;
  slot_time: string | null;
  frequency: 'weekly' | 'biweekly' | null;
  discount_percent: number | null;
  active: boolean;
};

function vipRow(overrides: Partial<VipClientFixture> = {}): VipClientFixture {
  return {
    id: 'vip-1',
    client_name: 'Cliente Test',
    client_phone: '3402000000',
    barber_id: 'barber-1',
    service_id: 'service-1',
    day_of_week: 4, // Thursday
    slot_time: '10:00',
    frequency: 'weekly',
    discount_percent: 10,
    active: true,
    ...overrides,
  };
}

type MockConfig = {
  vipClients: VipClientFixture[];
  existingAppointments?: {
    barber_id: string | null;
    appointment_date: string;
    appointment_time: string;
    status?: string;
  }[];
  // Rows the anchor query (`appointments` ⋈ `qr_hash like 'VIP-%'`) can return.
  // `qr_hash` is optional: absent means a generator-materialized VIP row.
  vipAppointments?: {
    barber_id: string | null;
    appointment_date: string;
    appointment_time: string;
    qr_hash?: string;
  }[];
  vipAppointmentsError?: { message: string };
  services?: { id: string; price: number }[];
  onInsert?: (payload: Record<string, unknown>) => { error: unknown } | undefined;
};

function matchesLike(value: unknown, pattern: string): boolean {
  const text = typeof value === 'string' ? value : '';
  return pattern.endsWith('%') ? text.startsWith(pattern.slice(0, -1)) : text === pattern;
}

function setupSupabaseMock(config: MockConfig) {
  const insertCalls: Record<string, unknown>[] = [];
  const vipQueryFilters: { column: string; value: unknown }[] = [];
  const vipAppointmentFilters: { column: string; op: string; value: unknown }[] = [];

  mocks.mockFrom.mockImplementation((table: string) => {
    if (table === 'vip_clients') {
      return {
        select: () =>
          // Records and *applies* the PostgREST filters instead of ignoring
          // them and returning the whole fixture: that way removing
          // `.eq('active', true)` from the generator makes the inactive-row
          // test (GitHub issue #49) fail instead of silently passing. Still a
          // thenable, like the real query builder, so an unfiltered query
          // resolves with the whole fixture.
          Object.assign(Promise.resolve({ data: config.vipClients, error: null }), {
            eq: (column: string, value: unknown) => {
              vipQueryFilters.push({ column, value });
              const filtered = config.vipClients.filter(
                (row) => (row as unknown as Record<string, unknown>)[column] === value
              );
              return Promise.resolve({ data: filtered, error: null });
            },
          }),
      };
    }

    if (table === 'appointments') {
      return {
        // Two query shapes hit `appointments`:
        //  - window pre-check: select -> gte -> lt -> neq
        //  - biweekly anchor:  select -> like('qr_hash', 'VIP-%') -> in('barber_id')
        // Both *apply* their filters instead of ignoring them, so dropping a
        // filter from the generator makes a test fail instead of passing
        // silently.
        select: () => ({
          gte: (_column: string, from: string) => ({
            lt: (_column2: string, to: string) => ({
              neq: (_column3: string, status: unknown) =>
                Promise.resolve({
                  data: (config.existingAppointments ?? []).filter(
                    (row) =>
                      row.appointment_date >= from &&
                      row.appointment_date < to &&
                      row.status !== status
                  ),
                  error: null,
                }),
            }),
          }),
          like: (column: string, pattern: string) => ({
            in: (column2: string, values: unknown[]) => {
              vipAppointmentFilters.push(
                { column, op: 'like', value: pattern },
                { column: column2, op: 'in', value: values }
              );
              if (config.vipAppointmentsError) {
                return Promise.resolve({ data: null, error: config.vipAppointmentsError });
              }
              return Promise.resolve({
                data: (config.vipAppointments ?? []).filter(
                  (row) => matchesLike(row.qr_hash, pattern) && values.includes(row.barber_id)
                ),
                error: null,
              });
            },
          }),
        }),
        insert: (payload: Record<string, unknown>) => {
          insertCalls.push(payload);
          const result = config.onInsert?.(payload);
          return Promise.resolve({ error: result?.error ?? null });
        },
      };
    }

    if (table === 'services') {
      return {
        select: () => ({
          in: () => Promise.resolve({ data: config.services ?? [], error: null }),
        }),
      };
    }

    throw new Error(`Unexpected table in test mock: ${table}`);
  });

  return { insertCalls, vipQueryFilters, vipAppointmentFilters };
}

// Thursday 2026-07-02, matches vipRow's default day_of_week (4).
const TODAY = new Date(2026, 6, 2);

describe('computeFinalPrice', () => {
  it('matches the Confirmation.tsx / QuickAddModal.tsx rounding formula', () => {
    expect(computeFinalPrice(14000, 10)).toBe(12600);
    expect(computeFinalPrice(14000, 0)).toBe(14000);
    // 13000 * 0.85 = 11050 -> /100 = 110.5 -> round = 111 -> *100 = 11100
    expect(computeFinalPrice(13000, 15)).toBe(11100);
  });
});

describe('generateVipAppointments (GitHub issue #15)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates an appointment for every matching date within the 15-day window for weekly clients', async () => {
    // TODAY is itself a Thursday match (day_of_week 4), so within
    // [2026-07-02, 2026-07-17) Thursdays fall on 07-02, 07-09, 07-16 — 3 occurrences.
    setupSupabaseMock({
      vipClients: [vipRow()],
      services: [{ id: 'service-1', price: 14000 }],
    });

    const summary = await generateVipAppointments(TODAY);

    expect(summary.created).toBe(3);
    expect(summary.skippedExisting).toBe(0);
    expect(summary.skippedIncomplete).toEqual({ count: 0, clientNames: [] });
    expect(summary.errors).toEqual([]);
  });

  it('generates exactly 2 occurrences for a weekly client when the window start does not match', async () => {
    // Start on a Friday (day_of_week 5); the client's day is Thursday (4).
    // Window [2026-07-03, 2026-07-18): Thursdays fall on 07-09 and 07-16 only.
    const friday = new Date(2026, 6, 3);
    setupSupabaseMock({
      vipClients: [vipRow()],
      services: [{ id: 'service-1', price: 14000 }],
    });

    const summary = await generateVipAppointments(friday);

    expect(summary.created).toBe(2);
  });

  it('generates exactly one occurrence for a biweekly client', async () => {
    setupSupabaseMock({
      vipClients: [vipRow({ frequency: 'biweekly' })],
      services: [{ id: 'service-1', price: 14000 }],
    });

    const summary = await generateVipAppointments(TODAY);

    expect(summary.created).toBe(1);
  });

  it('skips vip_clients rows missing slot_time or service_id and reports them in the summary', async () => {
    setupSupabaseMock({
      vipClients: [
        vipRow({ client_name: 'Sin Horario', slot_time: null }),
        vipRow({ client_name: 'Sin Servicio', service_id: null }),
        vipRow({ client_name: 'Sin Dia', day_of_week: null }),
      ],
      services: [{ id: 'service-1', price: 14000 }],
    });

    const summary = await generateVipAppointments(TODAY);

    expect(summary.created).toBe(0);
    expect(summary.skippedIncomplete.count).toBe(3);
    expect(summary.skippedIncomplete.clientNames).toEqual([
      'Sin Horario',
      'Sin Servicio',
      'Sin Dia',
    ]);
  });

  it('skips a date/slot combo when a matching non-cancelled appointment already exists (idempotency pre-check)', async () => {
    setupSupabaseMock({
      vipClients: [vipRow({ frequency: 'biweekly' })],
      existingAppointments: [
        { barber_id: 'barber-1', appointment_date: '2026-07-02', appointment_time: '10:00:00' },
      ],
      services: [{ id: 'service-1', price: 14000 }],
    });

    const summary = await generateVipAppointments(TODAY);

    expect(summary.created).toBe(0);
    expect(summary.skippedExisting).toBe(1);
  });

  it('treats a 23505 unique-violation on insert as an already-exists skip without aborting the batch', async () => {
    const { insertCalls } = setupSupabaseMock({
      vipClients: [
        vipRow({ client_name: 'Cliente A', frequency: 'biweekly' }),
        vipRow({ client_name: 'Cliente B', frequency: 'biweekly', barber_id: 'barber-2' }),
      ],
      services: [{ id: 'service-1', price: 14000 }],
      onInsert: (payload) => {
        if (payload.client_name === 'Cliente A') {
          return { error: { code: '23505', message: 'duplicate key value' } };
        }
        return undefined;
      },
    });

    const summary = await generateVipAppointments(TODAY);

    expect(summary.created).toBe(1);
    expect(summary.skippedExisting).toBe(1);
    expect(summary.errors).toEqual([]);
    expect(insertCalls).toHaveLength(2);
  });

  it('records a non-23505 insert failure as an error without aborting other rows', async () => {
    setupSupabaseMock({
      vipClients: [
        vipRow({ client_name: 'Cliente A', frequency: 'biweekly' }),
        vipRow({ client_name: 'Cliente B', frequency: 'biweekly', barber_id: 'barber-2' }),
      ],
      services: [{ id: 'service-1', price: 14000 }],
      onInsert: (payload) => {
        if (payload.client_name === 'Cliente A') {
          return { error: { message: 'network error' } };
        }
        return undefined;
      },
    });

    const summary = await generateVipAppointments(TODAY);

    expect(summary.created).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]).toMatchObject({ clientName: 'Cliente A', message: 'network error' });
  });

  it('computes final_price using the discount rounding formula on insert', async () => {
    const { insertCalls } = setupSupabaseMock({
      vipClients: [vipRow({ frequency: 'biweekly', discount_percent: 10 })],
      services: [{ id: 'service-1', price: 14000 }],
    });

    await generateVipAppointments(TODAY);

    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({
      barber_id: 'barber-1',
      service_id: 'service-1',
      client_name: 'Cliente Test',
      appointment_date: '2026-07-02',
      appointment_time: '10:00',
      status: 'confirmed',
      is_fixed_weekly: true,
      final_price: 12600,
      deposit_paid: true,
    });
    expect(insertCalls[0].qr_hash).toMatch(/^VIP-[0-9A-F]{8}$/);
  });

  it('does not throw when supabase is null (not configured) and rejects instead', async () => {
    vi.resetModules();
    vi.doMock('@/shared/lib/supabase-admin', () => ({ supabaseAdmin: null }));

    const { generateVipAppointments: generateWithNullClient } = await import(
      '../services/vipAppointmentGenerator'
    );

    await expect(generateWithNullClient(TODAY)).rejects.toThrow('Supabase no configurado');

    vi.doUnmock('@/shared/lib/supabase-admin');
    vi.resetModules();
  });
});

describe('generateVipAppointments (GitHub issue #49 — cliente dado de baja)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not materialize appointments for a vip_clients row with active=false (José Tucco: Thursday biweekly)', async () => {
    const { insertCalls, vipQueryFilters } = setupSupabaseMock({
      vipClients: [
        vipRow({
          client_name: 'José Tucco',
          day_of_week: 4,
          slot_time: '14:30',
          frequency: 'biweekly',
          discount_percent: 0,
          active: false,
        }),
      ],
      services: [{ id: 'service-1', price: 10000 }],
    });

    const summary = await generateVipAppointments(TODAY);

    expect(summary).toEqual({
      created: 0,
      skippedExisting: 0,
      skippedIncomplete: { count: 0, clientNames: [] },
      errors: [],
    });
    expect(insertCalls).toEqual([]);
    // The deactivation must be honored server-side by the query itself: a
    // client-side filter would still ship inactive rows over the wire.
    expect(vipQueryFilters).toEqual([{ column: 'active', value: true }]);
  });

  it('still materializes the active rows of the same batch when an inactive row is present', async () => {
    const { insertCalls } = setupSupabaseMock({
      vipClients: [
        vipRow({
          client_name: 'José Tucco',
          day_of_week: 4,
          slot_time: '14:30',
          frequency: 'biweekly',
          active: false,
        }),
        vipRow({
          client_name: 'Cliente Activo',
          id: 'vip-2',
          barber_id: 'barber-2',
          slot_time: '15:00',
          frequency: 'biweekly',
        }),
      ],
      services: [{ id: 'service-1', price: 10000 }],
    });

    const summary = await generateVipAppointments(TODAY);

    expect(summary.created).toBe(1);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].client_name).toBe('Cliente Activo');
  });
});

describe('generateVipAppointments (GitHub issue #50 — anclaje quincenal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Criterio fijado por Adriel en el issue #50: el sábado 28/11 queda libre
  // para Juli Bustos; su próximo VIP es el sábado 05/12 y de ahí cada 14 días.
  const anchorBustos = { barber_id: 'barber-1', appointment_time: '11:30:00' };
  const bustosRow = vipRow({
    client_name: 'Juli Bustos',
    day_of_week: 6, // Saturday
    slot_time: '11:30',
    frequency: 'biweekly',
    discount_percent: 0,
  });

  it('anchors a biweekly client on its last materialized VIP appointment (Bustos: 21/11 → 05/12, NOT 28/11)', async () => {
    // 2026-11-26 (Thursday) → window [2026-11-26, 2026-12-11).
    const thursday = new Date(2026, 10, 26);
    const { insertCalls, vipAppointmentFilters } = setupSupabaseMock({
      vipClients: [bustosRow],
      vipAppointments: [
        { ...anchorBustos, appointment_date: '2026-10-31', qr_hash: 'VIP-1A2B3C4D' },
        { ...anchorBustos, appointment_date: '2026-11-21', qr_hash: 'VIP-1A2B3C4D' },
        // Same slot, but booked manually: not materialized by the VIP cron, so
        // it must NOT become the anchor (otherwise the next date would be 12/12).
        { ...anchorBustos, appointment_date: '2026-11-28', qr_hash: 'MANUAL-8CA1DE01' },
        // Another client's VIP row (later date, same barber, other time): must
        // not anchor this slot, or the next date would be 18/12.
        {
          barber_id: 'barber-1',
          appointment_time: '10:30:00',
          appointment_date: '2026-12-04',
          qr_hash: 'VIP-48DB7711',
        },
      ],
      services: [{ id: 'service-1', price: 14000 }],
    });

    const summary = await generateVipAppointments(thursday);

    expect(summary.created).toBe(1);
    expect(summary.skippedExisting).toBe(0);
    expect(summary.errors).toEqual([]);
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0].appointment_date).toBe('2026-12-05');
    expect(insertCalls[0].appointment_time).toBe('11:30');
    // The anchor must be resolved server-side on VIP rows only, for the barbers
    // of the batch: a client-side filter would ship the whole history.
    expect(vipAppointmentFilters).toEqual([
      { column: 'qr_hash', op: 'like', value: 'VIP-%' },
      { column: 'barber_id', op: 'in', value: ['barber-1'] },
    ]);
  });

  it('keeps the current behavior for a biweekly client with no previous VIP appointment (first date of the window)', async () => {
    const thursday = new Date(2026, 10, 26);
    const { insertCalls } = setupSupabaseMock({
      vipClients: [bustosRow],
      vipAppointments: [],
      services: [{ id: 'service-1', price: 14000 }],
    });

    const summary = await generateVipAppointments(thursday);

    expect(summary.created).toBe(1);
    expect(insertCalls[0].appointment_date).toBe('2026-11-28');
  });

  it('anchors on a recent VIP appointment even when that puts the next date past the first match of the window', async () => {
    // 2026-12-01 (Tuesday) → window [2026-12-01, 2026-12-16). First Saturday is
    // 05/12; anchoring on 28/11 (last VIP, 3 days ago) moves the next one to 12/12.
    const tuesday = new Date(2026, 11, 1);
    const { insertCalls } = setupSupabaseMock({
      vipClients: [bustosRow],
      vipAppointments: [
        { ...anchorBustos, appointment_date: '2026-11-28', qr_hash: 'VIP-5E6F7A8B' },
      ],
      services: [{ id: 'service-1', price: 14000 }],
    });

    const summary = await generateVipAppointments(tuesday);

    expect(summary.created).toBe(1);
    expect(insertCalls.map((payload) => payload.appointment_date)).toEqual(['2026-12-12']);
  });

  it('generates nothing in the window when the next anchored date falls outside it', async () => {
    // 05/12 was already materialized by a previous run: the next anchored date
    // is 19/12, past the window end (2026-12-11). Nothing to create — and the
    // free Saturday 28/11 must stay free.
    const thursday = new Date(2026, 10, 26);
    const { insertCalls } = setupSupabaseMock({
      vipClients: [bustosRow],
      vipAppointments: [
        { ...anchorBustos, appointment_date: '2026-11-21', qr_hash: 'VIP-1A2B3C4D' },
        { ...anchorBustos, appointment_date: '2026-12-05', qr_hash: 'VIP-1A2B3C4D' },
      ],
      services: [{ id: 'service-1', price: 14000 }],
    });

    const summary = await generateVipAppointments(thursday);

    expect(summary).toEqual({
      created: 0,
      skippedExisting: 0,
      skippedIncomplete: { count: 0, clientNames: [] },
      errors: [],
    });
    expect(insertCalls).toEqual([]);
  });

  it('ignores VIP anchors for weekly clients (every matching date of the window is still generated)', async () => {
    const { insertCalls } = setupSupabaseMock({
      vipClients: [vipRow({ day_of_week: 4, slot_time: '10:00', frequency: 'weekly' })],
      vipAppointments: [
        { barber_id: 'barber-1', appointment_date: '2026-06-25', appointment_time: '10:00:00' },
      ],
      services: [{ id: 'service-1', price: 14000 }],
    });

    const summary = await generateVipAppointments(TODAY);

    expect(summary.created).toBe(3);
    expect(insertCalls.map((payload) => payload.appointment_date)).toEqual([
      '2026-07-02',
      '2026-07-09',
      '2026-07-16',
    ]);
  });

  it('falls back to the first date of the window when the anchor query fails, instead of dropping the client', async () => {
    const thursday = new Date(2026, 10, 26);
    const { insertCalls } = setupSupabaseMock({
      vipClients: [bustosRow],
      vipAppointments: [{ ...anchorBustos, appointment_date: '2026-11-21' }],
      vipAppointmentsError: { message: 'anchor query failed' },
      services: [{ id: 'service-1', price: 14000 }],
    });

    const summary = await generateVipAppointments(thursday);

    expect(summary.created).toBe(1);
    expect(summary.errors).toEqual([]);
    expect(insertCalls[0].appointment_date).toBe('2026-11-28');
  });
});
