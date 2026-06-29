'use client';

import { updateAppointmentStatus } from '@/features/admin/services/appointmentService';
import { getAvailableTimesForBarber } from '@/shared/config/barbers';
import { supabase } from '@/shared/lib/supabase';
import type { IncomingAppointment } from '@/shared/hooks/useNewAppointmentNotifications';
import type { AppointmentStatus } from '@/shared/types';
import { addDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, ChevronDown, ChevronUp, Crown, Download, Lock, X } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BlockTurnModal } from './BlockTurnModal';

// 30-min slots 08:00–20:00
const BASE_TIMES = Array.from({ length: 25 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

interface AppointmentRow {
  id: string;
  status: string;
  deposit_paid: boolean;
  final_price: number | null;
  client_name: string | null;
  appointment_date: string;
  appointment_time: string;
  qr_hash: string | null;
  barber_id: string;
  services: { name: string } | null;
  is_fixed_weekly: boolean;
  frequency?: 'weekly' | 'biweekly';
}

interface AgendaViewProps {
  barber: { id: string; name: string };
  refetchKey?: number;
  recentNotifications?: IncomingAppointment[];
}

// ── Mock data for UI demonstration ───────────────────────────────────────────
function getMockRows(barberId: string): AppointmentRow[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  const fri = new Date();
  while (fri.getDay() !== 5) fri.setDate(fri.getDate() + 1);
  const nextFri = format(fri, 'yyyy-MM-dd');
  const nextFri2 = format(addDays(fri, 14), 'yyyy-MM-dd');

  return [
    {
      id: 'mock-1', client_name: 'Joaquin Ferreyra', appointment_date: today,
      appointment_time: '10:00', status: 'pending', deposit_paid: false,
      final_price: 14000, qr_hash: 'MOCK-001', barber_id: barberId,
      services: { name: 'Corte Premium' }, is_fixed_weekly: false,
    },
    {
      id: 'mock-2', client_name: 'Fabri Kosic', appointment_date: today,
      appointment_time: '10:30', status: 'confirmed', deposit_paid: true,
      final_price: 12600, qr_hash: 'MOCK-002', barber_id: barberId,
      services: { name: 'Corte Premium' }, is_fixed_weekly: true, frequency: 'weekly',
    },
    {
      id: 'mock-3', client_name: 'Pedro Gimenez', appointment_date: today,
      appointment_time: '14:30', status: 'confirmed', deposit_paid: true,
      final_price: 14000, qr_hash: 'MOCK-003', barber_id: barberId,
      services: { name: 'Corte Premium' }, is_fixed_weekly: false,
    },
    {
      id: 'mock-4', client_name: 'Bruno Santamaria', appointment_date: nextFri,
      appointment_time: '16:30', status: 'confirmed', deposit_paid: true,
      final_price: 12600, qr_hash: 'MOCK-004', barber_id: barberId,
      services: { name: 'Corte Premium' }, is_fixed_weekly: true, frequency: 'weekly',
    },
    {
      id: 'mock-5', client_name: 'Tomas Santamaria', appointment_date: nextFri,
      appointment_time: '17:00', status: 'confirmed', deposit_paid: true,
      final_price: 12600, qr_hash: 'MOCK-005', barber_id: barberId,
      services: { name: 'Corte Premium' }, is_fixed_weekly: true, frequency: 'weekly',
    },
    {
      id: 'mock-6', client_name: 'Walter Chapista', appointment_date: nextFri,
      appointment_time: '14:00', status: 'pending', deposit_paid: true,
      final_price: 12600, qr_hash: 'MOCK-006', barber_id: barberId,
      services: { name: 'Corte Premium' }, is_fixed_weekly: true, frequency: 'biweekly',
    },
    {
      id: 'mock-7', client_name: 'Javi Orru', appointment_date: nextFri2,
      appointment_time: '09:00', status: 'confirmed', deposit_paid: true,
      final_price: 18000, qr_hash: 'MOCK-007', barber_id: barberId,
      services: { name: 'Corte + Barba' }, is_fixed_weekly: true, frequency: 'biweekly',
    },
  ];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusBadge(status: string) {
  if (status === 'pending')   return { label: 'Pendiente',  cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' };
  if (status === 'confirmed') return { label: 'Confirmado', cls: 'text-sky-400 bg-sky-400/10 border-sky-400/30' };
  if (status === 'attended')  return { label: 'Atendido',   cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' };
  if (status === 'debt')      return { label: 'Fiado',      cls: 'text-orange-400 bg-orange-400/10 border-orange-400/30' };
  return { label: status, cls: 'text-white/40 bg-white/5 border-white/10' };
}

function recurrenceLabel(row: AppointmentRow): string | null {
  if (!row.is_fixed_weekly) return null;
  if (row.frequency === 'biweekly') return 'Quincenal';
  return 'Semanal';
}

// ── Live ticker ───────────────────────────────────────────────────────────────
function LiveTicker({ notifications }: { notifications: IncomingAppointment[] }) {
  if (notifications.length === 0) return null;
  return (
    <div className='flex items-center gap-2 mb-6 overflow-hidden'>
      <span className='text-[9px] font-black uppercase tracking-[0.2em] text-neon-cyan flex-shrink-0 flex items-center gap-1'>
        <span className='w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse inline-block' />
        Live
      </span>
      <div className='flex-1 overflow-x-auto scrollbar-none'>
        <div className='flex gap-2 w-max animate-in slide-in-from-right duration-500'>
          {notifications.map((n, i) => (
            <span key={i} className='flex-shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-full border border-neon-cyan/20 bg-neon-cyan/5 text-white/70 whitespace-nowrap'>
              {n.client_name || 'Cliente'} · {n.appointment_time?.slice(0, 5)} hs
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── DayTurnRow ────────────────────────────────────────────────────────────────
function DayTurnRow({
  row,
  onStatusChange,
}: {
  row: AppointmentRow;
  onStatusChange: (id: string, next: AppointmentStatus) => void;
}) {
  const time = row.appointment_time?.slice(0, 5) ?? '';
  const { label, cls } = statusBadge(row.status);
  const recLabel = recurrenceLabel(row);
  const isVip = row.final_price != null && row.is_fixed_weekly;
  const [qrOpen, setQrOpen] = useState(false);

  function handleDownloadQR() {
    const svgEl = document.getElementById(`qr-svg-${row.id}`) as SVGSVGElement | null;
    if (!svgEl) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `turno-${row.qr_hash}.svg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className='flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors'>
        {/* Time */}
        <span className='text-sm font-black text-neon-cyan tabular-nums w-11 flex-shrink-0'>{time}</span>

        {/* Client + meta */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-1.5 flex-wrap'>
            <span className='text-sm font-bold text-white truncate'>{row.client_name || '—'}</span>
            {isVip && <Crown className='w-3 h-3 text-yellow-400 flex-shrink-0' />}
          </div>
          <div className='flex items-center gap-1.5 mt-0.5 flex-wrap'>
            {row.services?.name && (
              <span className='text-[10px] text-white/40 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded-md'>
                {row.services.name}
              </span>
            )}
            {row.final_price != null && (
              <span className='text-[10px] text-white/30'>${row.final_price.toLocaleString('es-AR')}</span>
            )}
            {recLabel && (
              <span className='text-[10px] text-purple-400 font-bold'>🔄 {recLabel}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className='flex items-center gap-1.5 flex-shrink-0'>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border hidden sm:inline ${cls}`}>{label}</span>
          {row.status === 'pending' && (
            <button type='button' onClick={() => onStatusChange(row.id, 'confirmed')}
              className='px-2.5 py-1 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-400 text-[10px] font-bold hover:bg-sky-500/30 transition-colors'>
              Confirmar
            </button>
          )}
          {row.status === 'confirmed' && (
            <button type='button' onClick={() => onStatusChange(row.id, 'attended')}
              className='px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/30 transition-colors'>
              Presente
            </button>
          )}
          {row.qr_hash && (
            <button type='button' onClick={() => setQrOpen(true)}
              className='px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold hover:bg-purple-500/20 transition-colors'>
              QR
            </button>
          )}
        </div>
      </div>

      {/* QR Modal */}
      {qrOpen && row.qr_hash && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm' onClick={() => setQrOpen(false)}>
          <div className='bg-[#111114] border border-white/10 rounded-3xl p-6 flex flex-col items-center gap-4 shadow-2xl w-72' onClick={(e) => e.stopPropagation()}>
            <div className='w-full flex justify-between items-center'>
              <p className='text-xs font-black uppercase tracking-widest text-white/40'>QR del turno</p>
              <button type='button' onClick={() => setQrOpen(false)} className='text-white/30 hover:text-white'><X className='w-4 h-4' /></button>
            </div>
            <p className='font-bold text-white'>{row.client_name}</p>
            <p className='text-white/40 text-xs'>
              {format(parseISO(row.appointment_date), "d MMM", { locale: es })} · {time} hs
            </p>
            <div className='bg-white p-4 rounded-2xl'>
              <QRCode id={`qr-svg-${row.id}`} value={row.qr_hash} size={180} />
            </div>
            <p className='text-white/30 font-mono text-[10px] tracking-widest'>{row.qr_hash}</p>
            <button type='button' onClick={handleDownloadQR}
              className='w-full py-3 rounded-2xl bg-white/8 border border-white/15 text-white font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-white/12 transition-colors'>
              <Download className='w-3.5 h-3.5' /> Descargar SVG
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── DayPanel ─────────────────────────────────────────────────────────────────
function DayPanel({
  date,
  rows,
  barber,
  onStatusChange,
  onBlockClick,
}: {
  date: string;
  rows: AppointmentRow[];
  barber: { id: string; name: string };
  onStatusChange: (id: string, next: AppointmentStatus) => void;
  onBlockClick: () => void;
}) {
  const parsed = parseISO(date);
  const dayLabel = format(parsed, "EEEE d 'de' MMMM", { locale: es });
  const sorted = [...rows].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  return (
    <div className='mt-3 rounded-2xl border border-neon-cyan/30 bg-neon-cyan/[0.03] animate-in fade-in slide-in-from-top-2 duration-300'>
      {/* Panel header */}
      <div className='flex items-center justify-between px-4 py-3 border-b border-white/5'>
        <div>
          <p className='text-xs font-black text-neon-cyan capitalize'>{dayLabel}</p>
          <p className='text-[10px] text-white/30'>{rows.length} turno{rows.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          type='button'
          onClick={onBlockClick}
          className='flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold uppercase hover:border-neon-cyan/40 hover:text-neon-cyan transition-colors'
        >
          <Lock className='w-3 h-3' />
          Bloquear
        </button>
      </div>

      {/* Turn list */}
      <div className='p-3 space-y-2'>
        {sorted.length === 0 ? (
          <p className='text-center text-white/20 text-xs py-4'>Sin turnos este día</p>
        ) : (
          sorted.map((row) => (
            <DayTurnRow key={row.id} row={row} onStatusChange={onStatusChange} />
          ))
        )}
      </div>
    </div>
  );
}

// ── DayGrid ───────────────────────────────────────────────────────────────────
function DayGrid({
  barberName,
  rows,
  barber,
  onStatusChange,
  onMoved,
}: {
  barberName: string;
  rows: AppointmentRow[];
  barber: { id: string; name: string };
  onStatusChange: (id: string, next: AppointmentStatus) => void;
  onMoved: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [blockDate, setBlockDate] = useState<string | null>(null);
  const [gridOpen, setGridOpen] = useState(true);

  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = addDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const total = getAvailableTimesForBarber(barberName, date, BASE_TIMES).length;
      const booked = rows.filter((r) => r.appointment_date === dateStr).length;
      const pct = total > 0 ? booked / total : 0;
      return { date, dateStr, total, booked, pct };
    });
  }, [barberName, rows]);

  function occupancyColor(pct: number) {
    if (pct === 0) return 'bg-white/10';
    if (pct < 0.5) return 'bg-emerald-500';
    if (pct < 0.8) return 'bg-yellow-400';
    return 'bg-red-500';
  }

  const selectedRows = selectedDate ? rows.filter((r) => r.appointment_date === selectedDate) : [];

  return (
    <div className='mb-8'>
      {/* Toggle header */}
      <button
        type='button'
        onClick={() => setGridOpen((v) => !v)}
        className='w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-white/15 transition-colors mb-2'
      >
        <div className='flex items-center gap-2'>
          <CalendarDays className='w-4 h-4 text-white/40' />
          <span className='text-xs font-bold text-white/50 uppercase tracking-widest'>
            Próximos 14 días
          </span>
        </div>
        {gridOpen
          ? <ChevronUp className='w-4 h-4 text-white/30' />
          : <ChevronDown className='w-4 h-4 text-white/30' />}
      </button>

      {gridOpen && (
        <div className='space-y-2 animate-in fade-in duration-300'>
          {/* Day cards grid */}
          <div className='grid grid-cols-4 sm:grid-cols-7 gap-2'>
            {days.map(({ date, dateStr, total, booked, pct }) => {
              if (total === 0) return null;
              const isSelected = selectedDate === dateStr;
              const hasAppts = booked > 0;
              const dayAbbr = format(date, 'EEE', { locale: es }).toUpperCase().slice(0, 3);
              const dayNum  = format(date, 'd');
              const month   = format(date, 'MMM', { locale: es });

              return (
                <button
                  key={dateStr}
                  type='button'
                  onClick={() => setSelectedDate((d) => d === dateStr ? null : dateStr)}
                  className={`relative p-2.5 rounded-2xl border flex flex-col items-center gap-1 transition-all
                    ${isSelected
                      ? 'border-neon-cyan/60 bg-neon-cyan/5 shadow-[0_0_12px_rgba(0,243,255,0.12)]'
                      : 'border-white/5 bg-white/[0.02] hover:border-white/15'}`}
                >
                  <span className='text-[9px] font-black uppercase tracking-wide text-white/40'>{dayAbbr}</span>
                  <span className={`text-base font-black leading-none ${isSelected ? 'text-neon-cyan' : 'text-white'}`}>
                    {dayNum}
                  </span>
                  <span className='text-[8px] text-white/30 uppercase'>{month}</span>

                  {/* Occupancy bar */}
                  <div className='w-full h-1 rounded-full bg-white/10 overflow-hidden mt-0.5'>
                    <div className={`h-full rounded-full ${occupancyColor(pct)}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
                  </div>

                  {/* Count + expand indicator */}
                  <div className='flex items-center gap-1'>
                    <span className='text-[9px] text-white/40'>
                      <span className='text-white/70 font-bold'>{booked}</span>/{total}
                    </span>
                    {hasAppts && (
                      isSelected
                        ? <ChevronUp className='w-2.5 h-2.5 text-neon-cyan' />
                        : <ChevronDown className='w-2.5 h-2.5 text-white/30' />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Day panel */}
          {selectedDate && (
            <DayPanel
              date={selectedDate}
              rows={selectedRows}
              barber={barber}
              onStatusChange={onStatusChange}
              onBlockClick={() => setBlockDate(selectedDate)}
            />
          )}
        </div>
      )}

      {/* Block Turn Modal */}
      {blockDate && (
        <BlockTurnModal
          barber={barber}
          initialDate={blockDate}
          isOpen={!!blockDate}
          onClose={() => setBlockDate(null)}
          onSuccess={() => { setBlockDate(null); onMoved(); }}
        />
      )}
    </div>
  );
}

// ── AgendaView ────────────────────────────────────────────────────────────────
export function AgendaView({ barber, refetchKey, recentNotifications = [] }: AgendaViewProps) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AppointmentRow[]>([]);

  const fetchAgenda = useCallback(async () => {
    try {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const limit = format(addDays(new Date(), 14), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('appointments')
        .select('id, status, deposit_paid, final_price, client_name, appointment_date, appointment_time, qr_hash, barber_id, is_fixed_weekly, services(name)')
        .eq('barber_id', barber.id)
        .gte('appointment_date', today)
        .lte('appointment_date', limit)
        .not('status', 'eq', 'cancelled')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      const realRows = (data as AppointmentRow[]) ?? [];
      const mockRows = getMockRows(barber.id);

      // Show mock rows only for dates where real data has no entries
      const realDates = new Set(realRows.map((r) => r.appointment_date));
      const filteredMock = mockRows.filter((m) => !realDates.has(m.appointment_date));

      setRows([...realRows, ...filteredMock]);
    } finally {
      setLoading(false);
    }
  }, [barber.id]);

  useEffect(() => { fetchAgenda(); }, [barber.id, refetchKey, fetchAgenda]);

  async function handleStatusChange(id: string, next: AppointmentStatus) {
    if (id.startsWith('mock-')) return; // mock rows are read-only
    const prev = rows;
    setRows(rows.map((r) => (r.id === id ? { ...r, status: next } : r)));
    const { error } = await updateAppointmentStatus(id, next);
    if (error) setRows(prev);
  }

  const todayRows = rows.filter((r) => r.appointment_date === format(new Date(), 'yyyy-MM-dd'));

  return (
    <div>
      <LiveTicker notifications={recentNotifications} />

      {/* Stats strip */}
      <div className='grid grid-cols-3 gap-3 mb-6'>
        {[
          { label: 'Hoy', value: todayRows.length, sub: 'turnos' },
          { label: 'Pendientes', value: todayRows.filter((r) => r.status === 'pending').length, sub: 'sin confirmar' },
          { label: 'Atendidos', value: todayRows.filter((r) => r.status === 'attended').length, sub: 'esta jornada' },
        ].map((m) => (
          <div key={m.label} className='glass-card rounded-2xl p-4 border border-white/5 text-center'>
            <p className='text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-1'>{m.label}</p>
            <p className='text-3xl font-black text-white'>{m.value}</p>
            <p className='text-[10px] text-white/20 mt-0.5'>{m.sub}</p>
          </div>
        ))}
      </div>

      {/* 14-day grid */}
      {loading ? (
        <div className='py-16 text-center text-white/30 text-xs uppercase tracking-[0.3em]'>Cargando...</div>
      ) : (
        <DayGrid
          barberName={barber.name}
          rows={rows}
          barber={barber}
          onStatusChange={handleStatusChange}
          onMoved={fetchAgenda}
        />
      )}
    </div>
  );
}
