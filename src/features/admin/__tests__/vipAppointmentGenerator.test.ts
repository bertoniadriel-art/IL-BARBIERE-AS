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
  }[];
  services?: { id: string; price: number }[];
  onInsert?: (payload: Record<string, unknown>) => { error: unknown } | undefined;
};

function setupSupabaseMock(config: MockConfig) {
  const insertCalls: Record<string, unknown>[] = [];

  mocks.mockFrom.mockImplementation((table: string) => {
    if (table === 'vip_clients') {
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: config.vipClients, error: null }),
        }),
      };
    }

    if (table === 'appointments') {
      return {
        select: () => ({
          gte: () => ({
            lt: () => ({
              neq: () => Promise.resolve({ data: config.existingAppointments ?? [], error: null }),
            }),
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

  return { insertCalls };
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
