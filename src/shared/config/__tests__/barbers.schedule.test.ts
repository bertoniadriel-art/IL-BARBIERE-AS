import { describe, it, expect } from 'vitest';
import { getAvailableTimesForBarber } from '../barbers';

// Base times: 30-min slots from 09:00 to 20:00
// Matches the time grid used in the booking wizard
const BASE_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00',
];

// Day helpers using a fixed reference week
// 2026-05-25 is a Monday — use noon local time to avoid UTC-midnight timezone shifts
const monday    = new Date('2026-05-25T12:00:00'); // day 1
const tuesday   = new Date('2026-05-26T12:00:00'); // day 2
const wednesday = new Date('2026-05-27T12:00:00'); // day 3
const thursday  = new Date('2026-05-28T12:00:00'); // day 4
const friday    = new Date('2026-05-29T12:00:00'); // day 5
const saturday  = new Date('2026-05-30T12:00:00'); // day 6
const sunday    = new Date('2026-05-31T12:00:00'); // day 0

describe('getAvailableTimesForBarber', () => {
  describe('Fede Diaz schedule — Mar–Sáb 09:00–20:00, Lun+Dom off', () => {
    it('returns [] for Fede on Monday (day off)', () => {
      const result = getAvailableTimesForBarber('Fede Diaz', monday, BASE_TIMES);
      expect(result).toEqual([]);
    });

    it('returns [] for Fede on Sunday (day off)', () => {
      const result = getAvailableTimesForBarber('Fede Diaz', sunday, BASE_TIMES);
      expect(result).toEqual([]);
    });

    it('returns times from 09:00 to 20:00 for Fede on Tuesday', () => {
      const result = getAvailableTimesForBarber('Fede Diaz', tuesday, BASE_TIMES);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBe('09:00');
      expect(result[result.length - 1]).toBe('20:00');
    });

    it('returns times from 09:00 to 20:00 for Fede on Wednesday', () => {
      const result = getAvailableTimesForBarber('Fede Diaz', wednesday, BASE_TIMES);
      expect(result[0]).toBe('09:00');
      expect(result[result.length - 1]).toBe('20:00');
    });

    it('returns times from 09:00 to 20:00 for Fede on Saturday', () => {
      const result = getAvailableTimesForBarber('Fede Diaz', saturday, BASE_TIMES);
      expect(result[0]).toBe('09:00');
      expect(result[result.length - 1]).toBe('20:00');
    });

    it('does not include times before 09:00 for Fede', () => {
      const timesWithEarly = ['08:30', '09:00', '09:30'];
      const result = getAvailableTimesForBarber('Fede Diaz', tuesday, timesWithEarly);
      expect(result).not.toContain('08:30');
      expect(result).toContain('09:00');
    });
  });

  describe('Santi Ducca schedule — Mar–Vie 10:00–19:00, Sáb 10:00–14:00, Lun+Dom off', () => {
    it('returns [] for Santi on Sunday (day off)', () => {
      const result = getAvailableTimesForBarber('Santi Ducca', sunday, BASE_TIMES);
      expect(result).toEqual([]);
    });

    it('returns [] for Santi on Monday (day off)', () => {
      const result = getAvailableTimesForBarber('Santi Ducca', monday, BASE_TIMES);
      expect(result).toEqual([]);
    });

    it('returns times from 10:00 to 19:00 for Santi on Tuesday', () => {
      const tuesday = new Date('2026-06-02T12:00:00');
      const result = getAvailableTimesForBarber('Santi Ducca', tuesday, BASE_TIMES);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBe('10:00');
      expect(result[result.length - 1]).toBe('19:00');
    });

    it('returns times from 10:00 to 19:00 for Santi on Friday', () => {
      const result = getAvailableTimesForBarber('Santi Ducca', friday, BASE_TIMES);
      expect(result[0]).toBe('10:00');
      expect(result[result.length - 1]).toBe('19:00');
    });

    it('returns only times up to 14:00 for Santi on Saturday', () => {
      const result = getAvailableTimesForBarber('Santi Ducca', saturday, BASE_TIMES);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toBe('10:00');
      expect(result[result.length - 1]).toBe('14:00');
      expect(result).not.toContain('14:30');
      expect(result).not.toContain('19:00');
    });

    it('does not include times before 10:00 for Santi on Tuesday', () => {
      const tuesday = new Date('2026-06-02T12:00:00');
      const timesWithEarly = ['09:00', '09:30', '10:00', '10:30'];
      const result = getAvailableTimesForBarber('Santi Ducca', tuesday, timesWithEarly);
      expect(result).not.toContain('09:00');
      expect(result).not.toContain('09:30');
      expect(result).toContain('10:00');
    });
  });

  describe('Argentine national holidays — block both barbers', () => {
    it('returns [] for Fede on Navidad 2026 (would be Friday, normally working)', () => {
      const navidad = new Date('2026-12-25T12:00:00');
      const result = getAvailableTimesForBarber('Fede Diaz', navidad, BASE_TIMES);
      expect(result).toEqual([]);
    });

    it('returns [] for Santi on Año Nuevo 2026 (Thursday, normally working)', () => {
      const anoNuevo = new Date('2026-01-01T12:00:00');
      const result = getAvailableTimesForBarber('Santi Ducca', anoNuevo, BASE_TIMES);
      expect(result).toEqual([]);
    });

    it('returns [] for Fede on Día de la Independencia 2026 (Thursday)', () => {
      const indep = new Date('2026-07-09T12:00:00');
      const result = getAvailableTimesForBarber('Fede Diaz', indep, BASE_TIMES);
      expect(result).toEqual([]);
    });

    it('non-holiday Tuesday still returns slots for Santi', () => {
      const regularTuesday = new Date('2026-06-02T12:00:00');
      const result = getAvailableTimesForBarber('Santi Ducca', regularTuesday, BASE_TIMES);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('returns [] for unknown barber name', () => {
      const result = getAvailableTimesForBarber('Unknown Barber', tuesday, BASE_TIMES);
      expect(result).toEqual([]);
    });

    it('returns [] when baseTimes is empty', () => {
      const result = getAvailableTimesForBarber('Fede Diaz', tuesday, []);
      expect(result).toEqual([]);
    });
  });
});
