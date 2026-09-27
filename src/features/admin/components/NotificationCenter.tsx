'use client';

import { confirmAppointment } from '@/features/admin/services/appointmentService';
import {
  type BookingOrigin,
  type RecentBooking,
  bookingOrigin,
  getRecentBookings,
} from '@/features/admin/services/recentBookings';
import { openPendingWindow } from '@/shared/lib/whatsapp';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell, Crown, Hand, Smartphone, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const ORIGIN: Record<BookingOrigin, { title: string; Icon: typeof Bell; cls: string }> = {
  app: { title: 'Reservado desde la app', Icon: Smartphone, cls: 'text-neon-cyan' },
  manual: { title: 'Cargado a mano', Icon: Hand, cls: 'text-white/50' },
  vip: { title: 'Turno VIP', Icon: Crown, cls: 'text-yellow-400' },
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  attended: 'Atendido',
  cancelled: 'Cancelado',
};

interface NotificationCenterProps {
  barberId: string;
  // Bump to refetch, e.g. when a realtime INSERT arrives.
  refreshKey?: number;
  onConfirmed?: () => void;
}

export function NotificationCenter({ barberId, refreshKey, onConfirmed }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBookings(await getRecentBookings(barberId));
    setLoaded(true);
  }, [barberId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is a prop used intentionally to force re-fetch
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  function toggle() {
    if (!open) load();
    setOpen(!open);
  }

  async function handleConfirm(id: string) {
    // Open the tab before the await, while the click still counts as a user gesture.
    const whatsappTab = openPendingWindow();
    setConfirmingId(id);
    const { error, whatsappUrl } = await confirmAppointment(id);
    setConfirmingId(null);
    if (error) {
      whatsappTab.go(null);
      return;
    }
    whatsappTab.go(whatsappUrl);
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'confirmed' } : b)));
    onConfirmed?.();
  }

  return (
    <div className='relative'>
      <button
        type='button'
        onClick={toggle}
        aria-label={`Notificaciones: ${pendingCount} por confirmar`}
        className='relative w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-neon-cyan hover:border-neon-cyan/40 transition-colors'
      >
        <Bell className='w-5 h-5' />
        {pendingCount > 0 && (
          <span className='absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-neon-cyan text-black text-[10px] font-black flex items-center justify-center'>
            {pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className='absolute right-0 top-14 z-40 w-[min(22rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto bg-[#111114] border border-white/10 rounded-2xl shadow-2xl p-3'>
          <div className='flex items-center justify-between px-1 pb-2'>
            <p className='text-[10px] font-black uppercase tracking-[0.2em] text-white/50'>
              Últimas 24 horas
            </p>
            <button
              type='button'
              onClick={() => setOpen(false)}
              aria-label='Cerrar notificaciones'
              className='text-white/30 hover:text-white transition-colors'
            >
              <X className='w-4 h-4' />
            </button>
          </div>

          {loaded && bookings.length === 0 && (
            <p className='text-sm text-white/40 px-1 py-4 text-center'>
              Sin reservas en las últimas 24 horas
            </p>
          )}

          <ul className='space-y-2'>
            {bookings.map((b) => {
              const { title, Icon, cls } = ORIGIN[bookingOrigin(b.qr_hash)];
              const isPending = b.status === 'pending';
              return (
                <li
                  key={b.id}
                  className={`rounded-xl border p-3 ${isPending ? 'border-yellow-400/30 bg-yellow-400/5' : 'border-white/10 bg-white/[0.02]'}`}
                >
                  <div className='flex items-start gap-2'>
                    <span title={title} className={`mt-0.5 flex-shrink-0 ${cls}`}>
                      <Icon className='w-4 h-4' aria-hidden='true' />
                    </span>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-bold text-white truncate'>
                        {b.client_name || 'Cliente sin nombre'}
                      </p>
                      <p className='text-xs text-white/50'>
                        {format(parseISO(b.appointment_date), "EEE d 'de' MMM", { locale: es })} ·{' '}
                        {b.appointment_time.slice(0, 5)} hs · {b.services?.name ?? 'Servicio'}
                      </p>
                      <p className='text-[10px] text-white/30 mt-0.5'>
                        {STATUS_LABEL[b.status] ?? b.status} · hace{' '}
                        {formatDistanceToNowStrict(parseISO(b.created_at), { locale: es })}
                      </p>
                    </div>
                  </div>
                  {isPending && (
                    <button
                      type='button'
                      onClick={() => handleConfirm(b.id)}
                      disabled={confirmingId === b.id}
                      className='mt-2 w-full py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-bold uppercase tracking-wide hover:bg-emerald-500/25 transition-colors disabled:opacity-40'
                    >
                      {confirmingId === b.id ? '...' : 'Confirmar y avisar'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
