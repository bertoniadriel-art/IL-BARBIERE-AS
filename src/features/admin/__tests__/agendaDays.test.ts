import { buildAgendaDates } from '@/features/admin/services/agendaDays';
import { describe, expect, it } from 'vitest';

// Sunday 2026-07-12. The following 14 days hold no Argentine holiday, so the
// only days excluded are the barber's own days off (Mon + Sun).
const SUNDAY = new Date('2026-07-12T12:00:00');

describe('buildAgendaDates', () => {
  it('includes working days that have no appointments', () => {
    const dates = buildAgendaDates('Fede Diaz', [], SUNDAY);

    // Wednesday and Saturday hold zero appointments but are working days, so
    // the agenda must still render them to expose their free slots.
    expect(dates).toContain('2026-07-15'); // Wed
    expect(dates).toContain('2026-07-18'); // Sat
  });

  it('excludes the barber days off', () => {
    const dates = buildAgendaDates('Fede Diaz', [], SUNDAY);

    expect(dates).not.toContain('2026-07-12'); // Sun
    expect(dates).not.toContain('2026-07-13'); // Mon
    expect(dates).not.toContain('2026-07-19'); // Sun
    expect(dates).not.toContain('2026-07-20'); // Mon
  });

  it('returns every working day in the window, sorted', () => {
    const dates = buildAgendaDates('Fede Diaz', [], SUNDAY);

    expect(dates).toEqual([
      '2026-07-14',
      '2026-07-15',
      '2026-07-16',
      '2026-07-17',
      '2026-07-18',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
      '2026-07-25',
    ]);
  });

  it('keeps appointment dates that fall outside the working window', () => {
    // A turno booked on a day off (or past the window) must not vanish from the
    // agenda just because the schedule says the barber does not work then.
    const dates = buildAgendaDates('Fede Diaz', ['2026-07-13', '2026-08-04'], SUNDAY);

    expect(dates).toContain('2026-07-13');
    expect(dates).toContain('2026-08-04');
  });

  it('does not duplicate a working day that already has appointments', () => {
    const dates = buildAgendaDates('Fede Diaz', ['2026-07-15', '2026-07-15'], SUNDAY);

    expect(dates.filter((d) => d === '2026-07-15')).toHaveLength(1);
  });

  it('returns only the appointment dates for an unknown barber', () => {
    const dates = buildAgendaDates('Ghost Barber', ['2026-07-15'], SUNDAY);

    expect(dates).toEqual(['2026-07-15']);
  });
});
