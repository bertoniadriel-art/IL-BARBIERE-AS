import { CancelAppointment } from '@/features/booking/components/CancelAppointment';
import { createClient } from '@/shared/lib/supabase-server';

export default async function MiTurnoPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const supabase = await createClient();

  const { data: appointment } = await supabase
    .from('appointments')
    .select(
      'id, client_name, appointment_date, appointment_time, status, barbers(name), services(name)'
    )
    .eq('qr_hash', hash.toUpperCase())
    .single();

  return <CancelAppointment appointment={appointment} hash={hash.toUpperCase()} />;
}
