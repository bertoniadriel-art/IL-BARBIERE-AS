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
