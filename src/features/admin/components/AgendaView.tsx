'use client';

import {
  confirmAppointment,
  moveAppointment,
  updateAppointmentStatus,
} from '@/features/admin/services/appointmentService';
import {
  expandSlots,
  getBlockedSlotsForDay,
  getBookedSlots,
} from '@/features/booking/services/availabilityService';
import { getAvailableTimesForBarber } from '@/shared/config/barbers';
import type { IncomingAppointment } from '@/shared/hooks/useNewAppointmentNotifications';
import { supabase } from '@/shared/lib/supabase';
import { clientWhatsAppUrl } from '@/shared/lib/whatsapp';
import type { AppointmentStatus } from '@/shared/types';
import { addDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, ChevronDown, ChevronUp, Crown, Download, Lock, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { BlockTurnModal } from './BlockTurnModal';
import {
  AGENDA_DAYS_AHEAD,
  BASE_TIMES,
  buildAgendaDates,
} from '@/features/admin/services/agendaDays';

const TIME_SLOTS = BASE_TIMES;

interface AppointmentRow {
  id: string;
  status: string;
  deposit_paid: boolean;
  final_price: number | null;
  client_name: string | null;
  client_phone: string | null;
  appointment_date: string;
  appointment_time: string;
  qr_hash: string | null;
  barber_id: string;
  services: { name: string; duration_min: number } | null;
  is_fixed_weekly: boolean;
  frequency?: 'weekly' | 'biweekly';
}

interface AgendaViewProps {
  barber: { id: string; name: string };
  refetchKey?: number;
  recentNotifications?: IncomingAppointment[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusInfo(status: string) {
  if (status === 'pending')
    return { label: 'Pendiente', cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' };
  if (status === 'confirmed')
    return { label: 'Confirmado', cls: 'text-sky-400 bg-sky-400/10 border-sky-400/30' };
  if (status === 'attended')
    return { label: 'Atendido', cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' };
  if (status === 'debt')
    return { label: 'Fiado', cls: 'text-orange-400 bg-orange-400/10 border-orange-400/30' };
  if (status === 'blocked')
    return { label: 'Bloqueado', cls: 'text-red-400 bg-red-400/10 border-red-400/30' };
  return { label: status, cls: 'text-white/40 bg-white/5 border-white/10' };
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
            <span
              key={i}
              className='flex-shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-full border border-neon-cyan/20 bg-neon-cyan/5 text-white/70 whitespace-nowrap'
            >
              {n.client_name || 'Cliente'} · {n.appointment_time?.slice(0, 5)} hs
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Availability bar (collapsible) ────────────────────────────────────────────
function AvailabilityBar({
  barberName,
  rows,
  onDayClick,
}: {
  barberName: string;
  rows: AppointmentRow[];
  onDayClick: (dateStr: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const days = useMemo(() => {
    return Array.from({ length: AGENDA_DAYS_AHEAD }, (_, i) => {
      const date = addDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const total = getAvailableTimesForBarber(barberName, date, BASE_TIMES).length;
      const booked = rows.filter((r) => r.appointment_date === dateStr).length;
      const pct = total > 0 ? booked / total : 0;
      return { date, dateStr, total, booked, pct };
    });
  }, [barberName, rows]);

  function barColor(pct: number) {
    if (pct === 0) return 'bg-white/10';
    if (pct < 0.5) return 'bg-emerald-500';
    if (pct < 0.8) return 'bg-yellow-400';
    return 'bg-red-500';
  }

  function statusText(pct: number, total: number) {
    if (total === 0) return { text: 'Libre', cls: 'text-white/20' };
    if (pct === 0) return { text: 'Vacío', cls: 'text-white/30' };
    if (pct < 0.5) return { text: 'Disponible', cls: 'text-emerald-400' };
    if (pct < 0.8) return { text: 'Llenándose', cls: 'text-yellow-400' };
    if (pct < 1) return { text: 'Casi lleno', cls: 'text-orange-400' };
    return { text: 'Completo', cls: 'text-red-400' };
  }

  return (
    <div className='mb-6'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-white/15 transition-colors'
      >
        <div className='flex items-center gap-2'>
          <CalendarDays className='w-4 h-4 text-white/40' />
          <span className='text-xs font-bold text-white/50 uppercase tracking-widest'>
            Disponibilidad próximos 14 días
          </span>
        </div>
        {open ? (
          <ChevronUp className='w-4 h-4 text-white/30' />
        ) : (
          <ChevronDown className='w-4 h-4 text-white/30' />
        )}
      </button>

      {open && (
        <div className='mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300'>
          {days.map(({ date, dateStr, total, booked, pct }) => {
            if (total === 0) return null;
            const { text, cls } = statusText(pct, total);
            return (
              <button
                key={dateStr}
                type='button'
                onClick={() => onDayClick(dateStr)}
                className={`p-2.5 rounded-xl bg-white/[0.03] border text-left w-full transition-colors hover:border-white/20 active:scale-95 ${pct >= 0.8 ? 'border-red-500/20' : pct >= 0.5 ? 'border-yellow-400/15' : 'border-white/5'}`}
              >
                <div className='flex justify-between items-center mb-1.5'>
                  <div>
                    <p className='text-[9px] font-black uppercase tracking-wide text-white/40 leading-none'>
                      {format(date, 'EEE', { locale: es })}
                    </p>
                    <p className='text-sm font-black text-white leading-tight'>
                      {format(date, 'd MMM', { locale: es })}
                    </p>
                  </div>
                  <span className='text-[9px] font-bold text-white/40 tabular-nums'>
                    {booked}
                    <span className='text-white/20'>/{total}</span>
                  </span>
                </div>
                <div className='h-1 rounded-full bg-white/10 overflow-hidden mb-1'>
                  <div
                    className={`h-full rounded-full ${barColor(pct)}`}
                    style={{ width: `${Math.min(pct * 100, 100)}%` }}
                  />
                </div>
                <p className={`text-[9px] font-bold leading-none ${cls}`}>{text}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── AppointmentCard ───────────────────────────────────────────────────────────
function AppointmentCard({
  row,
  onStatusChange,
  onMoved,
  isVip = false,
}: {
  row: AppointmentRow;
  onStatusChange: (id: string, next: AppointmentStatus) => void;
  onMoved: () => void;
  isVip?: boolean;
}) {
  const time = row.appointment_time?.slice(0, 5) ?? '';
  const { label, cls } = statusInfo(row.status);
  const isBlocked = row.status === 'blocked';

  const [qrOpen, setQrOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
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
    // Let the barber notify the client that the turno moved (new date/time).
    const moveMsg = `*IL BARBIERE OS - TURNO REPROGRAMADO* 🔄\n\n👤 *Cliente:* ${row.client_name ?? ''}\n✂️ *Servicio:* ${row.services?.name ?? 'Servicio'}\n📅 *Nueva fecha:* ${format(parseISO(moveDate), 'dd-MM-yyyy')}\n⏰ *Nueva hora:* ${moveTime} HS\n\n_Te esperamos!_`;
    const moveUrl = clientWhatsAppUrl(row.client_phone, moveMsg);
    if (moveUrl) window.open(moveUrl, '_blank');
    onMoved();
  }

  async function handleCancel() {
    setIsCancelling(true);
    const { error } = await updateAppointmentStatus(row.id, 'cancelled');
    setIsCancelling(false);
    if (error) return;
    // Let the barber notify the client that the turno was cancelled.
    const cancelMsg = `*IL BARBIERE OS - TURNO CANCELADO* ❌\n\n👤 *Cliente:* ${row.client_name ?? ''}\n✂️ *Servicio:* ${row.services?.name ?? 'Servicio'}\n📅 *Fecha:* ${format(parseISO(row.appointment_date), 'dd-MM-yyyy')}\n⏰ *Hora:* ${time} HS\n\n_Escribinos para reprogramar tu turno._`;
    const cancelUrl = clientWhatsAppUrl(row.client_phone, cancelMsg);
    if (cancelUrl) window.open(cancelUrl, '_blank');
    onMoved();
  }

  function handleDownloadQR() {
    const svgEl = document.getElementById(`qr-svg-${row.id}`) as SVGSVGElement | null;
    if (!svgEl) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], {
      type: 'image/svg+xml',
    });
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
      <div className='py-3 px-4 rounded-2xl border transition-colors bg-white/[0.03] border-white/5 hover:border-white/10'>
        {/* Row 1: time + name + status */}
        <div className='flex items-center gap-3'>
          <span className='text-lg font-black text-neon-cyan tabular-nums flex-shrink-0 w-12 text-right'>
            {time}
          </span>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-1.5 min-w-0'>
              <p className='font-bold text-white text-sm truncate leading-tight'>
                {row.client_name || 'Cliente sin nombre'}
              </p>
              {isVip && <Crown className='w-3 h-3 text-yellow-400 flex-shrink-0' />}
            </div>
            <div className='flex items-center gap-1.5 mt-0.5 flex-wrap'>
              {row.deposit_paid ? (
                <span className='text-[10px] text-emerald-400 font-bold'>Seña ✓</span>
              ) : (
                <span className='text-[10px] text-red-400 font-bold'>Sin seña</span>
              )}
              {row.services?.name && (
                <span className='text-[10px] text-white/40 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded-md truncate max-w-[120px]'>
                  {row.services.name}
                </span>
              )}
              {row.final_price != null && (
                <span className='text-[10px] text-white/30 flex-shrink-0'>
                  ${row.final_price.toLocaleString('es-AR')}
                </span>
              )}
            </div>
          </div>
          <span
            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${cls}`}
          >
            {label}
          </span>
        </div>

        {/* Row 2: action buttons */}
        <div className='flex items-center gap-1.5 mt-2.5 pl-[60px] flex-wrap'>
          {row.is_fixed_weekly && !isBlocked && (
            <span className='text-[10px] text-purple-400 font-bold mr-auto'>
              🔄 {row.frequency === 'biweekly' ? 'Quincenal' : 'Semanal'}
            </span>
          )}
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
          {row.qr_hash && !isBlocked && (
            <button
              type='button'
              onClick={() => setQrOpen(true)}
              className='px-3 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold uppercase hover:bg-purple-500/25 transition-colors'
            >
              QR
            </button>
          )}
          {isActive && (
            <button
              type='button'
              onClick={handleCancel}
              disabled={isCancelling}
              className='px-3 py-1 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 text-[10px] font-bold uppercase hover:bg-orange-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
            >
              {isCancelling ? '...' : 'Cancelar'}
            </button>
          )}
          {!isBlocked && (
            <button
              type='button'
              onClick={() => onStatusChange(row.id, 'blocked')}
              className='px-3 py-1 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase hover:bg-red-500/20 transition-colors'
            >
              🔒 Bloquear
            </button>
          )}
          {isBlocked && (
            <button
              type='button'
              onClick={() => onStatusChange(row.id, 'pending')}
              className='px-3 py-1 rounded-xl bg-white/5 border border-white/20 text-white/50 text-[10px] font-bold uppercase hover:bg-white/10 transition-colors'
            >
              🔓 Desbloquear
            </button>
          )}
          {row.client_phone && !isBlocked && (
            <a
              href={`https://wa.me/549${row.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${row.client_name ?? ''}, te recordamos tu turno a las ${time} hs en Il Barbiere ✂️`)}`}
              target='_blank'
              rel='noreferrer'
              className='px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase hover:bg-emerald-500/20 transition-colors'
            >
              WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* QR Modal */}
      {qrOpen && row.qr_hash && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm'
          onClick={() => setQrOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setQrOpen(false);
          }}
        >
          <div
            className='bg-[#111114] border border-white/10 rounded-3xl p-6 flex flex-col items-center gap-4 shadow-2xl w-72'
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className='w-full flex justify-between items-center'>
              <p className='text-xs font-black uppercase tracking-widest text-white/40'>
                QR del turno
              </p>
              <button
                type='button'
                onClick={() => setQrOpen(false)}
                className='text-white/30 hover:text-white'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <p className='font-bold text-white'>{row.client_name}</p>
            <p className='text-white/40 text-xs'>
              {format(parseISO(row.appointment_date), 'd MMM', { locale: es })} · {time} hs
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
            <p className='text-[10px] uppercase tracking-widest text-neon-cyan font-black mb-1'>
              Mover turno
            </p>
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
                      disabled={
                        bookedSlots.includes(slot) &&
                        !(slot === time && moveDate === row.appointment_date)
                      }
                    >
                      {slot}
                      {bookedSlots.includes(slot) ? ' (ocupado)' : ''}
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

// ── DaySection ────────────────────────────────────────────────────────────────
function DaySection({
  dateStr,
  rows,
  barber,
  onStatusChange,
  onMoved,
  sectionRef,
  vipNames,
}: {
  dateStr: string;
  rows: AppointmentRow[];
  barber: { id: string; name: string };
  onStatusChange: (id: string, next: AppointmentStatus) => void;
  onMoved: () => void;
  sectionRef?: (el: HTMLDivElement | null) => void;
  vipNames: Set<string>;
}) {
  const [blockOpen, setBlockOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [blockTime, setBlockTime] = useState<string | undefined>(undefined);
  const date = parseISO(dateStr);

  useEffect(() => {
    getBlockedSlotsForDay(barber.id, dateStr).then(setBlockedSlots);
  }, [barber.id, dateStr]);

  const scheduledTimes = getAvailableTimesForBarber(barber.name, parseISO(dateStr), BASE_TIMES);
  // Expand each turno across every 30-min slot it occupies, so a 60-min service
  // (e.g. Corte + Barba) marks both halves as taken. A start-time-only set left
  // the second half-hour showing as free.
  const bookedSet = new Set<string>();
  for (const r of rows) {
    for (const slot of expandSlots(r.appointment_time, r.services?.duration_min ?? 30)) {
      bookedSet.add(slot);
    }
  }
  const blockedSet = new Set(blockedSlots);
  const availableSlots = scheduledTimes.filter((s) => !bookedSet.has(s) && !blockedSet.has(s));

  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const prefix = dateStr === today ? 'Hoy' : dateStr === tomorrow ? 'Mañana' : null;

  const dayLabel = format(date, "EEEE d 'de' MMMM", { locale: es });
  const headerLabel = prefix
    ? `${prefix} · ${format(date, "d 'de' MMMM", { locale: es })}`
    : dayLabel;

  return (
    <div className='mb-6' ref={sectionRef}>
      {/* Day header — clickable to collapse */}
      <button
        type='button'
        onClick={() => setCollapsed((v) => !v)}
        className='w-full flex items-center justify-between mb-2 gap-2 group'
      >
        <div className='flex items-center gap-2 min-w-0'>
          {collapsed ? (
            <ChevronDown className='w-3.5 h-3.5 text-white/20 flex-shrink-0' />
          ) : (
            <ChevronUp className='w-3.5 h-3.5 text-white/20 flex-shrink-0' />
          )}
          <p className='text-[10px] font-black uppercase tracking-[0.15em] text-white/30 capitalize truncate group-hover:text-white/50 transition-colors'>
            {headerLabel}
          </p>
          <span className='text-[10px] font-bold text-white/20 flex-shrink-0'>
            {availableSlots.length}
          </span>
        </div>
        <div
          className='flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-white/30 text-[10px] font-bold hover:border-white/20 hover:text-white/60 transition-colors flex-shrink-0'
          onClick={(e) => {
            e.stopPropagation();
            setBlockOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              setBlockOpen(true);
            }
          }}
        >
          <Lock className='w-3 h-3' />
          Bloquear
        </div>
      </button>

      {!collapsed && (
        <>
          {/* Available slots — clickable to quick-book */}
          {availableSlots.length > 0 && (
            <div className='flex gap-1.5 flex-wrap mb-3 px-1'>
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  type='button'
                  onClick={() => {
                    setBlockTime(slot);
                    setBlockOpen(true);
                  }}
                  className='text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors'
                >
                  {slot}
                </button>
              ))}
            </div>
          )}

          {/* Appointment cards */}
          <div className='flex flex-col gap-2'>
            {rows.map((row) => (
              <AppointmentCard
                key={row.id}
                row={row}
                onStatusChange={onStatusChange}
                onMoved={onMoved}
                isVip={vipNames.has(row.client_name ?? '')}
              />
            ))}
          </div>
        </>
      )}

      <BlockTurnModal
        barber={barber}
        initialDate={dateStr}
        initialTime={blockTime}
        isOpen={blockOpen}
        onClose={() => {
          setBlockOpen(false);
          setBlockTime(undefined);
        }}
        onSuccess={() => {
          setBlockOpen(false);
          setBlockTime(undefined);
          onMoved();
        }}
      />
    </div>
  );
}

// ── AgendaView ────────────────────────────────────────────────────────────────
export function AgendaView({ barber, refetchKey, recentNotifications = [] }: AgendaViewProps) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [vipNames, setVipNames] = useState<Set<string>>(new Set());
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function scrollToDay(dateStr: string) {
    const el = dayRefs.current[dateStr];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  useEffect(() => {
    supabase
      .from('vip_clients')
      .select('client_name')
      .eq('barber_id', barber.id)
      .eq('active', true)
      .not('slot_time', 'is', null)
      .then(({ data }: { data: { client_name: string }[] | null }) => {
        if (data) setVipNames(new Set(data.map((r) => r.client_name)));
      });
  }, [barber.id]);

  const fetchAgenda = useCallback(async () => {
    try {
      setLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const limit = format(addDays(new Date(), 14), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('appointments')
        .select(
          'id, status, deposit_paid, final_price, client_name, client_phone, appointment_date, appointment_time, qr_hash, barber_id, is_fixed_weekly, services(name, duration_min)'
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
  }, [barber.id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refetchKey is a prop used intentionally to force re-fetch
  useEffect(() => {
    fetchAgenda();
  }, [barber.id, refetchKey, fetchAgenda]);

  async function handleStatusChange(id: string, next: AppointmentStatus) {
    if (id.startsWith('mock-')) return;
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

  // Group by date, sorted ascending
  const byDate = useMemo(() => {
    const map: Record<string, AppointmentRow[]> = {};
    for (const r of rows) {
      if (!map[r.appointment_date]) map[r.appointment_date] = [];
      map[r.appointment_date].push(r);
    }
    return map;
  }, [rows]);

  // Derived from the barber's schedule, not just from the fetched turnos: a
  // working day with zero appointments must still render, otherwise its
  // free-slot chips never appear and it can never receive its first booking.
  const sortedDates = useMemo(
    () => buildAgendaDates(barber.name, Object.keys(byDate)),
    [barber.name, byDate]
  );
  const todayRows = byDate[format(new Date(), 'yyyy-MM-dd')] ?? [];

  // Every unconfirmed turno in the window, pinned at the top so the barber sees
  // exactly what needs confirming the moment the agenda loads — no scrolling
  // through 14 days. rows already come ordered by date then time.
  const pendingRows = useMemo(() => rows.filter((r) => r.status === 'pending'), [rows]);

  return (
    <div>
      <LiveTicker notifications={recentNotifications} />

      {/* Stats strip */}
      <div className='grid grid-cols-3 gap-3 mb-6'>
        {[
          { label: 'Hoy', value: todayRows.length, sub: 'turnos' },
          {
            // Count every unconfirmed appointment in the fetched window (next
            // 14 days), not just today's. A client can book a slot for a future
            // date, and the barber needs that to register at the top so a new
            // request never goes unnoticed.
            label: 'Pendientes',
            value: rows.filter((r) => r.status === 'pending').length,
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

      {/* Pinned "to confirm" inbox — first thing the barber sees on refresh */}
      {!loading && pendingRows.length > 0 && (
        <div className='mb-6 glass-card border border-yellow-400/30 rounded-2xl p-4'>
          <p className='text-[10px] uppercase tracking-[0.2em] text-yellow-400 font-black mb-3 flex items-center gap-2'>
            <span className='w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse inline-block' />
            Sin confirmar ({pendingRows.length})
          </p>
          <div className='space-y-2'>
            {pendingRows.map((r) => (
              <div
                key={r.id}
                className='flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2'
              >
                <button
                  type='button'
                  onClick={() => scrollToDay(r.appointment_date)}
                  className='flex flex-col items-start min-w-0 text-left'
                >
                  <span className='font-bold text-white text-sm truncate max-w-[45vw]'>
                    {r.client_name || 'Cliente sin nombre'}
                  </span>
                  <span className='text-white/40 text-[11px]'>
                    {format(parseISO(r.appointment_date), 'd MMM', { locale: es })} ·{' '}
                    {r.appointment_time?.slice(0, 5)} hs
                  </span>
                </button>
                <button
                  type='button'
                  onClick={() => handleStatusChange(r.id, 'confirmed')}
                  className='flex-shrink-0 px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-500/40 text-sky-400 text-[10px] font-black uppercase tracking-wide hover:bg-sky-500/25 transition-colors'
                >
                  Confirmar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Availability bar */}
      <AvailabilityBar barberName={barber.name} rows={rows} onDayClick={scrollToDay} />

      {/* Appointment list grouped by day */}
      {loading ? (
        <div className='py-16 text-center text-white/30 text-xs uppercase tracking-[0.3em]'>
          Cargando...
        </div>
      ) : sortedDates.length === 0 ? (
        <div className='py-16 text-center text-white/20 text-sm'>Sin turnos próximos</div>
      ) : (
        sortedDates.map((dateStr) => (
          <DaySection
            key={dateStr}
            dateStr={dateStr}
            rows={byDate[dateStr] ?? []}
            barber={barber}
            onStatusChange={handleStatusChange}
            onMoved={fetchAgenda}
            vipNames={vipNames}
            sectionRef={(el) => {
              dayRefs.current[dateStr] = el;
            }}
          />
        ))
      )}
    </div>
  );
}
