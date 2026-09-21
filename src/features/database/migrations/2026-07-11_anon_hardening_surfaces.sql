-- Migration: 2026-07-11_anon_hardening_surfaces.sql
-- Purpose: PR1 (Unit 1) of il-barbiere-anon-hardening — additive-only scoped surfaces
--          that will replace the two blanket anon policies on public.appointments:
--            "TEMP: anon select appointments" (USING true)
--            "TEMP: anon update appointments" (USING true, WITH CHECK true)
--          This migration does NOT touch those policies or any app consumer. It only
--          adds a column-minimal view and three SECURITY DEFINER RPCs, then grants
--          anon access to them. Fully reversible — see rollback block at the end.
-- Requires: service_role or superuser credentials.
-- Design: sdd/il-barbiere-anon-hardening/design (Engram #1368, JD-approved round 1)
-- Apply decisions: sdd/il-barbiere-anon-hardening/apply-decisions (Engram #1384)
--   - get_appointment_by_hash does NOT return `id` (hash stays the only public identifier)
--   - cancel_appointment enforces the 4h cancellation cutoff server-side, folded into
--     the same indistinguishable no-op response as an invalid hash (no new error class)

begin;

-- ==========================================
-- 1. booked_slots VIEW
-- ==========================================
-- Exposes ONLY the 4 columns availabilityService.getBookedSlots needs to expand
-- booking slots. Mirrors the app's exact status allowlist (NOT `status != 'cancelled'`,
-- which would leak other/null statuses).
--
-- ACCEPTED EXPOSURE (not a defect): this view intentionally returns booked slots for
-- ALL barbers across ALL dates to anon. Barber/date/time availability is inherently
-- public booking data with no PII — this is the same shape the app already renders
-- publicly on the booking calendar.
create or replace view public.booked_slots as
select
  a.barber_id,
  a.appointment_date,
  a.appointment_time,
  coalesce(s.duration_min, 30) as duration_min
from public.appointments a
left join public.services s on s.id = a.service_id
where a.status in ('pending', 'confirmed', 'attended', 'blocked');

grant select on public.booked_slots to anon;

-- ==========================================
-- 2. get_appointment_by_hash(p_hash) RPC
-- ==========================================
-- Hash-scoped read for /mi-turno/[hash]. Scopes by hash possession (secret bearer),
-- not column stripping — only the row matching the caller's hash is returned, no
-- enumeration of other appointments.
--
-- Does NOT return `id`: the qr_hash remains the only public identifier for this
-- appointment, preserving the API/internal-model separation (apply decision #1384).
create or replace function public.get_appointment_by_hash(p_hash text)
returns table (
  client_name text,
  appointment_date date,
  appointment_time time,
  status text,
  qr_hash text,
  deposit_paid boolean,
  final_price numeric,
  barber_name text,
  service_name text
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    a.client_name,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.qr_hash,
    a.deposit_paid,
    a.final_price,
    b.name as barber_name,
    s.name as service_name
  from public.appointments a
  left join public.barbers b on b.id = a.barber_id
  left join public.services s on s.id = a.service_id
  where a.qr_hash = upper(p_hash);
$$;

grant execute on function public.get_appointment_by_hash(text) to anon;

-- ==========================================
-- 3. cancel_appointment(p_hash) RPC
-- ==========================================
-- Anti-oracle contract: invalid hash, already-cancelled, wrong-status (e.g.
-- 'attended'), AND a cutoff-blocked cancel (< 4h before the appointment) all
-- return the SAME 'no_op' text externally — one indistinguishable response
-- class, so this RPC never becomes a hash-existence, appointment-state, or
-- cutoff oracle. Only the true pending/confirmed -> cancelled transition
-- (still within the 4h window) returns the distinct 'cancelled' success value.
--
-- The 4h cutoff is enforced HERE, server-side (apply decision #1384) — the
-- client-side check in CancelAppointment.tsx (CANCEL_CUTOFF_HOURS) remains
-- UX-only from now on; this RPC is the actual business-rule enforcement point.
create or replace function public.cancel_appointment(p_hash text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_status text;
  v_appointment_at timestamp;
begin
  select id, status, (appointment_date + appointment_time)
    into v_id, v_status, v_appointment_at
  from public.appointments
  where qr_hash = upper(p_hash)
  for update;

  -- Case (a): hash never existed
  if v_id is null then
    return 'no_op';
  end if;

  -- Case (b)/(c): already cancelled or any non-cancellable status (e.g. attended)
  if v_status not in ('pending', 'confirmed') then
    return 'no_op';
  end if;

  -- Server-side 4h cutoff: block cancellation within 4 hours of the appointment.
  -- Buenos Aires wall-clock, matching the naive date+time semantics already used
  -- by appointment_date/appointment_time and by the client-side cutoff check.
  if v_appointment_at - (now() at time zone 'America/Argentina/Buenos_Aires') < interval '4 hours' then
    return 'no_op';
  end if;

  -- True transition: the one case that actually mutates state.
  update public.appointments
     set status = 'cancelled'
   where id = v_id;

  return 'cancelled';
end;
$$;

grant execute on function public.cancel_appointment(text) to anon;

-- ==========================================
-- 4. mark_deposit_paid(p_hash) RPC
-- ==========================================
-- Client self-service "Ya realicé el pago" action from the public hash page.
-- Idempotent: only mutates when status is still pending/confirmed. Previously
-- this write went through the blanket "TEMP: anon update appointments" policy
-- with NO status guard at all — this RPC is a behavior tightening, not a
-- regression (see tasks 2.4).
create or replace function public.mark_deposit_paid(p_hash text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated boolean := false;
begin
  update public.appointments
     set deposit_paid = true
   where qr_hash = upper(p_hash)
     and status in ('pending', 'confirmed')
  returning true into v_updated;

  return coalesce(v_updated, false);
end;
$$;

grant execute on function public.mark_deposit_paid(text) to anon;

commit;

-- ==========================================
-- ROLLBACK (additive surfaces only — no data ever deleted)
-- ==========================================
-- drop view if exists public.booked_slots;
-- drop function if exists public.get_appointment_by_hash(text);
-- drop function if exists public.cancel_appointment(text);
-- drop function if exists public.mark_deposit_paid(text);
--
-- NOTE: this migration never touches "TEMP: anon select appointments" or
-- "TEMP: anon update appointments" — those are dropped only in Unit 3/4
-- (Phase 6 of tasks), gated on the rollback-verification step (Phase 5).
