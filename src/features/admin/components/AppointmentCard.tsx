'use client';

import { getBookedSlots } from '@/features/booking/services/availabilityService';
import { Clock, Phone, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { moveAppointment, updateAppointmentStatus } from '../services/appointmentService';

export interface Appointment {
  id?: string;
  status: string;
  client_name: string;
  client_phone: string;
  appointment_time: string;
  appointment_date: string;
  final_price?: number | null;
  barber_id?: string;
}

export interface AppointmentCardProps {
  app: Appointment;
  currencyFormatter: Intl.NumberFormat;
  onMutated?: () => void;
}

// Available time slots for the move modal (30-min increments 08:00–20:00)
const TIME_SLOTS = Array.from({ length: 25 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

export function AppointmentCard({ app, currencyFormatter, onMutated }: AppointmentCardProps) {
  const [localStatus, setLocalStatus] = useState(app.status);
  const [localDate, setLocalDate] = useState(app.appointment_date);
  const [localTime, setLocalTime] = useState(app.appointment_time?.slice(0, 5));
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Move modal state
  const moveSlotRequestId = useRef(0);

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveDate, setMoveDate] = useState(app.appointment_date);
  const [moveTime, setMoveTime] = useState(app.appointment_time?.slice(0, 5) ?? '10:00');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const isActive = localStatus === 'pending' || localStatus === 'confirmed';
  const isCancelled = localStatus === 'cancelled';

  async function handleCancel() {
    if (isCancelling) return;
    setIsCancelling(true);
    const prevStatus = localStatus;
    setLocalStatus('cancelled');
    setCancelError(null);

    try {
      const { error } = await updateAppointmentStatus(app.id ?? '', 'cancelled');
      if (error) {
        setLocalStatus(prevStatus);
        setCancelError('Error al cancelar. Intenta de nuevo.');
      } else {
        onMutated?.();
      }
    } finally {
      setIsCancelling(false);
    }
  }

  async function openMoveModal() {
    setMoveDate(localDate);
    setMoveTime(localTime ?? '10:00');
    setMoveError(null);
    setIsMoveModalOpen(true);

    if (app.barber_id) {
      const reqId = ++moveSlotRequestId.current;
      const slots = await getBookedSlots(app.barber_id, localDate);
      if (reqId !== moveSlotRequestId.current) return;
      setBookedSlots(slots);
    }
  }

  function closeMoveModal() {
    setIsMoveModalOpen(false);
    setMoveError(null);
  }

  async function handleMoveDateChange(newDate: string) {
    setMoveDate(newDate);
    setMoveError(null);
    if (app.barber_id) {
      const reqId = ++moveSlotRequestId.current;
      const slots = await getBookedSlots(app.barber_id, newDate);
      if (reqId !== moveSlotRequestId.current) return;
      setBookedSlots(slots);
      // Only reset time if the current selection is now occupied on the new date
      if (slots.includes(moveTime)) {
        const firstFree = TIME_SLOTS.find((s) => !slots.includes(s));
        if (firstFree) setMoveTime(firstFree);
      }
    }
  }

  async function handleMoveConfirm() {
    // Same-slot no-op
    if (moveDate === localDate && moveTime === localTime) {
      closeMoveModal();
      return;
    }

    // Client-side slot check
    if (bookedSlots.includes(moveTime)) {
      setMoveError('Ese horario ya está ocupado.');
      return;
    }

    setIsMoving(true);
    setMoveError(null);

    const { error } = await moveAppointment(app.id ?? '', app.barber_id ?? '', moveDate, moveTime);

    setIsMoving(false);

    if (error) {
      if (typeof error === 'object' && 'type' in error && error.type === 'slot_occupied') {
        setMoveError('Ese horario ya está ocupado.');
      } else {
        setMoveError('Error al mover el turno. Intenta de nuevo.');
      }
      return;
    }

    setLocalDate(moveDate);
    setLocalTime(moveTime);
    closeMoveModal();
    onMutated?.();
  }

  return (
    <>
      <div
        className={`p-4 rounded-xl border mb-3 transition-all ${
          localStatus === 'attended'
            ? 'bg-neon-cyan/5 border-neon-cyan/20 opacity-80'
            : localStatus === 'confirmed'
              ? 'bg-emerald-500/5 border-emerald-500/30'
              : isCancelled
                ? 'bg-red-500/5 border-red-500/20 opacity-60'
                : 'bg-white/5 border-white/10'
        }`}
      >
        <div className='flex justify-between items-start mb-2'>
          <div className='flex items-center gap-2'>
            <Clock className='w-4 h-4 text-neon-cyan' />
            <span className={`font-bold text-lg ${isCancelled ? 'line-through opacity-50' : ''}`}>
              {localTime?.slice(0, 5)}
            </span>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${
              localStatus === 'attended'
                ? 'bg-neon-cyan text-black'
                : localStatus === 'confirmed'
                  ? 'bg-emerald-500 text-black'
                  : isCancelled
                    ? 'bg-red-500/40 text-red-300'
                    : 'bg-white/10 text-white/40'
            }`}
          >
            {localStatus}
          </span>
        </div>
        <h4 className={`font-bold text-white mb-1 ${isCancelled ? 'line-through opacity-50' : ''}`}>
          {app.client_name}
        </h4>
        <div className='flex items-center gap-2 text-xs text-white/40'>
          <Phone className='w-3 h-3' /> {app.client_phone}
        </div>
        {app.final_price != null && (
          <p className='mt-2 text-xs text-neon-cyan font-bold'>
            {currencyFormatter.format(app.final_price)} estimados
          </p>
        )}
        {cancelError && <p className='mt-2 text-xs text-red-400'>{cancelError}</p>}
        {isActive && (
          <div className='mt-3 flex gap-2'>
            <button
              type='button'
              onClick={handleCancel}
              disabled={isCancelling}
              className='px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-bold uppercase hover:bg-red-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
            >
              Cancelar
            </button>
            <button
              type='button'
              onClick={openMoveModal}
              className='px-3 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-[10px] font-bold uppercase hover:bg-neon-cyan/20 transition-colors'
            >
              Mover
            </button>
          </div>
        )}
      </div>

      {/* Move Modal */}
      {isMoveModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm'>
          <div className='w-full max-w-sm mx-4 glass-card border-neon-cyan/40 p-6 relative animate-in zoom-in-95 duration-300'>
            <button
              type='button'
              onClick={closeMoveModal}
              className='absolute top-3 right-3 text-white/40 hover:text-white transition-colors'
            >
              <X className='w-4 h-4' />
            </button>
            <div className='mb-4'>
              <p className='text-[10px] uppercase tracking-[0.25em] text-neon-cyan font-bold mb-1'>
                Mover turno
              </p>
              <h3 className='text-lg font-black'>{app.client_name}</h3>
            </div>
            <div className='space-y-4'>
              <div>
                <label
                  htmlFor='move-date'
                  className='block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 font-bold'
                >
                  Nueva Fecha
                </label>
                <input
                  id='move-date'
                  type='date'
                  value={moveDate}
                  onChange={(e) => handleMoveDateChange(e.target.value)}
                  className='w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan'
                />
              </div>
              <div>
                <label
                  htmlFor='move-time'
                  className='block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2 font-bold'
                >
                  Nuevo Horario
                </label>
                <select
                  id='move-time'
                  value={moveTime}
                  onChange={(e) => setMoveTime(e.target.value)}
                  className='w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan'
                >
                  {TIME_SLOTS.map((slot) => (
                    <option
                      key={slot}
                      value={slot}
                      disabled={bookedSlots.includes(slot) && slot !== localTime}
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
              className='mt-5 w-full py-3 rounded-2xl bg-neon-cyan text-black font-black uppercase tracking-[0.25em] text-[11px] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all'
            >
              {isMoving ? 'Moviendo...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
