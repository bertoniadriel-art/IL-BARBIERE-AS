import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockedSlotsForDay, getBookedSlots } from '../services/availabilityService';

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      mockFrom(table);
      return {
        select: (cols: string) => {
          mockSelect(cols);
          return {
            eq: (col: string, val: string) => {
              mockEq(col, val);
              return {
                eq: (col2: string, val2: string) => {
                  mockEq(col2, val2);
                  return {
                    in: (col3: string, vals: string[]) => {
                      mockIn(col3, vals);
                      return Promise.resolve({ data: null, error: null });
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  },
}));

function makeSupabaseMock(data: unknown) {
  return vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data, error: null }),
        }),
      }),
    }),
  });
}

describe('getBookedSlots (T2.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should query the appointments table with correct filters', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    (supabase as any).from = makeSupabaseMock([
      { appointment_time: '10:00:00', services: { duration_min: 30 } },
      { appointment_time: '14:30:00', services: { duration_min: 30 } },
    ]);

    const result = await getBookedSlots('barber-001', '2026-06-01');

    expect(result).toEqual(['10:00', '14:30']);
    expect((supabase as any).from).toHaveBeenCalledWith('appointments');
  });

  it('should normalize HH:MM:SS to HH:MM', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    (supabase as any).from = makeSupabaseMock([
      { appointment_time: '09:00:00', services: { duration_min: 30 } },
      { appointment_time: '11:30:00', services: { duration_min: 30 } },
      { appointment_time: '19:00:00', services: { duration_min: 30 } },
    ]);

    const result = await getBookedSlots('barber-001', '2026-06-01');
    expect(result).toEqual(['09:00', '11:30', '19:00']);
  });

  it('should expand a 60-min service into two consecutive 30-min slots', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    (supabase as any).from = makeSupabaseMock([
      { appointment_time: '10:00:00', services: { duration_min: 60 } },
    ]);

    const result = await getBookedSlots('barber-001', '2026-06-01');
    expect(result).toContain('10:00');
    expect(result).toContain('10:30');
    expect(result).toHaveLength(2);
  });

  it('should fall back to 30-min duration when services is null', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    (supabase as any).from = makeSupabaseMock([{ appointment_time: '12:00:00', services: null }]);

    const result = await getBookedSlots('barber-001', '2026-06-01');
    expect(result).toEqual(['12:00']);
  });

  it('should return [] on supabase error', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    (supabase as any).from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: null, error: { message: 'network error' } }),
          }),
        }),
      }),
    });

    const result = await getBookedSlots('barber-001', '2026-06-01');
    expect(result).toEqual([]);
  });

  it('should return [] when data is null (empty result)', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    (supabase as any).from = makeSupabaseMock(null);

    const result = await getBookedSlots('barber-001', '2026-06-01');
    expect(result).toEqual([]);
  });
});

/**
 * A chainable, thenable query-builder stub. Supports any sequence of
 * .select()/.eq()/.order() calls (matching supabase-js's fluent API) and
 * resolves to { data, error } when awaited — mirroring how the real
 * PostgrestFilterBuilder is itself a thenable.
 */
function makeChainable(result: { data: unknown; error: unknown }) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    in: () => chain,
    then: (resolve: (v: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

/**
 * Mocks supabase.from() to route to different fixed results per table name —
 * used for getBlockedSlotsForDay, which queries both `blocked_slots` and,
 * when VIP-reserved rows are present, `vip_clients`.
 */
function makeMultiTableMock(byTable: Record<string, { data: unknown; error: unknown }>) {
  return vi
    .fn()
    .mockImplementation((table: string) =>
      makeChainable(byTable[table] ?? { data: [], error: null })
    );
}

describe('getBlockedSlotsForDay (VIP combined-service duration expansion)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes through personal blocks unchanged (30-min granularity, no expansion needed)', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    (supabase as any).from = makeMultiTableMock({
      blocked_slots: {
        data: [
          { slot_time: '12:00:00', reason: 'personal' },
          { slot_time: '12:30:00', reason: 'personal' },
        ],
        error: null,
      },
    });

    // Wednesday 2026-07-01
    const result = await getBlockedSlotsForDay('barber-001', '2026-07-01');
    expect(result).toEqual(['12:00', '12:30']);
  });

  it('expands a VIP-reserved 60-min combined-service slot into both half-hours', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    (supabase as any).from = makeMultiTableMock({
      blocked_slots: {
        data: [{ slot_time: '09:00:00', reason: 'vip_reserved' }],
        error: null,
      },
      vip_clients: {
        data: [{ slot_time: '09:00:00', services: { duration_min: 60 } }],
        error: null,
      },
    });

    // Thursday 2026-07-02
    const result = await getBlockedSlotsForDay('barber-002', '2026-07-02');
    expect(result).toContain('09:00');
    expect(result).toContain('09:30');
    expect(result).toHaveLength(2);
  });

  it('does not expand a VIP-reserved 30-min single-service slot beyond its own slot', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    (supabase as any).from = makeMultiTableMock({
      blocked_slots: {
        data: [{ slot_time: '14:00:00', reason: 'vip_reserved' }],
        error: null,
      },
      vip_clients: {
        data: [{ slot_time: '14:00:00', services: { duration_min: 30 } }],
        error: null,
      },
    });

    const result = await getBlockedSlotsForDay('barber-002', '2026-07-02');
    expect(result).toEqual(['14:00']);
  });

  it('mixes personal and expanded VIP slots without false-positive blocking of unrelated times', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    (supabase as any).from = makeMultiTableMock({
      blocked_slots: {
        data: [
          { slot_time: '12:00:00', reason: 'personal' },
          { slot_time: '09:00:00', reason: 'vip_reserved' },
        ],
        error: null,
      },
      vip_clients: {
        data: [{ slot_time: '09:00:00', services: { duration_min: 60 } }],
        error: null,
      },
    });

    const result = await getBlockedSlotsForDay('barber-002', '2026-07-02');
    expect(result.sort()).toEqual(['09:00', '09:30', '12:00']);
    expect(result).not.toContain('13:00');
    expect(result).not.toContain('10:00');
  });

  it('falls back to a single 30-min slot when no matching vip_clients row is found', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    (supabase as any).from = makeMultiTableMock({
      blocked_slots: {
        data: [{ slot_time: '17:00:00', reason: 'vip_reserved' }],
        error: null,
      },
      vip_clients: { data: [], error: null },
    });

    const result = await getBlockedSlotsForDay('barber-002', '2026-07-02');
    expect(result).toEqual(['17:00']);
  });

  it('returns [] on blocked_slots query error', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    (supabase as any).from = makeMultiTableMock({
      blocked_slots: { data: null, error: { message: 'network error' } },
    });

    const result = await getBlockedSlotsForDay('barber-002', '2026-07-02');
    expect(result).toEqual([]);
  });
});
