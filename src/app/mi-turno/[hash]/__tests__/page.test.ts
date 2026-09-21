/**
 * MiTurnoPage reshape logic (anon-hardening Unit 2, T3.2).
 *
 * `get_appointment_by_hash` returns a FLAT row (no internal `id` — see apply
 * decision Engram #1384; qr_hash is the only public identifier) and flat
 * `barber_name`/`service_name` columns instead of the nested `barbers`/
 * `services` relations the old direct-table `.select()` produced.
 *
 * `CancelAppointment`'s `Appointment` interface is left UNCHANGED (design
 * IB-C3 fix) — page.tsx owns the flat -> nested reshape so the component
 * never has to know about the RPC's shape.
 */
import { describe, expect, it } from 'vitest';
import { mapHashRowToAppointment } from '../page';

describe('mapHashRowToAppointment (T3.2)', () => {
  it('returns null when the RPC finds no row for the hash', () => {
    expect(mapHashRowToAppointment(null)).toBeNull();
  });

  it('reshapes flat barber_name/service_name into nested barbers/services objects', () => {
    const result = mapHashRowToAppointment({
      client_name: 'Juan Perez',
      appointment_date: '2026-07-03',
      appointment_time: '14:00:00',
      status: 'confirmed',
      qr_hash: 'ABC12345',
      deposit_paid: false,
      final_price: 14000,
      barber_name: 'Santi Ducca',
      service_name: 'Corte Premium',
    });

    expect(result).toEqual({
      id: 'ABC12345',
      client_name: 'Juan Perez',
      appointment_date: '2026-07-03',
      appointment_time: '14:00:00',
      status: 'confirmed',
      qr_hash: 'ABC12345',
      deposit_paid: false,
      final_price: 14000,
      barbers: { name: 'Santi Ducca' },
      services: { name: 'Corte Premium' },
    });
  });

  it('uses qr_hash as the id field (RPC does not expose an internal id)', () => {
    const result = mapHashRowToAppointment({
      client_name: null,
      appointment_date: '2026-07-03',
      appointment_time: '14:00:00',
      status: 'pending',
      qr_hash: 'ZZZ999',
      deposit_paid: false,
      final_price: null,
      barber_name: null,
      service_name: null,
    });

    expect(result?.id).toBe('ZZZ999');
    expect(result?.barbers).toBeNull();
    expect(result?.services).toBeNull();
  });
});
