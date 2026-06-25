'use client';

import { createAppointment } from '@/features/admin/services/appointmentService';
import { format, startOfToday } from 'date-fns';
import { Download } from 'lucide-react';
import { useState } from 'react';
import QRCode from 'react-qr-code';

interface QuickAddModalProps {
  barber: { id: string; name: string };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function getNextRoundHour(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return `${String(now.getHours()).padStart(2, '0')}:00`;
}

export function QuickAddModal({ barber, isOpen, onClose, onSuccess }: QuickAddModalProps) {
  const [time, setTime] = useState<string>(getNextRoundHour);
  const [price, setPrice] = useState<string>('14000');
  const [clientName, setClientName] = useState<string>('');
  const [depositPaid, setDepositPaid] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedQrHash, setConfirmedQrHash] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (loading) return;
    setClientName('');
    setPrice('14000');
    setTime(getNextRoundHour());
    setDepositPaid(true);
    setError(null);
    setConfirmedQrHash(null);
    onClose();
  };

  const handleConfirmedClose = () => {
    onSuccess();
    handleClose();
  };

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      setError('El nombre del cliente es requerido.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: submitError, qr_hash } = await createAppointment({
      barber_id: barber.id,
      client_name: clientName.trim(),
      client_phone: '0000000000',
      appointment_date: format(startOfToday(), 'yyyy-MM-dd'),
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
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `turno-${confirmedQrHash}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Success screen — show QR after creating the appointment
  if (confirmedQrHash) {
    return (
      <div className='fixed inset-0 z-50 bg-black/80 backdrop-blur-sm'>
        <div className='absolute bottom-0 left-0 right-0 bg-[#111114] rounded-t-3xl px-6 pt-6 pb-10 animate-in slide-in-from-bottom duration-300'>
          <div className='w-10 h-1 bg-white/20 rounded-full mx-auto mb-6' />

          <p className='text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1 text-center'>
            Turno creado
          </p>
          <h2 className='text-2xl font-black mb-6 text-center'>{clientName} · {time} hs</h2>

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
            <Download className='w-4 h-4' />
            Descargar QR
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
      <div className='absolute bottom-0 left-0 right-0 bg-[#111114] rounded-t-3xl px-6 pt-6 pb-10 animate-in slide-in-from-bottom duration-300'>
        <div className='w-10 h-1 bg-white/20 rounded-full mx-auto mb-6' />

        <p className='text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1'>
          Nuevo Turno
        </p>
        <h2 className='text-2xl font-black mb-6'>{barber.name}</h2>

        <div className='space-y-5'>
          <div>
            <label className='block text-xs text-white/40 uppercase tracking-widest mb-1'>
              Hora
            </label>
            <input
              type='time'
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className='w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#00f3ff] outline-none'
            />
          </div>

          <div>
            <label className='block text-xs text-white/40 uppercase tracking-widest mb-1'>
              Precio
            </label>
            <input
              type='number'
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className='w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#00f3ff] outline-none'
            />
          </div>

          <div>
            <label className='block text-xs text-white/40 uppercase tracking-widest mb-1'>
              Nombre del cliente
            </label>
            <input
              type='text'
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder='Ej: Juan Pérez'
              className='w-full bg-[#18181c] border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#00f3ff] outline-none'
            />
          </div>

          <div>
            <label className='block text-xs text-white/40 uppercase tracking-widest mb-1'>
              ¿Pagó?
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
                ✗ No pagó
              </button>
              <button
                type='button'
                onClick={() => setDepositPaid(true)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-colors ${
                  depositPaid
                    ? 'border-[#00f3ff] bg-[#00f3ff]/10 text-[#00f3ff]'
                    : 'border-white/10 bg-[#18181c] text-white/40'
                }`}
              >
                ✓ Pagó
              </button>
            </div>
          </div>
        </div>

        {error && <p className='mt-4 text-xs text-red-400 font-bold text-center'>{error}</p>}

        <button
          type='button'
          disabled={loading}
          onClick={handleSubmit}
          className='mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-[#00f3ff] to-[#bc00ff] text-black font-black uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {loading ? 'Guardando...' : 'Confirmar turno'}
        </button>

        <button
          type='button'
          disabled={loading}
          onClick={handleClose}
          className='mt-3 w-full py-3 rounded-2xl text-white/40 text-sm font-bold hover:text-white/70 transition-colors disabled:opacity-50'
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
