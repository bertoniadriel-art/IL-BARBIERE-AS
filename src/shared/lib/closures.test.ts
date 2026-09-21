import { describe, expect, it } from 'vitest';
import { isClosureName, isClosureRow } from './closures';

/**
 * Closure rows are shop-shutdown blocks that staff register as ordinary
 * appointments. They must never count as turnos, revenue, or clients.
 *
 * Every label and client name below is taken verbatim from the production
 * appointments table (851 rows, surveyed 2026-08-03), not invented.
 */
describe('isClosureName', () => {
  it.each(['Argentina - Cerrado', '🔒 Argentina - Cerrado', 'ARGENTINA - CERRADO', 'Cerrado'])(
    'treats the production closure label %s as a closure',
    (name) => {
      expect(isClosureName(name)).toBe(true);
    }
  );

  it.each(['  Argentina  -  Cerrado  ', 'argentina-cerrado', 'CERRADO'])(
    'normalizes spacing, casing and separators in %s',
    (name) => {
      expect(isClosureName(name)).toBe(true);
    }
  );

  // Regression guard: "Franco" is a common Argentine first name. A substring
  // match on closure-ish words would erase 17 real appointments.
  it.each([
    'Franco Romagnoli',
    'Angel Franco',
    'Franco Vannelli',
    'Franco Pool',
    'Franco ducca',
    'Franco Cejas',
    'Franco Petrini',
    'Mateo Francovich',
  ])('never mistakes the real client %s for a closure', (name) => {
    expect(isClosureName(name)).toBe(false);
  });

  it.each(['Juan vitelli', 'Traumatologo', 'Nicolas giovacchini', 'Liborio Anelli'])(
    'leaves the ordinary client %s alone',
    (name) => {
      expect(isClosureName(name)).toBe(false);
    }
  );

  it.each([null, undefined, '', '   '])(
    'does not classify the empty name %s as a closure',
    (name) => {
      expect(isClosureName(name)).toBe(false);
    }
  );
});

describe('isClosureRow', () => {
  it('catches a closure that was registered as a confirmed appointment', () => {
    expect(isClosureRow({ status: 'confirmed', client_name: 'Cerrado' })).toBe(true);
  });

  it('catches a closure that carries a price', () => {
    expect(isClosureRow({ status: 'confirmed', client_name: 'ARGENTINA - CERRADO' })).toBe(true);
  });

  // A real client name was used on a blocked row in production; status alone
  // still has to win there.
  it('trusts the blocked status even when the name looks like a real client', () => {
    expect(isClosureRow({ status: 'blocked', client_name: 'Gabriel scarpecci ' })).toBe(true);
  });

  it('leaves a real attended appointment untouched', () => {
    expect(isClosureRow({ status: 'attended', client_name: 'Franco Romagnoli' })).toBe(false);
  });

  it('leaves a real cancelled appointment untouched', () => {
    expect(isClosureRow({ status: 'cancelled', client_name: 'Juan vitelli' })).toBe(false);
  });
});
