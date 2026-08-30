import { BARBERS_CONFIG, getAvailableTimesForBarber } from '@/shared/config/barbers';
import { expandSlots } from '@/shared/lib/slots';

/**
 * Pure function: returns slots available for booking.
 * Applies two filters in order:
 * 1. Schedule-aware filter (barber's working hours for that day, duration-aware)
 * 2. Removes any slot the service would overlap with an existing booking
 *
 * A service longer than one slot consumes several: a 60-min service starting at
 * 14:00 also takes 14:30, so it must not be offered when 14:30 is booked.
 * Checking only the starting slot is what allowed 60-min services to be booked
 * on top of the next appointment.
 *
 * Also emits a dev-mode console.warn when barberName is not in BARBERS_CONFIG
 * (mitigates W2: silent schedule breakage on barber rename).
 *
 * @param barberName  - display name matching BARBERS_CONFIG key
 * @param date        - Date object for the selected day
 * @param baseTimes   - all candidate time strings in "HH:MM" format
 * @param bookedTimes - already-booked times to exclude (from DB query)
 * @param durationMin - length of the service being booked, in minutes
 */
export function filterAvailableSlots(
  barberName: string,
  date: Date,
  baseTimes: string[],
  bookedTimes: string[],
  durationMin = 30
): string[] {
  // Dev-mode assertion: warn if barber name not found in config
  if (process.env.NODE_ENV !== 'production' && !(barberName in BARBERS_CONFIG)) {
    console.warn(
      `[filterAvailableSlots] Unknown barber name: "${barberName}". Update BARBERS_CONFIG in barbers.ts if this barber was renamed.`
    );
  }

  const scheduledSlots = getAvailableTimesForBarber(barberName, date, baseTimes, durationMin);
  const booked = new Set(bookedTimes);

  return scheduledSlots.filter((t) =>
    expandSlots(t, durationMin).every((slot) => !booked.has(slot))
  );
}
