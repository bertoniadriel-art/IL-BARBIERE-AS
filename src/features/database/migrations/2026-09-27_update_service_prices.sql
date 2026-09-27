-- ==========================================
-- SERVICE PRICE UPDATE (Sep 2026) — issue #36
-- Corte Premium      14000 -> 16000
-- Corte para chicos  14000 -> 16000
-- Corte + Barba      20000 -> 22000
-- Barba & Perfilado  10000 (unchanged)
-- ==========================================

update public.services set price = 16000.00 where name = 'Corte Premium';
update public.services set price = 16000.00 where name = 'Corte para chicos';
update public.services set price = 22000.00 where name = 'Corte + Barba';
update public.services set price = 10000.00 where name = 'Barba & Perfilado';
