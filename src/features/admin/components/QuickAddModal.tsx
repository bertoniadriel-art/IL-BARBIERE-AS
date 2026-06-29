'use client';

import { createAppointment } from '@/features/admin/services/appointmentService';
import { supabase } from '@/shared/lib/supabase';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';

interface QuickAddModalProps {
  barber: { id: string; name: string };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ServiceOption {
  id: string;
  name: string;
  price: number;
  duration_min: number;
}

const MODAL_TIMES: string[] = (() => {
  const slots: string[] = [];
  for (let h = 8; h <= 20; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 20) slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
})();

function getNextRoundHour(): string {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(now.getHours() + 1);
  const candidate = `${String(next.getHours()).padStart(2, '0')}:00`;
  return MODAL_TIMES.includes(candidate) ? candidate : MODAL_TIMES[0];
}

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function QuickAddModal({ barber, isOpen, onClose, onSuccess }: QuickAddModalProps) {
  const [date, setDate] = useState<string>(todayStr);
  const [time, setTime] = useState<string>(getNextRoundHour);
  const [price, setPrice] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [depositPaid, setDepositPaid] = useState<boolean>(true);
  const [serviceId, setServiceId] = useState<string>('');
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedQrHash, setConfirmedQrHash] = useState<string | null>(null);

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
            setPrice(String(data[0].price));
          }
        }
      });
  }, [isOpen, serviceId]);

  // Auto-fill price when service changes
  function handleServiceChange(id: string) {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc) setPrice(String(svc.price));
  }

  if (!isOpen) return null;

  const handleClose = () => {
    if (loading) return;
    setClientName('');
    setPrice('');
    setTime(getNextRoundHour());
    setDate(todayStr());
    setDepositPaid(true);
    setError(null);
    setConfirmedQrHash(null);
    setServiceId(services[0]?.id ?? '');
  };

  const handleConfirmedClose = () => {
    onSuccess();
    handleClose();
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

    const { error: submitError, qr_hash } = await createAppointment({
      barber_id: barber.id,
      service_id: serviceId,
      client_name: clientName.trim(),
      client_phone: '',
      appointment_date: date,
      appointment_time: time,
      final_price: price ? Number(price) : null,
      deposit_paid: depositPaid,
    });

    setLoading(false);

    if (submitError) {
      setError(submitError.message);
      return;
    }

    setConfirmedQrHash(qr_hash);
  };

  const handleDownloadQR = () => {
    const svgEl = document.getElementById('quick-add-qr-svg') as SVGSVGElement | null;
    if (!svgEl) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svgEl)], {
      type: 'image/svg+xml',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `turno-${confirmedQrHash}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (confirmedQrHash) {
    return (
      <div className='fixed inset-0 z-50 bg-black/80 backdrop-blur-sm'>
        <div className='absolute bottom-0 left-0 right-0 bg-[#111114] rounded-t-3xl px-6 pt-6 pb-10 animate-in slide-in-from-bottom duration-300'>
          <div className='w-10 h-1 bg-white/20 rounded-full mx-auto mb-6' />
          <p className='text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1 text-center'>
            Turno creado
          </p>
          <h2 className='text-2xl font-black mb-1 text-center'>{clientName}</h2>
          <p className='text-white/40 text-sm text-center mb-6'>
            {format(new Date(`${date}T00:00`), 'd MMM')} · {time} hs
          </p>
          <div className='flex justify-center mb-4'>
            <div className='bg-white p-4 rounded-2xl'>
              <QRCode
                id='quick-add-qr-svg'
                value={confirmedQrHash}
                size={180}
                style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              />
            </div>
          </div>
          <p className='text-center text-white/40 font-mono text-sm tracking-[0.3em] mb-6'>
            {confirmedQrHash}
          </p>
          <button
            type='button'
            onClick={handleDownloadQR}
            className='w-full py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:bg-white/15 transition-colors mb-3'
          >
            <Download className='w-4 h-4' /> Descargar QR
          </button>
          <button
            type='button'
            onClick={handleConfirmedClose}
            className='w-full py-3 rounded-2xl text-white/40 text-sm font-bold hover:text-white/70 transition-colors'
          >
            Listo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='fixed inset-0 z-50 bg-black/80 backdrop-blur-sm'>
      <div className='absolute bottom-0 left-0 right-0 bg-[#111114] rounded-t-3xl px-6 pt-6 pb-10 animate-in slide-in-from-bottom duration-300 max-h-[92vh] overflow-y-auto'>
        <div className='w-10 h-1 bg-white/20 rounded-full mx-auto mb-6' />

        <p className='text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1'>
          Nuevo Turno
        </p>
        <h2 className='text-2xl font-black mb-6'>{barber.name}</h2>

        <div className='space-y-5'>
          {/* Service selector */}
          <div>
            <label className='block text-xs text-white/40 uppercase tracking-widest mb-1'>
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
                    onClick={() => handleServiceChange(svc.id)}
                    className={`py-3 px-3 rounded-xl text-left text-sm font-bold border transition-colors ${
                      serviceId === svc.id
                        ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan'
                        : 'border-white/10 bg-[#18181c] text-white/60 hover:border-white/20'
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

          {/* Date */}
          <div>
            <label className='block text-xs text-white/40 uppercase tracking-widest mb-1'>
              Fecha
            </label>
            <input
              type='date'
              value={date}
              min={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              className='w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-cyan outline-none'
            />
          </div>

          {/* Time */}
          <div>
            <label className='block text-xs text-white/40 uppercase tracking-widest mb-1'>
              Hora
            </label>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className='w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-cyan outline-none'
            >
              {MODAL_TIMES.map((t) => (
                <option key={t} value={t}>
                  {t} hs
                </option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div>
            <label className='block text-xs text-white/40 uppercase tracking-widest mb-1'>
              Precio
            </label>
            <input
              type='number'
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className='w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-cyan outline-none'
            />
          </div>

          {/* Client name */}
          <div>
            <label className='block text-xs text-white/40 uppercase tracking-widest mb-1'>
              Nombre del cliente
            </label>
            <input
              type='text'
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder='Ej: Juan Pérez'
              className='w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-neon-cyan outline-none'
            />
          </div>

          {/* Deposit */}
          <div>
            <label className='block text-xs text-white/40 uppercase tracking-widest mb-1'>
              ¿Pagó seña?
            </label>
            <div className='flex gap-3'>
              <button
                type='button'
                onClick={() => setDepositPaid(false)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-colors ${
                  !depositPaid
                    ? 'border-red-500 bg-red-500/20 text-red-400'
                    : 'border-white/10 bg-[#18181c] text-white/40'
                }`}
              >
                ✗ No
              </button>
              <button
                type='button'
                onClick={() => setDepositPaid(true)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-colors ${
                  depositPaid
                    ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan'
                    : 'border-white/10 bg-[#18181c] text-white/40'
                }`}
              >
                ✓ Sí
              </button>
            </div>
          </div>
        </div>

        {error && <p className='mt-4 text-xs text-red-400 font-bold text-center'>{error}</p>}

        <button
          type='button'
          disabled={loading}
          onClick={handleSubmit}
          className='mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-neon-cyan to-[#bc00ff] text-black font-black uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {loading ? 'Guardando...' : 'Confirmar turno'}
        </button>

        <button
          type='button'
          disabled={loading}
          onClick={() => {
            handleClose();
            onClose();
          }}
          className='mt-3 w-full py-3 rounded-2xl text-white/40 text-sm font-bold hover:text-white/70 transition-colors disabled:opacity-50'
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
