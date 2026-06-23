-- Migration: Make appointments_unique_slot status-aware
-- Purpose: Allow cancelled appointments to free their slot for rebooking.
--          The current UNIQUE constraint blocks new inserts on (barber_id, date, time)
--          even when the existing row is cancelled, causing 23505 errors in the booking flow.
-- Safe to run: DROP + CREATE INDEX is transactional in Postgres.

begin;

-- Drop the table-level unique constraint
alter table public.appointments
  drop constraint if exists appointments_unique_slot;

-- Replace with a partial unique index that ignores cancelled rows
create unique index appointments_unique_slot
  on public.appointments (barber_id, appointment_date, appointment_time)
  where status != 'cancelled';

commit;
