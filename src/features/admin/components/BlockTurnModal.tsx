'use client';

import { createAppointment } from '@/features/admin/services/appointmentService';
import { supabase } from '@/shared/lib/supabase';
import { addDays, addWeeks, format } from 'date-fns';
import { Lock, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BlockTurnModalProps {
  barber: { id: string; name: string };
  isOpen: boolean;
  initialDate?: string;
  initialTime?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ServiceOption {
  id: string;
  name: string;
  price: number;
  duration_min: number;
}

type Recurrence = 'none' | 'weekly' | 'biweekly';

function getNextRoundHour(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return `${String(now.getHours()).padStart(2, '0')}:00`;
}

export function BlockTurnModal({
  barber,
  isOpen,
  initialDate,
  initialTime,
  onClose,
  onSuccess,
}: BlockTurnModalProps) {
  const [date, setDate] = useState<string>(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState<string>(initialTime || getNextRoundHour);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [isVip, setIsVip] = useState(false);
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);

  useEffect(() => {
    if (!isOpen || !supabase) return;
    supabase
      .from('services')
      .select('id, name, price, duration_min')
      .order('price', { ascending: true })
      .then(({ data }: { data: ServiceOption[] | null }) => {
        if (data) {
          setServices(data);
          if (data.length > 0 && !serviceId) {
            setServiceId(data[0].id);
          }
        }
      });
  }, [isOpen, serviceId]);

  useEffect(() => {
    if (initialDate) setDate(initialDate);
    if (initialTime) setTime(initialTime);
  }, [initialDate, initialTime]);

  if (!isOpen) return null;

  function getSelectedService(): ServiceOption | undefined {
    return services.find((s) => s.id === serviceId);
  }

  function calculatePrice(): number | null {
    const svc = getSelectedService();
    if (!svc) return null;
    const base = svc.price;
    return isVip ? Math.round(base * 0.9) : base;
  }

  function getRecurrenceDates(): string[] {
    const dates: string[] = [date];
    if (recurrence === 'none') return dates;

    const startDate = new Date(date + 'T12:00:00');
    const weeksToAdd = recurrence === 'biweekly' ? 2 : 1;

    // Generate for next 3 months
    let current = startDate;
    for (let i = 0; i < 6; i++) {
      current = addWeeks(current, weeksToAdd);
      dates.push(format(current, 'yyyy-MM-dd'));
    }
    return dates;
  }

  async function handleSubmit() {
    if (!clientName.trim()) {
      setError('El nombre del cliente es requerido.');
      return;
    }
    if (!serviceId) {
      setError('Seleccioná un servicio.');
      return;
    }

    setLoading(true);
    setError(null);

    const dates = getRecurrenceDates();
    const finalPrice = calculatePrice();
    let successCount = 0;
    let lastError: string | null = null;

    for (const appointmentDate of dates) {
      const { error: submitError } = await createAppointment({
        barber_id: barber.id,
        service_id: serviceId,
        client_name: clientName.trim(),
        client_phone: clientPhone || '',
        appointment_date: appointmentDate,
        appointment_time: time,
        final_price: finalPrice,
        deposit_paid: true,
      });

      if (submitError) {
        lastError = submitError.message;
        // If it's a collision, skip this date and continue
        if (submitError.message.includes('23505') || submitError.message.includes('duplicate')) {
          continue;
        }
      } else {
        successCount++;
      }
    }

    setLoading(false);

    if (successCount === 0 && lastError) {
      setError(lastError);
      return;
    }

    setCreatedCount(successCount);
    setTimeout(() => {
      onSuccess();
      handleClose();
      onClose();
    }, 1500);
  }

  function handleClose() {
    if (loading) return;
    setClientName('');
    setClientPhone('');
    setTime(getNextRoundHour());
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setIsVip(false);
    setRecurrence('none');
    setError(null);
    setCreatedCount(0);
    setServiceId(services[0]?.id ?? '');
  }

  if (createdCount > 0) {
    return (
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm'>
        <div className='w-full max-w-sm mx-4 bg-[#111114] border border-neon-cyan/40 rounded-3xl p-6 text-center animate-in zoom-in-95 duration-300'>
          <div className='w-16 h-16 rounded-full bg-neon-cyan/20 flex items-center justify-center mx-auto mb-4'>
            <Lock className='w-8 h-8 text-neon-cyan' />
          </div>
          <p className='text-[10px] uppercase tracking-widest text-neon-cyan font-bold mb-1'>
            Turnos bloqueados
          </p>
          <h2 className='text-2xl font-black mb-2'>{createdCount} turno{createdCount > 1 ? 's' : ''}</h2>
          <p className='text-white/40 text-sm'>
            {clientName} · {recurrence !== 'none' ? `Recurrente ${recurrence === 'biweekly' ? 'quincenal' : 'semanal'}` : 'Turno único'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm'>
      <div className='w-full max-w-md mx-4 bg-[#111114] border border-neon-cyan/30 rounded-3xl p-6 relative animate-in zoom-in-95 duration-300 max-h-[92vh] overflow-y-auto'>
        <button
          type='button'
          onClick={() => { handleClose(); onClose(); }}
          className='absolute top-4 right-4 text-white/30 hover:text-white transition-colors'
        >
          <X className='w-5 h-5' />
        </button>

        <div className='mb-6'>
          <div className='flex items-center gap-2 mb-1'>
            <Lock className='w-4 h-4 text-neon-cyan' />
            <p className='text-[10px] uppercase tracking-widest text-neon-cyan font-bold'>
              Bloquear Turno
            </p>
          </div>
          <h2 className='text-xl font-black'>{barber.name}</h2>
        </div>

        <div className='space-y-4'>
          {/* Client name */}
          <div>
            <label className='block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-bold'>
              Nombre del cliente
            </label>
            <input
              type='text'
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder='Ej: Juan Pérez'
              className='w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neon-cyan'
            />
          </div>

          {/* Phone */}
          <div>
            <label className='block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-bold'>
              WhatsApp (opcional)
            </label>
            <input
              type='tel'
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder='Sin 0 ni 15'
              className='w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-neon-cyan'
            />
          </div>

          {/* Service selector */}
          <div>
            <label className='block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-bold'>
              Servicio
            </label>
            {services.length === 0 ? (
              <p className='text-white/30 text-xs py-3'>Cargando servicios...</p>
            ) : (
              <div className='grid grid-cols-2 gap-2'>
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    type='button'
                    onClick={() => setServiceId(svc.id)}
                    className={`py-3 px-3 rounded-xl text-left text-sm font-bold border transition-colors ${
                      serviceId === svc.id
                        ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                    }`}
                  >
                    <span className='block truncate'>{svc.name}</span>
                    <span className='text-[10px] font-normal opacity-60'>
                      ${svc.price.toLocaleString('es-AR')} · {svc.duration_min}min
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-bold'>
                Fecha
              </label>
              <input
                type='date'
                value={date}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setDate(e.target.value)}
                className='w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neon-cyan'
              />
            </div>
            <div>
              <label className='block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-bold'>
                Hora
              </label>
              <input
                type='time'
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className='w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-neon-cyan'
              />
            </div>
          </div>

          {/* VIP Toggle */}
          <div>
            <label className='block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-bold'>
              Cliente VIP
            </label>
            <button
              type='button'
              onClick={() => setIsVip(!isVip)}
              className={`w-full py-3 rounded-xl text-sm font-bold border transition-colors ${
                isVip
                  ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                  : 'border-white/10 bg-white/5 text-white/40'
              }`}
            >
              {isVip ? '⭐ VIP — 10% descuento' : 'Marcar como VIP (10% off)'}
            </button>
            {isVip && calculatePrice() !== null && (
              <p className='mt-1.5 text-[10px] text-yellow-400/70'>
                Precio con descuento: ${calculatePrice()?.toLocaleString('es-AR')}
              </p>
            )}
          </div>

          {/* Recurrence */}
          <div>
            <label className='block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-bold'>
              Recurrencia
            </label>
            <div className='grid grid-cols-3 gap-2'>
              {[
                { value: 'none' as Recurrence, label: 'Único' },
                { value: 'weekly' as Recurrence, label: 'Semanal' },
                { value: 'biweekly' as Recurrence, label: 'Quincenal' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type='button'
                  onClick={() => setRecurrence(opt.value)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                    recurrence === opt.value
                      ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan'
                      : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {recurrence !== 'none' && (
              <p className='mt-1.5 text-[10px] text-white/30'>
                Se crearán turnos por los próximos 3 meses
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className='mt-4 text-xs text-red-400 font-bold text-center'>{error}</p>
        )}

        <button
          type='button'
          disabled={loading || !clientName.trim() || !serviceId}
          onClick={handleSubmit}
          className='mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-neon-cyan to-[#bc00ff] text-black font-black uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity'
        >
          {loading ? 'Bloqueando...' : recurrence !== 'none' ? 'Bloquear turnos recurrentes' : 'Bloquear turno'}
        </button>

        <button
          type='button'
          disabled={loading}
          onClick={() => { handleClose(); onClose(); }}
          className='mt-3 w-full py-3 rounded-2xl text-white/40 text-sm font-bold hover:text-white/70 transition-colors disabled:opacity-50'
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
