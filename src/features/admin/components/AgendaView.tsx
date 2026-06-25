'use client';

import { moveAppointment, updateAppointmentStatus } from '@/features/admin/services/appointmentService';
import { getBookedSlots } from '@/features/booking/services/availabilityService';
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
import QRCode from 'react-qr-code';
import { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';

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
}

interface AgendaViewProps {
  barber: { id: string; name: string };
  refetchKey?: number;
}

const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

function statusLabel(status: string) {
  if (status === 'pending') return { label: 'Pendiente', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' };
  if (status === 'confirmed') return { label: 'Confirmado', color: 'text-sky-400 bg-sky-400/10 border-sky-400/30' };
  if (status === 'attended') return { label: 'Atendido', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' };
  if (status === 'debt') return { label: 'Fiado', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30' };
  return { label: status, color: 'text-white/40 bg-white/5 border-white/10' };
}

function AppointmentRow({
  row,
  onStatusChange,
  onMoved,
}: {
  row: AppointmentRow;
  onStatusChange: (id: string, next: AppointmentStatus) => void;
  onMoved: () => void;
}) {
  const time = row.appointment_time?.slice(0, 5) ?? '';
  const { label, color } = statusLabel(row.status);

  // QR modal
  const [qrOpen, setQrOpen] = useState(false);

  // Move modal
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveDate, setMoveDate] = useState(row.appointment_date);
  const [moveTime, setMoveTime] = useState(time);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const moveReqId = useRef(0);

  async function openMove() {
    setMoveDate(row.appointment_date);
    setMoveTime(time);
    setMoveError(null);
    setMoveOpen(true);
    const reqId = ++moveReqId.current;
    const slots = await getBookedSlots(row.barber_id, row.appointment_date);
    if (reqId === moveReqId.current) setBookedSlots(slots);
  }

  async function handleMoveDateChange(d: string) {
    setMoveDate(d);
    setMoveError(null);
    const reqId = ++moveReqId.current;
    const slots = await getBookedSlots(row.barber_id, d);
    if (reqId !== moveReqId.current) return;
    setBookedSlots(slots);
    if (slots.includes(moveTime)) {
      const free = TIME_SLOTS.find((s) => !slots.includes(s));
      if (free) setMoveTime(free);
    }
  }

  async function handleMoveConfirm() {
    if (moveDate === row.appointment_date && moveTime === time) {
      setMoveOpen(false);
      return;
    }
    if (bookedSlots.includes(moveTime)) {
      setMoveError('Ese horario ya está ocupado.');
      return;
    }
    setIsMoving(true);
    const { error } = await moveAppointment(row.id, row.barber_id, moveDate, moveTime);
    setIsMoving(false);
    if (error) {
      setMoveError(
        typeof error === 'object' && 'type' in error && error.type === 'slot_occupied'
          ? 'Ese horario ya está ocupado.'
          : 'Error al mover el turno.'
      );
      return;
    }
    setMoveOpen(false);
    onMoved();
  }

  function handleDownloadQR() {
    const svgEl = document.getElementById(`qr-svg-${row.id}`) as SVGSVGElement | null;
    if (!svgEl) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `turno-${row.qr_hash}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const isActive = row.status === 'pending' || row.status === 'confirmed';

  return (
    <>
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

        <div className='flex items-center gap-2 flex-shrink-0 flex-wrap justify-end'>
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
          {isActive && (
            <button
              type='button'
              onClick={openMove}
              className='px-3 py-1 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-[10px] font-bold uppercase hover:bg-neon-cyan/20 transition-colors'
            >
              Mover
            </button>
          )}
          {row.qr_hash && (
            <button
              type='button'
              onClick={() => setQrOpen(true)}
              className='px-3 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold uppercase hover:bg-purple-500/25 transition-colors'
            >
              QR
            </button>
          )}
        </div>
      </div>

      {/* QR Modal */}
      {qrOpen && row.qr_hash && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm'
          onClick={() => setQrOpen(false)}
        >
          <div
            className='bg-[#111114] border border-white/10 rounded-3xl p-6 flex flex-col items-center gap-4 shadow-2xl w-72'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='w-full flex justify-between items-center'>
              <p className='text-xs font-black uppercase tracking-widest text-white/40'>QR del turno</p>
              <button type='button' onClick={() => setQrOpen(false)} className='text-white/30 hover:text-white'>
                <X className='w-4 h-4' />
              </button>
            </div>
            <p className='font-bold text-white'>{row.client_name}</p>
            <p className='text-white/40 text-xs'>
              {format(parseISO(row.appointment_date), "d MMM", { locale: es })} · {time} hs
            </p>
            <div className='bg-white p-4 rounded-2xl'>
              <QRCode id={`qr-svg-${row.id}`} value={row.qr_hash} size={180} />
            </div>
            <p className='text-white/30 font-mono text-[10px] tracking-widest'>{row.qr_hash}</p>
            <button
              type='button'
              onClick={handleDownloadQR}
              className='w-full py-3 rounded-2xl bg-white/8 border border-white/15 text-white font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-white/12 transition-colors'
            >
              <Download className='w-3.5 h-3.5' /> Descargar SVG
            </button>
          </div>
        </div>
      )}

      {/* Move Modal */}
      {moveOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm'>
          <div className='w-full max-w-sm mx-4 bg-[#111114] border border-neon-cyan/30 rounded-3xl p-6 relative animate-in zoom-in-95 duration-300'>
            <button
              type='button'
              onClick={() => setMoveOpen(false)}
              className='absolute top-4 right-4 text-white/30 hover:text-white'
            >
              <X className='w-4 h-4' />
            </button>
            <p className='text-[10px] uppercase tracking-widest text-neon-cyan font-black mb-1'>Mover turno</p>
            <p className='text-lg font-black mb-5'>{row.client_name}</p>

            <div className='space-y-4'>
              <div>
                <label className='block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-bold'>
                  Nueva fecha
                </label>
                <input
                  type='date'
                  value={moveDate}
                  onChange={(e) => handleMoveDateChange(e.target.value)}
                  className='w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neon-cyan'
                />
              </div>
              <div>
                <label className='block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-bold'>
                  Nuevo horario
                </label>
                <select
                  value={moveTime}
                  onChange={(e) => setMoveTime(e.target.value)}
                  className='w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neon-cyan'
                >
                  {TIME_SLOTS.map((slot) => (
                    <option
                      key={slot}
                      value={slot}
                      disabled={bookedSlots.includes(slot) && slot !== time}
                    >
                      {slot}{bookedSlots.includes(slot) ? ' (ocupado)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {moveError && <p className='mt-3 text-xs text-red-400'>{moveError}</p>}

            <button
              type='button'
              disabled={isMoving}
              onClick={handleMoveConfirm}
              className='mt-5 w-full py-3 rounded-2xl bg-neon-cyan text-black font-black uppercase tracking-widest text-xs hover:opacity-90 disabled:opacity-40 transition-opacity'
            >
              {isMoving ? 'Moviendo...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function DayGroup({
  label,
  rows,
  onStatusChange,
  onMoved,
}: {
  label: string;
  rows: AppointmentRow[];
  onStatusChange: (id: string, next: AppointmentStatus) => void;
  onMoved: () => void;
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
          <AppointmentRow key={row.id} row={row} onStatusChange={onStatusChange} onMoved={onMoved} />
        ))}
      </div>
    </div>
  );
}

export function AgendaView({ barber, refetchKey }: AgendaViewProps) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AppointmentRow[]>([]);

  async function fetchAgenda() {
    try {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const limit = format(addDays(new Date(), 14), 'yyyy-MM-dd');

      const { data } = await supabase
        .from('appointments')
        .select(
          'id, status, deposit_paid, final_price, client_name, appointment_date, appointment_time, qr_hash, barber_id, services(name)'
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

  useEffect(() => { fetchAgenda(); }, [barber.id, refetchKey]);

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
      <div className='grid grid-cols-3 gap-3 mb-8'>
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

      {loading ? (
        <div className='py-16 text-center text-white/30 text-xs uppercase tracking-[0.3em]'>Cargando...</div>
      ) : rows.length === 0 ? (
        <div className='py-16 text-center text-white/20 text-sm'>Sin turnos próximos</div>
      ) : (
        <>
          <DayGroup label={todayLabel} rows={todayRows} onStatusChange={handleStatusChange} onMoved={fetchAgenda} />
          <DayGroup label={tomorrowLabel} rows={tomorrowRows} onStatusChange={handleStatusChange} onMoved={fetchAgenda} />
          {weekRows.length > 0 && (
            <DayGroup label='Esta semana' rows={weekRows} onStatusChange={handleStatusChange} onMoved={fetchAgenda} />
          )}
        </>
      )}
    </div>
  );
}
