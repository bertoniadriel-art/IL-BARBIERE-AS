import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getVipDiscountPercent } from '../services/vipDiscountService';

/**
 * Tests for vipDiscountService (Bug #9).
 *
 * Root cause: VIP ("Coronita") clients have a `discount_percent` column in
 * `vip_clients`, but nothing in the booking flow ever queried it — the
 * final price was computed from `servicePrice` alone. This service is the
 * fix's lookup layer; Confirmation.tsx consumes it before charging.
 */

const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      mockFrom(table);
      return { select: mockSelect };
    },
  },
}));

function makeChain(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {
    eq: vi.fn((...args: unknown[]) => {
      mockEq(...args);
      return chain;
    }),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve),
  };
  return chain;
}

describe('getVipDiscountPercent (Bug #9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 0 when clientPhone is empty', async () => {
    const result = await getVipDiscountPercent('', 'barber-1');
    expect(result).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('queries vip_clients filtered by phone, active=true, and barberId', async () => {
    mockSelect.mockReturnValue(makeChain([{ discount_percent: 10 }]));

    const result = await getVipDiscountPercent('3402500000', 'barber-1');

    expect(mockFrom).toHaveBeenCalledWith('vip_clients');
    expect(mockSelect).toHaveBeenCalledWith('discount_percent');
    expect(mockEq).toHaveBeenCalledWith('client_phone', '3402500000');
    expect(mockEq).toHaveBeenCalledWith('active', true);
    expect(mockEq).toHaveBeenCalledWith('barber_id', 'barber-1');
    expect(result).toBe(10);
  });

  it('returns 0 when the client has no active VIP record', async () => {
    mockSelect.mockReturnValue(makeChain([]));

    const result = await getVipDiscountPercent('3402500000', 'barber-1');

    expect(result).toBe(0);
  });

  it('returns 0 on query error instead of throwing', async () => {
    mockSelect.mockReturnValue(makeChain(null, new Error('boom')));

    const result = await getVipDiscountPercent('3402500000', 'barber-1');

    expect(result).toBe(0);
  });

  it('returns the highest discount_percent when multiple active records match', async () => {
    mockSelect.mockReturnValue(makeChain([{ discount_percent: 10 }, { discount_percent: 15 }]));

    const result = await getVipDiscountPercent('3402500000', 'barber-1');

    expect(result).toBe(15);
  });

  it('trims whitespace from the phone before querying', async () => {
    mockSelect.mockReturnValue(makeChain([{ discount_percent: 10 }]));

    await getVipDiscountPercent('  3402500000  ', 'barber-1');

    expect(mockEq).toHaveBeenCalledWith('client_phone', '3402500000');
  });
});
