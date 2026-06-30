'use client';

import { createAppointment } from '@/features/admin/services/appointmentService';
import { supabase } from '@/shared/lib/supabase';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Crown, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const MODAL_TIMES: string[] = (() => {
  const slots: string[] = [];
  for (let h = 8; h <= 20; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 20) slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
})();

type Recurrence = 'once' | 'weekly' | 'biweekly';

interface ServiceOption {
  id: string;
  name: string;
  price: number;
  duration_min: number;
}

interface Props {
  barber: { id: string; name: string };
  initialDate?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

function getDatesForRecurrence(start: string, type: Recurrence): string[] {
  if (type === 'once') return [start];
  const step = type === 'weekly' ? 7 : 14;
  const dates: string[] = [];
  let current = new Date(`${start}T12:00:00`);
  const end = new Date(current);
  end.setMonth(end.getMonth() + 3);
  while (current <= end) {
    dates.push(format(current, 'yyyy-MM-dd'));
    current = addDays(current, step);
  }
  return dates;
}

export function BlockTurnModal({ barber, initialDate, isOpen, onClose, onSuccess }: Props) {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(initialDate ?? todayStr());
  const [time, setTime] = useState('10:00');
  const [isVip, setIsVip] = useState(false);
  const [recurrence, setRecurrence] = useState<Recurrence>('once');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null);

  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    if (!isOpen || !supabase) return;
    supabase
      .from('services')
      .select('id, name, price, duration_min')
      .order('price', { ascending: true })
      .then(({ data }: { data: ServiceOption[] | null }) => {
        if (data) {
          setServices(data);
          if (!serviceId && data.length > 0) setServiceId(data[0].id);
        }
      });
  }, [isOpen, serviceId]);

  if (!isOpen) return null;

  const selectedService = services.find((s) => s.id === serviceId);
  const basePrice = selectedService?.price ?? 0;
  const finalPrice = isVip ? Math.round(basePrice * 0.9) : basePrice;

  const recurrenceDates = getDatesForRecurrence(date, recurrence);
  const isRecurring = recurrence !== 'once';

  const handleClose = () => {
    if (loading) return;
    setClientName('');
    setClientPhone('');
    setServiceId(services[0]?.id ?? '');
    setDate(initialDate ?? todayStr());
    setTime('10:00');
    setIsVip(false);
    setRecurrence('once');
    setError(null);
    setResult(null);
    onClose();
  };

  const handleSubmit = async () => {
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

    const dates = recurrenceDates;
    let ok = 0;
    let failed = 0;

    for (const d of dates) {
      const { error: err } = await createAppointment({
        barber_id: barber.id,
        service_id: serviceId,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        appointment_date: d,
        appointment_time: time,
        final_price: finalPrice,
        deposit_paid: false,
      });
      if (err) failed++;
      else ok++;
    }

    setLoading(false);

    if (ok === 0) {
      setError('No se pudo crear ningún turno. Es posible que los horarios ya estén ocupados.');
      return;
    }

    setResult({ ok, failed });
  };

  if (result) {
    return (
      <div className='fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4'>
        <div className='w-full max-w-sm bg-[#111114] border border-white/10 rounded-3xl p-6 text-center animate-in zoom-in-95 duration-300'>
          <div className='w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4'>
            <span className='text-2xl'>✓</span>
          </div>
          <p className='text-white font-black text-xl mb-1'>
            {result.ok} turno{result.ok !== 1 ? 's' : ''} creado{result.ok !== 1 ? 's' : ''}
          </p>
          {result.failed > 0 && (
            <p className='text-orange-400 text-sm mb-1'>
              {result.failed} no pudo{result.failed !== 1 ? 'n' : ''} crearse (horario ocupado)
            </p>
          )}
          <p className='text-white/40 text-xs mb-6'>
            {clientName} · {time} hs{isVip ? ' · VIP 10% off' : ''}
          </p>
          <button
            type='button'
            onClick={() => {
              onSuccess();
              handleClose();
            }}
            className='w-full py-3 rounded-2xl bg-neon-cyan text-black font-black uppercase tracking-widest text-sm'
          >
            Listo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='fixed inset-0 z-50 bg-black/80 backdrop-blur-sm'>
      <div className='absolute bottom-0 left-0 right-0 bg-[#111114] rounded-t-3xl px-5 pt-5 pb-10 animate-in slide-in-from-bottom duration-300 max-h-[95vh] overflow-y-auto'>
        <div className='flex items-center justify-between mb-5'>
          <div>
            <p className='text-[10px] uppercase tracking-widest text-white/30 font-bold'>
              Nuevo turno
            </p>
            <h2 className='text-xl font-black'>{barber.name}</h2>
          </div>
          <button
            type='button'
            onClick={handleClose}
            className='text-white/30 hover:text-white transition-colors'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='space-y-4'>
          {/* Client name */}
          <div>
            <label className='block text-[10px] uppercase tracking-widest text-white/40 mb-1 font-bold'>
              Nombre
            </label>
            <input
              type='text'
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder='Nombre del cliente'
              className='w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-cyan outline-none text-sm'
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className='block text-[10px] uppercase tracking-widest text-white/40 mb-1 font-bold'>
              WhatsApp
            </label>
            <input
              type='tel'
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder='Ej: 3402123456'
              className='w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-cyan outline-none text-sm'
            />
          </div>

          {/* Service */}
          <div>
            <label className='block text-[10px] uppercase tracking-widest text-white/40 mb-1 font-bold'>
              Servicio
            </label>
            <div className='grid grid-cols-2 gap-2'>
              {services.map((svc) => (
                <button
                  key={svc.id}
                  type='button'
                  onClick={() => setServiceId(svc.id)}
                  className={`py-2.5 px-3 rounded-xl text-left text-xs font-bold border transition-colors ${
                    serviceId === svc.id
                      ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan'
                      : 'border-white/10 bg-[#18181c] text-white/50 hover:border-white/20'
                  }`}
                >
                  <span className='block truncate'>{svc.name}</span>
                  <span className='text-[10px] font-normal opacity-60'>
                    ${svc.price.toLocaleString('es-AR')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Date + Time */}
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-[10px] uppercase tracking-widest text-white/40 mb-1 font-bold'>
                Fecha
              </label>
              <input
                type='date'
                value={date}
                min={todayStr()}
                onChange={(e) => setDate(e.target.value)}
                className='w-full bg-[#18181c] border border-white/10 rounded-xl px-3 py-3 text-white focus:border-neon-cyan outline-none text-sm'
              />
            </div>
            <div>
              <label className='block text-[10px] uppercase tracking-widest text-white/40 mb-1 font-bold'>
                Hora
              </label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className='w-full bg-[#18181c] border border-white/10 rounded-xl px-3 py-3 text-white focus:border-neon-cyan outline-none text-sm'
              >
                {MODAL_TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t} hs
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* VIP toggle */}
          <div
            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${isVip ? 'border-yellow-400/40 bg-yellow-400/5' : 'border-white/10 bg-white/[0.02]'}`}
          >
            <div className='flex items-center gap-2'>
              <Crown className={`w-4 h-4 ${isVip ? 'text-yellow-400' : 'text-white/20'}`} />
              <div>
                <p className={`text-xs font-bold ${isVip ? 'text-yellow-400' : 'text-white/40'}`}>
                  Cliente VIP
                </p>
                {isVip && basePrice > 0 && (
                  <p className='text-[10px] text-white/40'>
                    ${basePrice.toLocaleString('es-AR')} →{' '}
                    <span className='text-yellow-400 font-bold'>
                      ${finalPrice.toLocaleString('es-AR')}
                    </span>{' '}
                    (−10%)
                  </p>
                )}
              </div>
            </div>
            <button
              type='button'
              onClick={() => setIsVip((v) => !v)}
              className={`w-11 h-6 rounded-full transition-all relative ${isVip ? 'bg-yellow-400' : 'bg-white/10'}`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${isVip ? 'left-[22px]' : 'left-0.5'}`}
              />
            </button>
          </div>

          {/* Recurrence */}
          <div>
            <label className='block text-[10px] uppercase tracking-widest text-white/40 mb-2 font-bold'>
              Recurrencia
            </label>
            <div className='grid grid-cols-3 gap-2'>
              {(['once', 'weekly', 'biweekly'] as Recurrence[]).map((r) => (
                <button
                  key={r}
                  type='button'
                  onClick={() => setRecurrence(r)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                    recurrence === r
                      ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan'
                      : 'border-white/10 bg-[#18181c] text-white/40 hover:border-white/20'
                  }`}
                >
                  {r === 'once' ? 'Único' : r === 'weekly' ? '🔄 Semanal' : '🔄 Quincenal'}
                </button>
              ))}
            </div>
            {isRecurring && (
              <p className='text-[10px] text-white/30 mt-2 leading-relaxed'>
                Se crearán{' '}
                <span className='text-neon-cyan font-bold'>{recurrenceDates.length} turnos</span>{' '}
                por los próximos 3 meses (
                {format(new Date(`${date}T12:00:00`), 'd MMM', { locale: es })} →{' '}
                {format(
                  new Date(`${recurrenceDates[recurrenceDates.length - 1]}T12:00:00`),
                  'd MMM',
                  { locale: es }
                )}
                )
              </p>
            )}
          </div>
        </div>

        {error && <p className='mt-4 text-xs text-red-400 font-bold text-center'>{error}</p>}

        <button
          type='button'
          disabled={loading}
          onClick={handleSubmit}
          className='mt-5 w-full py-4 rounded-2xl bg-gradient-to-r from-neon-cyan to-[#bc00ff] text-black font-black uppercase tracking-widest text-sm disabled:opacity-50'
        >
          {loading
            ? 'Creando turnos...'
            : isRecurring
              ? `Crear ${recurrenceDates.length} turnos`
              : 'Confirmar turno'}
        </button>
      </div>
    </div>
  );
}
