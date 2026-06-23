import { describe, expect, it } from 'vitest';
import { BARBERS_CONFIG, getAllBarbers, getBarberConfig } from './barbers';

describe('Barbers Config', () => {
  it('should return barber config by name', () => {
    const config = getBarberConfig('Santi Ducca');

    expect(config).toBeDefined();
    expect(config?.id).toBe('barber-001');
    expect(config?.paymentAlias).toBe('santi.ducca');
    expect(config?.whatsappPhone).toBe('3402503244');
  });

  it('should return undefined for unknown barber', () => {
    const config = getBarberConfig('Unknown Barber');
    expect(config).toBeUndefined();
  });

  it('should return all barbers', () => {
    const barbers = getAllBarbers();

    expect(barbers).toHaveLength(2);
    expect(barbers.map((b) => b.name)).toContain('Santi Ducca');
    expect(barbers.map((b) => b.name)).toContain('Fede Diaz');
  });

  it('should have all required fields in config', () => {
    Object.values(BARBERS_CONFIG).forEach((barber) => {
      expect(barber).toHaveProperty('id');
      expect(barber).toHaveProperty('name');
      expect(barber).toHaveProperty('paymentAlias');
      expect(barber).toHaveProperty('whatsappPhone');
      expect(barber).toHaveProperty('schedule');
      expect(barber).toHaveProperty('vacations');
    });
  });

  it('should have payment aliases for both barbers', () => {
    expect(BARBERS_CONFIG['Santi Ducca'].paymentAlias).toBe('santi.ducca');
    expect(BARBERS_CONFIG['Fede Diaz'].paymentAlias).toBe('fedediaz.14');
  });
});
