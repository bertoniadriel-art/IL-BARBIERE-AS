import { describe, expect, it } from 'vitest';
import { nameSchema, phoneSchema, validateBookingForm } from './validation';

describe('Validation', () => {
  describe('phoneSchema', () => {
    it.each([
      ['3402500000', 'Arroyo Seco'],
      ['3415551234', 'Rosario'],
      ['3425551234', 'Santa Fe'],
      ['3515551234', 'Córdoba'],
      ['1123456789', 'Buenos Aires'],
      ['2215551234', 'La Plata'],
      ['2235551234', 'Mar del Plata'],
      ['2615551234', 'Mendoza'],
      ['2915551234', 'Bahía Blanca'],
      ['2995551234', 'Neuquén'],
    ])('should accept %s (%s)', (phone) => {
      expect(phoneSchema.safeParse(phone).success).toBe(true);
    });

    it('should reject an area code starting with 4 — no such code exists in Argentina', () => {
      expect(phoneSchema.safeParse('4123456789').success).toBe(false);
    });

    it('should reject 12 as an area code — only 11 is valid in that range', () => {
      expect(phoneSchema.safeParse('1234567890').success).toBe(false);
    });

    it('should reject phone with less than 10 digits', () => {
      expect(phoneSchema.safeParse('340250000').success).toBe(false);
    });

    it('should reject phone with more than 10 digits', () => {
      expect(phoneSchema.safeParse('34025000001').success).toBe(false);
    });

    it('should reject non-numeric input', () => {
      expect(phoneSchema.safeParse('34025abcde').success).toBe(false);
    });
  });

  describe('nameSchema', () => {
    it.each(['Juan Perez', 'José Pérez', 'Martín Núñez', 'Ramón Muñoz', "D'Angelo", 'Sáenz-Peña'])(
      'should accept %s',
      (name) => {
        expect(nameSchema.safeParse(name).success).toBe(true);
      }
    );

    it('should reject name with numbers', () => {
      expect(nameSchema.safeParse('Juan123').success).toBe(false);
    });

    it('should reject name shorter than 2 characters', () => {
      expect(nameSchema.safeParse('J').success).toBe(false);
    });
  });

  describe('validateBookingForm', () => {
    it('should return null for valid data', () => {
      const errors = validateBookingForm({
        name: 'Juan Perez',
        phone: '3402500000',
      });
      expect(errors).toBeNull();
    });

    it('should return null for an accented name and a Buenos Aires phone', () => {
      const errors = validateBookingForm({
        name: 'José Muñoz',
        phone: '1123456789',
      });
      expect(errors).toBeNull();
    });

    it('should return errors for invalid data', () => {
      const errors = validateBookingForm({
        name: 'J',
        phone: '123',
      });
      expect(errors).not.toBeNull();
      expect(errors).toHaveProperty('name');
      expect(errors).toHaveProperty('phone');
    });
  });
});
