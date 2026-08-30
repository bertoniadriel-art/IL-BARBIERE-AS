/**
 * Unit tests for TimeSelector slot filtering logic (T2.2).
 *
 * Tests the two-stage filter:
 * 1. Schedule-aware filter via getAvailableTimesForBarber (from barbers config)
 * 2. Booked-slot removal (slots occupied in DB are excluded)
 *
 * Also tests the dev-mode assertion for unknown barber names (W2 mitigation).
 */
import { describe, expect, it } from 'vitest';
import { filterAvailableSlots } from '../services/timeSelectorHelpers';

const BASE_TIMES = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '14:00',
  '14:30',
  '15:00',
  '18:00',
  '19:00',
  '19:30',
  '20:00',
];

describe('filterAvailableSlots (T2.2)', () => {
  describe('schedule-aware filtering', () => {
    it('returns slots within Fede Diaz schedule on a Tuesday (09:00–19:00)', () => {
      // Tuesday 2026-06-02
      const date = new Date('2026-06-02T12:00:00');
      const result = filterAvailableSlots('Fede Diaz', date, BASE_TIMES, []);
      // Fede Tue: 09:00–19:00
      expect(result).toContain('09:00');
      expect(result).toContain('19:00');
      expect(result).not.toContain('19:30');
      expect(result).not.toContain('20:00');
    });

    it('returns [] for Fede Diaz on a Monday (off day)', () => {
      // Monday 2026-06-01
      const date = new Date('2026-06-01T12:00:00');
      const result = filterAvailableSlots('Fede Diaz', date, BASE_TIMES, []);
      expect(result).toEqual([]);
    });

    it('returns slots within Santi Ducca schedule on a Wednesday (10:00–18:30)', () => {
      // Wednesday 2026-06-03
      const date = new Date('2026-06-03T12:00:00');
      const result = filterAvailableSlots('Santi Ducca', date, BASE_TIMES, []);
      // Santi Wed: 10:00–18:30
      expect(result).not.toContain('09:00');
      expect(result).not.toContain('09:30');
      expect(result).toContain('10:00');
      expect(result).toContain('18:00');
      expect(result).not.toContain('19:00');
      expect(result).not.toContain('19:30');
      expect(result).not.toContain('20:00');
    });

    it('returns [] for Santi Ducca on a Sunday (off day)', () => {
      // Sunday 2026-06-07
      const date = new Date('2026-06-07T12:00:00');
      const result = filterAvailableSlots('Santi Ducca', date, BASE_TIMES, []);
      expect(result).toEqual([]);
    });
  });

  describe('booked slot removal (REQ-2.2)', () => {
    it('removes booked times from available slots', () => {
      // Wednesday — Santi is working
      const date = new Date('2026-06-03T12:00:00');
      const bookedTimes = ['10:00', '14:00'];
      const result = filterAvailableSlots('Santi Ducca', date, BASE_TIMES, bookedTimes);

      expect(result).not.toContain('10:00');
      expect(result).not.toContain('14:00');
      expect(result).toContain('10:30');
      expect(result).toContain('14:30');
    });

    it('returns all schedule slots when no slots are booked', () => {
      const date = new Date('2026-06-03T12:00:00');
      const result = filterAvailableSlots('Santi Ducca', date, BASE_TIMES, []);
      // Should include all times within 10:00–18:30
      expect(result).toContain('10:00');
      expect(result).toContain('18:00');
      expect(result).not.toContain('19:00');
    });

    it('returns [] when all slots are booked', () => {
      const date = new Date('2026-06-03T12:00:00');
      // Book every slot that Santi has on Wed
      const santiSlots = BASE_TIMES.filter((t) => t >= '10:00' && t <= '18:30');
      const result = filterAvailableSlots('Santi Ducca', date, BASE_TIMES, santiSlots);
      expect(result).toEqual([]);
    });
  });

  describe('unknown barber name (W2 dev-mode assertion)', () => {
    it('returns [] for an unrecognized barber name', () => {
      const date = new Date('2026-06-03T12:00:00');
      const result = filterAvailableSlots('Unknown Barber', date, BASE_TIMES, []);
      expect(result).toEqual([]);
    });
  });
});

/**
 * Duration-aware filtering.
 *
 * A 60-min service ("Corte + Barba") occupies TWO 30-min slots. Filtering only
 * by the starting slot lets it overlap the next appointment and run past the
 * barber's window. These tests pin the slot a service actually consumes.
 */
describe('filterAvailableSlots — service duration', () => {
  // Santi Ducca, Wednesday 10:00–18:30
  const WEDNESDAY = new Date('2026-06-03T12:00:00');
  // Fede Diaz, Tuesday 09:00–19:00
  const TUESDAY = new Date('2026-06-02T12:00:00');

  it('does not offer a 60-min slot when the following slot is booked', () => {
    const result = filterAvailableSlots('Santi Ducca', WEDNESDAY, BASE_TIMES, ['14:30'], 60);
    // 14:00 would run 14:00–15:00 and overlap the 14:30 appointment
    expect(result).not.toContain('14:00');
  });

  it('offers that same slot for a 30-min service', () => {
    const result = filterAvailableSlots('Santi Ducca', WEDNESDAY, BASE_TIMES, ['14:30'], 30);
    // Same day, same bookings — only the duration differs
    expect(result).toContain('14:00');
  });

  it('offers a 60-min slot when both halves are free', () => {
    const result = filterAvailableSlots('Santi Ducca', WEDNESDAY, BASE_TIMES, ['14:30'], 60);
    expect(result).toContain('15:00');
  });

  it('does not offer a 60-min slot that would run past the barber window', () => {
    const result = filterAvailableSlots('Fede Diaz', TUESDAY, BASE_TIMES, [], 60);
    // Fede closes at 19:00: a 60-min service there would occupy 19:00 and 19:30
    expect(result).not.toContain('19:00');
    expect(result).toContain('18:00');
  });

  it('still offers the last slot for a 30-min service', () => {
    const result = filterAvailableSlots('Fede Diaz', TUESDAY, BASE_TIMES, [], 30);
    expect(result).toContain('19:00');
  });

  it('defaults to 30 min when no duration is given', () => {
    const withDefault = filterAvailableSlots('Santi Ducca', WEDNESDAY, BASE_TIMES, ['14:30']);
    const explicit = filterAvailableSlots('Santi Ducca', WEDNESDAY, BASE_TIMES, ['14:30'], 30);
    expect(withDefault).toEqual(explicit);
  });
});
