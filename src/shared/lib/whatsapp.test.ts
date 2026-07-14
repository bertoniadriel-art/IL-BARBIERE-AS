import { describe, expect, it } from 'vitest';
import { whatsAppUrl } from './whatsapp';

describe('whatsAppUrl', () => {
  it('should prefix the stored 10-digit number with 549', () => {
    expect(whatsAppUrl('3402417023')).toBe('https://wa.me/5493402417023');
  });

  it('should append an encoded message when one is given', () => {
    expect(whatsAppUrl('3402417023', 'Hola Fede')).toBe(
      'https://wa.me/5493402417023?text=Hola%20Fede'
    );
  });

  it('should omit the query string when no message is given', () => {
    expect(whatsAppUrl('3402417023')).not.toContain('?text=');
  });

  it('should strip formatting characters from the number', () => {
    expect(whatsAppUrl('(3402) 41-7023')).toBe('https://wa.me/5493402417023');
  });

  it('should return null when there is no phone', () => {
    expect(whatsAppUrl(null)).toBeNull();
    expect(whatsAppUrl(undefined)).toBeNull();
    expect(whatsAppUrl('')).toBeNull();
  });
});
