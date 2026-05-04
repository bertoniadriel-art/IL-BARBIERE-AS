import { describe, it, expect } from 'vitest';
import { getBarberConfig, getAllBarbers, BARBERS_CONFIG } from './barbers';

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
    expect(barbers.map(b => b.name)).toContain('Santi Ducca');
    expect(barbers.map(b => b.name)).toContain('Fede Diaz');
  });

  it('should have all required fields in config', () => {
    Object.values(BARBERS_CONFIG).forEach(barber => {
      expect(barber).toHaveProperty('id');
      expect(barber).toHaveProperty('name');
      expect(barber).toHaveProperty('paymentAlias');
      expect(barber).toHaveProperty('whatsappPhone');
    });
  });
});