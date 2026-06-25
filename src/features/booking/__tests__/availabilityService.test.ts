import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBookedSlots } from '../services/availabilityService';

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
    (supabase as any).from = makeSupabaseMock([
      { appointment_time: '12:00:00', services: null },
    ]);

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
