import { supabase } from '@/shared/lib/supabase';

export interface BookedSlot {
  appointment_time: string;
}

/**
 * Fetches booked time slots for a given barber on a given date.
 * Excludes cancelled appointments (they free up the slot).
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
    .select('appointment_time')
    .eq('barber_id', barberId)
    .eq('appointment_date', date)
    .in('status', ['pending', 'confirmed', 'attended']);

  if (error) {
    console.error('getBookedSlots error', error);
    return [];
  }

  // Normalize: DB returns "HH:MM:SS", grid uses "HH:MM"
  return (data ?? []).map((r: BookedSlot) => r.appointment_time.slice(0, 5));
}
