import { supabase } from '@/shared/lib/supabase';

interface BlockedSlotRow {
  slot_time: string;
}

interface BookedRow {
  appointment_time: string;
  services: { duration_min: number } | null;
}

function expandSlots(time: string, durationMin: number): string[] {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  const startMin = h * 60 + m;
  const slots: string[] = [];
  for (let t = startMin; t < startMin + durationMin; t += 30) {
    const hh = String(Math.floor(t / 60)).padStart(2, '0');
    const mm = String(t % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

/**
 * Fetches booked time slots for a given barber on a given date.
 * Excludes cancelled appointments (they free up the slot).
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
    .from('appointments')
    .select('appointment_time, services(duration_min)')
    .eq('barber_id', barberId)
    .eq('appointment_date', date)
    .in('status', ['pending', 'confirmed', 'attended']);

  if (error) {
    console.error('getBookedSlots error', error);
    return [];
  }

  const blocked = new Set<string>();
  for (const row of (data ?? []) as BookedRow[]) {
    const duration = row.services?.duration_min ?? 30;
    for (const slot of expandSlots(row.appointment_time, duration)) {
      blocked.add(slot);
    }
  }
  return [...blocked];
}

/**
 * Fetches permanently blocked time slots for a barber on a given date's day-of-week.
 * Covers barber personal time and weekly VIP reservations.
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
    .select('slot_time')
    .eq('barber_id', barberId)
    .eq('day_of_week', dayOfWeek);

  if (error) {
    console.error('getBlockedSlotsForDay error', error);
    return [];
  }

  return (data ?? []).map((row: BlockedSlotRow) => row.slot_time.slice(0, 5));
}
