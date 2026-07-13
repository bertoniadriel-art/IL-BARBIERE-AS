import { getAvailableTimesForBarber } from '@/shared/config/barbers';
import { addDays, format } from 'date-fns';

/** 30-min slots 08:00–20:00 — the widest window any barber schedule can span. */
export const BASE_TIMES = Array.from({ length: 25 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

export const AGENDA_DAYS_AHEAD = 14;

/**
 * Returns the dates the agenda must render: every day the barber works within
 * the window, plus every date that already holds an appointment.
 *
 * Working days are included even when they hold zero appointments. The
 * free-slot chips that create a booking live inside the day section, so a day
 * that never renders can never receive its first turno — which left permanently
 * empty days (e.g. a barber's Wednesday) impossible to book into.
 *
 * @param barberName       - display name matching a key in BARBERS_CONFIG
 * @param appointmentDates - dates ("YYYY-MM-DD") that already have appointments
 * @param from             - first day of the window (inclusive)
 * @param daysAhead        - window length in days
 */
export function buildAgendaDates(
  barberName: string,
  appointmentDates: string[],
  from: Date = new Date(),
  daysAhead: number = AGENDA_DAYS_AHEAD
): string[] {
  const dates = new Set(appointmentDates);

  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(from, i);
    if (getAvailableTimesForBarber(barberName, date, BASE_TIMES).length > 0) {
      dates.add(format(date, 'yyyy-MM-dd'));
    }
  }

  return [...dates].sort();
}
