import { supabase } from '@/shared/lib/supabase-client';
import type { AppointmentStatus } from '@/shared/types';

export type MoveError = { type: 'slot_occupied' } | Error;

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase no configurado') };
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
  return { error: error ? new Error(error.message) : null };
}

// Confirma el turno y arma el link de WhatsApp para avisarle al cliente.
// El cliente no tiene forma de enterarse de que su turno pending pasó a
// confirmed si nadie le avisa — esto le da al barbero un link listo para
// enviar apenas confirma, en vez de depender de que se acuerde de escribirle.
export async function confirmAppointment(
  id: string
): Promise<{ error: Error | null; whatsappUrl: string | null }> {
  if (!supabase) return { error: new Error('Supabase no configurado'), whatsappUrl: null };

  const { error: updateError } = await supabase
    .from('appointments')
    .update({ status: 'confirmed' })
    .eq('id', id);

  if (updateError) {
    return { error: new Error(updateError.message), whatsappUrl: null };
  }

  const { data: raw } = await supabase
    .from('appointments')
    .select(
      'client_name, client_phone, appointment_date, appointment_time, qr_hash, barbers(name), services(name)'
    )
    .eq('id', id)
    .single();

  if (!raw?.client_phone) {
    // Turno confirmado igual; sin teléfono no hay a quién avisar.
    return { error: null, whatsappUrl: null };
  }

  const barberName = Array.isArray(raw.barbers) ? raw.barbers[0]?.name : raw.barbers?.name;
  const serviceName = Array.isArray(raw.services) ? raw.services[0]?.name : raw.services?.name;
  const [year, month, day] = raw.appointment_date.split('-');
  const formattedDate = `${day}-${month}-${year}`;

  const message = `*IL BARBIERE OS - TURNO CONFIRMADO* ✅\n\n👤 *Cliente:* ${raw.client_name ?? ''}\n✂️ *Servicio:* ${serviceName ?? 'Servicio'}\n📅 *Fecha:* ${formattedDate}\n⏰ *Hora:* ${raw.appointment_time?.slice(0, 5)} HS\n💈 *Barbero:* ${barberName ?? 'Sin asignar'}\n🎟️ *Código:* ${raw.qr_hash}\n\n_Te esperamos!_`;

  return {
    error: null,
    whatsappUrl: `https://wa.me/${raw.client_phone}?text=${encodeURIComponent(message)}`,
  };
}

export async function moveAppointment(
  id: string,
  barberId: string,
  newDate: string,
  newTime: string
): Promise<{ error: MoveError | null }> {
  if (!supabase) return { error: new Error('Supabase no configurado') };
  const { data, error } = await supabase
    .from('appointments')
    .update({ appointment_date: newDate, appointment_time: newTime })
    .eq('id', id)
    .eq('barber_id', barberId)
    .select('id');
  if (error) {
    return {
      error:
        (error as { code?: string }).code === '23505'
          ? { type: 'slot_occupied' }
          : new Error((error as { message?: string }).message ?? 'Error desconocido'),
    };
  }
  if (!data || data.length === 0) {
    return {
      error: new Error('No se pudo mover el turno. El turno no existe o no tenés permisos.'),
    };
  }
  return { error: null };
}

export async function registerPayment(
  id: string,
  type: 'paid' | 'debt'
): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase no configurado') };
  const { error } = await supabase
    .from('appointments')
    .update({ status: type === 'paid' ? 'attended' : 'debt' })
    .eq('id', id);
  return { error: error ? new Error(error.message) : null };
}

export async function createAppointment(payload: {
  barber_id: string;
  service_id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  appointment_time: string;
  final_price: number | null;
  deposit_paid: boolean;
}): Promise<{ error: Error | null; qr_hash: string | null }> {
  if (!supabase) return { error: new Error('Supabase no configurado'), qr_hash: null };
  const qr_hash = `MANUAL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const { error } = await supabase.from('appointments').insert({
    ...payload,
    status: 'confirmed',
    is_fixed_weekly: false,
    qr_hash,
  });
  return { error: error ? new Error(error.message) : null, qr_hash: error ? null : qr_hash };
}
