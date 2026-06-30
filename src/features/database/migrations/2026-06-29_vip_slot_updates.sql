-- ==========================================
-- VIP SLOT UPDATES
-- Juli Juarez → Martes 12:30 (Fede)
-- Bruno Vanelli → Viernes 16:00 (Santi)
-- ==========================================

-- Update Juli Juarez: confirm slot_time 12:30 on Tuesday
update public.vip_clients
set slot_time = '12:30'::time
where client_name = 'Juli Juarez'
  and barber_id = (select id from public.barbers where name = 'Fede Diaz');

-- Block that slot (upsert)
insert into public.blocked_slots (barber_id, day_of_week, slot_time, reason, label, enabled)
values (
  (select id from public.barbers where name = 'Fede Diaz'),
  2, '12:30'::time, 'vip_reserved', 'Juli Juarez', true
)
on conflict on constraint blocked_slots_unique do update set enabled = true, label = 'Juli Juarez';

-- Update Bruno Vanelli: Friday 16:00 (Santi)
update public.vip_clients
set day_of_week = 5, slot_time = '16:00'::time
where client_name = 'Bruno Vanelli'
  and barber_id = (select id from public.barbers where name = 'Santi Ducca');

-- Block that slot (upsert)
insert into public.blocked_slots (barber_id, day_of_week, slot_time, reason, label, enabled)
values (
  (select id from public.barbers where name = 'Santi Ducca'),
  5, '16:00'::time, 'vip_reserved', 'Bruno Vanelli', true
)
on conflict on constraint blocked_slots_unique do update set enabled = true, label = 'Bruno Vanelli';

-- ==========================================
-- ARGENTINA MATCH — Viernes 4 jul 2026
-- Último turno 17:30 → bloquear 18:00+ para ambos
-- ==========================================

-- Santi (Vie ends 18:30 normally): block 18:00, 18:30
insert into public.appointments
  (barber_id, appointment_date, appointment_time, client_name, status, deposit_paid, final_price)
select b.id, '2026-07-04', t.slot_time, '🔒 Argentina - Cerrado', 'blocked', false, 0
from public.barbers b
cross join (values ('18:00:00'), ('18:30:00')) as t(slot_time)
where b.name = 'Santi Ducca'
on conflict do nothing;

-- Fede (Vie ends 19:00 normally): block 18:00, 18:30, 19:00
insert into public.appointments
  (barber_id, appointment_date, appointment_time, client_name, status, deposit_paid, final_price)
select b.id, '2026-07-04', t.slot_time, '🔒 Argentina - Cerrado', 'blocked', false, 0
from public.barbers b
cross join (values ('18:00:00'), ('18:30:00'), ('19:00:00')) as t(slot_time)
where b.name = 'Fede Diaz'
on conflict do nothing;
