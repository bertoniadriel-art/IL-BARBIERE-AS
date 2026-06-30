'use client';

import { supabase } from '@/shared/lib/supabase';
import { addHours, format, isAfter, isToday, parseISO } from 'date-fns';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertCircle, Camera, Clock, ImageUp, QrCode, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  barberId: string;
}

type ScanState = 'idle' | 'scanning' | 'processing' | 'success' | 'error';

export function ScannerModule({ barberId }: Props) {
  const [state, setState] = useState<ScanState>('idle');
  const [appointment, setAppointment] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        /* already stopped */
      }
      scannerRef.current = null;
    }
  }, []);

  const processQrResult = useCallback(
    async (decodedText: string) => {
      setState('processing');

      if (!supabase) {
        setErrorMsg('Supabase no configurado');
        setState('error');
        return;
      }

      const { data, error } = await supabase
        .from('appointments')
        .select('*, barbers(*)')
        .eq('qr_hash', decodedText)
        .eq('barber_id', barberId)
        .single();

      if (error || !data) {
        setErrorMsg('TURNO NO ENCONTRADO O INVÁLIDO');
        setState('error');
        return;
      }

      const appointmentDate = parseISO(data.appointment_date);
      if (!isToday(appointmentDate)) {
        setErrorMsg(`ESTE QR ES PARA EL ${format(appointmentDate, 'dd/MM/yyyy')}, NO PARA HOY`);
        setState('error');
        return;
      }

      const expiryTime = addHours(parseISO(`${data.appointment_date}T${data.appointment_time}`), 2);
      if (isAfter(new Date(), expiryTime)) {
        setErrorMsg('ESTE QR YA VENCIÓ (VÁLIDO POR 2 HORAS)');
        setState('error');
        return;
      }

      if (data.status === 'attended') {
        setErrorMsg('ESTE TURNO YA FUE REGISTRADO');
        setState('error');
        return;
      }

      const { data: updated, error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'attended' })
        .eq('id', data.id)
        .in('status', ['confirmed', 'pending'])
        .select('id');

      if (updateError) {
        setErrorMsg('ERROR AL REGISTRAR EL TURNO');
        setState('error');
        return;
      }

      if (!updated || updated.length === 0) {
        setErrorMsg('ESTE TURNO YA FUE REGISTRADO');
        setState('error');
        return;
      }

      setAppointment(data);
      setState('success');
    },
    [barberId]
  );

  const startScanner = useCallback(async () => {
    setState('scanning');
    const qr = new Html5Qrcode('qr-reader');
    scannerRef.current = qr;

    try {
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          await stopScanner();
          await processQrResult(decodedText);
        },
        () => {
          /* ignore frame errors */
        }
      );
    } catch {
      setErrorMsg('No se pudo acceder a la cámara. Verificá los permisos del navegador.');
      setState('error');
    }
  }, [processQrResult, stopScanner]);

  const scanFromFile = useCallback(
    async (file: File) => {
      await stopScanner();
      setState('processing');
      const qr = new Html5Qrcode('qr-reader');
      scannerRef.current = qr;
      try {
        const result = await qr.scanFile(file, false);
        scannerRef.current = null;
        await processQrResult(result);
      } catch {
        scannerRef.current = null;
        setErrorMsg('No se pudo leer el QR de la imagen. Probá con otra foto.');
        setState('error');
      }
    },
    [processQrResult, stopScanner]
  );

  const reset = useCallback(async () => {
    await stopScanner();
    setAppointment(null);
    setErrorMsg(null);
    setState('idle');
  }, [stopScanner]);

  useEffect(
    () => () => {
      stopScanner();
    },
    [stopScanner]
  );

  return (
    <div className='w-full max-w-xl mx-auto flex flex-col items-center gap-6'>
      <h2 className='text-3xl font-black flex items-center gap-4'>
        <QrCode className='w-8 h-8 text-neon-cyan' /> EL ESCÁNER
      </h2>

      <div
        className={`w-full aspect-square max-w-sm rounded-3xl overflow-hidden border transition-colors duration-300 relative
          ${state === 'scanning' ? 'border-neon-cyan/40 bg-black' : 'border-white/10 bg-white/[0.02]'}`}
      >
        <div id='qr-reader' className='w-full h-full' />

        {state !== 'scanning' && (
          <div className='absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0a0a0a]'>
            {state === 'idle' && (
              <>
                <div className='w-20 h-20 rounded-2xl border border-neon-cyan/20 bg-neon-cyan/5 grid place-items-center'>
                  <Camera className='w-9 h-9 text-neon-cyan/50' />
                </div>
                <p className='text-white/30 text-sm text-center max-w-[200px] leading-relaxed'>
                  Usá la cámara o cargá una foto del QR
                </p>
                <button
                  onClick={startScanner}
                  className='mt-2 px-8 py-3 rounded-2xl bg-neon-cyan text-black font-black text-sm uppercase tracking-widest shadow-neon-glow hover:opacity-90 transition-opacity'
                >
                  Abrir cámara
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className='flex items-center gap-2 px-6 py-2.5 rounded-2xl border border-white/15 bg-white/5 text-white/50 text-xs font-bold uppercase tracking-wide hover:bg-white/10 hover:text-white/70 transition-colors'
                >
                  <ImageUp className='w-4 h-4' /> Cargar imagen
                </button>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) scanFromFile(file);
                    e.target.value = '';
                  }}
                />
              </>
            )}

            {state === 'processing' && (
              <div className='flex flex-col items-center gap-3'>
                <div className='w-10 h-10 rounded-full border-2 border-neon-cyan/30 border-t-neon-cyan animate-spin' />
                <p className='text-white/40 text-sm'>Verificando...</p>
              </div>
            )}

            {state === 'success' && appointment && (
              <div className='w-full h-full flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-400'>
                <ShieldCheck className='w-16 h-16 text-neon-cyan mb-4' />
                <p className='text-xs uppercase tracking-widest text-neon-cyan font-black mb-1'>
                  Check-in exitoso
                </p>
                <p className='text-2xl font-black text-white mb-1'>{appointment.client_name}</p>
                <p className='text-white/40 text-sm mb-6'>
                  {appointment.appointment_date} · {appointment.appointment_time?.slice(0, 5)} hs
                </p>
                <button
                  onClick={reset}
                  className='w-full py-3 bg-neon-cyan text-black font-black rounded-xl text-sm uppercase tracking-wide'
                >
                  Escanear siguiente
                </button>
              </div>
            )}

            {state === 'error' && (
              <div className='w-full h-full flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-400'>
                {errorMsg?.includes('DÍA') || errorMsg?.includes('VENCIÓ') ? (
                  <Clock className='w-16 h-16 text-yellow-400 mb-4' />
                ) : (
                  <AlertCircle className='w-16 h-16 text-red-500 mb-4' />
                )}
                <p
                  className={`text-sm font-bold text-center mb-6 ${errorMsg?.includes('DÍA') || errorMsg?.includes('VENCIÓ') ? 'text-yellow-400' : 'text-red-400'}`}
                >
                  {errorMsg}
                </p>
                <button
                  onClick={reset}
                  className='px-8 py-3 rounded-2xl bg-white/10 border border-white/10 text-white font-bold text-sm hover:bg-white/15 transition-colors'
                >
                  Reintentar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {state === 'scanning' && (
        <button
          onClick={reset}
          className='text-white/30 text-xs hover:text-white/60 transition-colors'
        >
          Cancelar
        </button>
      )}
    </div>
  );
}
