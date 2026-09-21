import { expandSlots } from '@/shared/lib/slots';
import { supabase } from '@/shared/lib/supabase';

interface BlockedSlotRow {
  slot_time: string;
  reason: string;
}

interface VipClientRow {
  slot_time: string | null;
  services: { duration_min: number } | null;
}

interface BookedRow {
  appointment_time: string;
  duration_min: number | null;
}

// Re-exported so existing consumers keep importing it from here.
export { expandSlots };

/**
 * Fetches booked time slots for a given barber on a given date.
 * Reads from the `booked_slots` VIEW (anon-hardening surface, see
 * sdd/il-barbiere-anon-hardening/design D1) instead of `appointments`
 * directly — the view already scopes rows to the bookable statuses
 * (pending/confirmed/attended/blocked) server-side, so no `.in('status', ...)`
 * filter is needed here anymore.
 * Expands slots based on service duration (e.g. a 60-min service at 10:00 blocks 10:00 and 10:30).
 * Normalizes DB "HH:MM:SS" format to "HH:MM".
 *
 * @param barberId - UUID of the barber
 * @param date     - date string in YYYY-MM-DD format
 * @returns array of booked time strings in "HH:MM" format
 */
export async function getBookedSlots(barberId: string, date: string): Promise<string[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('booked_slots')
    .select('appointment_time, duration_min')
    .eq('barber_id', barberId)
    .eq('appointment_date', date);

  if (error) {
    console.error('getBookedSlots error', error);
    return [];
  }

  const blocked = new Set<string>();
  for (const row of (data ?? []) as BookedRow[]) {
    const duration = row.duration_min ?? 30;
    for (const slot of expandSlots(row.appointment_time, duration)) {
      blocked.add(slot);
    }
  }
  return [...blocked];
}

/**
 * Fetches permanently blocked time slots for a barber on a given date's day-of-week.
 * Covers barber personal time and weekly/biweekly VIP reservations.
 *
 * VIP-reserved slots are seeded 1:1 from `vip_clients` as a single `blocked_slots`
 * row (no duration stored on that table). For a VIP client with a combined service
 * (e.g. "Corte + Barba", 60 min) that single row only blocks its own 30-min slot,
 * leaving the following slot open for another client to double-book. To fix this,
 * VIP-reserved slots are expanded using the duration of the matching vip_clients'
 * service, the same way getBookedSlots expands real appointments.
 *
 * @param barberId - UUID of the barber
 * @param date     - date string in YYYY-MM-DD format
 * @returns array of blocked time strings in "HH:MM" format
 */
export async function getBlockedSlotsForDay(barberId: string, date: string): Promise<string[]> {
  if (!supabase) return [];

  const dayOfWeek = new Date(`${date}T12:00:00`).getDay();

  const { data, error } = await supabase
    .from('blocked_slots')
    .select('slot_time, reason')
    .eq('barber_id', barberId)
    .eq('day_of_week', dayOfWeek)
    .eq('enabled', true);

  if (error) {
    console.error('getBlockedSlotsForDay error', error);
    return [];
  }

  const rows = (data ?? []) as BlockedSlotRow[];
  const personalSlots = rows
    .filter((row) => row.reason !== 'vip_reserved')
    .map((row) => row.slot_time.slice(0, 5));

  const vipSlots = rows
    .filter((row) => row.reason === 'vip_reserved')
    .map((row) => row.slot_time.slice(0, 5));

  if (vipSlots.length === 0) {
    return personalSlots;
  }

  const { data: vipData, error: vipError } = await supabase
    .from('vip_clients')
    .select('slot_time, services(duration_min)')
    .eq('barber_id', barberId)
    .eq('day_of_week', dayOfWeek);

  if (vipError) {
    console.error('getBlockedSlotsForDay vip lookup error', vipError);
    return [...personalSlots, ...vipSlots];
  }

  const durationBySlot = new Map<string, number>();
  for (const row of (vipData ?? []) as VipClientRow[]) {
    if (!row.slot_time) continue;
    durationBySlot.set(row.slot_time.slice(0, 5), row.services?.duration_min ?? 30);
  }

  const expandedVipSlots = new Set<string>();
  for (const slot of vipSlots) {
    const duration = durationBySlot.get(slot) ?? 30;
    for (const expanded of expandSlots(`${slot}:00`, duration)) {
      expandedVipSlots.add(expanded);
    }
  }

  return [...personalSlots, ...expandedVipSlots];
}
