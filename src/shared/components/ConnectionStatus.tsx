'use client';

import { format } from 'date-fns';

interface ConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'reconnecting';
  lastSync: Date | null;
}

const STATUS_CONFIG = {
  connected: {
    dot: 'bg-emerald-400',
    text: 'Conectado',
    textColor: 'text-emerald-400',
  },
  disconnected: {
    dot: 'bg-red-400',
    text: 'Desconectado',
    textColor: 'text-red-400',
  },
  reconnecting: {
    dot: 'bg-yellow-400 animate-pulse',
    text: 'Reconectando...',
    textColor: 'text-yellow-400',
  },
};

export function ConnectionStatusIndicator({ status, lastSync }: ConnectionStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className='flex items-center gap-2'>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      <span className={`text-[10px] uppercase tracking-wider font-bold ${config.textColor}`}>
        {config.text}
      </span>
      {lastSync && (
        <span className='text-[10px] text-white/30'>{format(lastSync, 'HH:mm:ss')}</span>
      )}
    </div>
  );
}
