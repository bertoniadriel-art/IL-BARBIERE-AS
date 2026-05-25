-- Migration: 2026-05-25_mvp_core.sql
-- Purpose: Add missing columns, soft-cancel duplicate slots, add unique constraint, enforce barber-scoped RLS.
-- Prerequisites: Run audit-pre-mvp.sql first. Duplicate slot query MUST return 0 rows before applying.
-- Requires: service_role or superuser credentials.

begin;

-- ==========================================
-- 1. ADDITIVE COLUMNS — barbers
-- ==========================================

alter table public.barbers add column if not exists role text not null default 'Barbero';
alter table public.barbers add column if not exists image text;

-- ==========================================
-- 2. ADDITIVE COLUMNS — appointments
-- ==========================================

alter table public.appointments add column if not exists is_fixed_weekly boolean not null default false;

-- final_price: integer whole ARS pesos, rounded to nearest 100 before insert
alter table public.appointments add column if not exists final_price integer;

alter table public.appointments add column if not exists deposit_paid boolean not null default false;

-- ==========================================
-- 3. SOFT-CANCEL DUPLICATE SLOTS
-- Must run BEFORE adding the unique constraint.
-- Keeps the oldest appointment (lowest created_at), cancels the rest.
-- ==========================================

with ranked as (
  select
    id,
    row_number() over (
      partition by barber_id, appointment_date, appointment_time
      order by created_at asc
    ) as rn
  from public.appointments
  where status in ('pending', 'confirmed')
)
update public.appointments a
   set status = 'cancelled'
  from ranked r
 where a.id = r.id
   and r.rn > 1;

-- ==========================================
-- 4. UNIQUE CONSTRAINT (named) — AFTER dedup
-- ==========================================

alter table public.appointments
  add constraint appointments_unique_slot
  unique (barber_id, appointment_date, appointment_time);

-- ==========================================
-- 5. RLS POLICIES — barber-scoped access
-- ==========================================

-- Drop old catch-all policies before replacing with scoped ones
drop policy if exists "Appointments: public select own" on public.appointments;
drop policy if exists "Appointments: admin full access" on public.appointments;
drop policy if exists "Appointments: admin select" on public.appointments;
drop policy if exists "Appointments: admin update" on public.appointments;
drop policy if exists "Appointments: barber select own" on public.appointments;
drop policy if exists "Appointments: barber update own" on public.appointments;
drop policy if exists "Appointments: barber delete own" on public.appointments;

-- Appointments SELECT: barber sees only their own appointments
create policy "Appointments: barber select own"
  on public.appointments
  for select
  using (
    barber_id in (
      select id from public.barbers
      where auth_user_id = auth.uid()
    )
  );

-- Appointments UPDATE: barber can only update their own appointments
create policy "Appointments: barber update own"
  on public.appointments
  for update
  using (
    barber_id in (
      select id from public.barbers
      where auth_user_id = auth.uid()
    )
  );

-- Appointments DELETE: barber can only delete their own appointments
create policy "Appointments: barber delete own"
  on public.appointments
  for delete
  using (
    barber_id in (
      select id from public.barbers
      where auth_user_id = auth.uid()
    )
  );

commit;
