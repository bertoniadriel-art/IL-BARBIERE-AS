// Feriados nacionales de Argentina — observados en 2026.
// Format: ISO 'YYYY-MM-DD' (date-only, local interpretation).
// Maintainer: update yearly per official decree (PEN). Trasladables marked.
//
// Source: Ley 27.399 + decreto anual de feriados trasladables (PEN).
// Verify against https://www.argentina.gob.ar/interior/feriados before each year.

export const HOLIDAYS_AR_2026: ReadonlyArray<string> = [
  '2026-01-01', // Año Nuevo
  '2026-02-16', // Carnaval (lunes)
  '2026-02-17', // Carnaval (martes)
  '2026-03-24', // Día Nacional de la Memoria
  '2026-04-02', // Veteranos y Caídos en Malvinas
  '2026-04-03', // Viernes Santo
  '2026-05-01', // Día del Trabajador
  '2026-05-25', // Día de la Revolución de Mayo
  '2026-06-15', // Paso a la Inmortalidad de Güemes — trasladable, verificar decreto
  '2026-06-20', // Día de la Bandera (Belgrano)
  '2026-07-09', // Día de la Independencia
  '2026-08-17', // Paso a la Inmortalidad de San Martín
  '2026-10-12', // Diversidad Cultural — trasladable, verificar decreto
  '2026-11-23', // Soberanía Nacional — trasladable del 20-nov (vie) a lun, verificar decreto
  '2026-12-08', // Inmaculada Concepción
  '2026-12-25', // Navidad
];

/**
 * Returns true if the given date is an Argentine national holiday in 2026.
 * Currently only 2026 is covered — extend with HOLIDAYS_AR_2027 etc. as needed.
 */
export function isArgentineHoliday(date: Date): boolean {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const iso = `${y}-${m}-${d}`;
  if (y === 2026) return HOLIDAYS_AR_2026.includes(iso);
  console.warn(
    `[holidays] Year ${y} not supported. Only 2026 holidays are defined. ` +
      `Update holidays.ts to add HOLIDAYS_AR_${y}.`
  );
  return false;
}
