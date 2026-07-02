import { supabase } from '@/shared/lib/supabase';

/**
 * Looks up the active VIP discount for a client by phone number.
 *
 * Bug #9: VIP ("Coronita") clients were never charged a discount because
 * nothing in the booking flow consulted the `vip_clients` table — the
 * only place it was queried was AgendaView, purely to render a badge.
 *
 * Returns the discount percentage (0-100) to apply, or 0 when the client
 * has no active VIP record (or Supabase isn't configured, e.g. in tests).
 * When a client has more than one active VIP record, the highest
 * discount_percent among them is used.
 */
export async function getVipDiscountPercent(
  clientPhone: string,
  barberId: string | null
): Promise<number> {
  if (!supabase) return 0;

  const phone = clientPhone.trim();
  if (!phone) return 0;

  let query = supabase
    .from('vip_clients')
    .select('discount_percent')
    .eq('client_phone', phone)
    .eq('active', true);

  if (barberId) {
    query = query.eq('barber_id', barberId);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) return 0;

  return (data as { discount_percent: number }[]).reduce(
    (max, row) => Math.max(max, row.discount_percent ?? 0),
    0
  );
}
