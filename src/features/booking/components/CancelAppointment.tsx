'use client';

import { supabase } from '@/shared/lib/supabase';
import { differenceInHours, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  Calendar,
  CalendarPlus,
  CheckCircle,
  Clock,
  Link2,
  QrCode,
  Scissors,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import QRCode from 'react-qr-code';

const CANCEL_CUTOFF_HOURS = 4;
const SHOP_LOCATION = 'San Martín 345, Arroyo Seco, Santa Fe';
const DEFAULT_DURATION_MIN = 30;

interface Appointment {
  id: string;
  client_name: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
  qr_hash: string;
  barbers: { name: string } | null;
  services: { name: string; duration_min?: number | null } | null;
}

/** Escapes a value for an iCalendar TEXT field (RFC 5545 §3.3.11). */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Formats a Date as a floating (timezone-less) iCalendar timestamp. */
function toIcsFloating(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}00`
  );
}

/**
 * Navigation shown on every terminal state so the client is never stranded
 * on a dead-end screen.
 */
function ExitLinks({ primaryLabel = 'Pedir otro turno' }: { primaryLabel?: string }) {
  return (
    <div className='mt-8 space-y-3'>
      <Link
        href='/reservar'
        className='block w-full py-4 rounded-2xl bg-neon-cyan text-black font-black uppercase tracking-[0.25em] text-xs text-center shadow-neon-glow hover:scale-[1.01] active:scale-[0.98] transition-transform'
      >
        {primaryLabel}
      </Link>
      <Link
        href='/'
        className='block w-full py-3 rounded-2xl border border-white/10 bg-white/5 text-white/50 font-bold uppercase tracking-widest text-[11px] text-center hover:bg-white/10 hover:text-white/70 transition-colors'
      >
        Volver al inicio
      </Link>
    </div>
  );
}

export function CancelAppointment({
  appointment,
  hash,
  isNew = false,
  loadFailed = false,
}: {
  appointment: Appointment | null;
  hash: string;
  isNew?: boolean;
  loadFailed?: boolean;
}) {
  const [status, setStatus] = useState<'idle' | 'cancelling' | 'cancelled' | 'error'>('idle');
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const [fallback, setFallback] = useState<{ msg: string; link?: string } | null>(null);

  const handleCopyLink = async () => {
    const url = window.location.href;
    // Undefined in non-secure contexts, rejects in WhatsApp/Instagram webviews.
    try {
      await navigator.clipboard.writeText(url);
      setFallback(null);
      setHasCopiedLink(true);
      setTimeout(() => setHasCopiedLink(false), 2000);
    } catch {
      setFallback({ msg: 'No pudimos copiarlo automáticamente. Copiá el link a mano:', link: url });
    }
  };

  if (loadFailed) {
    return (
      <div className='min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6'>
        <div className='w-full max-w-sm text-center'>
          <AlertCircle className='w-12 h-12 text-orange-400 mx-auto mb-4' />
          <p className='text-white font-bold text-lg'>No pudimos cargar tu turno</p>
          <p className='text-white/40 text-sm mt-2'>{`No pudimos leer el turno ${hash}. Tu turno sigue como estaba: volvé a abrir este mismo link en un momento.`}</p>
          <Link
            href='/'
            className='mt-8 block w-full py-3 rounded-2xl border border-white/10 bg-white/5 text-white/50 font-bold uppercase tracking-widest text-[11px] text-center hover:bg-white/10 hover:text-white/70 transition-colors'
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className='min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6'>
        <div className='w-full max-w-sm text-center'>
          <XCircle className='w-12 h-12 text-red-400 mx-auto mb-4' />
          <p className='text-white font-bold text-lg'>Turno no encontrado</p>
          <p className='text-white/40 text-sm mt-2'>
            El código {hash} no corresponde a ningún turno. Revisá el link o pedí un turno nuevo.
          </p>
          <ExitLinks primaryLabel='Pedir un turno' />
        </div>
      </div>
    );
  }

  if (appointment.status === 'cancelled') {
    return (
      <div className='min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6'>
        <div className='w-full max-w-sm text-center'>
          <XCircle className='w-12 h-12 text-white/30 mx-auto mb-4' />
          <p className='text-white font-bold text-lg'>Este turno ya fue cancelado</p>
          <p className='text-white/40 text-sm mt-2'>Si querés venir igual, pedí un turno nuevo.</p>
          <ExitLinks />
        </div>
      </div>
    );
  }

  if (appointment.status === 'attended') {
    return (
      <div className='min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6'>
        <div className='w-full max-w-sm text-center'>
          <CheckCircle className='w-12 h-12 text-emerald-400 mx-auto mb-4' />
          <p className='text-white font-bold text-lg'>Este turno ya fue completado</p>
          <p className='text-white/40 text-sm mt-2'>Gracias por venir. Te esperamos la próxima.</p>
          <ExitLinks />
        </div>
      </div>
    );
  }

  // Total: 'debt' (fiado), 'blocked' and any future status are not live turnos.
  if (appointment.status !== 'pending' && appointment.status !== 'confirmed') {
    const isDebt = appointment.status === 'debt';
    const title = isDebt ? 'Quedó un pago pendiente' : 'Este turno ya no está activo';
    const body = isDebt
      ? 'Ya fuiste atendido y el pago quedó anotado como fiado. Arreglalo con el barbero.'
      : 'No se puede usar ni cancelar desde acá. Si creés que es un error, hablá con el barbero.';
    return (
      <div className='min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6'>
        <div className='w-full max-w-sm text-center'>
          <AlertCircle className='w-12 h-12 text-orange-400 mx-auto mb-4' />
          <p className='text-white font-bold text-lg'>{title}</p>
          <p className='text-white/40 text-sm mt-2'>{body}</p>
          <ExitLinks />
        </div>
      </div>
    );
  }

  const appointmentDateTime = parseISO(
    `${appointment.appointment_date}T${appointment.appointment_time}`
  );
  const hoursUntil = differenceInHours(appointmentDateTime, new Date());
  const canCancel = hoursUntil >= CANCEL_CUTOFF_HOURS;

  const formattedDate = format(appointmentDateTime, "EEEE d 'de' MMMM", { locale: es });
  const formattedTime = appointment.appointment_time.slice(0, 5);

  // React does NOT route event-handler throws to an ErrorBoundary: surface it here.
  const handleAddToCalendar = () => {
    try {
      buildAndDownloadIcs();
      setFallback(null);
    } catch {
      setFallback({ msg: 'No pudimos generar el archivo del calendario. Anotá el turno a mano.' });
    }
  };

  const buildAndDownloadIcs = () => {
    const durationMin = appointment.services?.duration_min ?? DEFAULT_DURATION_MIN;
    const end = new Date(appointmentDateTime.getTime() + durationMin * 60_000);
    const serviceName = appointment.services?.name ?? 'Turno';
    const barberName = appointment.barbers?.name;

    const descriptionLines = [
      `Servicio: ${serviceName}`,
      barberName ? `Barbero: ${barberName}` : null,
      `Código: ${appointment.qr_hash}`,
      `Tu turno: ${window.location.origin}/mi-turno/${appointment.qr_hash}`,
    ].filter((line): line is string => line !== null);

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Il Barbiere//Mi Turno//ES',
      'BEGIN:VEVENT',
      `UID:${appointment.qr_hash}@ilbarbiere`,
      `DTSTAMP:${toIcsFloating(new Date())}`,
      `DTSTART:${toIcsFloating(appointmentDateTime)}`,
      `DTEND:${toIcsFloating(end)}`,
      `SUMMARY:${escapeIcsText(`Il Barbiere — ${serviceName}`)}`,
      `LOCATION:${escapeIcsText(SHOP_LOCATION)}`,
      `DESCRIPTION:${escapeIcsText(descriptionLines.join('\n'))}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `turno-${appointment.qr_hash}.ics`;
    anchor.click();
    // Cheap insurance: revoking synchronously can race the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  async function handleCancel() {
    if (!supabase) {
      setStatus('error');
      return;
    }
    setStatus('cancelling');
    // `.select()` returns the rows actually changed: without it a row outside the
    // status filter matches ZERO rows with NO error, and we would report success.
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointment!.id)
      .in('status', ['pending', 'confirmed'])
      .select();

    setStatus(error || !data || data.length === 0 ? 'error' : 'cancelled');
  }

  if (status === 'cancelled') {
    return (
      <div className='min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6'>
        <div className='w-full max-w-sm text-center'>
          <CheckCircle className='w-12 h-12 text-neon-cyan mx-auto mb-4' />
          <p className='text-white font-bold text-lg'>Turno cancelado</p>
          <p className='text-white/40 text-sm mt-2'>
            Tu turno del {formattedDate} a las {formattedTime} hs fue cancelado.
          </p>
          <ExitLinks />
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6'>
      <div className='w-full max-w-sm'>
        <div className='text-center mb-8'>
          <div className='relative w-16 h-16 mx-auto mb-4'>
            <span className='absolute inset-0 rounded-full border border-neon-cyan shadow-neon-glow animate-pulse' />
            <img
              src='/assets/logo/logo-official.jpg'
              alt='Il Barbiere'
              className='w-16 h-16 rounded-full object-cover'
            />
          </div>
          <h1 className='text-2xl font-black tracking-tighter text-white'>IL BARBIERE</h1>
          <p className='text-white/30 text-xs uppercase tracking-widest mt-1'>Mi turno</p>
        </div>

        {isNew && (
          <div className='flex items-start gap-3 p-4 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/40 mb-6 shadow-neon-glow'>
            <CheckCircle className='w-5 h-5 text-neon-cyan flex-shrink-0 mt-0.5' />
            <div>
              <p className='text-neon-cyan text-xs font-black uppercase tracking-[0.15em]'>
                Tu pedido de turno entró
              </p>
              <p className='text-white/60 text-xs mt-2 leading-relaxed'>
                Guardá este link: es donde vas a ver si el barbero confirma tu turno.
              </p>
            </div>
          </div>
        )}

        {appointment.status === 'confirmed' && (
          <div className='flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 mb-6'>
            <CheckCircle className='w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5' />
            <div>
              <p className='text-emerald-400 text-xs font-black uppercase tracking-[0.15em]'>
                Turno confirmado por el barbero
              </p>
              <p className='text-white/60 text-xs mt-2 leading-relaxed'>
                Te esperamos el {formattedDate} a las {formattedTime} hs. Mostrá el código de abajo
                cuando llegues.
              </p>
            </div>
          </div>
        )}

        {appointment.status === 'pending' && (
          <div className='flex items-start gap-3 p-4 rounded-2xl bg-yellow-400/5 border border-yellow-400/20 mb-6'>
            <AlertCircle className='w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5' />
            <div>
              <p className='text-yellow-400 text-xs font-black uppercase tracking-[0.15em]'>
                Pendiente de confirmación del barbero
              </p>
              <p className='text-white/60 text-xs mt-2 leading-relaxed'>
                Tu turno todavía no está confirmado: el barbero tiene que aprobarlo. No te vamos a
                enviar ningún mensaje. Para saber si ya lo confirmó, volvé a abrir este mismo link.
              </p>
            </div>
          </div>
        )}

        <div className='bg-white/[0.03] border border-white/8 rounded-3xl p-6 mb-6 space-y-4'>
          <div className='flex items-center gap-3'>
            <Calendar className='w-4 h-4 text-white/30 flex-shrink-0' />
            <div>
              <p className='text-[10px] text-white/30 uppercase tracking-widest'>Fecha</p>
              <p className='text-sm font-bold text-white capitalize'>{formattedDate}</p>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <Clock className='w-4 h-4 text-white/30 flex-shrink-0' />
            <div>
              <p className='text-[10px] text-white/30 uppercase tracking-widest'>Horario</p>
              <p className='text-lg font-black text-neon-cyan'>{formattedTime} hs</p>
            </div>
          </div>
          {appointment.barbers?.name && (
            <div className='flex items-center gap-3'>
              <Scissors className='w-4 h-4 text-white/30 flex-shrink-0' />
              <div>
                <p className='text-[10px] text-white/30 uppercase tracking-widest'>Barbero</p>
                <p className='text-sm font-bold text-white'>{appointment.barbers.name}</p>
              </div>
            </div>
          )}
          {appointment.services?.name && (
            <div className='pt-3 border-t border-white/5'>
              <p className='text-[10px] text-white/30 uppercase tracking-widest mb-1'>Servicio</p>
              <p className='text-sm font-bold text-white'>{appointment.services.name}</p>
            </div>
          )}
        </div>

        {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
          <>
            <div className='glass-card p-1 max-w-[220px] mx-auto mb-4 shadow-neon-glow border-2 border-neon-cyan overflow-hidden rounded-3xl'>
              <div className='bg-white p-5 rounded-2xl'>
                <QRCode
                  value={appointment.qr_hash}
                  size={160}
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                />
              </div>
              <div className='py-3 text-white font-black text-xl tracking-[0.3em] uppercase text-center'>
                {appointment.qr_hash}
              </div>
            </div>

            {/* Reglas reales aplicadas por ScannerModule: mismo día, +2 h de gracia. */}
            <div className='flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/8 mb-6'>
              <QrCode className='w-4 h-4 text-neon-cyan flex-shrink-0 mt-0.5' />
              <p className='text-white/50 text-xs leading-relaxed'>
                El barbero escanea este código cuando llegás a la barbería. Sólo sirve el día del
                turno y vence 2 horas después del horario reservado.
              </p>
            </div>

            <div className='bg-white/[0.03] border border-neon-purple/30 rounded-3xl p-6 mb-6'>
              <div className='flex items-center gap-3 mb-3'>
                <Link2 className='w-5 h-5 text-neon-purple flex-shrink-0' />
                <h4 className='font-bold text-sm tracking-widest uppercase text-white'>
                  Guardá este link
                </h4>
              </div>
              <p className='text-white/50 text-xs leading-relaxed mb-4'>
                Es la única forma de volver a este turno: acá vas a ver si el barbero lo confirmó, y
                desde acá lo podés cancelar.
              </p>
              <div className='space-y-3'>
                <button
                  type='button'
                  onClick={handleCopyLink}
                  className='w-full py-3.5 rounded-2xl border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan font-black uppercase tracking-[0.15em] text-[11px] hover:bg-neon-cyan hover:text-black transition-colors'
                >
                  {hasCopiedLink ? 'Link copiado' : 'Copiar link'}
                </button>
                <button
                  type='button'
                  onClick={handleAddToCalendar}
                  className='w-full py-3.5 rounded-2xl border border-white/15 bg-white/5 text-white/70 font-black uppercase tracking-[0.15em] text-[11px] flex items-center justify-center gap-2 hover:bg-white/10 hover:text-white transition-colors'
                >
                  <CalendarPlus className='w-4 h-4' />
                  Agregar al calendario
                </button>
                {fallback && (
                  <div className='p-3 rounded-2xl border border-white/10 bg-white/[0.03] text-[11px]'>
                    <p className='text-white/50 leading-relaxed'>{fallback.msg}</p>
                    <p className='mt-2 text-neon-cyan break-all select-all'>{fallback.link}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {canCancel ? (
          <div className='space-y-3'>
            {confirmingCancel ? (
              <div className='p-5 rounded-2xl bg-red-500/5 border border-red-500/30 space-y-4'>
                <p className='text-white text-sm font-bold text-center'>¿Cancelar este turno?</p>
                <p className='text-white/50 text-xs text-center leading-relaxed'>
                  El turno del {formattedDate} a las {formattedTime} hs se libera y no se puede
                  deshacer.
                </p>
                <div className='grid grid-cols-2 gap-3'>
                  <button
                    type='button'
                    onClick={() => setConfirmingCancel(false)}
                    className='py-3.5 rounded-2xl border border-white/15 bg-white/5 text-white/70 font-black uppercase tracking-[0.15em] text-[11px] hover:bg-white/10 hover:text-white transition-colors'
                  >
                    No, mantener
                  </button>
                  <button
                    type='button'
                    disabled={status === 'cancelling'}
                    onClick={handleCancel}
                    className='py-3.5 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 font-black uppercase tracking-[0.15em] text-[11px] hover:bg-red-500/30 disabled:opacity-40 disabled:hover:bg-red-500/20 transition-colors'
                  >
                    {status === 'cancelling' ? 'Cancelando…' : 'Sí, cancelar'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className='text-white/40 text-xs text-center'>
                  Podés cancelar hasta {CANCEL_CUTOFF_HOURS} horas antes del turno.
                </p>
                <button
                  type='button'
                  onClick={() => setConfirmingCancel(true)}
                  className='w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-black uppercase tracking-widest text-sm hover:bg-red-500/20 transition-colors'
                >
                  Cancelar turno
                </button>
              </>
            )}
            {status === 'error' && (
              <p className='text-red-400 text-xs text-center'>
                No pudimos cancelar el turno. Volvé a abrir este link o hablá con el barbero.
              </p>
            )}
          </div>
        ) : (
          <div className='flex items-start gap-3 p-4 rounded-2xl bg-yellow-400/5 border border-yellow-400/20'>
            <AlertCircle className='w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5' />
            <p className='text-yellow-400 text-xs font-bold'>
              Ya no es posible cancelar. Los turnos solo pueden cancelarse con al menos{' '}
              {CANCEL_CUTOFF_HOURS} horas de anticipación.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
