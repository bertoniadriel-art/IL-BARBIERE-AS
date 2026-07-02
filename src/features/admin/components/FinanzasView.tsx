'use client';

import { registerPayment } from '@/features/admin/services/appointmentService';
import { supabase } from '@/shared/lib/supabase';
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';

interface AppointmentRow {
  id: string;
  status: string;
  final_price: number | null;
  deposit_paid: boolean;
  client_name: string | null;
  appointment_date: string;
  appointment_time: string;
}

interface FinanzasViewProps {
  barber: { id: string };
}

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

function isPaid(row: AppointmentRow) {
  return row.status === 'attended';
}

function isSettled(row: AppointmentRow) {
  return row.status === 'attended' || row.status === 'debt';
}

export function FinanzasView({ barber }: FinanzasViewProps) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AppointmentRow[]>([]);

  useEffect(() => {
    async function fetchFinanzas() {
      try {
        setLoading(true);
        const today = new Date();
        // "Esta semana" can start before the month does (e.g. week starts
        // Mon 29/06 while the month is julio) — widen the fetch to the
        // union of month range and week range so it never silently drops
        // days from the previous/next month.
        const monthFrom = startOfMonth(today);
        const monthTo = endOfMonth(today);
        const weekFrom = startOfWeek(today, { weekStartsOn: 1 });
        const weekTo = endOfWeek(today, { weekStartsOn: 1 });
        const from = format(monthFrom < weekFrom ? monthFrom : weekFrom, 'yyyy-MM-dd');
        const to = format(monthTo > weekTo ? monthTo : weekTo, 'yyyy-MM-dd');

        const { data } = await supabase
          .from('appointments')
          .select(
            'id, status, final_price, deposit_paid, client_name, appointment_date, appointment_time'
          )
          .eq('barber_id', barber.id)
          .gte('appointment_date', from)
          .lte('appointment_date', to)
          .not('status', 'eq', 'cancelled');

        setRows((data as AppointmentRow[]) ?? []);
      } finally {
        setLoading(false);
      }
    }
    fetchFinanzas();
  }, [barber.id]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const metrics = useMemo(() => {
    const sum = (filter: (r: AppointmentRow) => boolean) =>
      rows.filter((r) => isPaid(r) && filter(r)).reduce((acc, r) => acc + (r.final_price ?? 0), 0);
    const count = (filter: (r: AppointmentRow) => boolean) =>
      rows.filter((r) => isPaid(r) && filter(r)).length;

    return {
      today: {
        total: sum((r) => r.appointment_date === todayStr),
        count: count((r) => r.appointment_date === todayStr),
      },
      week: {
        total: sum((r) => r.appointment_date >= weekStart && r.appointment_date <= weekEnd),
        count: count((r) => r.appointment_date >= weekStart && r.appointment_date <= weekEnd),
      },
      month: {
        total: sum((r) => r.appointment_date >= monthStart && r.appointment_date <= monthEnd),
        count: count((r) => r.appointment_date >= monthStart && r.appointment_date <= monthEnd),
      },
    };
  }, [rows, todayStr, weekStart, weekEnd, monthStart, monthEnd]);

  async function handlePayment(id: string, type: 'paid' | 'debt') {
    const prev = rows;
    setRows(
      rows.map((r) => (r.id === id ? { ...r, status: type === 'paid' ? 'attended' : 'debt' } : r))
    );
    const { error } = await registerPayment(id, type);
    if (error) setRows(prev);
  }

  const todayRows = useMemo(
    () =>
      rows
        .filter((r) => r.appointment_date === todayStr)
        .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)),
    [rows, todayStr]
  );

  const metricCards = [
    {
      label: 'Hoy',
      sub: format(new Date(), "d 'de' MMMM", { locale: es }),
      total: metrics.today.total,
      count: metrics.today.count,
      border: 'border-neon-cyan/30',
      text: 'text-neon-cyan',
    },
    {
      label: 'Esta semana',
      sub: `${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'd MMM', { locale: es })} – ${format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'd MMM', { locale: es })}`,
      total: metrics.week.total,
      count: metrics.week.count,
      border: 'border-neon-purple/30',
      text: 'text-neon-purple',
    },
    {
      label: 'Este mes',
      sub: format(new Date(), 'MMMM yyyy', { locale: es }),
      total: metrics.month.total,
      count: metrics.month.count,
      border: 'border-white/10',
      text: 'text-white',
    },
  ];

  return (
    <div>
      {/* Metric cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10'>
        {metricCards.map((m) => (
          <div key={m.label} className={`glass-card rounded-2xl p-5 border ${m.border}`}>
            <p className='text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-0.5'>
              {m.label}
            </p>
            <p className='text-[10px] text-white/20 mb-3'>{m.sub}</p>
            <p className={`text-2xl font-black ${m.text} mb-1`}>
              {loading ? '—' : ARS.format(m.total)}
            </p>
            <p className='text-[10px] text-white/30'>
              {loading
                ? ''
                : `${m.count} turno${m.count !== 1 ? 's' : ''} cobrado${m.count !== 1 ? 's' : ''}`}
            </p>
          </div>
        ))}
      </div>

      {/* Today's detail */}
      <div className='mb-2 flex items-center gap-3'>
        <p className='text-[10px] font-black uppercase tracking-[0.2em] text-white/30'>
          Cobros de hoy
        </p>
        <div className='flex-1 h-px bg-white/5' />
      </div>

      {loading ? (
        <div className='py-10 text-center text-white/30 text-xs uppercase tracking-[0.3em]'>
          Cargando...
        </div>
      ) : todayRows.length === 0 ? (
        <div className='py-10 text-center text-white/20 text-sm'>Sin turnos hoy</div>
      ) : (
        <div className='flex flex-col gap-2'>
          {todayRows.map((row) => (
            <div
              key={row.id}
              className='flex items-center gap-3 py-3 px-4 rounded-2xl bg-white/[0.03] border border-white/5'
            >
              <span className='text-neon-cyan font-black tabular-nums text-sm w-12 text-right flex-shrink-0'>
                {row.appointment_time?.slice(0, 5)}
              </span>
              <p className='flex-1 font-bold text-sm text-white truncate'>
                {row.client_name || '—'}
              </p>
              {row.final_price != null && (
                <span
                  className={`text-sm font-black flex-shrink-0 ${isPaid(row) ? 'text-emerald-400' : 'text-white/40'}`}
                >
                  {ARS.format(row.final_price)}
                </span>
              )}

              {/* Status / action */}
              {row.status === 'attended' && (
                <span className='text-[10px] font-bold px-2.5 py-1 rounded-full border text-emerald-400 bg-emerald-400/10 border-emerald-400/30 flex-shrink-0'>
                  Cobrado ✓
                </span>
              )}
              {row.status === 'debt' && (
                <span className='text-[10px] font-bold px-2.5 py-1 rounded-full border text-orange-400 bg-orange-400/10 border-orange-400/30 flex-shrink-0'>
                  Fiado ⚠
                </span>
              )}
              {!isSettled(row) && (
                <div className='flex gap-2 flex-shrink-0'>
                  <button
                    type='button'
                    onClick={() => handlePayment(row.id, 'paid')}
                    className='text-[10px] font-bold px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors'
                  >
                    Cobrar
                  </button>
                  <button
                    type='button'
                    onClick={() => handlePayment(row.id, 'debt')}
                    className='text-[10px] font-bold px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/25 text-orange-400 hover:bg-orange-500/20 transition-colors'
                  >
                    Fiar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
