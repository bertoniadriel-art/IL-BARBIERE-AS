'use client';

import { getBarberConfig } from '@/shared/config/barbers';
import { supabase } from '@/shared/lib/supabase';
import { validateBookingForm } from '@/shared/lib/validation';
import { format } from 'date-fns';
import { ArrowRight, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useBookingStore } from '../bookingStore';

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
    setStep,
    setFixedWeekly,
    setClient,
    setSlotConflictError,
  } = useBookingStore();

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [slotError, setSlotError] = useState<string | null>(null);

  // Format date for display
  const formattedDate = date ? format(new Date(`${date}T12:00:00`), 'dd-MM-yyyy') : '';

  // Payment alias from barber config (preview before confirming)
  const barberConfig = barberName ? getBarberConfig(barberName) : undefined;
  const paymentAlias = barberConfig?.paymentAlias ?? 'barberia.ilbarbiere';

  // Compute final price: integer pesos rounded to nearest 100
  const computeFinalPrice = (): number | null => {
    if (servicePrice == null) return null;
    const base = isFixedWeekly ? servicePrice * 0.9 : servicePrice;
    return Math.round(base / 100) * 100;
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

    const qrHash = crypto.randomUUID().slice(0, 8).toUpperCase();
    const finalPrice = computeFinalPrice();

    if (!supabase || !barberId) {
      console.error('Cannot save appointment: Supabase not configured or no barber selected');
      setValidationErrors({ submit: 'Error de conexión. Intentá nuevamente.' });
      setIsSubmitting(false);
      return;
    }

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
      if (error.code === '23505' && error.message.includes('appointments_unique_slot')) {
        const conflictMsg = 'Este turno acaba de ser tomado. Por favor elegí otro horario.';
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

    // Redirige a la página durable del turno (DB-backed) en vez de quedarse
    // en estado local: si WhatsApp mata/recarga la pestaña al volver, esta
    // URL sigue funcionando y evita que el cliente reintente reservar el
    // mismo horario (chocaría con su propio turno pending).
    router.push(`/mi-turno/${qrHash}`);
  };

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
      {validationErrors.submit && (
        <div className='mt-4 p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-center'>
          <p className='text-red-400 text-xs font-bold'>{validationErrors.submit}</p>
        </div>
      )}
      <p className='text-center mt-6 text-white/20 text-[10px] font-bold uppercase tracking-widest'>
        Después de confirmar, podés enviar los datos por WhatsApp
      </p>
    </div>
  );
}
