import { supabaseAdmin as supabase } from '@/shared/lib/supabase-admin';

/**
 * VIP ("Coronita") recurring appointment generator — GitHub issue #15.
 *
 * Reads `vip_clients` (fixed recurring VIP slots) and materializes concrete
 * `appointments` rows for the next 15-day window, so a VIP client with a
 * fixed weekly/biweekly slot doesn't need to book manually every time.
 *
 * Called from the Vercel Cron route at
 * src/app/api/cron/generate-vip-appointments/route.ts.
 *
 * Uses the service-role admin client (not the anon browser client) because
 * `vip_clients` RLS only grants `authenticated` role access — a cron
 * request has no user session, so the anon key would silently see 0 rows.
 */

export type VipGenerationError = {
  clientName: string;
  date: string;
  time: string | null;
  message: string;
};

export type VipGenerationSummary = {
  created: number;
  skippedExisting: number;
  skippedIncomplete: { count: number; clientNames: string[] };
  errors: VipGenerationError[];
};

type VipClientRow = {
  id: string;
  client_name: string;
  client_phone: string | null;
  barber_id: string | null;
  service_id: string | null;
  day_of_week: number | null;
  slot_time: string | null;
  frequency: 'weekly' | 'biweekly' | null;
  discount_percent: number | null;
  active: boolean;
};

type ExistingAppointmentRow = {
  barber_id: string | null;
  appointment_date: string;
  appointment_time: string;
};

type ServiceRow = {
  id: string;
  price: number;
};

const WINDOW_DAYS = 15;

// Builds a YYYY-MM-DD string from the local calendar date. Deliberately NOT
// using date.toISOString() here: that converts to UTC first, which can shift
// the calendar date by +/-1 day depending on the server's local timezone
// offset (e.g. any UTC+ timezone at local midnight rolls back to the
// previous day in UTC). We want the *local* day, matching how day_of_week
// (via getDay()) is computed.
function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function normalizeTime(time: string): string {
  return time.slice(0, 5);
}

function slotKey(barberId: string | null, date: string, time: string): string {
  return `${barberId ?? ''}|${date}|${normalizeTime(time)}`;
}

/**
 * Same rounding formula used by Confirmation.tsx (computeFinalPrice) and
 * QuickAddModal.tsx (computeDiscountedPrice) — kept in sync intentionally,
 * do not diverge.
 */
export function computeFinalPrice(price: number, discountPercent: number): number {
  return Math.round((price * (1 - discountPercent / 100)) / 100) * 100;
}

/**
 * Computes, for a single vip_clients row, every appointment_date that falls
 * inside the [windowStart, windowEnd) 15-day window and matches the row's
 * day_of_week.
 *
 * - 'weekly': every matching date in the window (can be 2, or even 3 when
 *   windowStart itself matches, occurrences in a 15-day window).
 * - 'biweekly': only the first matching date in the window.
 */
function datesForRow(row: VipClientRow, windowStart: Date, windowEnd: Date): string[] {
  const dates: string[] = [];
  for (let d = new Date(windowStart); d < windowEnd; d = addDays(d, 1)) {
    if (d.getDay() === row.day_of_week) {
      dates.push(toIsoDate(d));
      if (row.frequency === 'biweekly') break;
    }
  }
  return dates;
}

export async function generateVipAppointments(
  today: Date = new Date()
): Promise<VipGenerationSummary> {
  const summary: VipGenerationSummary = {
    created: 0,
    skippedExisting: 0,
    skippedIncomplete: { count: 0, clientNames: [] },
    errors: [],
  };

  if (!supabase) {
    throw new Error('Supabase no configurado');
  }

  const windowStart = new Date(today);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = addDays(windowStart, WINDOW_DAYS);

  const { data: vipClientsData, error: vipError } = await supabase
    .from('vip_clients')
    .select('*')
    .eq('active', true);

  if (vipError) {
    throw new Error(`No se pudo consultar vip_clients: ${vipError.message}`);
  }

  const vipClients = (vipClientsData ?? []) as VipClientRow[];

  type Planned = { row: VipClientRow; date: string };
  const planned: Planned[] = [];

  for (const row of vipClients) {
    if (!row.slot_time || !row.service_id || row.day_of_week === null) {
      summary.skippedIncomplete.count += 1;
      summary.skippedIncomplete.clientNames.push(row.client_name);
      continue;
    }

    const dates = datesForRow(row, windowStart, windowEnd);
    for (const date of dates) {
      planned.push({ row, date });
    }
  }

  if (planned.length === 0) {
    return summary;
  }

  // Idempotency pre-check: batch-fetch existing (non-cancelled) appointments
  // in the target window and skip combos that already exist.
  const { data: existingData, error: existingError } = await supabase
    .from('appointments')
    .select('barber_id, appointment_date, appointment_time')
    .gte('appointment_date', toIsoDate(windowStart))
    .lt('appointment_date', toIsoDate(windowEnd))
    .neq('status', 'cancelled');

  if (existingError) {
    throw new Error(`No se pudo consultar appointments existentes: ${existingError.message}`);
  }

  const existingKeys = new Set(
    ((existingData ?? []) as ExistingAppointmentRow[]).map((a) =>
      slotKey(a.barber_id, a.appointment_date, a.appointment_time)
    )
  );

  // Batch-fetch service prices for every service_id involved.
  const serviceIds = Array.from(new Set(planned.map((p) => p.row.service_id as string)));
  const { data: servicesData, error: servicesError } = await supabase
    .from('services')
    .select('id, price')
    .in('id', serviceIds);

  if (servicesError) {
    throw new Error(`No se pudo consultar services: ${servicesError.message}`);
  }

  const priceByServiceId = new Map<string, number>(
    ((servicesData ?? []) as ServiceRow[]).map((s) => [s.id, s.price])
  );

  for (const { row, date } of planned) {
    const time = row.slot_time as string;
    const key = slotKey(row.barber_id, date, time);

    if (existingKeys.has(key)) {
      summary.skippedExisting += 1;
      continue;
    }

    const price = priceByServiceId.get(row.service_id as string);
    if (price === undefined) {
      summary.errors.push({
        clientName: row.client_name,
        date,
        time,
        message: `Servicio ${row.service_id} no encontrado`,
      });
      continue;
    }

    const finalPrice = computeFinalPrice(price, row.discount_percent ?? 0);
    const qrHash = `VIP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const { error: insertError } = await supabase.from('appointments').insert({
      barber_id: row.barber_id,
      service_id: row.service_id,
      client_name: row.client_name,
      client_phone: row.client_phone,
      appointment_date: date,
      appointment_time: time,
      qr_hash: qrHash,
      status: 'confirmed',
      is_fixed_weekly: true,
      final_price: finalPrice,
      deposit_paid: true,
    });

    if (insertError) {
      // 23505 = unique_violation — a race inserted the same slot between our
      // pre-check and this insert. Treat exactly like a pre-checked skip;
      // must not abort the rest of the batch.
      if ((insertError as { code?: string }).code === '23505') {
        summary.skippedExisting += 1;
      } else {
        summary.errors.push({
          clientName: row.client_name,
          date,
          time,
          message: insertError.message,
        });
      }
      continue;
    }

    existingKeys.add(key);
    summary.created += 1;
  }

  return summary;
}
