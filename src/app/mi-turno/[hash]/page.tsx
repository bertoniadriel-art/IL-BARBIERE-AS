import { CancelAppointment } from '@/features/booking/components/CancelAppointment';
import { createClient } from '@/shared/lib/supabase-server';

/** Flat row shape returned by the anon-hardening `get_appointment_by_hash` RPC. */
interface HashAppointmentRow {
  client_name: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
  qr_hash: string;
  deposit_paid: boolean;
  final_price: number | null;
  barber_name: string | null;
  service_name: string | null;
}

/**
 * Reshapes the flat row returned by `get_appointment_by_hash` into the nested
 * shape `CancelAppointment`'s `Appointment` interface expects
 * (`barbers: {name}` / `services: {name}`), owning the flat -> nested mapping
 * so the component's interface stays unchanged (design IB-C3 fix).
 *
 * The RPC intentionally does not return an internal `id` (apply decision
 * Engram #1384 — `qr_hash` stays the only public identifier). `id` is now
 * only used to satisfy the component's typed prop; `handleCancel`/
 * `handleMarkPaid` key off the `hash` prop directly, not `appointment.id`.
 */
export function mapHashRowToAppointment(raw: HashAppointmentRow | null) {
  if (!raw) return null;

  return {
    id: raw.qr_hash,
    client_name: raw.client_name,
    appointment_date: raw.appointment_date,
    appointment_time: raw.appointment_time,
    status: raw.status,
    qr_hash: raw.qr_hash,
    deposit_paid: raw.deposit_paid,
    final_price: raw.final_price,
    barbers: raw.barber_name ? { name: raw.barber_name } : null,
    services: raw.service_name ? { name: raw.service_name } : null,
  };
}

export default async function MiTurnoPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .rpc('get_appointment_by_hash', { p_hash: hash.toUpperCase() })
    .maybeSingle();

  const appointment = mapHashRowToAppointment(data as HashAppointmentRow | null);

  return <CancelAppointment appointment={appointment} hash={hash.toUpperCase()} />;
}
