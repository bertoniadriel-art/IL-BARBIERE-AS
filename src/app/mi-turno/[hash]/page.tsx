import { CancelAppointment } from '@/features/booking/components/CancelAppointment';
import { createClient } from '@/shared/lib/supabase-server';

export default async function MiTurnoPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const supabase = await createClient();

  const { data: raw } = await supabase
    .from('appointments')
    .select(
      'id, client_name, appointment_date, appointment_time, status, barbers(name), services(name)'
    )
    .eq('qr_hash', hash.toUpperCase())
    .single();

  const appointment = raw
    ? {
        ...raw,
        barbers: Array.isArray(raw.barbers) ? (raw.barbers[0] ?? null) : raw.barbers,
        services: Array.isArray(raw.services) ? (raw.services[0] ?? null) : raw.services,
      }
    : null;

  return <CancelAppointment appointment={appointment} hash={hash.toUpperCase()} />;
}
