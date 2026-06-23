import { BARBERS_CONFIG, getAvailableTimesForBarber } from '@/shared/config/barbers';

/**
 * Pure function: returns slots available for booking.
 * Applies two filters in order:
 * 1. Schedule-aware filter (barber's working hours for that day)
 * 2. Removes bookedTimes (already occupied slots from DB)
 *
 * Also emits a dev-mode console.warn when barberName is not in BARBERS_CONFIG
 * (mitigates W2: silent schedule breakage on barber rename).
 *
 * @param barberName  - display name matching BARBERS_CONFIG key
 * @param date        - Date object for the selected day
 * @param baseTimes   - all candidate time strings in "HH:MM" format
 * @param bookedTimes - already-booked times to exclude (from DB query)
 */
export function filterAvailableSlots(
  barberName: string,
  date: Date,
  baseTimes: string[],
  bookedTimes: string[]
): string[] {
  // Dev-mode assertion: warn if barber name not found in config
  if (process.env.NODE_ENV !== 'production' && !(barberName in BARBERS_CONFIG)) {
    console.warn(
      `[filterAvailableSlots] Unknown barber name: "${barberName}". Update BARBERS_CONFIG in barbers.ts if this barber was renamed.`
    );
  }

  const scheduledSlots = getAvailableTimesForBarber(barberName, date, baseTimes);
  return scheduledSlots.filter((t) => !bookedTimes.includes(t));
}
