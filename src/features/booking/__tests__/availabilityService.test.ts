import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBookedSlots } from '../services/availabilityService';

// Mock the supabase module
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

describe('getBookedSlots (T2.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should query the appointments table with correct filters', async () => {
    // Override the mock to return test data
    const { supabase } = await import('@/shared/lib/supabase');
    (supabase as any).from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ appointment_time: '10:00:00' }, { appointment_time: '14:30:00' }],
              error: null,
            }),
          }),
        }),
      }),
    });

    const result = await getBookedSlots('barber-001', '2026-06-01');

    expect(result).toEqual(['10:00', '14:30']);
    expect((supabase as any).from).toHaveBeenCalledWith('appointments');
  });

  it('should normalize HH:MM:SS to HH:MM', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    (supabase as any).from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                { appointment_time: '09:00:00' },
                { appointment_time: '11:30:00' },
                { appointment_time: '19:00:00' },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    const result = await getBookedSlots('barber-001', '2026-06-01');
    expect(result).toEqual(['09:00', '11:30', '19:00']);
  });

  it('should return [] on supabase error', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    (supabase as any).from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'network error' },
            }),
          }),
        }),
      }),
    });

    const result = await getBookedSlots('barber-001', '2026-06-01');
    expect(result).toEqual([]);
  });

  it('should return [] when supabase is null', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    const originalFrom = (supabase as any).from;
    (supabase as any).from = undefined;
    // Temporarily replace module
    const mod = await import('@/shared/lib/supabase');
    const origSupabase = mod.supabase;
    // Test null supabase path by using the null check inside getBookedSlots
    // We test this indirectly: if supabase is null, return []
    (mod as any).supabase = null;

    const result = await getBookedSlots('barber-001', '2026-06-01');
    expect(result).toEqual([]);

    // restore
    (mod as any).supabase = origSupabase;
    if (supabase) (supabase as any).from = originalFrom;
  });

  it('should return [] when data is null (empty result)', async () => {
    const { supabase } = await import('@/shared/lib/supabase');
    (supabase as any).from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    });

    const result = await getBookedSlots('barber-001', '2026-06-01');
    expect(result).toEqual([]);
  });
});
