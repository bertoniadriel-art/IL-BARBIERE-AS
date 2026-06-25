'use client';

import { updateAppointmentStatus } from '@/features/admin/services/appointmentService';
import { supabase } from '@/shared/lib/supabase';
import type { AppointmentStatus } from '@/shared/types';
import {
  addDays,
  format,
  isToday,
  isTomorrow,
  isWithinInterval,
  parseISO,
  startOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useState } from 'react';

interface AppointmentRow {
  id: string;
  status: string;
  deposit_paid: boolean;
  final_price: number | null;
  client_name: string | null;
  appointment_date: string;
  appointment_time: string;
  services: { name: string } | null;
}

interface AgendaViewProps {
  barber: { id: string; name: string };
  refetchKey?: number;
}

function statusLabel(status: string) {
  if (status === 'pending') return { label: 'Pendiente', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' };
  if (status === 'confirmed') return { label: 'Confirmado', color: 'text-sky-400 bg-sky-400/10 border-sky-400/30' };
  if (status === 'attended') return { label: 'Atendido', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' };
  return { label: status, color: 'text-white/40 bg-white/5 border-white/10' };
}

function AppointmentRow({
  row,
  onStatusChange,
}: {
  row: AppointmentRow;
  onStatusChange: (id: string, next: AppointmentStatus) => void;
}) {
  const time = row.appointment_time?.slice(0, 5) ?? '';
  const { label, color } = statusLabel(row.status);

  return (
    <div className='flex items-center gap-4 py-3 px-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors'>
      <div className='w-14 text-right flex-shrink-0'>
        <span className='text-lg font-black text-neon-cyan tabular-nums'>{time}</span>
      </div>

      <div className='flex-1 min-w-0'>
        <p className='font-bold text-white text-sm truncate'>
          {row.client_name || 'Cliente sin nombre'}
        </p>
        <div className='flex items-center gap-2 mt-0.5 flex-wrap'>
          {row.deposit_paid ? (
            <span className='text-[10px] text-emerald-400 font-bold'>Seña ✓</span>
          ) : (
            <span className='text-[10px] text-red-400 font-bold'>Sin seña</span>
          )}
          {row.services?.name && (
            <span className='text-[10px] text-white/50 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md'>
              {row.services.name}
            </span>
          )}
          {row.final_price != null && (
            <span className='text-[10px] text-white/30'>
              · ${row.final_price.toLocaleString('es-AR')}
            </span>
          )}
        </div>
      </div>

      <div className='flex items-center gap-2 flex-shrink-0'>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
          {label}
        </span>
        {row.status === 'pending' && (
          <button
            type='button'
            onClick={() => onStatusChange(row.id, 'confirmed')}
            className='px-3 py-1 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 text-[10px] font-bold uppercase hover:bg-sky-500/30 transition-colors'
          >
            Confirmar
          </button>
        )}
        {row.status === 'confirmed' && (
          <button
            type='button'
            onClick={() => onStatusChange(row.id, 'attended')}
            className='px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold uppercase hover:bg-emerald-500/30 transition-colors'
          >
            Presente
          </button>
        )}
      </div>
    </div>
  );
}

function DayGroup({
  label,
  rows,
  onStatusChange,
}: {
  label: string;
  rows: AppointmentRow[];
  onStatusChange: (id: string, next: AppointmentStatus) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div className='mb-8'>
      <div className='flex items-center gap-3 mb-3'>
        <p className='text-[10px] font-black uppercase tracking-[0.2em] text-white/30'>{label}</p>
        <span className='text-[10px] font-bold text-white/20'>{rows.length}</span>
        <div className='flex-1 h-px bg-white/5' />
      </div>
      <div className='flex flex-col gap-2'>
        {rows.map((row) => (
          <AppointmentRow key={row.id} row={row} onStatusChange={onStatusChange} />
        ))}
      </div>
    </div>
  );
}

export function AgendaView({ barber, refetchKey }: AgendaViewProps) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AppointmentRow[]>([]);

  useEffect(() => {
    async function fetchAgenda() {
      try {
        setLoading(true);
        const today = format(new Date(), 'yyyy-MM-dd');
        const limit = format(addDays(new Date(), 14), 'yyyy-MM-dd');

        const { data } = await supabase
          .from('appointments')
          .select(
            'id, status, deposit_paid, final_price, client_name, appointment_date, appointment_time, services(name)'
          )
          .eq('barber_id', barber.id)
          .gte('appointment_date', today)
          .lte('appointment_date', limit)
          .not('status', 'eq', 'cancelled')
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true });

        setRows((data as AppointmentRow[]) ?? []);
      } finally {
        setLoading(false);
      }
    }
    fetchAgenda();
  }, [barber.id, refetchKey]);

  async function handleStatusChange(id: string, next: AppointmentStatus) {
    const prev = rows;
    setRows(rows.map((r) => (r.id === id ? { ...r, status: next } : r)));
    const { error } = await updateAppointmentStatus(id, next);
    if (error) setRows(prev);
  }

  const todayRows = rows.filter((r) => isToday(parseISO(r.appointment_date)));
  const tomorrowRows = rows.filter((r) => isTomorrow(parseISO(r.appointment_date)));
  const weekRows = rows.filter((r) => {
    const d = parseISO(r.appointment_date);
    return isWithinInterval(d, {
      start: startOfDay(addDays(new Date(), 2)),
      end: startOfDay(addDays(new Date(), 7)),
    });
  });

  const todayLabel = `Hoy · ${format(new Date(), "d 'de' MMMM", { locale: es })}`;
  const tomorrowLabel = `Mañana · ${format(addDays(new Date(), 1), "d 'de' MMMM", { locale: es })}`;

  return (
    <div>
      {/* Today summary strip */}
      <div className='grid grid-cols-3 gap-3 mb-8'>
        {[
          { label: 'Hoy', value: todayRows.length, sub: 'turnos' },
          {
            label: 'Pendientes',
            value: todayRows.filter((r) => r.status === 'pending').length,
            sub: 'sin confirmar',
          },
          {
            label: 'Atendidos',
            value: todayRows.filter((r) => r.status === 'attended').length,
            sub: 'esta jornada',
          },
        ].map((m) => (
          <div
            key={m.label}
            className='glass-card rounded-2xl p-4 border border-white/5 text-center'
          >
            <p className='text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-1'>
              {m.label}
            </p>
            <p className='text-3xl font-black text-white'>{m.value}</p>
            <p className='text-[10px] text-white/20 mt-0.5'>{m.sub}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className='py-16 text-center text-white/30 text-xs uppercase tracking-[0.3em]'>
          Cargando...
        </div>
      ) : rows.length === 0 ? (
        <div className='py-16 text-center text-white/20 text-sm'>Sin turnos próximos</div>
      ) : (
        <>
          <DayGroup label={todayLabel} rows={todayRows} onStatusChange={handleStatusChange} />
          <DayGroup label={tomorrowLabel} rows={tomorrowRows} onStatusChange={handleStatusChange} />
          {weekRows.length > 0 && (
            <DayGroup label='Esta semana' rows={weekRows} onStatusChange={handleStatusChange} />
          )}
        </>
      )}
    </div>
  );
}
