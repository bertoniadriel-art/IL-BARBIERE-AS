'use client';

import { addDays, format, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { useBookingStore } from '../bookingStore';
import { getBlockedSlotsForDay, getBookedSlots } from '../services/availabilityService';
import { filterAvailableSlots } from '../services/timeSelectorHelpers';

const BASE_TIMES = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
];

export function TimeSelector() {
  const setDateTime = useBookingStore((state) => state.setDateTime);
  const setStep = useBookingStore((state) => state.setStep);
  const barberId = useBookingStore((state) => state.barberId);
  const barberName = useBookingStore((state) => state.barberName);
  const serviceDuration = useBookingStore((state) => state.serviceDuration);
  const slotConflictError = useBookingStore((state) => state.slotConflictError);
  const setSlotConflictError = useBookingStore((state) => state.setSlotConflictError);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loadingBooked, setLoadingBooked] = useState(false);

  // Generate next 14 days
  const days = Array.from({ length: 14 }).map((_, i) => addDays(startOfToday(), i));

  // Clear slot conflict error when user selects a new date
  const handleDateSelect = (dateStr: string) => {
    if (slotConflictError) setSlotConflictError(null);
    setSelectedDate(dateStr);
  };

  // Fetch booked slots whenever barber or date changes
  useEffect(() => {
    if (!barberId || !selectedDate) {
      setBookedTimes([]);
      return;
    }
    setLoadingBooked(true);
    Promise.all([
      getBookedSlots(barberId, selectedDate),
      getBlockedSlotsForDay(barberId, selectedDate),
    ])
      .then(([booked, blocked]) => setBookedTimes([...booked, ...blocked]))
      .finally(() => setLoadingBooked(false));
  }, [barberId, selectedDate]);

  const getTimesForDate = (dateStr: string): string[] => {
    const date = new Date(`${dateStr}T12:00:00`);
    if (!barberName) return [];
    return filterAvailableSlots(barberName, date, BASE_TIMES, bookedTimes, serviceDuration ?? 30);
  };

  // For date availability preview (uses empty bookedTimes to show all schedule days)
  const dateHasSlots = (dateStr: string): boolean => {
    const date = new Date(`${dateStr}T12:00:00`);
    if (!barberName) return false;
    return filterAvailableSlots(barberName, date, BASE_TIMES, [], serviceDuration ?? 30).length > 0;
  };

  return (
    <div className='w-full max-w-4xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-right-4 duration-500'>
      <div className='flex justify-between items-center mb-12'>
        <button
          onClick={() => setStep(2)}
          className='text-white/40 hover:text-white transition-colors text-sm uppercase tracking-widest'
        >
          ← Volver
        </button>
        <h2 className='text-3xl font-bold tracking-tighter'>
          FECHA Y <span className='text-neon-cyan uppercase'>HORA</span>
        </h2>
        <div className='w-16' />
      </div>

      <div className='flex flex-col gap-10'>
        {/* Slot conflict error banner */}
        {slotConflictError && (
          <div className='p-4 rounded-2xl border border-red-500/40 bg-red-500/10 animate-in fade-in duration-300'>
            <p className='text-red-400 text-sm font-bold'>{slotConflictError}</p>
          </div>
        )}

        {/* Date Horizontal Scroll */}
        <div className='flex gap-4 overflow-x-auto pb-4 no-scrollbar'>
          {days.map((date) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const isSelected = selectedDate === dateStr;
            const isDisabledDay = !dateHasSlots(dateStr);
            return (
              <button
                key={dateStr}
                onClick={() => !isDisabledDay && handleDateSelect(dateStr)}
                disabled={isDisabledDay}
                className={`flex-shrink-0 w-24 p-4 rounded-xl border flex flex-col items-center transition-all
                  ${
                    isDisabledDay
                      ? 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed opacity-40'
                      : isSelected
                        ? 'bg-neon-cyan border-neon-cyan text-black shadow-neon-glow'
                        : 'bg-white/5 border-white/10 text-white/60 hover:border-neon-cyan/50 hover:text-white'
                  }`}
              >
                <span className='text-[10px] uppercase font-bold mb-1'>
                  {format(date, 'EEE', { locale: es })}
                </span>
                <span className='text-2xl font-black'>{format(date, 'dd')}</span>
                <span className='text-[10px] uppercase font-bold mt-1'>
                  {format(date, 'MMM', { locale: es })}
                </span>
              </button>
            );
          })}
        </div>

        {/* Time Grid */}
        {selectedDate && (
          <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 animate-in fade-in zoom-in-95 duration-300'>
            {loadingBooked ? (
              <div className='col-span-full text-center text-white/30 text-xs uppercase tracking-[0.2em]'>
                Verificando disponibilidad...
              </div>
            ) : getTimesForDate(selectedDate).length === 0 ? (
              <div className='col-span-full text-center text-white/30 text-xs uppercase tracking-[0.2em]'>
                No hay horarios disponibles para este día.
              </div>
            ) : (
              getTimesForDate(selectedDate).map((time) => (
                <button
                  key={time}
                  onClick={() => setDateTime(selectedDate, time)}
                  className='py-3 glass-card text-sm font-bold hover:neon-border hover:shadow-neon-glow transition-all'
                >
                  {time}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
