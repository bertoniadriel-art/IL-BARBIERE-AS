'use client';

// Requires Supabase Realtime enabled on the appointments table.
// In Supabase dashboard: Database → Replication → enable "appointments".

import { supabase } from '@/shared/lib/supabase-client';
import { useEffect, useRef } from 'react';

export interface IncomingAppointment {
  id: string;
  client_name: string | null;
  appointment_date: string;
  appointment_time: string;
  qr_hash: string | null;
}

export function useNewAppointmentNotifications(
  barberId: string | null,
  onNew: (appt: IncomingAppointment) => void
) {
  const onNewRef = useRef(onNew);
  useEffect(() => {
    onNewRef.current = onNew;
  });

  useEffect(() => {
    if (!supabase || !barberId) return;

    const channel = supabase
      .channel(`new-appts-${barberId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `barber_id=eq.${barberId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          onNewRef.current(payload.new as unknown as IncomingAppointment);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barberId]);
}
