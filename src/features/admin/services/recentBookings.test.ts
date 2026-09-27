import { describe, expect, it } from 'vitest';
import { bookingOrigin, recentBookingsSince } from './recentBookings';

describe('bookingOrigin', () => {
  it('should tag VIP-generated turnos by their VIP- prefix', () => {
    expect(bookingOrigin('VIP-AB12CD34')).toBe('vip');
  });

  it('should tag turnos loaded by the barber by their MANUAL- prefix', () => {
    expect(bookingOrigin('MANUAL-AB12CD34')).toBe('manual');
  });

  it('should treat an unprefixed hash as a booking made from the app', () => {
    expect(bookingOrigin('AB12CD34')).toBe('app');
  });

  it('should treat a missing hash as manual, since the app always sets one', () => {
    expect(bookingOrigin(null)).toBe('manual');
  });
});

describe('recentBookingsSince', () => {
  it('should return the ISO instant exactly 24 hours before now', () => {
    const now = new Date('2026-09-27T12:00:00.000Z');
    expect(recentBookingsSince(now)).toBe('2026-09-26T12:00:00.000Z');
  });
});
