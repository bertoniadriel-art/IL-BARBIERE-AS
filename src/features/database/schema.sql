-- Schema reflects production state. Auth handled via Supabase Auth (auth.users). Barbers must be provisioned in Auth dashboard and linked via auth_user_id.

-- ==========================================
-- IL BARBIERE OS - THE VAULT (SUPABASE SCHEMA)
-- ==========================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. BARBERS TABLE
create table if not exists public.barbers (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id),
  name text not null,
  phone text not null,
  image_url text,
  role text not null default 'Barbero',
  image text,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- INITIAL BARBERS
-- Provision users in Supabase Auth dashboard first, then insert with matching auth_user_id
insert into public.barbers (name, phone, image_url)
values
  ('Santi Ducca', '3402503244', '/assets/barbers/santi.png'),
  ('Fede Diaz', '3402417023', '/assets/barbers/fede.png')
on conflict do nothing;

-- 2. SERVICES TABLE
create table if not exists public.services (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price decimal(10,2) not null,
  duration_min integer default 30,
  barber_id uuid references public.barbers(id) on delete cascade, -- Null if service is general
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- INITIAL SERVICES (Idempotent)
insert into public.services (name, price, duration_min) values
('Corte Premium', 14000.00, 30),
('Corte para chicos', 14000.00, 30),
('Barba & Perfilado', 10000.00, 30),
('Corte + Barba', 20000.00, 60)
on conflict do nothing;

-- 3. APPOINTMENTS TABLE
create table if not exists public.appointments (
  id uuid primary key default uuid_generate_v4(),
  barber_id uuid references public.barbers(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  client_name text not null,
  client_phone text not null,
  appointment_date date not null,
  appointment_time time not null,
  status text check (status in ('pending', 'confirmed', 'attended', 'cancelled')) default 'pending',
  qr_hash text unique,
  is_fixed_weekly boolean not null default false,
  final_price integer,
  deposit_paid boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- UNIQUE CONSTRAINT — slot collision prevention
-- ==========================================

-- Partial index: cancelled appointments don't hold their slot, so a client
-- can rebook the same barber/date/time after a cancellation. See
-- migrations/2026-06-23_partial_unique_slot.sql — this was written on
-- 2026-06-23 but drifted from what's actually applied to prod (schema.sql
-- kept the old plain-unique version). Always cross-check this file against
-- the live DB's index definition, not just against migration files.
create unique index if not exists appointments_unique_slot
  on public.appointments (barber_id, appointment_date, appointment_time)
  where status != 'cancelled';

-- ==========================================
-- RLS (ROW LEVEL SECURITY)
-- ==========================================

alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;

-- Drop existing policies to avoid "already exists" errors
drop policy if exists "Barbers: public read" on public.barbers;
drop policy if exists "Services: public read" on public.services;
drop policy if exists "Appointments: public insert" on public.appointments;
drop policy if exists "Appointments: admin select" on public.appointments;
drop policy if exists "Appointments: admin update" on public.appointments;
drop policy if exists "Appointments: public select own" on public.appointments;
drop policy if exists "Appointments: admin full access" on public.appointments;
drop policy if exists "Appointments: barber select own" on public.appointments;
drop policy if exists "Appointments: barber update own" on public.appointments;
drop policy if exists "Appointments: barber delete own" on public.appointments;

-- Permissions
grant all on public.barbers to anon, authenticated, service_role;
grant all on public.services to anon, authenticated, service_role;
grant all on public.appointments to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated;

-- Barbers: public SELECT (needed for booking flow)
create policy "Barbers: public read"
  on public.barbers
  for select
  using (true);

-- Services: public SELECT (needed for booking flow)
create policy "Services: public read"
  on public.services
  for select
  using (true);

-- Appointments: public INSERT (anon clients booking)
create policy "Appointments: public insert"
  on public.appointments
  for insert to anon, authenticated
  with check (true);

-- Appointments SELECT: each barber sees only their own appointments
-- (scoped via auth.uid() = barbers.auth_user_id joined through barber_id)
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
