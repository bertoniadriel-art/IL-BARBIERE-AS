import { describe, expect, it } from 'vitest';
import { expandSlots } from './slots';

describe('expandSlots', () => {
  it('returns a single slot for a 30-min service', () => {
    expect(expandSlots('14:00', 30)).toEqual(['14:00']);
  });

  it('returns both slots for a 60-min service', () => {
    expect(expandSlots('13:30', 60)).toEqual(['13:30', '14:00']);
  });

  it('crosses the hour boundary correctly', () => {
    expect(expandSlots('09:30', 60)).toEqual(['09:30', '10:00']);
  });

  it('returns three slots for a 90-min service', () => {
    expect(expandSlots('10:00', 90)).toEqual(['10:00', '10:30', '11:00']);
  });

  it('accepts the DB "HH:MM:SS" format', () => {
    expect(expandSlots('16:30:00', 60)).toEqual(['16:30', '17:00']);
  });

  it('pads single-digit hours', () => {
    expect(expandSlots('09:00', 30)).toEqual(['09:00']);
  });
});
