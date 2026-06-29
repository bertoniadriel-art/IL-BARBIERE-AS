-- ==========================================
-- VIP CLIENTS + BLOCKED SLOTS
-- ==========================================

-- 1. VIP_CLIENTS — reference table for discount tracking and recurring schedule
create table if not exists public.vip_clients (
  id uuid primary key default uuid_generate_v4(),
  client_name text not null,
  client_phone text,
  barber_id uuid references public.barbers(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  day_of_week smallint check (day_of_week between 0 and 6), -- 0=Sun…6=Sat
  slot_time time,
  frequency text check (frequency in ('weekly', 'biweekly')) default 'weekly',
  discount_percent integer default 10 check (discount_percent between 0 and 100),
  notes text,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.vip_clients enable row level security;
grant all on public.vip_clients to anon, authenticated, service_role;

create policy "VipClients: authenticated full access"
  on public.vip_clients for all
  to authenticated
  using (true)
  with check (true);

-- 2. BLOCKED_SLOTS — permanent unavailable slots (personal time + VIP reservations)
-- enabled=false lets barbers temporarily unlock a slot without deleting it
create table if not exists public.blocked_slots (
  id uuid primary key default uuid_generate_v4(),
  barber_id uuid references public.barbers(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  slot_time time not null,
  reason text default 'personal', -- 'personal' | 'vip_reserved'
  label text,                      -- client name for vip_reserved slots
  enabled boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint blocked_slots_unique unique (barber_id, day_of_week, slot_time)
);

alter table public.blocked_slots enable row level security;
grant all on public.blocked_slots to anon, authenticated, service_role;

-- Public read: needed by the booking flow (anon clients)
create policy "BlockedSlots: public read"
  on public.blocked_slots for select using (true);

-- Authenticated write: barbers manage their own blocks
create policy "BlockedSlots: authenticated manage"
  on public.blocked_slots for all
  to authenticated
  using (true)
  with check (true);

-- ==========================================
-- SEED: BARBER PERSONAL BLOCKS
-- Wed (3) + Sat (6) at 12:00 and 12:30 — both barbers
-- ==========================================

insert into public.blocked_slots (barber_id, day_of_week, slot_time, reason, label, enabled)
select
  b.id,
  d.dow,
  t.slot_time::time,
  'personal',
  null,
  true
from public.barbers b
cross join (values (3), (6)) as d(dow)
cross join (values ('12:00'), ('12:30')) as t(slot_time)
where b.name in ('Santi Ducca', 'Fede Diaz')
on conflict on constraint blocked_slots_unique do nothing;

-- ==========================================
-- SEED: VIP CLIENTS — FEDE
-- ==========================================

insert into public.vip_clients (client_name, barber_id, service_id, day_of_week, slot_time, frequency, discount_percent)
values
  -- Martes c/15 días (horario sin confirmar)
  ('Juli Juarez',
   (select id from public.barbers where name = 'Fede Diaz'),
   (select id from public.services where name = 'Corte Premium' limit 1),
   2, null, 'biweekly', 10),

  -- Jueves 09:00 c/15 días
  ('Javi Orru',
   (select id from public.barbers where name = 'Fede Diaz'),
   (select id from public.services where name = 'Corte + Barba' limit 1),
   4, '09:00', 'biweekly', 10),

  -- Jueves 12:30 todas las semanas
  ('Gino Ambrosis',
   (select id from public.barbers where name = 'Fede Diaz'),
   (select id from public.services where name = 'Corte Premium' limit 1),
   4, '12:30', 'weekly', 10),

  -- Jueves 14:00 todas las semanas
  ('Tomi Degano',
   (select id from public.barbers where name = 'Fede Diaz'),
   (select id from public.services where name = 'Corte Premium' limit 1),
   4, '14:00', 'weekly', 10),

  -- Viernes 09:00 todas las semanas
  ('Joni Barba',
   (select id from public.barbers where name = 'Fede Diaz'),
   (select id from public.services where name = 'Corte + Barba' limit 1),
   5, '09:00', 'weekly', 10),

  -- Viernes 10:30 todas las semanas
  ('Fabri Kosic',
   (select id from public.barbers where name = 'Fede Diaz'),
   (select id from public.services where name = 'Corte Premium' limit 1),
   5, '10:30', 'weekly', 10),

  -- Viernes 13:30 todas las semanas
  ('Fabri Cresta',
   (select id from public.barbers where name = 'Fede Diaz'),
   (select id from public.services where name = 'Corte Premium' limit 1),
   5, '13:30', 'weekly', 10),

  -- Viernes 14:00 c/15 días
  ('Walter Chapista',
   (select id from public.barbers where name = 'Fede Diaz'),
   (select id from public.services where name = 'Corte Premium' limit 1),
   5, '14:00', 'biweekly', 10),

  -- Viernes 16:30 todas las semanas
  ('Bruno Santamaria',
   (select id from public.barbers where name = 'Fede Diaz'),
   (select id from public.services where name = 'Corte Premium' limit 1),
   5, '16:30', 'weekly', 10),

  -- Viernes 17:00 todas las semanas
  ('Tomas Santamaria',
   (select id from public.barbers where name = 'Fede Diaz'),
   (select id from public.services where name = 'Corte Premium' limit 1),
   5, '17:00', 'weekly', 10),

  -- Viernes 19:00 todas las semanas
  ('Juli Diaz',
   (select id from public.barbers where name = 'Fede Diaz'),
   (select id from public.services where name = 'Corte Premium' limit 1),
   5, '19:00', 'weekly', 10);

-- ==========================================
-- SEED: VIP CLIENTS — SANTI
-- ==========================================

insert into public.vip_clients (client_name, barber_id, service_id, day_of_week, slot_time, frequency, discount_percent)
values
  -- Jueves 12:00 todas las semanas
  ('Dami Yaco',
   (select id from public.barbers where name = 'Santi Ducca'),
   null, 4, '12:00', 'weekly', 10),

  -- Viernes 14:00 todas las semanas
  ('Tiziano',
   (select id from public.barbers where name = 'Santi Ducca'),
   null, 5, '14:00', 'weekly', 10),

  -- Viernes 14:30 todas las semanas
  ('Galgo',
   (select id from public.barbers where name = 'Santi Ducca'),
   null, 5, '14:30', 'weekly', 10),

  -- Viernes 15:00 todas las semanas
  ('Leiva',
   (select id from public.barbers where name = 'Santi Ducca'),
   null, 5, '15:00', 'weekly', 10),

  -- Viernes todas las semanas (horario pendiente)
  ('Ivan',
   (select id from public.barbers where name = 'Santi Ducca'),
   null, 5, null, 'weekly', 10),

  -- Sábado c/15 días (horario pendiente)
  ('Juli Bustos',
   (select id from public.barbers where name = 'Santi Ducca'),
   null, 6, null, 'biweekly', 10),

  -- Sin día/horario fijo aún
  ('Machi',         (select id from public.barbers where name = 'Santi Ducca'), null, null, null, 'weekly', 10),
  ('Bruno Vanelli',  (select id from public.barbers where name = 'Santi Ducca'), null, null, null, 'weekly', 10),
  ('Ema Giardini',   (select id from public.barbers where name = 'Santi Ducca'), null, null, null, 'weekly', 10),
  ('Adriel Bertoni', (select id from public.barbers where name = 'Santi Ducca'), null, null, null, 'weekly', 10),

  -- Clientes compartidos con Fede (horario en Santi pendiente de confirmar)
  ('Fabri Kosic',      (select id from public.barbers where name = 'Santi Ducca'), null, null, null, 'weekly', 10),
  ('Juli Diaz',        (select id from public.barbers where name = 'Santi Ducca'), null, null, null, 'weekly', 10),
  ('Tomas Santamaria', (select id from public.barbers where name = 'Santi Ducca'), null, null, null, 'weekly', 10),
  ('Bruno Santamaria', (select id from public.barbers where name = 'Santi Ducca'), null, null, null, 'weekly', 10),
  ('Fabri Cresta',     (select id from public.barbers where name = 'Santi Ducca'), null, null, null, 'weekly', 10),
  ('Walter Chapista',  (select id from public.barbers where name = 'Santi Ducca'), null, null, null, 'weekly', 10),
  ('Joni Barba',       (select id from public.barbers where name = 'Santi Ducca'), null, null, null, 'weekly', 10);

-- ==========================================
-- SEED: BLOCKED SLOTS — ALL VIP reservations with a known slot_time
-- Includes both weekly and biweekly (barbers unlock biweekly slots manually)
-- ==========================================

insert into public.blocked_slots (barber_id, day_of_week, slot_time, reason, label, enabled)
select
  v.barber_id,
  v.day_of_week,
  v.slot_time,
  'vip_reserved',
  v.client_name,
  true
from public.vip_clients v
where v.slot_time is not null
on conflict on constraint blocked_slots_unique do nothing;
