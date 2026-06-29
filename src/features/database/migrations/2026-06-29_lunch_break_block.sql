-- ==========================================
-- LUNCH BREAK BLOCK — 13:00 every working day
-- Both barbers, Tue–Sat (2,3,4,5,6)
-- ==========================================

insert into public.blocked_slots (barber_id, day_of_week, slot_time, reason, label, enabled)
select
  b.id,
  d.dow,
  '13:00'::time,
  'personal',
  'Almuerzo',
  true
from public.barbers b
cross join (values (2), (3), (4), (5), (6)) as d(dow)
where b.name in ('Santi Ducca', 'Fede Diaz')
on conflict on constraint blocked_slots_unique do nothing;
