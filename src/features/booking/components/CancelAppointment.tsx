'use client';

import { getBarberConfig } from '@/shared/config/barbers';
import { supabase } from '@/shared/lib/supabase';
import { whatsAppUrl } from '@/shared/lib/whatsapp';
import { differenceInHours, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Scissors,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import QRCode from 'react-qr-code';

const CANCEL_CUTOFF_HOURS = 4;

interface Appointment {
  id: string;
  client_name: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
  qr_hash: string;
  deposit_paid: boolean;
  final_price: number | null;
  barbers: { name: string } | null;
  services: { name: string } | null;
}

export function CancelAppointment({
  appointment,
  hash,
}: {
  appointment: Appointment | null;
  hash: string;
}) {
  const [status, setStatus] = useState<'idle' | 'cancelled' | 'error'>('idle');
  const [depositPaid, setDepositPaid] = useState(appointment?.deposit_paid ?? false);
  const [hasCopied, setHasCopied] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const barberConfig = appointment?.barbers?.name
    ? getBarberConfig(appointment.barbers.name)
    : undefined;
  const paymentAlias = barberConfig?.paymentAlias ?? 'barberia.ilbarbiere';

  const handleCopyAlias = async () => {
    try {
      await navigator.clipboard.writeText(paymentAlias);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch (error) {
      console.error('Error copying alias to clipboard:', error);
    }
  };

  const handleMarkPaid = async () => {
    if (!supabase || !appointment) return;
    setMarkingPaid(true);
    const { error } = await supabase
      .from('appointments')
      .update({ deposit_paid: true })
      .eq('id', appointment.id);
    setMarkingPaid(false);
    if (!error) setDepositPaid(true);
  };

  const handleSendWhatsApp = () => {
    if (!appointment) return;
    const barberWaPhone = barberConfig?.whatsappPhone ?? '3402417023';
    const displayService = appointment.services?.name ?? 'Servicio';
    const formattedDateWa = format(
      parseISO(`${appointment.appointment_date}T${appointment.appointment_time}`),
      'dd-MM-yyyy'
    );
    const message = `*IL BARBIERE OS - NUEVA RESERVA*\n\n👤 *Cliente:* ${appointment.client_name}\n✂️ *Servicio:* ${displayService}\n📅 *Fecha:* ${formattedDateWa}\n⏰ *Hora:* ${appointment.appointment_time.slice(0, 5)} HS\n💈 *Barbero:* ${appointment.barbers?.name || 'Sin asignar'}\n🎟️ *Código:* ${appointment.qr_hash}\n\n_Confirmado vía IL BARBIERE OS_`;
    const url = whatsAppUrl(barberWaPhone, message);
    if (url) window.open(url, '_blank');
  };

  if (!appointment) {
    return (
      <div className='min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6'>
        <div className='text-center'>
          <XCircle className='w-12 h-12 text-red-400 mx-auto mb-4' />
          <p className='text-white font-bold text-lg'>Turno no encontrado</p>
          <p className='text-white/40 text-sm mt-2'>
            El código {hash} no corresponde a ningún turno.
          </p>
        </div>
      </div>
    );
  }

  if (appointment.status === 'cancelled') {
    return (
      <div className='min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6'>
        <div className='text-center'>
          <XCircle className='w-12 h-12 text-white/30 mx-auto mb-4' />
          <p className='text-white font-bold text-lg'>Este turno ya fue cancelado</p>
        </div>
      </div>
    );
  }

  if (appointment.status === 'attended') {
    return (
      <div className='min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6'>
        <div className='text-center'>
          <CheckCircle className='w-12 h-12 text-emerald-400 mx-auto mb-4' />
          <p className='text-white font-bold text-lg'>Este turno ya fue completado</p>
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

  async function handleCancel() {
    if (!supabase) return;
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointment!.id)
      .in('status', ['pending', 'confirmed']);

    if (error) {
      setStatus('error');
    } else {
      setStatus('cancelled');
    }
  }

  if (status === 'cancelled') {
    return (
      <div className='min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6'>
        <div className='text-center'>
          <CheckCircle className='w-12 h-12 text-neon-cyan mx-auto mb-4' />
          <p className='text-white font-bold text-lg'>Turno cancelado</p>
          <p className='text-white/40 text-sm mt-2'>
            Tu turno del {formattedDate} a las {formattedTime} hs fue cancelado.
          </p>
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

        {appointment.status === 'confirmed' && (
          <div className='flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 mb-6'>
            <CheckCircle className='w-5 h-5 text-emerald-400 flex-shrink-0' />
            <p className='text-emerald-400 text-xs font-black uppercase tracking-[0.15em]'>
              ¡Turno confirmado por el barbero!
            </p>
          </div>
        )}
        {appointment.status === 'pending' && (
          <div className='flex items-center gap-3 p-4 rounded-2xl bg-yellow-400/5 border border-yellow-400/20 mb-6'>
            <AlertCircle className='w-5 h-5 text-yellow-400 flex-shrink-0' />
            <p className='text-yellow-400 text-xs font-black uppercase tracking-[0.15em]'>
              Pendiente de confirmación del barbero
            </p>
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
            <div className='glass-card p-1 max-w-[220px] mx-auto mb-6 shadow-neon-glow border-2 border-neon-cyan overflow-hidden rounded-3xl'>
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

            <div className='bg-white/[0.03] border border-white/8 rounded-3xl p-6 mb-6 text-left'>
              <div className='flex items-center gap-3 mb-4'>
                <CreditCard className='w-5 h-5 text-neon-purple' />
                <h4 className='font-bold text-sm tracking-widest uppercase'>
                  {depositPaid ? 'Seña enviada' : 'Finalizar Compra'}
                </h4>
              </div>

              {depositPaid ? (
                <p className='text-green-400 text-xs font-bold uppercase tracking-[0.15em]'>
                  {appointment.status === 'confirmed'
                    ? 'Seña recibida ✓'
                    : 'Queda sujeto a validación del pago por parte del barbero.'}
                </p>
              ) : (
                <>
                  <p className='text-white/40 text-xs mb-4'>
                    Para asegurar tu turno, envía la seña usando el alias que corresponde a tu
                    barbero y luego confirma el pago.
                  </p>
                  <div className='grid gap-3 grid-cols-[2fr,1fr] items-center mb-4'>
                    <div className='p-3 bg-white/5 rounded-2xl border border-white/10'>
                      <p className='text-[10px] text-white/40 uppercase tracking-[0.2em]'>
                        Alias para transferir
                      </p>
                      <p className='text-lg font-black tracking-wide uppercase text-neon-purple'>
                        {paymentAlias}
                      </p>
                    </div>
                    <button
                      type='button'
                      onClick={handleCopyAlias}
                      className='h-full flex items-center justify-center rounded-2xl border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan font-bold text-[10px] uppercase tracking-[0.15em] hover:bg-neon-cyan hover:text-black transition-colors'
                    >
                      {hasCopied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <button
                    type='button'
                    disabled={markingPaid}
                    onClick={handleMarkPaid}
                    className='w-full py-4 rounded-2xl bg-neon-cyan text-black font-black uppercase tracking-[0.25em] text-xs hover:scale-[1.01] active:scale-[0.98] transition-transform shadow-neon-glow disabled:opacity-40'
                  >
                    {markingPaid ? 'Guardando...' : 'Ya realicé el pago'}
                  </button>
                </>
              )}
            </div>

            <button
              type='button'
              onClick={handleSendWhatsApp}
              className='mb-6 w-full py-4 rounded-2xl bg-green-500 text-white font-black uppercase tracking-[0.25em] text-xs hover:scale-[1.01] active:scale-[0.98] transition-transform shadow-lg'
            >
              Enviar por WhatsApp
            </button>
          </>
        )}

        {canCancel ? (
          <div className='space-y-3'>
            <p className='text-white/40 text-xs text-center'>
              Podés cancelar hasta {CANCEL_CUTOFF_HOURS} horas antes del turno.
            </p>
            <button
              type='button'
              onClick={handleCancel}
              className='w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-black uppercase tracking-widest text-sm hover:bg-red-500/20 transition-colors'
            >
              Cancelar turno
            </button>
            {status === 'error' && (
              <p className='text-red-400 text-xs text-center'>
                Error al cancelar. Intentá nuevamente.
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
