import { afterEach, describe, expect, it, vi } from 'vitest';
import { openPendingWindow, whatsAppUrl } from './whatsapp';

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

describe('openPendingWindow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function fakeWindow() {
    return { opener: {}, location: { href: '' }, close: vi.fn() } as unknown as Window;
  }

  it('should open a blank tab synchronously, before any await', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWindow());
    openPendingWindow();
    expect(openSpy).toHaveBeenCalledWith('', '_blank');
  });

  it('should point the pending tab at the url once it arrives', () => {
    const tab = fakeWindow();
    vi.spyOn(window, 'open').mockReturnValue(tab);
    openPendingWindow().go('https://wa.me/5493402417023');
    expect(tab.location.href).toBe('https://wa.me/5493402417023');
    expect(tab.opener).toBeNull();
  });

  it('should close the pending tab when there is no url', () => {
    const tab = fakeWindow();
    vi.spyOn(window, 'open').mockReturnValue(tab);
    openPendingWindow().go(null);
    expect(tab.close).toHaveBeenCalled();
  });

  it('should fall back to a direct open when the blank tab was blocked', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    openPendingWindow().go('https://wa.me/5493402417023');
    expect(openSpy).toHaveBeenLastCalledWith('https://wa.me/5493402417023', '_blank');
  });
});
