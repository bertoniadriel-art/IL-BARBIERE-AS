/**
 * One-off partial-day closure.
 *
 * The app has no way to close a single date: `blocked_slots` is keyed by
 * day_of_week (recurring), and editing a barber's schedule in BARBERS_CONFIG
 * would move that weekday permanently. This script occupies the affected slots
 * with `status: 'blocked'` appointment rows, which the `booked_slots` view
 * already treats as unavailable — the same shape the admin UI produces when the
 * barber blocks a turno by hand.
 *
 * Usage:
 *   bun scripts/close-day.ts --barber "Fede Diaz" --date 2026-07-15 --from 15:00
 *   bun scripts/close-day.ts --barber "Fede Diaz" --date 2026-07-15 --from 15:00 --apply
 *
 * Without --apply it is a dry run and writes nothing.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getAvailableTimesForBarber } from '../src/shared/config/barbers';

// 30-min slots 08:00–20:00 — the widest window any barber schedule can span.
const BASE_TIMES = Array.from({ length: 25 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

// Mirrors what the admin UI writes for a manual block.
const BLOCK_LABEL = 'Argentina - Cerrado';
const BLOCK_SERVICE_NAME = 'Corte Premium'; // 30 min — one row must occupy exactly one slot

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const raw = readFileSync(join(__dirname, '../.env.production.local'), 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    env[t.slice(0, i).trim()] = t
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  return env;
}

function manualQrHash(): string {
  const hex = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .toUpperCase()
    .padStart(8, '0');
  return `MANUAL-${hex}`;
}

async function main() {
  const barberName = arg('barber');
  const date = arg('date');
  const from = arg('from');
  const apply = process.argv.includes('--apply');

  if (!barberName || !date || !from) {
    console.error('Usage: --barber "Fede Diaz" --date 2026-07-15 --from 15:00 [--apply]');
    process.exit(1);
  }

  const env = loadEnv();
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !key) {
    console.error('Missing Supabase URL or key in .env.production.local');
    process.exit(1);
  }
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, key);

  // Only slots the barber actually works that day, at or after --from.
  const scheduled = getAvailableTimesForBarber(barberName, new Date(`${date}T12:00:00`), BASE_TIMES);
  const targets = scheduled.filter((t) => t >= from);

  if (targets.length === 0) {
    console.error(`Nothing to close: ${barberName} has no scheduled slots >= ${from} on ${date}.`);
    process.exit(1);
  }

  const { data: barbers } = await db.from('barbers').select('id, name').eq('name', barberName);
  const barber = barbers?.[0];
  if (!barber) {
    console.error(`Barber not found: ${barberName}`);
    process.exit(1);
  }

  const { data: services } = await db
    .from('services')
    .select('id, name, duration_min')
    .eq('name', BLOCK_SERVICE_NAME);
  const service = services?.[0];
  if (!service) {
    console.error(`Service not found: ${BLOCK_SERVICE_NAME}`);
    process.exit(1);
  }

  // Anything already occupying those slots (cancelled rows do not count).
  const { data: existing } = await db
    .from('appointments')
    .select('appointment_time, status, client_name')
    .eq('barber_id', barber.id)
    .eq('appointment_date', date)
    .neq('status', 'cancelled');

  const taken = new Map<string, { status: string; client_name: string }>();
  for (const r of existing ?? []) {
    taken.set((r.appointment_time as string).slice(0, 5), {
      status: r.status as string,
      client_name: r.client_name as string,
    });
  }

  const toInsert = targets.filter((t) => !taken.has(t));
  const skipped = targets.filter((t) => taken.has(t));

  console.log(`\n${barberName} — ${date} — closing from ${from}`);
  console.log(`  last bookable turno: ${scheduled.filter((t) => t < from).pop() ?? '(none)'}`);
  console.log(`  slots to block:      ${toInsert.join(' ') || '(none)'}`);
  for (const t of skipped) {
    const r = taken.get(t);
    console.log(`  SKIP ${t} — already ${r?.status}: "${r?.client_name}"`);
  }

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to write.\n');
    return;
  }

  let ok = 0;
  for (const time of toInsert) {
    const { error } = await db.from('appointments').insert({
      barber_id: barber.id,
      service_id: service.id,
      client_name: BLOCK_LABEL,
      client_phone: '',
      appointment_date: date,
      appointment_time: time,
      status: 'blocked',
      final_price: 0,
      deposit_paid: false,
      is_fixed_weekly: false,
      qr_hash: manualQrHash(),
    });
    if (error) console.error(`  FAILED ${time}: ${error.message}`);
    else ok++;
  }

  console.log(`\nBlocked ${ok}/${toInsert.length} slots.\n`);
}

main();
