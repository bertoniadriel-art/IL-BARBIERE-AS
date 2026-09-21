/**
 * Shop-closure detection — single source of truth.
 *
 * Staff block shop downtime by creating an ordinary appointment named
 * "Argentina - Cerrado" (and casing/emoji variants) instead of using the
 * `blocked` status. Those rows are not turnos, not revenue, and not clients,
 * so every consumer has to exclude them through this one predicate.
 *
 * Matching is anchored to the end of the normalized name rather than done as a
 * substring scan: "Franco" is a common Argentine first name, and a loose match
 * on closure-ish words erases real appointments.
 */

const CLOSURE_TOKEN = 'cerrado';
const BLOCKED_STATUS = 'blocked';

/** Combining diacritics left behind by NFD decomposition. */
const COMBINING_MARKS = /\p{M}/gu;

export type ClosureCandidate = {
  status?: string | null;
  client_name?: string | null;
};

/**
 * Fold a client name down to lowercase ASCII words: strips accents, replaces
 * emoji and punctuation with spaces, and collapses separators so that
 * "🔒 Argentina - Cerrado" and "argentina-cerrado" land on the same string.
 */
function normalize(name: string | null | undefined): string {
  return (name ?? '')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .toLowerCase()
    .replace(/[\s-]+/g, ' ')
    .trim();
}

/** True when the client name is one of the closure labels used in production. */
export function isClosureName(name: string | null | undefined): boolean {
  const value = normalize(name);
  if (!value) return false;
  return value === CLOSURE_TOKEN || value.endsWith(` ${CLOSURE_TOKEN}`);
}

/**
 * True when the row is shop downtime rather than a real appointment.
 *
 * Status wins on its own: production has blocked rows carrying a real client's
 * name, and those are still downtime.
 */
export function isClosureRow(row: ClosureCandidate): boolean {
  return row.status === BLOCKED_STATUS || isClosureName(row.client_name);
}
