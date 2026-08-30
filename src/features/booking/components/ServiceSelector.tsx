'use client';

import { supabase } from '@/shared/lib/supabase';
import { Clock, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useBookingStore } from '../bookingStore';

interface ServiceFromDB {
  id: string;
  name: string;
  price: number;
  duration_min: number;
}

// Color cycle derived from index — keeps UI identical without coupling to DB
const SERVICE_COLORS = [
  'from-neon-cyan to-blue-500',
  'from-neon-purple to-pink-500',
  'from-white to-neon-cyan',
];

export function ServiceSelector() {
  const setService = useBookingStore((state) => state.setService);
  const setStep = useBookingStore((state) => state.setStep);

  const [services, setServices] = useState<ServiceFromDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) {
          setLoadError('No se pudieron cargar los servicios');
          return;
        }
        const { data, error } = await supabase
          .from('services')
          .select('id, name, price, duration_min')
          .order('price', { ascending: true });

        if (error) {
          console.error('ServiceSelector fetch error:', error);
          setLoadError('No se pudieron cargar los servicios');
          return;
        }
        setServices(data ?? []);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <div className='w-full max-w-4xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-right-4 duration-500'>
      <div className='flex flex-col md:flex-row justify-between items-center mb-16 gap-8'>
        <div className='flex items-center gap-6'>
          <button
            onClick={() => setStep(1)}
            className='p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors'
          >
            <BackIcon className='w-5 h-5 text-white/40' />
          </button>
          <div>
            <h2 className='text-4xl font-black tracking-tighter italic'>
              EL <span className='text-neon-cyan'>MENU</span>
            </h2>
            <p className='text-[10px] tracking-[0.4em] uppercase text-white/30 font-bold'>
              Selección de Protocolo
            </p>
          </div>
        </div>

        <div className='flex items-center gap-3 px-6 py-3 bg-neon-cyan/5 border border-neon-cyan/20 rounded-2xl animate-pulse'>
          <Zap className='w-4 h-4 text-neon-cyan fill-neon-cyan' />
          <span className='text-xs font-black uppercase tracking-widest text-neon-cyan italic'>
            Turno fijo semanal 10% OFF
          </span>
        </div>
      </div>

      {isLoading && (
        <div className='text-center text-white/30 text-xs uppercase tracking-[0.2em] py-12'>
          Cargando servicios...
        </div>
      )}

      {!isLoading && loadError && (
        <div className='text-center text-red-400 text-sm font-bold py-12 uppercase tracking-widest'>
          {loadError}
        </div>
      )}

      {!isLoading && !loadError && (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {services.map((service, i) => {
            const color = SERVICE_COLORS[i % SERVICE_COLORS.length];
            return (
              <button
                key={service.id}
                onClick={() =>
                  setService(service.id, service.name, service.price, service.duration_min)
                }
                className='group relative flex flex-col p-8 glass-card border-white/5 hover:border-neon-cyan/50 transition-all duration-500 text-left overflow-hidden hover:scale-[1.02] active:scale-[0.98]'
              >
                {/* Interactive Background Gradient */}
                <div
                  className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500`}
                />

                <div className='flex items-start justify-between mb-8 relative z-10'>
                  <div className='p-4 bg-white/5 rounded-2xl group-hover:bg-neon-cyan/10 transition-colors duration-500 border border-white/5 group-hover:border-neon-cyan/30'>
                    <img
                      src='/assets/logo/logo-official.jpg'
                      alt='OS'
                      className='w-8 h-8 object-contain'
                    />
                  </div>
                  <div className='text-right'>
                    <span className='text-2xl font-black tracking-tighter text-white'>
                      ${service.price.toLocaleString('es-AR')}
                    </span>
                    <p className='text-[10px] text-white/30 font-black tracking-widest uppercase'>
                      ARS
                    </p>
                  </div>
                </div>

                <div className='relative z-10'>
                  <h3 className='text-2xl font-black italic uppercase mb-2 group-hover:text-neon-cyan transition-colors'>
                    {service.name}
                  </h3>

                  <div className='flex items-center gap-6'>
                    <div className='flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-white/20 uppercase'>
                      <Clock className='w-4 h-4 text-neon-cyan' />
                      <span>{service.duration_min} MINUTOS</span>
                    </div>
                    <div className='h-px w-8 bg-white/5' />
                    <span className='text-[10px] font-black tracking-[0.2em] text-neon-cyan uppercase group-hover:translate-x-2 transition-transform'>
                      SELECCIONAR →
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BackIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='m15 18-6-6 6-6' />
    </svg>
  );
}
