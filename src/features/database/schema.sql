-- ==========================================
-- IL BARBIERE OS - THE VAULT (SUPABASE SCHEMA)
-- ==========================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. BARBERS TABLE
create table if not exists public.barbers (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid references auth.users(id), -- Link to Supabase Auth
  name text not null,
  phone text not null,
  image_url text,
  username text unique,
  password text, -- Deprecated once Auth is real, but keeping for compatibility
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- INITIAL BARBERS (Idempotent)
insert into public.barbers (name, phone, image_url, username, password)
values 
  ('Santi Ducca', '3402503244', '/assets/barbers/santi.png', 'santi', 'santi123'), 
  ('Fede Diaz', '3402417023', '/assets/barbers/fede.png', 'fede', 'fede123')
on conflict (username) do nothing;

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
('Corte de Pelo', 12000.00, 30),
('Barba', 8000.00, 30),
('Corte + Barba', 16000.00, 60)
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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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

-- Permissions
grant all on public.barbers to anon, authenticated, service_role;
grant all on public.services to anon, authenticated, service_role;
grant all on public.appointments to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated;

-- Policies
create policy "Barbers: public read" on public.barbers for select using (true);
create policy "Services: public read" on public.services for select using (true);

create policy "Appointments: public insert" on public.appointments 
for insert to anon, authenticated 
with check (true);

create policy "Appointments: public select own" on public.appointments 
for select using (true); -- Allow anyone to see availability or confirmation

create policy "Appointments: admin full access" on public.appointments 
for all using (true);
