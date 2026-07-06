'use client';

import { authService } from '@/features/auth/services/authService';
import type { IncomingAppointment } from '@/shared/hooks/useNewAppointmentNotifications';
import { useNewAppointmentNotifications } from '@/shared/hooks/useNewAppointmentNotifications';
import { playNotificationBeep } from '@/shared/lib/notificationSound';
import type { Barber } from '@/shared/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { AgendaView } from './AgendaView';
import { AyudaView } from './AyudaView';
import { FinanzasView } from './FinanzasView';
import { QuickAddModal } from './QuickAddModal';
import { VipSlotsView } from './VipSlotsView';

const ScannerModule = dynamic(() => import('./ScannerModule').then((mod) => mod.ScannerModule), {
  ssr: false,
});

type AdminTab = 'agenda' | 'scanner' | 'finanzas' | 'vip' | 'ayuda';

interface Props {
  barber: Barber;
}

export function DashboardShell({ barber }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>('agenda');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);
  const [notification, setNotification] = useState<IncomingAppointment | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<IncomingAppointment[]>([]);

  const handleLogout = async () => {
    await authService.signOut();
    window.location.reload();
  };

  const handleNewAppointment = useCallback((appt: IncomingAppointment) => {
    playNotificationBeep();
    setNotification(appt);
    setNotificationCount((c) => c + 1);
    setRecentNotifications((prev) => [appt, ...prev].slice(0, 8));
  }, []);

  useNewAppointmentNotifications(barber.id, handleNewAppointment);

  const dismissNotification = () => setNotification(null);

  const goToAgenda = () => {
    setNotification(null);
    setActiveTab('agenda');
    setRefetchKey((k) => k + 1);
  };

  const tabLabel: Record<AdminTab, string> = {
    agenda: 'Agenda',
    scanner: 'Escáner QR',
    finanzas: 'Finanzas',
    vip: 'Turnos VIP',
    ayuda: 'Ayuda',
  };

  return (
    <>
      {/* Real-time notification banner */}
      {notification && (
        <div className='fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-in slide-in-from-top duration-400'>
          <div className='bg-[#111114] border border-neon-cyan/40 rounded-2xl p-4 shadow-2xl shadow-neon-cyan/10'>
            <div className='flex items-start gap-3'>
              <div className='w-9 h-9 rounded-xl bg-neon-cyan/20 border border-neon-cyan/40 flex items-center justify-center flex-shrink-0'>
                <Bell className='w-4 h-4 text-neon-cyan' />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-[10px] uppercase tracking-widest text-neon-cyan font-black mb-0.5'>
                  Nuevo turno
                </p>
                <p className='font-bold text-white text-sm truncate'>
                  {notification.client_name || 'Cliente sin nombre'}
                </p>
                <p className='text-white/40 text-xs mt-0.5'>
                  {notification.appointment_date
                    ? format(parseISO(notification.appointment_date), 'd MMM', { locale: es })
                    : ''}{' '}
                  · {notification.appointment_time?.slice(0, 5)} hs
                </p>
              </div>
              <button
                type='button'
                onClick={dismissNotification}
                className='text-white/30 hover:text-white transition-colors flex-shrink-0'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <div className='flex gap-2 mt-3'>
              <button
                type='button'
                onClick={goToAgenda}
                className='flex-1 py-2 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-xs font-bold uppercase tracking-wide hover:bg-neon-cyan/20 transition-colors'
              >
                Ver en agenda
              </button>
              <button
                type='button'
                onClick={dismissNotification}
                className='flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs font-bold uppercase tracking-wide hover:bg-white/10 transition-colors'
              >
                Ignorar
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminLayout
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab as AdminTab);
          if (tab === 'agenda') setNotificationCount(0);
        }}
        onLogout={handleLogout}
        notificationCount={notificationCount}
      >
        <div className='max-w-4xl mx-auto'>
          <div className='flex justify-between items-end mb-10'>
            <div>
              <h1 className='text-4xl font-black tracking-tighter mb-2 uppercase italic text-neon-cyan'>
                HOLA, {barber.name.split(' ')[0].toUpperCase()}
              </h1>
              <p className='text-white/40 uppercase tracking-widest text-xs'>
                {tabLabel[activeTab]}
              </p>
            </div>
          </div>

          {activeTab === 'agenda' && (
            <div className='animate-in fade-in duration-500'>
              <AgendaView
                barber={barber}
                refetchKey={refetchKey}
                recentNotifications={recentNotifications}
              />
            </div>
          )}
          {activeTab === 'scanner' && <ScannerModule barberId={barber.id} />}
          {activeTab === 'finanzas' && (
            <div className='animate-in fade-in duration-500'>
              <FinanzasView barber={barber} />
            </div>
          )}
          {activeTab === 'vip' && (
            <div className='animate-in fade-in duration-500'>
              <VipSlotsView barberId={barber.id} />
            </div>
          )}
          {activeTab === 'ayuda' && (
            <div className='animate-in fade-in duration-500'>
              <AyudaView />
            </div>
          )}
        </div>
      </AdminLayout>

      <button
        type='button'
        onClick={() => setIsQuickAddOpen(true)}
        className='fixed bottom-6 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-[#00f3ff] to-[#bc00ff] text-black text-2xl font-bold shadow-lg shadow-cyan-500/30 flex items-center justify-center cursor-pointer border-none'
        aria-label='Nuevo turno'
      >
        +
      </button>

      <QuickAddModal
        barber={barber}
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={() => {
          setRefetchKey((k) => k + 1);
          setActiveTab('agenda');
        }}
      />
    </>
  );
}
