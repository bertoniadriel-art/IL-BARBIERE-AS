import { slotEnd } from '../lib/slots';
// Barbers configuration — schedules, payment aliases, contact info
// Schedules are in code (stable, 2-barber operation). Move to DB in v2 if dynamic editing is needed.
import type { Barber } from '../types';
import { isArgentineHoliday } from './holidays';

export type { WeeklySchedule, DayWindow, VacationBlock } from '../types';

export const BARBERS_CONFIG: Record<string, Barber> = {
  'Santi Ducca': {
    id: 'barber-001',
    name: 'Santi Ducca',
    auth_user_id: null,
    paymentAlias: 'santi.ducca',
    whatsappPhone: '3402503244',
    // Mar–Vie 10:00–19:00; Sáb 10:00–14:00; Lun + Dom off
    schedule: {
      2: { from: '10:00', to: '19:00' }, // Tue
      3: { from: '10:00', to: '19:00' }, // Wed
      4: { from: '10:00', to: '19:00' }, // Thu
      5: { from: '10:00', to: '19:00' }, // Fri
      6: { from: '10:00', to: '14:00' }, // Sat
      // 0 = Sun — omitted means off
      // 1 = Mon — omitted means off
    },
    // One-off date window: only Sat 2026-11-21 runs 10:00–15:30. The regular
    // Saturday window stays 10:00–14:00 and applies again from 2026-11-28.
    dateWindows: {
      '2026-11-21': { from: '10:00', to: '15:30' },
    },
    vacations: [],
  },
  'Fede Diaz': {
    id: 'barber-002',
    name: 'Fede Diaz',
    auth_user_id: null,
    paymentAlias: 'fedediaz.14',
    whatsappPhone: '3402417023',
    // Mar–Vie 09:00–19:00; Sáb 09:00–16:00; Lun+Dom off
    schedule: {
      2: { from: '09:00', to: '19:00' }, // Tue
      3: { from: '09:00', to: '19:00' }, // Wed
      4: { from: '09:00', to: '19:00' }, // Thu
      5: { from: '09:00', to: '19:00' }, // Fri
      6: { from: '09:00', to: '16:00' }, // Sat
      // 0 = Sun — omitted means off
      // 1 = Mon — omitted means off
    },
    vacations: [],
  },
};

/** Local calendar date as "YYYY-MM-DD", matching the `dateWindows` keys. */
function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Returns the available time slots for a barber on a given date.
 * Filters baseTimes to the barber's schedule window for that day-of-week.
 * Returns [] if the barber is off that day or on vacation.
 *
 * `window.to` is closing time, so a service must FINISH by then, not merely
 * start before it: at a 19:00 close the last 30-min slot is 18:30 and the last
 * 60-min slot is 18:00.
 *
 * A one-off `dateWindows` entry for the given date REPLACES the weekly window
 * for that date and follows the same closing-time rule. This is the only entry
 * point for slot generation, so callers never special-case a date themselves.
 *
 * @param barberName  - display name matching a key in BARBERS_CONFIG
 * @param date        - the date to check
 * @param baseTimes   - all possible time slots ("HH:MM" strings), e.g. ["09:00", "09:30", ...]
 * @param durationMin - length of the service being booked, in minutes
 */
export function getAvailableTimesForBarber(
  barberName: string,
  date: Date,
  baseTimes: string[],
  durationMin = 30
): string[] {
  const cfg = BARBERS_CONFIG[barberName];
  if (!cfg) return [];

  // National holidays block both barbers
  if (isArgentineHoliday(date)) return [];

  // Check vacation blocks
  const onVacation = cfg.vacations.some(
    (v) =>
      date.getMonth() === v.monthZeroBased &&
      date.getDate() >= v.dayFrom &&
      date.getDate() <= v.dayTo
  );
  if (onVacation) return [];

  const dayKey = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  // A one-off date window wins over the weekly schedule for that exact date.
  const window = cfg.dateWindows?.[toDateKey(date)] ?? cfg.schedule[dayKey];
  if (!window) return []; // day off

  return baseTimes.filter((t) => t >= window.from && slotEnd(t, durationMin) <= window.to);
}

export const getBarberConfig = (name: string): Barber | undefined => {
  return BARBERS_CONFIG[name];
};

export const getAllBarbers = (): Barber[] => {
  return Object.values(BARBERS_CONFIG);
};
