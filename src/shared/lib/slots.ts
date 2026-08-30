/**
 * Pure slot math for the 30-min booking grid.
 *
 * Lives outside availabilityService so schedule config can use it without
 * pulling in the Supabase client.
 */

export const SLOT_MINUTES = 30;

/**
 * Expands a start time into every 30-min slot it occupies for the given
 * duration. E.g. a 60-min service at "13:30" occupies ["13:30", "14:00"].
 * Accepts "HH:MM" or "HH:MM:SS".
 */
export function expandSlots(time: string, durationMin: number): string[] {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  const startMin = h * 60 + m;
  const slots: string[] = [];
  for (let t = startMin; t < startMin + durationMin; t += SLOT_MINUTES) {
    const hh = String(Math.floor(t / 60)).padStart(2, '0');
    const mm = String(t % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

/**
 * Returns the time a service starting at `time` finishes, as "HH:MM".
 * E.g. a 60-min service at "18:00" ends at "19:00".
 */
export function slotEnd(time: string, durationMin: number): string {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  const end = h * 60 + m + durationMin;
  return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
}
