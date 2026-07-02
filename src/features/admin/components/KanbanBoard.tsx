'use client';

import {
  confirmAppointment,
  updateAppointmentStatus,
} from '@/features/admin/services/appointmentService';
import { useDashboardMetrics } from '@/shared/hooks/useDashboardMetrics';
import { supabase } from '@/shared/lib/supabase';
import type { AppointmentStatus } from '@/shared/types';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { AlertCircle, BadgeDollarSign, CalendarDays } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface AppointmentRow {
  id: string;
  status: string;
  deposit_paid: boolean;
  final_price: number | null;
  client_name: string | null;
  client_phone: string | null;
  appointment_date: string;
  appointment_time: string;
  qr_hash?: string | null;
}

interface KanbanBoardProps {
  barber: { id: string; name: string } | null;
}

const COLUMNS = [
  {
    key: 'pending',
    label: 'PENDIENTE',
    border: 'border-yellow-400/40',
    text: 'text-yellow-400',
    dot: 'bg-yellow-400',
  },
  {
    key: 'confirmed',
    label: 'CONFIRMADO',
    border: 'border-sky-400/40',
    text: 'text-sky-400',
    dot: 'bg-sky-400',
  },
  {
    key: 'attended',
    label: 'ATENDIDO',
    border: 'border-emerald-400/40',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
] as const;

function AppointmentCard({
  row,
  onStatusChange,
}: {
  row: AppointmentRow;
  onStatusChange: (id: string, next: AppointmentStatus) => void;
}) {
  const dateLabel = (() => {
    try {
      const [year, month, day] = row.appointment_date.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return format(d, 'dd MMM');
    } catch {
      return row.appointment_date;
    }
  })();

  const timeLabel = row.appointment_time?.slice(0, 5) ?? '';

  return (
    <div className='glass-card rounded-2xl p-4 border border-white/10 flex flex-col gap-3'>
      <div className='flex items-start justify-between gap-2'>
        <p className='font-bold text-white text-sm leading-tight'>
          {row.client_name || 'Cliente sin nombre'}
        </p>
        {row.deposit_paid ? (
          <span className='inline-flex items-center rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400 whitespace-nowrap'>
            Seña ✓
          </span>
        ) : (
          <span className='inline-flex items-center rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[10px] font-bold text-red-400 whitespace-nowrap'>
            Sin seña
          </span>
        )}
      </div>

      <p className='text-white/60 text-xs'>
        {dateLabel} · {timeLabel} hs
      </p>

      <div className='mt-auto'>
        {row.status === 'pending' && (
          <button
            type='button'
            onClick={() => onStatusChange(row.id, 'confirmed')}
            className='w-full px-3 py-1.5 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 text-[11px] font-bold uppercase tracking-wide hover:bg-sky-500/30 transition-colors'
          >
            Confirmar
          </button>
        )}
        {row.status === 'confirmed' && (
          <button
            type='button'
            onClick={() => onStatusChange(row.id, 'attended')}
            className='w-full px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold uppercase tracking-wide hover:bg-emerald-500/30 transition-colors'
          >
            Presente
          </button>
        )}
        {row.status === 'attended' && (
          <p className='text-center text-[11px] text-emerald-400/40 uppercase tracking-wide font-bold'>
            Finalizado
          </p>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ barber }: KanbanBoardProps) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AppointmentRow[]>([]);

  useEffect(() => {
    const barberId = barber?.id;
    if (!barberId) return;

    async function fetchAppointments() {
      try {
        setLoading(true);
        const today = new Date();
        const start = startOfMonth(today);
        const end = endOfMonth(addMonths(today, 1));

        const { data } = await supabase
          .from('appointments')
          .select(
            'id, status, deposit_paid, final_price, client_name, client_phone, appointment_date, appointment_time, qr_hash'
          )
          .eq('barber_id', barberId)
          .gte('appointment_date', format(start, 'yyyy-MM-dd'))
          .lte('appointment_date', format(end, 'yyyy-MM-dd'))
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true });

        setRows((data as AppointmentRow[]) ?? []);
      } finally {
        setLoading(false);
      }
    }

    fetchAppointments();
  }, [barber?.id]);

  const { monthlyCashFlow, currencyFormatter } = useDashboardMetrics(rows);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const todayStats = useMemo(() => {
    const todayRows = rows.filter((r) => r.appointment_date === todayStr);
    return {
      total: todayRows.length,
      pending: todayRows.filter((r) => r.status === 'pending').length,
      confirmed: todayRows.filter((r) => r.status === 'confirmed').length,
      attended: todayRows.filter((r) => r.status === 'attended').length,
    };
  }, [rows, todayStr]);

  const pendingDepositsCount = useMemo(
    () =>
      rows.filter((r) => (r.status === 'pending' || r.status === 'confirmed') && !r.deposit_paid)
        .length,
    [rows]
  );

  const columnRows = useMemo(
    () => ({
      pending: rows.filter((r) => r.status === 'pending'),
      confirmed: rows.filter((r) => r.status === 'confirmed'),
      attended: rows.filter((r) => r.status === 'attended'),
    }),
    [rows]
  );

  async function handleStatusChange(id: string, next: AppointmentStatus) {
    const prev = rows;
    setRows(rows.map((r) => (r.id === id ? { ...r, status: next } : r)));

    if (next === 'confirmed') {
      const { error, whatsappUrl } = await confirmAppointment(id);
      if (error) {
        setRows(prev);
        return;
      }
      if (whatsappUrl) window.open(whatsappUrl, '_blank');
      return;
    }

    const { error } = await updateAppointmentStatus(id, next);
    if (error) setRows(prev);
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Metric strip */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        {/* Cashflow */}
        <div className='glass-card border-neon-cyan/40 p-4 rounded-2xl flex items-center gap-4'>
          <div className='w-10 h-10 rounded-xl bg-neon-cyan/20 border border-neon-cyan/40 flex items-center justify-center flex-shrink-0'>
            <BadgeDollarSign className='w-5 h-5 text-neon-cyan' />
          </div>
          <div>
            <p className='text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold'>
              Flujo de caja
            </p>
            <p className='text-lg font-black text-neon-cyan mt-0.5'>
              {loading ? '—' : currencyFormatter.format(monthlyCashFlow)}
            </p>
          </div>
        </div>

        {/* HOY */}
        <div className='glass-card border-white/10 p-4 rounded-2xl flex items-center gap-4'>
          <div className='w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0'>
            <CalendarDays className='w-5 h-5 text-white/60' />
          </div>
          <div>
            <p className='text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold'>Hoy</p>
            <p className='text-lg font-black text-white mt-0.5'>
              {loading ? '—' : `${todayStats.total} turnos`}
            </p>
            {!loading && todayStats.total > 0 && (
              <p className='text-[10px] text-white/40 mt-0.5'>
                {todayStats.pending}p · {todayStats.confirmed}c · {todayStats.attended}a
              </p>
            )}
          </div>
        </div>

        {/* Señas pendientes */}
        <div className='glass-card border-red-500/40 p-4 rounded-2xl flex items-center gap-4'>
          <div className='w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0'>
            <AlertCircle className='w-5 h-5 text-red-400' />
          </div>
          <div>
            <p className='text-[10px] uppercase tracking-[0.3em] text-red-400 font-bold'>
              Señas pendientes
            </p>
            <p className='text-lg font-black text-white mt-0.5'>
              {loading ? '—' : pendingDepositsCount}
            </p>
          </div>
        </div>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className='py-16 text-center text-white/40 text-xs uppercase tracking-[0.3em]'>
          Cargando...
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 overflow-x-auto'>
          {COLUMNS.map((col) => {
            const cards = columnRows[col.key];
            return (
              <div
                key={col.key}
                className={`flex flex-col gap-3 bg-white/[0.02] rounded-2xl p-4 border ${col.border} min-w-[260px]`}
              >
                {/* Column header */}
                <div className='flex items-center justify-between mb-1'>
                  <div className='flex items-center gap-2'>
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${col.text}`}>
                      {col.label}
                    </p>
                  </div>
                  <span className='text-[11px] font-bold text-white/40'>{cards.length}</span>
                </div>

                {/* Cards */}
                {cards.length === 0 ? (
                  <p className='text-center text-white/20 text-xs py-6'>Sin turnos</p>
                ) : (
                  cards.map((row) => (
                    <AppointmentCard key={row.id} row={row} onStatusChange={handleStatusChange} />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
