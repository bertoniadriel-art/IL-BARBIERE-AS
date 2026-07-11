// @vitest-environment node
/**
 * Anon-Policy Hardening — Unit 1 (additive surfaces) integration tests.
 *
 * These tests validate the migration in
 * `../migrations/2026-07-11_anon_hardening_surfaces.sql` against the REAL
 * Supabase project, executing SQL through the Management API and
 * impersonating the `anon` role in-session (`set role anon;`) — the same
 * verification technique already used for the prior advisors remediation
 * (see Engram `il-barbiere/supabase-advisors`).
 *
 * Why not mock: this migration's entire purpose is DB-level access control
 * (RLS-adjacent SECURITY DEFINER surfaces, anon GRANTs). A mocked
 * `supabase-js` client cannot exercise Postgres role/grant semantics — only
 * a real database connection can prove anon is actually scoped correctly.
 *
 * Requires `SUPABASE_ACCESS_TOKEN` (Management API PAT) in the environment.
 * Suite is skipped entirely (not failed) when absent, so the default
 * `pnpm exec vitest run` stays green for contributors without prod
 * credentials configured.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PROJECT_REF = 'bvfmfbybvwjuofjvngdg';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

async function runSql(query: string): Promise<any> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      // Management API blocks default fetch/Python User-Agents (Cloudflare 1010).
      'User-Agent': 'curl/8.0',
    },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (!res.ok || json?.message) {
    throw new Error(json?.message ?? `Management API error (status ${res.status})`);
  }
  return json;
}

const HASH_PREFIX = 'T1UNITTEST';
let barberId: string;
let serviceId: string;
let pendingHash: string;
let confirmedHash: string;
let attendedHash: string;
let cancelledHash: string;
let cutoffHash: string; // valid + cancellable status, but < 4h away
let depositHash: string; // dedicated row for the mark_deposit_paid success case

describe.skipIf(!ACCESS_TOKEN)('anon hardening surfaces — Unit 1 (real Supabase)', () => {
  beforeAll(async () => {
    const [{ id: bId }] = (await runSql('select id from public.barbers limit 1;')) as Array<{
      id: string;
    }>;
    const [{ id: sId }] = (await runSql(
      `select id from public.services where barber_id = '${bId}' limit 1;`
    )) as Array<{ id: string }>;
    barberId = bId;
    serviceId = sId;

    pendingHash = `${HASH_PREFIX}PEND01`;
    confirmedHash = `${HASH_PREFIX}CONF01`;
    attendedHash = `${HASH_PREFIX}ATTD01`;
    cancelledHash = `${HASH_PREFIX}CANC01`;
    cutoffHash = `${HASH_PREFIX}CUTF01`;
    depositHash = `${HASH_PREFIX}DEPO01`;

    // Fixture rows far enough in the future to be well outside the 4h cutoff,
    // except cutoffHash which is deliberately inside the next hour. Each hash
    // is used by exactly ONE mutating test below — cancel_appointment and
    // mark_deposit_paid never share a fixture row, since either RPC mutating
    // a shared row would invalidate the other test's precondition.
    await runSql(`
      insert into public.appointments
        (barber_id, service_id, client_name, appointment_date, appointment_time, status, qr_hash, deposit_paid, final_price)
      values
        ('${barberId}', '${serviceId}', 'Unit1 Test Pending', current_date + interval '10 days', '10:00:00', 'pending', '${pendingHash}', false, 10000),
        ('${barberId}', '${serviceId}', 'Unit1 Test Confirmed', current_date + interval '11 days', '10:00:00', 'confirmed', '${confirmedHash}', false, 10000),
        ('${barberId}', '${serviceId}', 'Unit1 Test Attended', current_date + interval '12 days', '10:00:00', 'attended', '${attendedHash}', true, 10000),
        ('${barberId}', '${serviceId}', 'Unit1 Test Cancelled', current_date + interval '13 days', '10:00:00', 'cancelled', '${cancelledHash}', false, 10000),
        ('${barberId}', '${serviceId}', 'Unit1 Test Cutoff', current_date + interval '14 days', '10:00:00', 'confirmed', '${cutoffHash}', false, 10000),
        ('${barberId}', '${serviceId}', 'Unit1 Test Deposit', current_date + interval '15 days', '10:00:00', 'confirmed', '${depositHash}', false, 10000);
    `);

    // cutoffHash must be < 4h away from "now" — set it directly with an
    // UPDATE using DB-side now(), avoiding any client/server clock drift and
    // avoiding a same-day unique-slot collision with real production rows.
    await runSql(`
      update public.appointments
         set appointment_date = (now() at time zone 'America/Argentina/Buenos_Aires')::date,
             appointment_time = ((now() at time zone 'America/Argentina/Buenos_Aires') + interval '1 hour')::time
       where qr_hash = '${cutoffHash}';
    `);
  });

  afterAll(async () => {
    await runSql(`delete from public.appointments where qr_hash like '${HASH_PREFIX}%';`);
  });

  describe('booked_slots view (2.1)', () => {
    it('exposes exactly the 4 scoped columns to anon', async () => {
      const rows = await runSql(`
        set role anon;
        select * from public.booked_slots where barber_id = '${barberId}' limit 1;
        reset role;
      `);
      expect(Array.isArray(rows)).toBe(true);
      if (rows.length > 0) {
        expect(Object.keys(rows[0]).sort()).toEqual(
          ['appointment_date', 'appointment_time', 'barber_id', 'duration_min'].sort()
        );
      }
    });

    it('excludes cancelled rows (allowlist mirrors app status filter exactly)', async () => {
      // Scope to our fixture's exact time slot (10:00:00) — the target date may
      // also carry unrelated real production bookings at other times, so we
      // isolate our own cancelled fixture row instead of assuming an empty date.
      const rows = (await runSql(`
        set role anon;
        select appointment_time from public.booked_slots
          where barber_id = '${barberId}'
            and appointment_date = current_date + interval '13 days'
            and appointment_time = '10:00:00';
        reset role;
      `)) as Array<{ appointment_time: string }>;

      expect(rows).toEqual([]);
    });

    it('includes a pending appointment on its own date', async () => {
      const rows = (await runSql(`
        set role anon;
        select appointment_time from public.booked_slots
          where barber_id = '${barberId}'
            and appointment_date = current_date + interval '10 days'
            and appointment_time = '10:00:00';
        reset role;
      `)) as Array<{ appointment_time: string }>;

      expect(rows).toHaveLength(1);
    });

    it('does not expose client_name or final_price columns', async () => {
      const rows = await runSql(`
        set role anon;
        select * from public.booked_slots where barber_id = '${barberId}' limit 1;
        reset role;
      `);
      if (rows.length > 0) {
        expect(rows[0]).not.toHaveProperty('client_name');
        expect(rows[0]).not.toHaveProperty('final_price');
      }
    });
  });

  describe('get_appointment_by_hash RPC (2.2)', () => {
    it('returns exactly one scoped row for a valid hash, WITHOUT an id column', async () => {
      const rows = await runSql(`
        set role anon;
        select * from public.get_appointment_by_hash('${pendingHash}');
        reset role;
      `);
      expect(rows).toHaveLength(1);
      expect(rows[0]).not.toHaveProperty('id');
      expect(rows[0].qr_hash).toBe(pendingHash);
      expect(rows[0].client_name).toBe('Unit1 Test Pending');
    });

    it('returns no row for an invalid/unknown hash', async () => {
      const rows = await runSql(`
        set role anon;
        select * from public.get_appointment_by_hash('NOPE-DOES-NOT-EXIST');
        reset role;
      `);
      expect(rows).toHaveLength(0);
    });
  });

  describe('cancel_appointment RPC (2.3 + apply-decision 4h cutoff)', () => {
    it('cancels a pending appointment and returns the distinct success value', async () => {
      const rows = await runSql(`
        set role anon;
        select public.cancel_appointment('${pendingHash}') as result;
        reset role;
      `);
      expect(rows[0].result).toBe('cancelled');

      const [{ status }] = (await runSql(
        `select status from public.appointments where qr_hash = '${pendingHash}';`
      )) as Array<{ status: string }>;
      expect(status).toBe('cancelled');
    });

    it('cancels a confirmed appointment identically to pending', async () => {
      const rows = await runSql(`
        set role anon;
        select public.cancel_appointment('${confirmedHash}') as result;
        reset role;
      `);
      expect(rows[0].result).toBe('cancelled');
    });

    it(
      'returns the SAME no_op value for an invalid hash, already-cancelled, wrong-status, and cutoff-blocked cases',
      { timeout: 20000 },
      async () => {
        const invalidHash = await runSql(`
        set role anon;
        select public.cancel_appointment('TOTALLY-INVALID-HASH') as result;
        reset role;
      `);
        const alreadyCancelled = await runSql(`
        set role anon;
        select public.cancel_appointment('${cancelledHash}') as result;
        reset role;
      `);
        const wrongStatus = await runSql(`
        set role anon;
        select public.cancel_appointment('${attendedHash}') as result;
        reset role;
      `);
        const cutoffBlocked = await runSql(`
        set role anon;
        select public.cancel_appointment('${cutoffHash}') as result;
        reset role;
      `);

        expect(invalidHash[0].result).toBe('no_op');
        expect(alreadyCancelled[0].result).toBe('no_op');
        expect(wrongStatus[0].result).toBe('no_op');
        expect(cutoffBlocked[0].result).toBe('no_op');

        // Prove the cutoff case truly did NOT mutate state (it stayed 'confirmed').
        const [{ status }] = (await runSql(
          `select status from public.appointments where qr_hash = '${cutoffHash}';`
        )) as Array<{ status: string }>;
        expect(status).toBe('confirmed');
      }
    );
  });

  describe('mark_deposit_paid RPC (2.4 — regression guard vs. prior unguarded UPDATE)', () => {
    it('sets deposit_paid=true for a confirmed appointment', async () => {
      const rows = await runSql(`
        set role anon;
        select public.mark_deposit_paid('${depositHash}') as result;
        reset role;
      `);
      expect(rows[0].result).toBe(true);

      const [{ deposit_paid }] = (await runSql(
        `select deposit_paid from public.appointments where qr_hash = '${depositHash}';`
      )) as Array<{ deposit_paid: boolean }>;
      expect(deposit_paid).toBe(true);
    });

    it('no-ops (returns false, no mutation) for an already-cancelled appointment', async () => {
      const before = (await runSql(
        `select deposit_paid from public.appointments where qr_hash = '${cancelledHash}';`
      )) as Array<{ deposit_paid: boolean }>;

      const rows = await runSql(`
        set role anon;
        select public.mark_deposit_paid('${cancelledHash}') as result;
        reset role;
      `);
      expect(rows[0].result).toBe(false);

      const after = (await runSql(
        `select deposit_paid from public.appointments where qr_hash = '${cancelledHash}';`
      )) as Array<{ deposit_paid: boolean }>;
      expect(after[0].deposit_paid).toBe(before[0].deposit_paid);
    });

    it('no-ops for an invalid hash', async () => {
      const rows = await runSql(`
        set role anon;
        select public.mark_deposit_paid('NOPE-DOES-NOT-EXIST') as result;
        reset role;
      `);
      expect(rows[0].result).toBe(false);
    });
  });

  describe('SECURITY DEFINER hygiene', () => {
    it('all 3 RPCs are SECURITY DEFINER with search_path pinned to public, pg_temp', async () => {
      const rows = (await runSql(`
        select p.proname,
               p.prosecdef as is_security_definer,
               p.proconfig as config
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname in ('get_appointment_by_hash', 'cancel_appointment', 'mark_deposit_paid')
        order by p.proname;
      `)) as Array<{ proname: string; is_security_definer: boolean; config: string[] }>;

      expect(rows).toHaveLength(3);
      for (const row of rows) {
        expect(row.is_security_definer).toBe(true);
        expect(row.config).toContain('search_path=public, pg_temp');
      }
    });
  });
});
