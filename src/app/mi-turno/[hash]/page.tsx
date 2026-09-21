import { CancelAppointment } from '@/features/booking/components/CancelAppointment';
import { createClient } from '@/shared/lib/supabase-server';

export default async function MiTurnoPage({
  params,
  searchParams,
}: {
  params: Promise<{ hash: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const { hash } = await params;
  // `nuevo=1` lo agrega Confirmation al redirigir recién reservado. Se lee acá
  // (Server Component) para no envolver el cliente en <Suspense>.
  const { nuevo } = await searchParams;
  const supabase = await createClient();

  const { data: raw, error } = await supabase
    .from('appointments')
    .select(
      'id, client_name, appointment_date, appointment_time, status, qr_hash, barbers(name), services(name, duration_min)'
    )
    .eq('qr_hash', hash.toUpperCase())
    .single();

  // PGRST116 = `.single()` matched no row, which IS "no existe". Any other error
  // means the read failed: never tell the client their turno does not exist.
  const loadFailed = Boolean(error) && error?.code !== 'PGRST116';

  const appointment = raw
    ? {
        ...raw,
        barbers: Array.isArray(raw.barbers) ? (raw.barbers[0] ?? null) : raw.barbers,
        services: Array.isArray(raw.services) ? (raw.services[0] ?? null) : raw.services,
      }
    : null;

  return (
    <CancelAppointment
      appointment={appointment}
      hash={hash.toUpperCase()}
      isNew={nuevo === '1'}
      loadFailed={loadFailed}
    />
  );
}
