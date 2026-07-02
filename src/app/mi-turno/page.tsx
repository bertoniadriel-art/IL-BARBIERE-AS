'use client';

import { ArrowRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

export default function BuscarMiTurnoPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Ingresá el código de tu turno.');
      return;
    }
    router.push(`/mi-turno/${trimmed}`);
  };

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

        <form
          onSubmit={handleSubmit}
          className='bg-white/[0.03] border border-white/8 rounded-3xl p-6 space-y-4'
        >
          <div>
            <label className='block text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 font-black italic'>
              Código de tu turno
            </label>
            <div className='relative'>
              <Search className='absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30' />
              <input
                type='text'
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder='Ej: A1B2C3D4'
                autoCapitalize='characters'
                className='w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-5 py-4 focus:outline-none focus:border-neon-cyan transition-all text-white font-bold uppercase tracking-widest'
              />
            </div>
            {error && <p className='text-red-400 text-xs mt-2'>{error}</p>}
          </div>
          <p className='text-white/30 text-[10px]'>
            Lo enviamos por WhatsApp cuando reservaste — también está en el QR que te mostramos al
            confirmar.
          </p>
          <button
            type='submit'
            className='group w-full py-4 bg-neon-cyan text-black font-black rounded-2xl hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm'
          >
            Ver mi turno
            <ArrowRight className='w-4 h-4 group-hover:translate-x-1 transition-transform' />
          </button>
        </form>
      </div>
    </div>
  );
}
