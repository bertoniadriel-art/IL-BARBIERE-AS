-- Pre-MVP audit queries
-- Run these BEFORE applying 2026-05-25_mvp_core.sql
-- All queries must return expected values noted below; abort migration if any check fails.

-- 1. Row counts (record values as evidence before migration)
SELECT 'appointments' AS table_name, count(*) AS row_count FROM appointments
UNION ALL
SELECT 'barbers', count(*) FROM barbers
UNION ALL
SELECT 'services', count(*) FROM services;

-- 2. Duplicate slot detection
-- EXPECTED: 0 rows — if any rows returned, DO NOT run the migration.
-- Resolve duplicates manually first, then re-run this check.
SELECT
  barber_id,
  appointment_date,
  appointment_time,
  count(*) AS duplicate_count
FROM appointments
WHERE status != 'cancelled'
GROUP BY barber_id, appointment_date, appointment_time
HAVING count(*) > 1;

-- 3. Check for any non-integer final_price values (should return 0 rows)
-- Only relevant if final_price column already exists (pre-existing installs)
-- SELECT count(*) FROM appointments WHERE final_price <> floor(final_price);

-- 4. Current column list snapshot for appointments
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'appointments'
ORDER BY ordinal_position;

-- 5. Current column list snapshot for barbers
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'barbers'
ORDER BY ordinal_position;
