'use client';

import { format, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { useMemo } from 'react';

interface AppointmentRow {
  id: string;
  status: string;
  client_name: string | null;
  appointment_date: string;
  appointment_time: string | null;
}

interface TodaySummaryProps {
  appointments: AppointmentRow[];
}

export function TodaySummary({ appointments }: TodaySummaryProps) {
  const todayAppointments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return appointments.filter((apt) => {
      try {
        const aptDate = parseISO(apt.appointment_date);
        aptDate.setHours(0, 0, 0, 0);
        return aptDate.getTime() === today.getTime();
      } catch {
        return false;
      }
    });
  }, [appointments]);

  const statusCounts = useMemo(() => {
    const counts = {
      pending: 0,
      confirmed: 0,
      attended: 0,
      cancelled: 0,
    };

    for (const apt of todayAppointments) {
      if (apt.status in counts) {
        counts[apt.status as keyof typeof counts] += 1;
      }
    }

    return counts;
  }, [todayAppointments]);

  const total = todayAppointments.length;

  return (
    <div className='glass-card border-neon-cyan/40 p-4 md:p-6 rounded-3xl'>
      <div className='flex items-center justify-between mb-4'>
        <div>
          <p className='text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold'>
            Resumen de hoy
          </p>
          <h3 className='text-xl md:text-2xl font-black mt-1 text-neon-cyan'>
            {total} turno{total !== 1 ? 's' : ''}
          </h3>
          <p className='text-[10px] text-white/40 mt-1 uppercase'>
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <div className='w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-neon-cyan/20 flex items-center justify-center border border-neon-cyan/40'>
          <CalendarDays className='w-5 h-5 text-neon-cyan' />
        </div>
      </div>

      {total > 0 ? (
        <div className='space-y-2'>
          {statusCounts.pending > 0 && (
            <div className='flex items-center justify-between text-[11px]'>
              <span className='text-yellow-400'>Pendientes</span>
              <span className='font-bold text-white'>{statusCounts.pending}</span>
            </div>
          )}
          {statusCounts.confirmed > 0 && (
            <div className='flex items-center justify-between text-[11px]'>
              <span className='text-sky-400'>Confirmados</span>
              <span className='font-bold text-white'>{statusCounts.confirmed}</span>
            </div>
          )}
          {statusCounts.attended > 0 && (
            <div className='flex items-center justify-between text-[11px]'>
              <span className='text-emerald-400'>Atendidos</span>
              <span className='font-bold text-white'>{statusCounts.attended}</span>
            </div>
          )}
        </div>
      ) : (
        <p className='text-xs text-white/40'>Sin turnos programados para hoy.</p>
      )}
      <div className='flex items-center justify-between text-[11px] mt-2'>
        <span className='text-red-400'>Cancelados</span>
        <span className='font-bold text-white'>{statusCounts.cancelled}</span>
      </div>
    </div>
  );
}
