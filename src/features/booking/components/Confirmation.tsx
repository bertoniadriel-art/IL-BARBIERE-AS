'use client';

import { useState } from 'react';
import { useBookingStore } from '../bookingStore';
import { getBarberConfig } from '@/shared/config/barbers';
import { validateBookingForm } from '@/shared/lib/validation';
import { CheckCircle, CreditCard, ArrowRight } from 'lucide-react';
import QRCode from 'react-qr-code';
import { supabase } from '@/shared/lib/supabase';
import { format } from 'date-fns';

export function Confirmation() {
  const {
    barberId,
    barberName,
    serviceId,
    serviceName,
    servicePrice,
    date,
    time,
    isFixedWeekly,
    clientName,
    clientPhone,
    reset,
    setStep,
    setFixedWeekly,
    setClient,
    setSlotConflictError,
  } = useBookingStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [slotError, setSlotError] = useState<string | null>(null);

  // Format date for display
  const formattedDate = date ? format(new Date(date + 'T12:00:00'), 'dd-MM-yyyy') : '';

  // Payment alias from barber config
  const barberConfig = barberName ? getBarberConfig(barberName) : undefined;
  const paymentAlias = barberConfig?.paymentAlias ?? 'barberia.ilbarbiere';

  // Compute final price: integer pesos rounded to nearest 100
  const computeFinalPrice = (): number | null => {
    if (servicePrice == null) return null;
    const base = isFixedWeekly ? servicePrice * 0.9 : servicePrice;
    return Math.round(base / 100) * 100;
  };

  const handleCopyAlias = async () => {
    try {
      await navigator.clipboard.writeText(paymentAlias);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch (error) {
      console.error('Error copying alias to clipboard:', error);
    }
  };

  const handleConfirm = async () => {
    // T6.1 — Zod validation before insert
    const errors = validateBookingForm({ name: clientName, phone: clientPhone });
    if (errors) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});
    setSlotError(null);
    setIsSubmitting(true);

    const qrHash = Math.random().toString(36).substring(2, 8).toUpperCase();
    const finalPrice = computeFinalPrice();

    if (supabase && barberId) {
      const { error } = await supabase.from('appointments').insert({
        barber_id: barberId,
        service_id: serviceId, // T3.3: real UUID from store (no hardcoded fallback)
        client_name: clientName,
        client_phone: clientPhone,
        appointment_date: date,
        appointment_time: time,
        qr_hash: qrHash,
        status: 'pending',
        is_fixed_weekly: isFixedWeekly,
        final_price: finalPrice,
        deposit_paid: false,
      });

      if (error) {
        // T2.3 — 23505 unique constraint violation: slot was just taken
        if (
          error.code === '23505' &&
          error.message.includes('appointments_unique_slot')
        ) {
          const conflictMsg =
            'Este turno acaba de ser tomado. Por favor elegí otro horario.';
          setSlotConflictError(conflictMsg);
          setSlotError(conflictMsg);
          setIsSubmitting(false);
          setStep(3);
          return;
        }
        console.error('Error saving appointment:', error);
        setIsSubmitting(false);
        return;
      }
    }

    setQrValue(qrHash);
    setIsConfirmed(true);
    setIsSubmitting(false);

    // WhatsApp dynamic link
    const barberWaPhone = barberConfig?.whatsappPhone ?? '3402417023';
    const displayService = serviceName ?? 'Servicio';
    const message =
      `*IL BARBIERE OS - NUEVA RESERVA*\n\n` +
      `👤 *Cliente:* ${clientName}\n` +
      `✂️ *Servicio:* ${displayService}\n` +
      `📅 *Fecha:* ${formattedDate}\n` +
      `⏰ *Hora:* ${time} HS\n` +
      `💈 *Barbero:* ${barberName || 'Sin asignar'}\n` +
      `🎟️ *Código:* ${qrHash}\n\n` +
      `_Confirmado vía IL BARBIERE OS_`;

    window.open(`https://wa.me/${barberWaPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (isConfirmed) {
    return (
      <div className='w-full max-w-xl mx-auto px-4 py-8 text-center animate-in zoom-in-95 duration-500'>
        <div className='flex flex-col items-center'>
          <div className='w-20 h-20 bg-neon-cyan/20 rounded-full flex items-center justify-center mb-6 shadow-neon-glow'>
            <CheckCircle className='w-10 h-10 text-neon-cyan' />
          </div>
          <h2 className='text-4xl font-extrabold tracking-tighter mb-2'>
            {paymentCompleted ? '¡TURNO REGISTRADO!' : '¡PENDIENTE DE SEÑA!'}
          </h2>
          <p className='text-white/60 mb-6 uppercase tracking-widest text-[10px] font-black'>
            {paymentCompleted
              ? 'Queda sujeto a validación del pago por parte del barbero'
              : 'Tu turno fue generado en estado PENDING. Debes abonar la seña para que pase a CONFIRMED.'}
          </p>

          <div className='w-full glass-card p-1 max-w-[260px] mx-auto mb-8 shadow-neon-glow border-2 border-neon-cyan overflow-hidden rounded-3xl'>
            <div className='bg-white p-6 rounded-2xl'>
              <QRCode
                value={qrValue}
                size={200}
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              />
            </div>
            <div className='py-4 text-white font-black text-2xl tracking-[0.3em] uppercase'>
              {qrValue}
            </div>
          </div>

          {/* Payment section */}
          <div className='w-full glass-card p-6 mb-8 border-white/5 text-left bg-white/[0.02] animate-in fade-in slide-in-from-bottom-2 duration-500'>
            <div className='flex items-center gap-3 mb-4'>
              <CreditCard className='w-5 h-5 text-neon-purple' />
              <h4 className='font-bold text-sm tracking-widest uppercase'>Finalizar Compra</h4>
            </div>
            <p className='text-white/40 text-xs mb-4'>
              Para asegurar tu turno, envía la seña usando el alias que corresponde a tu barbero y
              luego confirma el pago.
            </p>
            <div className='grid gap-4 md:grid-cols-[2fr,1fr] items-center'>
              <div className='p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-2'>
                <p className='text-[10px] text-white/40 uppercase tracking-[0.25em]'>
                  Alias para transferir
                </p>
                <p className='text-2xl md:text-3xl font-black tracking-wide uppercase text-neon-purple'>
                  {paymentAlias}
                </p>
                <p className='text-[10px] text-white/30 mt-1 uppercase'>
                  Barbero seleccionado:{' '}
                  <span className='font-bold'>{barberName || 'N/D'}</span>
                </p>
              </div>
              <button
                type='button'
                onClick={handleCopyAlias}
                className='w-full h-full flex items-center justify-center rounded-2xl border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan font-bold text-xs uppercase tracking-[0.2em] hover:bg-neon-cyan hover:text-black transition-colors shadow-neon-glow/30'
              >
                {hasCopied ? 'Alias copiado' : 'Copiar alias'}
              </button>
            </div>

            <button
              type='button'
              onClick={() => setPaymentCompleted(true)}
              className='mt-6 w-full py-4 rounded-2xl bg-neon-cyan text-black font-black uppercase tracking-[0.25em] text-xs hover:scale-[1.01] active:scale-[0.98] transition-transform shadow-neon-glow'
            >
              Ya realicé el pago
            </button>

            {paymentCompleted && (
              <div className='mt-4 p-3 rounded-xl border border-green-500/40 bg-green-500/10 text-left'>
                <p className='text-xs font-bold text-green-400 uppercase tracking-[0.2em]'>
                  ¡Turno registrado! Queda sujeto a la validación del pago por parte del barbero.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={reset}
            className='text-white/40 hover:text-neon-cyan font-bold uppercase tracking-widest text-xs transition-colors'
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  // Compute display price (with discount if applicable)
  const displayPrice = computeFinalPrice();

  return (
    <div className='w-full max-w-xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-right-4 duration-500'>
      <div className='flex justify-between items-center mb-10'>
        <button
          onClick={() => setStep(3)}
          className='text-white/40 hover:text-white transition-colors text-sm uppercase tracking-widest flex items-center gap-2'
        >
          ← Volver
        </button>
        <h2 className='text-3xl font-black tracking-tighter uppercase italic'>
          TU <span className='text-neon-cyan'>IDENTIDAD</span>
        </h2>
        <div className='w-16' />
      </div>

      {/* Slot conflict inline error (T2.3) */}
      {slotError && (
        <div className='mb-6 p-4 rounded-2xl border border-red-500/40 bg-red-500/10'>
          <p className='text-red-400 text-sm font-bold'>{slotError}</p>
        </div>
      )}

      {/* Payment alias shown before confirmation (T3.3) */}
      <div className='glass-card p-4 mb-6 border-neon-purple/20 bg-white/[0.02] flex items-center gap-3'>
        <CreditCard className='w-4 h-4 text-neon-purple flex-shrink-0' />
        <div>
          <p className='text-[10px] text-white/40 uppercase tracking-[0.2em]'>Alias de pago</p>
          <p className='text-lg font-black text-neon-purple uppercase'>{paymentAlias}</p>
        </div>
      </div>

      <div className='glass-card p-8 mb-8 border-neon-cyan/20 relative overflow-hidden'>
        <div className='absolute top-0 right-0 w-32 h-32 bg-neon-cyan/5 blur-3xl pointer-events-none' />
        <div className='space-y-6 relative z-10'>
          <div>
            <label className='block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 font-black italic'>
              Nombre Completo
            </label>
            <input
              type='text'
              value={clientName}
              onChange={(e) => setClient(e.target.value, clientPhone)}
              placeholder='Juan Pérez'
              className='w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-neon-cyan transition-all text-white font-bold'
            />
            {validationErrors.name && (
              <p className='text-red-400 text-xs mt-2'>{validationErrors.name}</p>
            )}
          </div>
          <div>
            <label className='block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 font-black italic'>
              WhatsApp (Sin 0 ni 15)
            </label>
            <input
              type='tel'
              value={clientPhone}
              onChange={(e) => setClient(clientName, e.target.value)}
              placeholder='3402500000'
              className='w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-neon-cyan transition-all text-white font-bold'
            />
            {validationErrors.phone && (
              <p className='text-red-400 text-xs mt-2'>{validationErrors.phone}</p>
            )}
          </div>
        </div>
      </div>

      <div className='glass-card p-6 mb-10 border-white/5 bg-white/[0.02]'>
        <h4 className='text-[10px] uppercase tracking-[0.3em] text-white/20 mb-6 font-black italic'>
          Detalles de Protocolo
        </h4>
        <div className='grid grid-cols-2 gap-8 px-2'>
          <div className='space-y-1'>
            <p className='text-[10px] text-white/30 uppercase tracking-widest'>Fecha</p>
            <p className='text-lg font-black italic'>{formattedDate}</p>
          </div>
          <div className='space-y-1 text-right'>
            <p className='text-[10px] text-white/30 uppercase tracking-widest'>Hora</p>
            <p className='text-lg font-black italic text-neon-cyan'>{time} HS</p>
          </div>
          <div className='space-y-1'>
            <p className='text-[10px] text-white/30 uppercase tracking-widest'>Servicio</p>
            <p className='text-sm font-black italic uppercase'>{serviceName ?? '—'}</p>
          </div>
          <div className='space-y-1 text-right'>
            <p className='text-[10px] text-white/30 uppercase tracking-widest'>Precio</p>
            <p className='text-sm font-black italic text-neon-cyan'>
              {displayPrice != null ? `$${displayPrice.toLocaleString('es-AR')}` : '—'}
            </p>
          </div>
          <div className='space-y-1'>
            <p className='text-[10px] text-white/30 uppercase tracking-widest'>Barbero</p>
            <p className='text-sm font-black italic uppercase'>{barberName || 'Sin asignar'}</p>
          </div>
          <div className='col-span-2 mt-4'>
            <label className='inline-flex items-center gap-3 cursor-pointer'>
              <input
                type='checkbox'
                checked={isFixedWeekly}
                onChange={(e) => setFixedWeekly(e.target.checked)}
                className='h-4 w-4 rounded border-white/30 bg-white/5 text-neon-cyan focus:ring-neon-cyan'
              />
              <span className='text-[11px] text-white/60 uppercase tracking-[0.2em] font-bold'>
                Marcar como turno fijo semanal (aplica 10% OFF automático)
              </span>
            </label>
          </div>
        </div>
      </div>

      <button
        disabled={isSubmitting}
        onClick={handleConfirm}
        className='group w-full py-6 bg-white text-black font-black text-xl rounded-[2rem] shadow-neon-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100 flex items-center justify-center gap-4 uppercase italic'
      >
        {isSubmitting ? (
          'ENVIANDO DATOS...'
        ) : (
          <>
            CONFIRMAR RESERVA{' '}
            <ArrowRight className='w-6 h-6 group-hover:translate-x-1 transition-transform' />
          </>
        )}
      </button>
      <p className='text-center mt-6 text-white/20 text-[10px] font-bold uppercase tracking-widest'>
        Al confirmar, serás redirigido a WhatsApp
      </p>
    </div>
  );
}
