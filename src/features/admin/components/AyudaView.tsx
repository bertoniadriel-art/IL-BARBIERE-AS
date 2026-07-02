'use client';

import { AlertTriangle, CheckCircle2, Crown, MoveRight, XCircle } from 'lucide-react';
import { useState } from 'react';

interface FaqItem {
  id: string;
  icon: React.ReactNode;
  question: string;
  answer: React.ReactNode;
}

const FAQS: FaqItem[] = [
  {
    id: 'mover-vs-cancelar',
    icon: <MoveRight className='w-5 h-5 text-neon-cyan' />,
    question: '¿Un cliente no puede venir a un turno puntual? ¿Lo cancelo y que reserve de nuevo?',
    answer: (
      <div className='space-y-3'>
        <p>
          <span className='text-red-400 font-bold'>No canceles y dejes que reserve de nuevo.</span>{' '}
          Eso le crea un turno con un código nuevo — pierde el link/QR que ya tenía guardado y le
          puede aparecer como "cancelado" cuando en realidad tiene otro turno.
        </p>
        <p>
          <span className='text-neon-cyan font-bold'>Usá el botón "Mover"</span> en la card del
          turno, dentro de Agenda. Elegís el nuevo día y horario, confirmás, y listo — es el mismo
          turno, mismo cliente, mismo código.
        </p>
      </div>
    ),
  },
  {
    id: 'vip-turno-fijo',
    icon: <Crown className='w-5 h-5 text-yellow-400' />,
    question: '¿Tengo que volver a cargar a mis clientes fijos (VIP) todas las semanas?',
    answer: (
      <div className='space-y-3'>
        <p>
          <span className='text-emerald-400 font-bold'>No.</span> Un cliente VIP tiene su horario
          reservado automáticamente todas las semanas, para siempre — no tenés que hacer nada.
        </p>
        <p>
          Solo entrás a <span className='text-neon-cyan font-bold'>"Turnos VIP"</span> cuando ese
          cliente te avisa que ESA semana puntual no puede venir:
        </p>
        <ol className='list-decimal list-inside space-y-1 text-white/70'>
          <li>
            Le das <span className='text-emerald-400 font-bold'>"Habilitar"</span> a su horario —
            queda libre para que otro cliente lo reserve esa semana.
          </li>
          <li>Dejás que alguien más lo tome (por la app, o lo cargás vos).</li>
          <li>
            Cuando pasa esa semana, le das{' '}
            <span className='text-red-400 font-bold'>"Bloquear"</span> de nuevo — vuelve a quedar
            reservado para tu cliente fijo, sin que tengas que cargarlo de nuevo.
          </li>
        </ol>
      </div>
    ),
  },
  {
    id: 'seña-pago',
    icon: <CheckCircle2 className='w-5 h-5 text-emerald-400' />,
    question: '¿Cómo sé si un turno está señado o cobrado?',
    answer: (
      <div className='space-y-2'>
        <p>
          En Agenda y en el tablero, cada turno muestra{' '}
          <span className='text-emerald-400 font-bold'>"Seña ✓"</span> o{' '}
          <span className='text-red-400 font-bold'>"Sin seña"</span>.
        </p>
        <p>
          En Finanzas, el total del día/semana/mes solo cuenta turnos que ya marcaste como{' '}
          <span className='text-neon-cyan font-bold'>cobrado</span> — si atendiste a alguien y no lo
          marcás, esa plata no va a aparecer sumada en ningún lado.
        </p>
      </div>
    ),
  },
];

export function AyudaView() {
  const [openId, setOpenId] = useState<string | null>(FAQS[0]?.id ?? null);

  return (
    <div className='space-y-4'>
      <div className='flex items-start gap-3 p-4 rounded-2xl bg-neon-cyan/5 border border-neon-cyan/20'>
        <AlertTriangle className='w-4 h-4 text-neon-cyan flex-shrink-0 mt-0.5' />
        <p className='text-xs text-white/60'>
          Respuestas rápidas a las dudas que surgieron usando la app. Si tenés otra que no está acá,
          avisale a Adriel.
        </p>
      </div>

      {FAQS.map((faq) => {
        const isOpen = openId === faq.id;
        return (
          <div
            key={faq.id}
            className='glass-card rounded-2xl border border-white/10 overflow-hidden'
          >
            <button
              type='button'
              onClick={() => setOpenId(isOpen ? null : faq.id)}
              className='w-full flex items-center gap-3 p-5 text-left'
            >
              {faq.icon}
              <span className='flex-1 font-bold text-sm text-white'>{faq.question}</span>
              {isOpen ? (
                <XCircle className='w-4 h-4 text-white/30 flex-shrink-0' />
              ) : (
                <MoveRight className='w-4 h-4 text-white/30 flex-shrink-0 rotate-90' />
              )}
            </button>
            {isOpen && (
              <div className='px-5 pb-5 text-sm text-white/80 border-t border-white/5 pt-4'>
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
