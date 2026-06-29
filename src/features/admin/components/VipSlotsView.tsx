'use client';

import type { BlockedSlot } from '@/shared/types';
import { Crown, Lock, Unlock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getVipBlockedSlots, toggleBlockedSlot } from '../services/vipService';

const DAY_NAMES: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

interface Props {
  barberId: string;
}

export function VipSlotsView({ barberId }: Props) {
  const [slots, setSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getVipBlockedSlots(barberId)
      .then(setSlots)
      .finally(() => setLoading(false));
  }, [barberId]);

  const handleToggle = async (slot: BlockedSlot) => {
    const next = !slot.enabled;
    setToggling(slot.id);

    // Optimistic update
    setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, enabled: next } : s)));

    const { error } = await toggleBlockedSlot(slot.id, next);

    if (error) {
      // Revert on failure
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, enabled: !next } : s)));
    }

    setToggling(null);
  };

  const byDay = slots.reduce<Record<number, BlockedSlot[]>>((acc, slot) => {
    const dow = slot.day_of_week;
    if (!acc[dow]) acc[dow] = [];
    acc[dow].push(slot);
    return acc;
  }, {});

  const sortedDays = Object.keys(byDay)
    .map(Number)
    .sort((a, b) => {
      // Mon–Fri–Sat–Sun order (Mon=1 first, Sun=0 last)
      const order = [1, 2, 3, 4, 5, 6, 0];
      return order.indexOf(a) - order.indexOf(b);
    });

  if (loading) {
    return (
      <div className='text-center text-white/30 text-xs uppercase tracking-widest py-20'>
        Cargando turnos VIP...
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className='text-center text-white/30 text-xs uppercase tracking-widest py-20'>
        No hay turnos VIP bloqueados.
      </div>
    );
  }

  return (
    <div className='space-y-8 animate-in fade-in duration-500'>
      <div className='flex items-center gap-3 mb-2'>
        <Crown className='w-5 h-5 text-yellow-400' />
        <p className='text-white/40 text-xs uppercase tracking-widest'>
          Habilitá un turno para que quede disponible ese día — volvé a bloquearlo cuando termine.
        </p>
      </div>

      {sortedDays.map((dow) => (
        <div key={dow}>
          <h3 className='text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold mb-3'>
            {DAY_NAMES[dow]}
          </h3>
          <div className='space-y-2'>
            {byDay[dow].map((slot) => (
              <div
                key={slot.id}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all
                  ${
                    slot.enabled
                      ? 'bg-white/5 border-white/10'
                      : 'bg-green-500/5 border-green-500/20'
                  }`}
              >
                <div className='flex items-center gap-4'>
                  <span className='text-sm font-black tabular-nums text-white'>
                    {slot.slot_time}
                  </span>
                  <span className='text-sm text-white/60'>{slot.label ?? '—'}</span>
                </div>

                <button
                  type='button'
                  onClick={() => handleToggle(slot)}
                  disabled={toggling === slot.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all
                    ${
                      slot.enabled
                        ? 'bg-white/5 border border-white/10 text-white/40 hover:border-green-500/50 hover:text-green-400'
                        : 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20'
                    }
                    disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {slot.enabled ? (
                    <>
                      <Lock className='w-3 h-3' />
                      Bloqueado
                    </>
                  ) : (
                    <>
                      <Unlock className='w-3 h-3' />
                      Habilitado
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
