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
