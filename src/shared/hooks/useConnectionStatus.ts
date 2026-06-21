import { supabase } from '@/shared/lib/supabase';
import { useEffect, useState } from 'react';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface UseConnectionStatusResult {
  status: ConnectionStatus;
  lastSync: Date | null;
}

export function useConnectionStatus(): UseConnectionStatusResult {
  const [status, setStatus] = useState<ConnectionStatus>('connected');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const channel = supabase.channel('connection-monitor');

    channel
      .on('system', { event: 'CHANNEL_ERROR' }, () => {
        setStatus('disconnected');
      })
      .on('system', { event: 'TIMESTAMP' }, () => {
        setStatus('connected');
        setLastSync(new Date());
      })
      .subscribe((state) => {
        if (state === 'SUBSCRIBED') {
          setStatus('connected');
          setLastSync(new Date());
        } else if (state === 'CHANNEL_ERROR') {
          setStatus('disconnected');
        } else if (state === 'TIMED_OUT') {
          setStatus('reconnecting');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { status, lastSync };
}
