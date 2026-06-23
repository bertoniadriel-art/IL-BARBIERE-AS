import { describe, expect, it } from 'vitest';
import { nameSchema, phoneSchema, validateBookingForm } from './validation';

describe('Validation', () => {
  describe('phoneSchema', () => {
    it('should accept valid Argentine phone', () => {
      const result = phoneSchema.safeParse('3402500000');
      expect(result.success).toBe(true);
    });

    it('should reject phone with wrong format', () => {
      const result = phoneSchema.safeParse('1234567890');
      expect(result.success).toBe(false);
    });

    it('should reject phone with less than 10 digits', () => {
      const result = phoneSchema.safeParse('340250000');
      expect(result.success).toBe(false);
    });
  });

  describe('nameSchema', () => {
    it('should accept valid name', () => {
      const result = nameSchema.safeParse('Juan Perez');
      expect(result.success).toBe(true);
    });

    it('should reject name with numbers', () => {
      const result = nameSchema.safeParse('Juan123');
      expect(result.success).toBe(false);
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
