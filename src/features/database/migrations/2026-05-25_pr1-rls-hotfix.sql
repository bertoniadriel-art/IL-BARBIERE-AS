-- Migration: 2026-05-25_pr1-rls-hotfix.sql
-- Purpose: HOTFIX — relax RLS until PR3 (real Supabase Auth + populated barbers.auth_user_id) lands.
-- Background: PR1 (2026-05-25_mvp_core.sql) replaced the previous "admin full access" + "public select"
-- policies on `appointments` with barber-scoped ones that depend on `auth.uid() = barbers.auth_user_id`.
-- However, real Auth (PR3) is not yet implemented, so `auth.uid()` is null in every request →
-- everything except INSERT is blocked: TimeSelector availability check, Scanner SELECT/UPDATE, Dashboard.
--
-- This migration drops those barber-scoped policies and adds two clearly-labeled TEMP policies
-- (anon SELECT and anon UPDATE). PR3 MUST replace these with the barber-scoped versions once
-- auth_user_id is populated for Fede and Santi.
--
-- Idempotent: safe to run more than once.

begin;

drop policy if exists "Appointments: barber select own" on public.appointments;
drop policy if exists "Appointments: barber update own" on public.appointments;
drop policy if exists "Appointments: barber delete own" on public.appointments;

-- Allow anon (public booking flow + admin scanner without real Auth) to read appointments.
-- PR3 will replace with barber-scoped policy.
create policy "TEMP: anon select appointments"
  on public.appointments
  for select
  using (true);

-- Allow anon to update appointments (Scanner needs to mark status=attended without real Auth).
-- PR3 will replace with barber-scoped policy.
create policy "TEMP: anon update appointments"
  on public.appointments
  for update
  using (true);

commit;
