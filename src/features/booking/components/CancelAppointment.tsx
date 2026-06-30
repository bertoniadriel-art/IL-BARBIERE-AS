'use client';

import { supabase } from '@/shared/lib/supabase';
import { differenceInHours, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, Calendar, CheckCircle, Clock, Scissors, XCircle } from 'lucide-react';
import { useState } from 'react';

const CANCEL_CUTOFF_HOURS = 4;

interface Appointment {
  id: string;
  client_name: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
  barbers: { name: string } | null;
  services: { name: string } | null;
}

export function CancelAppointment({
  appointment,
  hash,
}: {
  appointment: Appointment | null;
  hash: string;
}) {
  const [status, setStatus] = useState<'idle' | 'cancelled' | 'error'>('idle');

  if (!appointment) {
    return (
      <div className='min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6'>
        <div className='text-center'>
          <XCircle className='w-12 h-12 text-red-400 mx-auto mb-4' />
          <p className='text-white font-bold text-lg'>Turno no encontrado</p>
          <p className='text-white/40 text-sm mt-2'>
            El código {hash} no corresponde a ningún turno.
          </p>
        </div>
      </div>
    );
  }

  if (appointment.status === 'cancelled') {
    return (
      <div className='min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6'>
        <div className='text-center'>
          <XCircle className='w-12 h-12 text-white/30 mx-auto mb-4' />
          <p className='text-white font-bold text-lg'>Este turno ya fue cancelado</p>
        </div>
      </div>
    );
  }

  if (appointment.status === 'attended') {
    return (
      <div className='min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6'>
        <div className='text-center'>
          <CheckCircle className='w-12 h-12 text-emerald-400 mx-auto mb-4' />
          <p className='text-white font-bold text-lg'>Este turno ya fue completado</p>
        </div>
      </div>
    );
  }

  const appointmentDateTime = parseISO(
    `${appointment.appointment_date}T${appointment.appointment_time}`
  );
  const hoursUntil = differenceInHours(appointmentDateTime, new Date());
  const canCancel = hoursUntil >= CANCEL_CUTOFF_HOURS;

  const formattedDate = format(appointmentDateTime, "EEEE d 'de' MMMM", { locale: es });
  const formattedTime = appointment.appointment_time.slice(0, 5);

  async function handleCancel() {
    if (!supabase) return;
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointment!.id)
      .in('status', ['pending', 'confirmed']);

    if (error) {
      setStatus('error');
    } else {
      setStatus('cancelled');
    }
  }

  if (status === 'cancelled') {
    return (
      <div className='min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6'>
        <div className='text-center'>
          <CheckCircle className='w-12 h-12 text-neon-cyan mx-auto mb-4' />
          <p className='text-white font-bold text-lg'>Turno cancelado</p>
          <p className='text-white/40 text-sm mt-2'>
            Tu turno del {formattedDate} a las {formattedTime} hs fue cancelado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6'>
      <div className='w-full max-w-sm'>
        <div className='text-center mb-8'>
          <Scissors className='w-8 h-8 text-neon-cyan mx-auto mb-3' />
          <h1 className='text-2xl font-black tracking-tighter text-white'>IL BARBIERE</h1>
          <p className='text-white/30 text-xs uppercase tracking-widest mt-1'>Mi turno</p>
        </div>

        <div className='bg-white/[0.03] border border-white/8 rounded-3xl p-6 mb-6 space-y-4'>
          <div className='flex items-center gap-3'>
            <Calendar className='w-4 h-4 text-white/30 flex-shrink-0' />
            <div>
              <p className='text-[10px] text-white/30 uppercase tracking-widest'>Fecha</p>
              <p className='text-sm font-bold text-white capitalize'>{formattedDate}</p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <Clock className='w-4 h-4 text-white/30 flex-shrink-0' />
            <div>
              <p className='text-[10px] text-white/30 uppercase tracking-widest'>Horario</p>
              <p className='text-lg font-black text-neon-cyan'>{formattedTime} hs</p>
            </div>
          </div>
          {appointment.barbers?.name && (
            <div className='flex items-center gap-3'>
              <Scissors className='w-4 h-4 text-white/30 flex-shrink-0' />
              <div>
                <p className='text-[10px] text-white/30 uppercase tracking-widest'>Barbero</p>
                <p className='text-sm font-bold text-white'>{appointment.barbers.name}</p>
              </div>
            </div>
          )}
          {appointment.services?.name && (
            <div className='pt-3 border-t border-white/5'>
              <p className='text-[10px] text-white/30 uppercase tracking-widest mb-1'>Servicio</p>
              <p className='text-sm font-bold text-white'>{appointment.services.name}</p>
            </div>
          )}
        </div>

        {canCancel ? (
          <div className='space-y-3'>
            <p className='text-white/40 text-xs text-center'>
              Podés cancelar hasta {CANCEL_CUTOFF_HOURS} horas antes del turno.
            </p>
            <button
              type='button'
              onClick={handleCancel}
              className='w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-black uppercase tracking-widest text-sm hover:bg-red-500/20 transition-colors'
            >
              Cancelar turno
            </button>
            {status === 'error' && (
              <p className='text-red-400 text-xs text-center'>
                Error al cancelar. Intentá nuevamente.
              </p>
            )}
          </div>
        ) : (
          <div className='flex items-start gap-3 p-4 rounded-2xl bg-yellow-400/5 border border-yellow-400/20'>
            <AlertCircle className='w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5' />
            <p className='text-yellow-400 text-xs font-bold'>
              Ya no es posible cancelar. Los turnos solo pueden cancelarse con al menos{' '}
              {CANCEL_CUTOFF_HOURS} horas de anticipación.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
