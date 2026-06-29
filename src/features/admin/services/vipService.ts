import { supabase } from '@/shared/lib/supabase-client';
import type { BlockedSlot } from '@/shared/types';

export async function getVipBlockedSlots(barberId: string): Promise<BlockedSlot[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('blocked_slots')
    .select('*')
    .eq('barber_id', barberId)
    .eq('reason', 'vip_reserved')
    .order('day_of_week')
    .order('slot_time');

  if (error) {
    console.error('getVipBlockedSlots error', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    ...row,
    slot_time: row.slot_time.slice(0, 5),
  }));
}

export async function toggleBlockedSlot(
  id: string,
  enabled: boolean
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase no configurado') };

  const { error } = await supabase.from('blocked_slots').update({ enabled }).eq('id', id);

  return { error: error ? new Error(error.message) : null };
}
